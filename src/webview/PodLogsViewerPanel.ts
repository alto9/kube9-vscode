import { randomUUID } from 'crypto';
import * as vscode from 'vscode';
import { LogsProvider } from '../providers/LogsProvider';
import { PreferencesManager } from '../utils/PreferencesManager';
import { WebviewToExtensionMessage, ExtensionToWebviewMessage, InitialState, PodInfo } from '../types/messages';
import { WebviewHelpHandler } from './WebviewHelpHandler';
import { getHelpController } from '../extension';
import { makePodLogsViewerKey } from './podLogsViewerKey';

/**
 * Interface for storing panel information.
 * Each panel has a stable instance id for message routing and streaming state,
 * plus a composite registry key for deduplicating the same pod/container view.
 */
interface PanelInfo {
    panel: vscode.WebviewPanel;
    logsProvider: LogsProvider;
    currentPod: PodInfo;
    /** Stable id for this panel instance (maps, handlers, streaming). */
    viewerInstanceId: string;
    /** Current dedupe key; updated when the user switches container in the same panel. */
    compositeKey: string;
}

/**
 * PodLogsViewerPanel manages webview panels for Pod Logs Viewer.
 * Supports multiple simultaneous panels (distinct pod/container targets per cluster).
 */
export class PodLogsViewerPanel {
    /**
     * Open panels keyed by viewerInstanceId.
     */
    private static openPanels: Map<string, PanelInfo> = new Map();

    /**
     * Maps composite viewer key (context/namespace/pod/container) to an open panel instance.
     * Used to reveal an existing panel instead of opening a duplicate.
     */
    private static compositeKeyToViewerInstanceId: Map<string, string> = new Map();
    
    /**
     * Extension context for managing subscriptions.
     */
    private static extensionContext: vscode.ExtensionContext | undefined;

    /**
     * Preferences manager instance for accessing user preferences.
     */
    private static preferencesManager: PreferencesManager | undefined;

    /**
     * Map of pending log lines per viewer instance, waiting to be batched and sent.
     */
    private static pendingLogLines: Map<string, string[]> = new Map();

    /**
     * Map of batch interval timers per viewer instance for scheduled log sends.
     */
    private static batchIntervals: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Map of total line counts per viewer instance for tracking log volume.
     */
    private static totalLineCounts: Map<string, number> = new Map();

    /**
     * Map tracking whether warning has been shown for "All" option exceeding 10,000 lines per viewer instance.
     */
    private static allLimitWarningsShown: Map<string, boolean> = new Map();

    /**
     * Map tracking active container streams for "all" containers mode.
     * Key: viewerInstanceId, Value: Set of container names with active streams.
     */
    private static activeContainerStreams: Map<string, Set<string>> = new Map();

    /**
     * Map tracking LogsProvider instances for "all" containers mode.
     * Key: viewerInstanceId, Value: Map of container name to LogsProvider instance.
     */
    private static allContainersLogsProviders: Map<string, Map<string, LogsProvider>> = new Map();

    /**
     * Show a Pod Logs Viewer webview panel.
     * Creates a new panel or reveals an existing one for the same context/namespace/pod/container.
     * For multi-container pods, prompts user to select a container.
     * Single-container pods automatically select the container.
     *
     * @param context - The VS Code extension context
     * @param contextName - The kubectl context name
     * @param clusterName - The display name of the cluster
     * @param podName - The name of the pod
     * @param namespace - The namespace of the pod
     */
    public static async show(
        context: vscode.ExtensionContext,
        contextName: string,
        clusterName: string,
        podName: string,
        namespace: string
    ): Promise<void> {
        PodLogsViewerPanel.extensionContext = context;

        const logsProvider = new LogsProvider(contextName);

        try {
            const containers = await logsProvider.getPodContainers(namespace, podName);

            if (containers.length === 0) {
                vscode.window.showErrorMessage(`No containers found in pod ${podName}`);
                logsProvider.dispose();
                return;
            }

            let selectedContainer: string;

            if (containers.length === 1) {
                selectedContainer = containers[0];
            } else {
                const quickPickItems = [...containers, 'All Containers'];
                const selection = await vscode.window.showQuickPick(quickPickItems, {
                    placeHolder: 'Select container to view logs'
                });

                if (!selection) {
                    logsProvider.dispose();
                    return;
                }

                selectedContainer = selection === 'All Containers' ? 'all' : selection;
            }

            const compositeKey = makePodLogsViewerKey(
                contextName,
                namespace,
                podName,
                selectedContainer
            );

            const existingInstanceId = PodLogsViewerPanel.compositeKeyToViewerInstanceId.get(compositeKey);
            if (existingInstanceId) {
                const existing = PodLogsViewerPanel.openPanels.get(existingInstanceId);
                if (existing) {
                    existing.panel.reveal(vscode.ViewColumn.One);
                    logsProvider.dispose();
                    return;
                }
                PodLogsViewerPanel.compositeKeyToViewerInstanceId.delete(compositeKey);
            }

            const viewerInstanceId = randomUUID();
            await PodLogsViewerPanel.createPanel(
                context,
                viewerInstanceId,
                compositeKey,
                contextName,
                clusterName,
                podName,
                namespace,
                selectedContainer,
                logsProvider
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to fetch containers for pod ${podName}: ${errorMessage}`);
            logsProvider.dispose();
        }
    }

    /**
     * Create a new webview panel for pod logs.
     *
     * @param context - The VS Code extension context
     * @param viewerInstanceId - Stable id for this panel (state, handlers, streaming)
     * @param compositeKey - Registry key for deduplicating the same pod/container
     * @param contextName - The kubectl context name
     * @param clusterName - The display name of the cluster
     * @param podName - The name of the pod
     * @param namespace - The namespace of the pod
     * @param container - The container name (or 'all' for all containers)
     * @param logsProvider - The LogsProvider instance for this panel
     */
    private static async createPanel(
        context: vscode.ExtensionContext,
        viewerInstanceId: string,
        compositeKey: string,
        contextName: string,
        clusterName: string,
        podName: string,
        namespace: string,
        container: string,
        logsProvider: LogsProvider
    ): Promise<void> {
        const panelTitle =
            container === 'all'
                ? `Logs: ${podName} (all containers) — ${namespace}`
                : `Logs: ${podName} — ${namespace}`;

        const panel = vscode.window.createWebviewPanel(
            'kube9PodLogs',
            panelTitle,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        const podInfo: PodInfo = {
            name: podName,
            namespace,
            container,
            contextName,
            clusterName
        };

        PodLogsViewerPanel.compositeKeyToViewerInstanceId.set(compositeKey, viewerInstanceId);
        PodLogsViewerPanel.openPanels.set(viewerInstanceId, {
            panel,
            logsProvider,
            currentPod: podInfo,
            viewerInstanceId,
            compositeKey
        });

        panel.webview.html = PodLogsViewerPanel.getWebviewContent(
            panel.webview,
            context.extensionUri
        );

        PodLogsViewerPanel.setupMessageHandling(panel, viewerInstanceId, context);

        const helpHandler = new WebviewHelpHandler(getHelpController());
        helpHandler.setupHelpMessageHandler(panel.webview);

        panel.onDidDispose(
            () => {
                PodLogsViewerPanel.cleanupBatching(viewerInstanceId);

                const panelInfo = PodLogsViewerPanel.openPanels.get(viewerInstanceId);
                if (panelInfo) {
                    PodLogsViewerPanel.compositeKeyToViewerInstanceId.delete(panelInfo.compositeKey);

                    if (panelInfo.logsProvider) {
                        panelInfo.logsProvider.dispose();
                    }

                    const containerProviders =
                        PodLogsViewerPanel.allContainersLogsProviders.get(viewerInstanceId);
                    if (containerProviders) {
                        for (const [, provider] of containerProviders) {
                            provider.stopStream();
                            provider.dispose();
                        }
                        PodLogsViewerPanel.allContainersLogsProviders.delete(viewerInstanceId);
                    }
                    PodLogsViewerPanel.activeContainerStreams.delete(viewerInstanceId);
                }
                PodLogsViewerPanel.openPanels.delete(viewerInstanceId);
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Set up bidirectional message handling between extension and webview.
     *
     * @param panel - The webview panel
     * @param viewerInstanceId - Stable id for this viewer instance
     * @param context - The VS Code extension context
     */
    private static setupMessageHandling(
        panel: vscode.WebviewPanel,
        viewerInstanceId: string,
        context: vscode.ExtensionContext
    ): void {
        panel.webview.onDidReceiveMessage(
            async (message: WebviewToExtensionMessage) => {
                const timestamp = new Date().toISOString();
                console.log(`[PodLogsViewerPanel ${timestamp}] ⬅️ Received message: ${message.type}`);

                await PodLogsViewerPanel.handleMessage(viewerInstanceId, message);
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Handle messages received from webview.
     *
     * @param viewerInstanceId - Stable id for this viewer instance
     * @param message - The message from webview
     */
    private static async handleMessage(
        viewerInstanceId: string,
        message: WebviewToExtensionMessage
    ): Promise<void> {
        const timestamp = new Date().toISOString();

        switch (message.type) {
            case 'ready':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'ready' message`);
                await PodLogsViewerPanel.sendInitialState(viewerInstanceId);
                break;
            case 'refresh':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'refresh' message`);
                break;
            case 'toggleFollow':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'toggleFollow' message, enabled=${message.enabled}`);
                await PodLogsViewerPanel.handleToggleFollow(viewerInstanceId, message.enabled);
                break;
            case 'toggleTimestamps':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'toggleTimestamps' message, enabled=${message.enabled}`);
                await PodLogsViewerPanel.handleToggleTimestamps(viewerInstanceId, message.enabled);
                break;
            case 'copy':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'copy' message`);
                await PodLogsViewerPanel.handleCopy(message.lines);
                break;
            case 'export':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'export' message`);
                await PodLogsViewerPanel.handleExport(message.lines, message.podName, message.containerName, message.includeTimestamps);
                break;
            case 'setLineLimit':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'setLineLimit' message, limit=${message.limit}`);
                await PodLogsViewerPanel.handleSetLineLimit(viewerInstanceId, message.limit);
                break;
            case 'setPrevious':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'setPrevious' message, enabled=${message.enabled}`);
                await PodLogsViewerPanel.handleSetPrevious(viewerInstanceId, message.enabled);
                break;
            case 'switchContainer':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'switchContainer' message, container=${message.container}`);
                await PodLogsViewerPanel.handleSwitchContainer(viewerInstanceId, message.container);
                break;
            default:
                console.log(`[PodLogsViewerPanel ${timestamp}] ❌ Unknown message type:`, message);
        }
    }

    /**
     * Handle follow mode toggle request from webview.
     * Updates preferences and restarts stream with new follow setting.
     *
     * @param viewerInstanceId - Stable id for this viewer instance
     * @param enabled - Whether follow mode should be enabled
     */
    private static async handleToggleFollow(viewerInstanceId: string, enabled: boolean): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] handleToggleFollow: enabled=${enabled}`);

        const panelInfo = PodLogsViewerPanel.openPanels.get(viewerInstanceId);
        if (!panelInfo) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ No panel found for viewer: ${viewerInstanceId}`);
            return;
        }

        const clusterCtx = panelInfo.currentPod.contextName;

        if (!PodLogsViewerPanel.preferencesManager && PodLogsViewerPanel.extensionContext) {
            PodLogsViewerPanel.preferencesManager = new PreferencesManager(PodLogsViewerPanel.extensionContext);
        }

        if (!PodLogsViewerPanel.preferencesManager) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Cannot initialize PreferencesManager - no extension context`);
            return;
        }

        try {
            const preferences = PodLogsViewerPanel.preferencesManager.getPreferences(clusterCtx);

            const updatedPreferences = { ...preferences, followMode: enabled };

            await PodLogsViewerPanel.preferencesManager.savePreferences(clusterCtx, updatedPreferences);

            panelInfo.logsProvider.stopStream();
            PodLogsViewerPanel.cleanupBatching(viewerInstanceId);

            await PodLogsViewerPanel.startStreaming(viewerInstanceId);

            console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Follow mode ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Failed to toggle follow mode: ${errorMessage}`);
        }
    }

    /**
     * Handle timestamps toggle request from webview.
     * Updates preferences and restarts stream with new timestamps setting.
     *
     * @param viewerInstanceId - Stable id for this viewer instance
     * @param enabled - Whether timestamps should be enabled
     */
    private static async handleToggleTimestamps(viewerInstanceId: string, enabled: boolean): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] handleToggleTimestamps: enabled=${enabled}`);

        const panelInfo = PodLogsViewerPanel.openPanels.get(viewerInstanceId);
        if (!panelInfo) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ No panel found for viewer: ${viewerInstanceId}`);
            return;
        }

        const clusterCtx = panelInfo.currentPod.contextName;

        if (!PodLogsViewerPanel.preferencesManager && PodLogsViewerPanel.extensionContext) {
            PodLogsViewerPanel.preferencesManager = new PreferencesManager(PodLogsViewerPanel.extensionContext);
        }

        if (!PodLogsViewerPanel.preferencesManager) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Cannot initialize PreferencesManager - no extension context`);
            return;
        }

        try {
            const preferences = PodLogsViewerPanel.preferencesManager.getPreferences(clusterCtx);

            const updatedPreferences = { ...preferences, showTimestamps: enabled };

            await PodLogsViewerPanel.preferencesManager.savePreferences(clusterCtx, updatedPreferences);

            panelInfo.logsProvider.stopStream();
            PodLogsViewerPanel.cleanupBatching(viewerInstanceId);

            await PodLogsViewerPanel.startStreaming(viewerInstanceId);

            console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Timestamps ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Failed to toggle timestamps: ${errorMessage}`);
        }
    }

    /**
     * Handle set previous container logs request from webview.
     * Updates preferences and restarts stream with new previous setting.
     *
     * @param viewerInstanceId - Stable id for this viewer instance
     * @param enabled - Whether to show previous container logs
     */
    private static async handleSetPrevious(viewerInstanceId: string, enabled: boolean): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] handleSetPrevious: enabled=${enabled}`);

        const panelInfo = PodLogsViewerPanel.openPanels.get(viewerInstanceId);
        if (!panelInfo) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ No panel found for viewer: ${viewerInstanceId}`);
            return;
        }

        const clusterCtx = panelInfo.currentPod.contextName;

        if (!PodLogsViewerPanel.preferencesManager && PodLogsViewerPanel.extensionContext) {
            PodLogsViewerPanel.preferencesManager = new PreferencesManager(PodLogsViewerPanel.extensionContext);
        }

        if (!PodLogsViewerPanel.preferencesManager) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Cannot initialize PreferencesManager - no extension context`);
            return;
        }

        try {
            const preferences = PodLogsViewerPanel.preferencesManager.getPreferences(clusterCtx);

            const updatedPreferences = { ...preferences, showPrevious: enabled };

            await PodLogsViewerPanel.preferencesManager.savePreferences(clusterCtx, updatedPreferences);

            panelInfo.logsProvider.stopStream();
            PodLogsViewerPanel.cleanupBatching(viewerInstanceId);

            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'logData',
                data: []
            });

            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'preferencesUpdated',
                preferences: updatedPreferences
            });

            PodLogsViewerPanel.startStreaming(viewerInstanceId);

            console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Previous logs ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Failed to set previous logs: ${errorMessage}`);
        }
    }

    /**
     * Handle set line limit request from webview.
     * Updates preferences and restarts stream with new tailLines parameter.
     * If limit is 'custom', prompts user for numeric input.
     *
     * @param viewerInstanceId - Stable id for this viewer instance
     * @param limit - The line limit value (number, 'all', or 'custom')
     */
    private static async handleSetLineLimit(
        viewerInstanceId: string,
        limit: number | 'all' | 'custom'
    ): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] handleSetLineLimit: limit=${limit}`);

        const panelInfo = PodLogsViewerPanel.openPanels.get(viewerInstanceId);
        if (!panelInfo) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ No panel found for viewer: ${viewerInstanceId}`);
            return;
        }

        const clusterCtx = panelInfo.currentPod.contextName;

        if (!PodLogsViewerPanel.preferencesManager && PodLogsViewerPanel.extensionContext) {
            PodLogsViewerPanel.preferencesManager = new PreferencesManager(PodLogsViewerPanel.extensionContext);
        }

        if (!PodLogsViewerPanel.preferencesManager) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Cannot initialize PreferencesManager - no extension context`);
            return;
        }

        try {
            const preferences = PodLogsViewerPanel.preferencesManager.getPreferences(clusterCtx);
            
            let newLimit: number | 'all';
            
            // Handle 'custom' case - prompt for numeric input
            if (limit === 'custom') {
                const input = await vscode.window.showInputBox({
                    prompt: 'Enter number of lines',
                    placeHolder: 'e.g., 2500',
                    validateInput: (value) => {
                        const num = parseInt(value, 10);
                        if (isNaN(num) || num < 1) {
                            return 'Please enter a valid positive number';
                        }
                        return null;
                    }
                });
                
                // User cancelled input box
                if (input === undefined) {
                    console.log(`[PodLogsViewerPanel ${timestamp}] Custom line limit input cancelled`);
                    return;
                }
                
                newLimit = parseInt(input, 10);
            } else {
                // limit is already number | 'all'
                newLimit = limit;
            }
            
            const updatedPreferences = { ...preferences, lineLimit: newLimit };

            await PodLogsViewerPanel.preferencesManager.savePreferences(clusterCtx, updatedPreferences);

            panelInfo.logsProvider.stopStream();
            PodLogsViewerPanel.cleanupBatching(viewerInstanceId);

            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'logData',
                data: []
            });

            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'preferencesUpdated',
                preferences: updatedPreferences
            });

            await PodLogsViewerPanel.startStreaming(viewerInstanceId);
            
            console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Line limit set to: ${newLimit}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Failed to set line limit: ${errorMessage}`);
            vscode.window.showErrorMessage(`Failed to set line limit: ${errorMessage}`);
        }
    }

    /**
     * Handle container switch request from webview.
     * Stops current stream(s), updates container, clears logs, and starts new stream(s).
     *
     * @param viewerInstanceId - Stable id for this viewer instance
     * @param container - The container name to switch to (or 'all' for all containers)
     */
    private static async handleSwitchContainer(viewerInstanceId: string, container: string | 'all'): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] handleSwitchContainer: container=${container}`);

        const panelInfo = PodLogsViewerPanel.openPanels.get(viewerInstanceId);
        if (!panelInfo) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ No panel found for viewer: ${viewerInstanceId}`);
            return;
        }

        const clusterCtx = panelInfo.currentPod.contextName;

        const oldCompositeKey = panelInfo.compositeKey;
        const newCompositeKey = makePodLogsViewerKey(
            panelInfo.currentPod.contextName,
            panelInfo.currentPod.namespace,
            panelInfo.currentPod.name,
            container
        );

        try {
            if (panelInfo.currentPod.container === 'all') {
                const containerProviders =
                    PodLogsViewerPanel.allContainersLogsProviders.get(viewerInstanceId);
                if (containerProviders) {
                    for (const [, provider] of containerProviders) {
                        provider.stopStream();
                        provider.dispose();
                    }
                    PodLogsViewerPanel.allContainersLogsProviders.delete(viewerInstanceId);
                }
                PodLogsViewerPanel.activeContainerStreams.delete(viewerInstanceId);
            } else {
                panelInfo.logsProvider.stopStream();
            }
            PodLogsViewerPanel.cleanupBatching(viewerInstanceId);

            panelInfo.currentPod.container = container;

            if (oldCompositeKey !== newCompositeKey) {
                PodLogsViewerPanel.compositeKeyToViewerInstanceId.delete(oldCompositeKey);
                const existingId = PodLogsViewerPanel.compositeKeyToViewerInstanceId.get(newCompositeKey);
                if (existingId && existingId !== viewerInstanceId) {
                    console.warn(
                        `[PodLogsViewerPanel ${timestamp}] Composite key collision when switching container; keeping this panel instance.`
                    );
                }
                PodLogsViewerPanel.compositeKeyToViewerInstanceId.set(newCompositeKey, viewerInstanceId);
                panelInfo.compositeKey = newCompositeKey;
            }

            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'logData',
                data: []
            });

            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'initialState',
                data: {
                    pod: panelInfo.currentPod,
                    preferences: PodLogsViewerPanel.preferencesManager
                        ? PodLogsViewerPanel.preferencesManager.getPreferences(clusterCtx)
                        : { followMode: true, showTimestamps: false, lineLimit: 1000, showPrevious: false },
                    containers: await panelInfo.logsProvider.getPodContainers(
                        panelInfo.currentPod.namespace,
                        panelInfo.currentPod.name
                    )
                }
            });

            await PodLogsViewerPanel.startStreaming(viewerInstanceId);

            console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Container switched to: ${container}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Failed to switch container: ${errorMessage}`);
            vscode.window.showErrorMessage(`Failed to switch container: ${errorMessage}`);
        }
    }

    /**
     * Handle copy logs request from webview.
     * Copies formatted log lines to clipboard and shows notification.
     * 
     * @param lines - Array of log lines to copy
     */
    private static async handleCopy(lines: string[]): Promise<void> {
        const timestamp = new Date().toISOString();
        
        try {
            if (lines.length === 0) {
                vscode.window.showInformationMessage('No logs to copy');
                return;
            }

            // Join lines with newline to preserve line breaks
            const text = lines.join('\n');
            
            // Write to clipboard
            await vscode.env.clipboard.writeText(text);
            
            // Show notification with line count
            vscode.window.showInformationMessage(
                `${lines.length} lines copied to clipboard`
            );
            
            console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Copied ${lines.length} lines to clipboard`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Failed to copy logs: ${errorMessage}`);
            vscode.window.showErrorMessage(`Failed to copy logs: ${errorMessage}`);
        }
    }

    /**
     * Handle export logs request from webview.
     * Shows save dialog and writes logs to selected file.
     *
     * @param lines - Array of log lines to export
     * @param podName - Name of the pod
     * @param containerName - Name of the container
     * @param includeTimestamps - Whether timestamps should be included
     */
    private static async handleExport(
        lines: string[],
        podName: string,
        containerName: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _includeTimestamps: boolean
    ): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] handleExport called for pod: ${podName}, container: ${containerName}`);
        
        try {
            // Generate default filename: {podName}-{containerName}-{timestamp}.log
            const fileTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const defaultFilename = `${podName}-${containerName}-${fileTimestamp}.log`;
            
            // Show save dialog
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(defaultFilename),
                filters: { 'Log Files': ['log', 'txt'] }
            });
            
            if (uri) {
                // Join log lines with newlines
                const content = lines.join('\n');
                
                // Write file
                await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
                
                // Show success notification
                vscode.window.showInformationMessage(`Logs exported to ${uri.fsPath}`);
                
                console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Exported ${lines.length} lines to ${uri.fsPath}`);
            } else {
                console.log(`[PodLogsViewerPanel ${timestamp}] Export cancelled by user`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Failed to export logs: ${errorMessage}`);
            vscode.window.showErrorMessage(`Export failed: ${errorMessage}`);
        }
    }

    /**
     * Send initial state to webview when ready.
     *
     * @param viewerInstanceId - Stable id for this viewer instance
     */
    private static async sendInitialState(viewerInstanceId: string): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] sendInitialState called for viewer: ${viewerInstanceId}`);

        const panelInfo = PodLogsViewerPanel.openPanels.get(viewerInstanceId);
        if (!panelInfo) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ No panel found for viewer: ${viewerInstanceId}`);
            return;
        }

        const clusterCtx = panelInfo.currentPod.contextName;

        if (!PodLogsViewerPanel.preferencesManager && PodLogsViewerPanel.extensionContext) {
            PodLogsViewerPanel.preferencesManager = new PreferencesManager(PodLogsViewerPanel.extensionContext);
        }

        if (!PodLogsViewerPanel.preferencesManager) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Cannot initialize PreferencesManager - no extension context`);
            return;
        }

        try {
            const preferences = PodLogsViewerPanel.preferencesManager.getPreferences(clusterCtx);
            
            // Get containers for the pod
            const containers = await panelInfo.logsProvider.getPodContainers(
                panelInfo.currentPod.namespace,
                panelInfo.currentPod.name
            );

            // Detect if container has crashed
            let hasCrashed = false;
            if (panelInfo.currentPod.container === 'all') {
                // For 'all' containers, check if any container has crashed
                for (const container of containers) {
                    const crashed = await panelInfo.logsProvider.hasContainerCrashed(
                        panelInfo.currentPod.namespace,
                        panelInfo.currentPod.name,
                        container
                    );
                    if (crashed) {
                        hasCrashed = true;
                        break;
                    }
                }
            } else {
                // For single container, check crash status
                hasCrashed = await panelInfo.logsProvider.hasContainerCrashed(
                    panelInfo.currentPod.namespace,
                    panelInfo.currentPod.name,
                    panelInfo.currentPod.container
                );
            }

            // Create pod info with crash status
            const podInfo: PodInfo = {
                ...panelInfo.currentPod,
                hasCrashed
            };

            // Create initial state
            const initialState: InitialState = {
                pod: podInfo,
                preferences: preferences,
                containers: containers
            };

            // Send initial state message
            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'initialState',
                data: initialState
            });

            console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Sent initialState for pod: ${panelInfo.currentPod.name}, hasCrashed: ${hasCrashed}`);
            
            try {
                await PodLogsViewerPanel.startStreaming(viewerInstanceId);
                console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Streaming started successfully after initialState`);
            } catch (streamError) {
                const streamErrorMessage = streamError instanceof Error ? streamError.message : 'Unknown error';
                console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Failed to start streaming after initialState: ${streamErrorMessage}`);
                PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                    type: 'error',
                    error: `Failed to start log stream: ${streamErrorMessage}`,
                    errorType: undefined
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Failed to send initialState: ${errorMessage}`);
        }
    }

    /**
     * Send message to webview.
     * 
     * @param panel - The webview panel
     * @param message - The message to send
     */
    private static sendMessage(
        panel: vscode.WebviewPanel,
        message: ExtensionToWebviewMessage
    ): void {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] ➡️ Sending message: ${message.type}`);
        panel.webview.postMessage(message);
    }

    /**
     * Start streaming logs from Kubernetes API for a panel.
     * Gets preferences, calls LogsProvider.streamLogs(), and sets up batching.
     * For "all" containers mode, starts multiple streams (one per container) with prefixed log lines.
     *
     * @param viewerInstanceId - Stable id for this viewer instance
     */
    private static async startStreaming(viewerInstanceId: string): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] startStreaming called for viewer: ${viewerInstanceId}`);

        const panelInfo = PodLogsViewerPanel.openPanels.get(viewerInstanceId);
        if (!panelInfo) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ No panel found for viewer: ${viewerInstanceId}`);
            return;
        }

        const clusterCtx = panelInfo.currentPod.contextName;

        if (!PodLogsViewerPanel.preferencesManager && PodLogsViewerPanel.extensionContext) {
            PodLogsViewerPanel.preferencesManager = new PreferencesManager(PodLogsViewerPanel.extensionContext);
        }

        if (!PodLogsViewerPanel.preferencesManager) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Cannot initialize PreferencesManager - no extension context`);
            return;
        }

        try {
            const preferences = PodLogsViewerPanel.preferencesManager.getPreferences(clusterCtx);

            PodLogsViewerPanel.pendingLogLines.set(viewerInstanceId, []);

            PodLogsViewerPanel.totalLineCounts.set(viewerInstanceId, 0);

            PodLogsViewerPanel.allLimitWarningsShown.set(viewerInstanceId, false);

            const batchInterval = setInterval(() => {
                PodLogsViewerPanel.sendBatchedLines(viewerInstanceId);
            }, 100);
            PodLogsViewerPanel.batchIntervals.set(viewerInstanceId, batchInterval);

            if (panelInfo.currentPod.container === 'all') {
                const containers = await panelInfo.logsProvider.getPodContainers(
                    panelInfo.currentPod.namespace,
                    panelInfo.currentPod.name
                );

                const containerProviders = new Map<string, LogsProvider>();
                PodLogsViewerPanel.allContainersLogsProviders.set(viewerInstanceId, containerProviders);
                const activeStreams = new Set<string>();
                PodLogsViewerPanel.activeContainerStreams.set(viewerInstanceId, activeStreams);

                for (const containerName of containers) {
                    try {
                        const containerProvider = new LogsProvider(clusterCtx);
                        containerProviders.set(containerName, containerProvider);
                        activeStreams.add(containerName);

                        await containerProvider.streamLogs(
                            panelInfo.currentPod.namespace,
                            panelInfo.currentPod.name,
                            containerName,
                            {
                                follow: preferences.followMode,
                                tailLines: preferences.lineLimit === 'all' ? undefined : preferences.lineLimit,
                                timestamps: preferences.showTimestamps,
                                previous: preferences.showPrevious
                            },
                            (chunk) => PodLogsViewerPanel.handleLogData(viewerInstanceId, chunk, containerName),
                            (error) => {
                                console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Stream error for container ${containerName}:`, error.message);
                                activeStreams.delete(containerName);
                                if (activeStreams.size === 0) {
                                    PodLogsViewerPanel.handleStreamError(viewerInstanceId, error);
                                }
                            },
                            () => {
                                console.log(`[PodLogsViewerPanel ${timestamp}] Stream closed for container: ${containerName}`);
                                activeStreams.delete(containerName);
                                if (activeStreams.size === 0) {
                                    PodLogsViewerPanel.handleStreamClose(viewerInstanceId);
                                }
                            }
                        );
                        console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Stream setup completed for container: ${containerName}`);
                    } catch (error) {
                        console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Failed to start stream for container ${containerName}:`, error);
                        activeStreams.delete(containerName);
                    }
                }

                console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Started streaming for all containers (${containers.length} containers)`);
            } else {
                await panelInfo.logsProvider.streamLogs(
                    panelInfo.currentPod.namespace,
                    panelInfo.currentPod.name,
                    panelInfo.currentPod.container,
                    {
                        follow: preferences.followMode,
                        tailLines: preferences.lineLimit === 'all' ? undefined : preferences.lineLimit,
                        timestamps: preferences.showTimestamps,
                        previous: preferences.showPrevious
                    },
                    (chunk) => PodLogsViewerPanel.handleLogData(viewerInstanceId, chunk),
                    (error) => PodLogsViewerPanel.handleStreamError(viewerInstanceId, error),
                    () => PodLogsViewerPanel.handleStreamClose(viewerInstanceId)
                );

                console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Stream setup completed for container: ${panelInfo.currentPod.container}`);
            }

            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'streamStatus',
                status: 'connected'
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Failed to start streaming: ${errorMessage}`);
            PodLogsViewerPanel.handleStreamError(viewerInstanceId, error as Error);
        }
    }

    /**
     * Handle log data chunk received from Kubernetes API.
     * Splits chunk into lines and adds them to pending batch.
     * If containerName is provided (for "all" containers mode), prefixes each line with [container-name].
     *
     * @param viewerInstanceId - Stable id for this viewer instance
     * @param chunk - The log data chunk as a string
     * @param containerName - Optional container name to prefix lines with (for "all" containers mode)
     */
    private static handleLogData(viewerInstanceId: string, chunk: string, containerName?: string): void {
        let pendingLines = PodLogsViewerPanel.pendingLogLines.get(viewerInstanceId);
        if (!pendingLines) {
            pendingLines = [];
            PodLogsViewerPanel.pendingLogLines.set(viewerInstanceId, pendingLines);
        }

        const lines = chunk.split('\n').filter(line => line.length > 0);

        if (lines.length === 0) {
            return;
        }

        const prefixedLines = containerName
            ? lines.map(line => `[${containerName}] ${line}`)
            : lines;

        pendingLines.push(...prefixedLines);

        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] 📥 Received ${lines.length} log line(s) for viewer ${viewerInstanceId}, total pending: ${pendingLines.length}`);
    }

    /**
     * Send batched log lines to webview.
     * Called every 100ms by the batch interval timer.
     *
     * @param viewerInstanceId - Stable id for this viewer instance
     */
    private static sendBatchedLines(viewerInstanceId: string): void {
        const panelInfo = PodLogsViewerPanel.openPanels.get(viewerInstanceId);
        if (!panelInfo) {
            return;
        }

        const pendingLines = PodLogsViewerPanel.pendingLogLines.get(viewerInstanceId);
        if (!pendingLines || pendingLines.length === 0) {
            return;
        }

        const clusterCtx = panelInfo.currentPod.contextName;

        const currentCount = PodLogsViewerPanel.totalLineCounts.get(viewerInstanceId) || 0;
        const newCount = currentCount + pendingLines.length;
        PodLogsViewerPanel.totalLineCounts.set(viewerInstanceId, newCount);

        if (PodLogsViewerPanel.preferencesManager) {
            const preferences = PodLogsViewerPanel.preferencesManager.getPreferences(clusterCtx);
            const warningShown = PodLogsViewerPanel.allLimitWarningsShown.get(viewerInstanceId) || false;

            if (preferences.lineLimit === 'all' && newCount > 10000 && !warningShown) {
                vscode.window.showWarningMessage(
                    'Large log volume (>10,000 lines) may affect performance'
                );
                PodLogsViewerPanel.allLimitWarningsShown.set(viewerInstanceId, true);
            }
        }

        const linesToSend = [...pendingLines];
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] 📤 Sending ${linesToSend.length} batched log line(s) to webview`);

        PodLogsViewerPanel.sendMessage(panelInfo.panel, {
            type: 'logData',
            data: linesToSend
        });

        pendingLines.length = 0;
    }

    /**
     * Handle stream error from Kubernetes API.
     * Detects specific error types and handles them appropriately.
     * Triggers auto-reconnect for recoverable connection errors.
     *
     * @param viewerInstanceId - Stable id for this viewer instance
     * @param error - The error that occurred
     */
    private static handleStreamError(viewerInstanceId: string, error: Error): void {
        const timestamp = new Date().toISOString();
        console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Stream error for viewer ${viewerInstanceId}:`, error.message);

        const panelInfo = PodLogsViewerPanel.openPanels.get(viewerInstanceId);
        if (!panelInfo) {
            return;
        }

        // Detect error type
        const errorType = PodLogsViewerPanel.detectErrorType(error);
        const podInfo = panelInfo.currentPod;

        // Handle specific error types
        switch (errorType) {
            case 'podNotFound':
                // Pod was deleted - keep logs visible but disable streaming
                PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                    type: 'error',
                    error: `Pod '${podInfo.name}' no longer exists in namespace '${podInfo.namespace}'`,
                    errorType: 'podNotFound'
                });
                PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                    type: 'streamStatus',
                    status: 'disconnected'
                });
                // Don't attempt reconnection for pod deletion
                break;

            case 'permissionDenied':
                // Permission denied - show RBAC guidance
                PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                    type: 'error',
                    error: 'Access denied. Check your cluster permissions and RBAC settings.',
                    errorType: 'permissionDenied'
                });
                PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                    type: 'streamStatus',
                    status: 'error'
                });
                // Don't attempt reconnection for permission errors
                break;

            case 'connectionFailed':
                // Connection error - attempt auto-reconnect
                // Send reconnecting status
                PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                    type: 'streamStatus',
                    status: 'reconnecting'
                });
                // Trigger reconnection attempt
                PodLogsViewerPanel.attemptReconnect(viewerInstanceId, error);
                break;

            case 'maxReconnectAttempts':
                // Max reconnection attempts reached
                PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                    type: 'error',
                    error: 'Connection failed after 5 attempts. Please check your network connection.',
                    errorType: 'maxReconnectAttempts'
                });
                PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                    type: 'streamStatus',
                    status: 'error'
                });
                break;

            default:
                // Generic error
                PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                    type: 'error',
                    error: error.message || 'An error occurred while streaming logs',
                    errorType: undefined
                });
                PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                    type: 'streamStatus',
                    status: 'error'
                });
        }

        PodLogsViewerPanel.cleanupBatching(viewerInstanceId);
    }

    /**
     * Detects the type of error from an Error object.
     * Checks for Kubernetes API status codes and Node.js error codes.
     * 
     * @param error - The error to analyze
     * @returns The detected error type, or undefined for unknown errors
     */
    private static detectErrorType(error: Error): 'podNotFound' | 'permissionDenied' | 'connectionFailed' | 'maxReconnectAttempts' | undefined {
        // Check for Node.js error codes
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code === 'ECONNREFUSED' || nodeError.code === 'ETIMEDOUT') {
            return 'connectionFailed';
        }

        // Check for Kubernetes API error status codes
        const apiError = error as { response?: { statusCode?: number; body?: { message?: string } } };
        if (apiError.response?.statusCode) {
            const statusCode = apiError.response.statusCode;
            if (statusCode === 404) {
                return 'podNotFound';
            }
            if (statusCode === 403) {
                return 'permissionDenied';
            }
            // Other connection-related status codes
            if (statusCode >= 500 || statusCode === 408 || statusCode === 429) {
                return 'connectionFailed';
            }
        }

        // Check error message for specific patterns
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('max reconnection attempts') || errorMessage.includes('max reconnect')) {
            return 'maxReconnectAttempts';
        }
        if (errorMessage.includes('not found') || errorMessage.includes('404')) {
            return 'podNotFound';
        }
        if (errorMessage.includes('permission') || errorMessage.includes('forbidden') || errorMessage.includes('403')) {
            return 'permissionDenied';
        }
        if (errorMessage.includes('connection') || errorMessage.includes('network') || 
            errorMessage.includes('econnrefused') || errorMessage.includes('etimedout')) {
            return 'connectionFailed';
        }

        return undefined;
    }

    /**
     * Attempts to reconnect to the log stream after a connection error.
     * Implements exponential backoff reconnection with status updates.
     *
     * @param viewerInstanceId - Stable id for this viewer instance
     * @param _error - The error that triggered the reconnection attempt (unused, kept for API consistency)
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private static async attemptReconnect(viewerInstanceId: string, _error: Error): Promise<void> {
        const timestamp = new Date().toISOString();
        const panelInfo = PodLogsViewerPanel.openPanels.get(viewerInstanceId);
        if (!panelInfo) {
            return;
        }

        const maxReconnectAttempts = 5;
        let reconnectAttempts = 0;

        // Reconnecting status already sent by handleStreamError

        const attemptReconnectInternal = async (): Promise<void> => {
            if (reconnectAttempts >= maxReconnectAttempts) {
                // Max attempts reached
                PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                    type: 'error',
                    error: 'Connection failed after 5 attempts. Please check your network connection.',
                    errorType: 'maxReconnectAttempts'
                });
                PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                    type: 'streamStatus',
                    status: 'error'
                });
                return;
            }

            reconnectAttempts++;
            console.log(`[PodLogsViewerPanel ${timestamp}] Attempting reconnection (${reconnectAttempts}/${maxReconnectAttempts})...`);

            // Calculate exponential backoff delay: 1s, 2s, 4s, 8s, 16s, max 30s
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
            await new Promise(resolve => setTimeout(resolve, delay));

            try {
                await PodLogsViewerPanel.startStreaming(viewerInstanceId);

                PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                    type: 'streamStatus',
                    status: 'connected'
                });

                vscode.window.showInformationMessage('Reconnected successfully');
                console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Reconnected successfully`);
            } catch (reconnectError) {
                console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Reconnection attempt ${reconnectAttempts} failed:`, reconnectError);
                const reconnectErrorObj = reconnectError as Error;
                const errorType = PodLogsViewerPanel.detectErrorType(reconnectErrorObj);

                if (errorType === 'connectionFailed') {
                    await attemptReconnectInternal();
                } else {
                    PodLogsViewerPanel.handleStreamError(viewerInstanceId, reconnectErrorObj);
                }
            }
        };

        await attemptReconnectInternal();
    }

    /**
     * Handle stream close from Kubernetes API.
     * Sends disconnected status to webview and cleans up batching.
     *
     * @param viewerInstanceId - Stable id for this viewer instance
     */
    private static handleStreamClose(viewerInstanceId: string): void {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] Stream closed for viewer: ${viewerInstanceId}`);

        const pendingLines = PodLogsViewerPanel.pendingLogLines.get(viewerInstanceId);
        if (pendingLines && pendingLines.length > 0) {
            console.log(`[PodLogsViewerPanel ${timestamp}] Flushing ${pendingLines.length} pending log lines before close`);
            const panelInfo = PodLogsViewerPanel.openPanels.get(viewerInstanceId);
            if (panelInfo) {
                PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                    type: 'logData',
                    data: [...pendingLines]
                });
                pendingLines.length = 0;
            }
        }

        const panelInfo = PodLogsViewerPanel.openPanels.get(viewerInstanceId);
        if (panelInfo) {
            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'streamStatus',
                status: 'disconnected'
            });
        }

        PodLogsViewerPanel.cleanupBatching(viewerInstanceId);
    }

    /**
     * Clean up batching infrastructure for a viewer instance.
     * Clears interval timer and pending lines.
     *
     * @param viewerInstanceId - Stable id for this viewer instance
     */
    private static cleanupBatching(viewerInstanceId: string): void {
        const interval = PodLogsViewerPanel.batchIntervals.get(viewerInstanceId);
        if (interval) {
            clearInterval(interval);
            PodLogsViewerPanel.batchIntervals.delete(viewerInstanceId);
        }

        PodLogsViewerPanel.pendingLogLines.delete(viewerInstanceId);

        PodLogsViewerPanel.totalLineCounts.delete(viewerInstanceId);

        PodLogsViewerPanel.allLimitWarningsShown.delete(viewerInstanceId);
    }

    /**
     * Generate the HTML content for the Pod Logs Viewer webview.
     * Includes Content Security Policy, React bundle loading, and proper structure.
     * 
     * @param webview - The VS Code webview instance
     * @param extensionUri - The URI of the extension
     * @returns HTML content string
     */
    private static getWebviewContent(
        webview: vscode.Webview,
        extensionUri: vscode.Uri
    ): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'media', 'pod-logs', 'main.js')
        );
        const stylesUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'media', 'pod-logs', 'styles.css')
        );
        const headerStyleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'styles', 'webview-header.css')
        );

        const nonce = getNonce();
        const cspSource = webview.cspSource;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource};">
    <link href="${stylesUri}" rel="stylesheet">
    <link href="${headerStyleUri}" rel="stylesheet">
    <title>Pod Logs Viewer</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}

/**
 * Generate a random nonce for Content Security Policy.
 * 
 * @returns A 32-character random alphanumeric string
 */
function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

