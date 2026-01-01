import * as vscode from 'vscode';
import { LogsProvider } from '../providers/LogsProvider';
import { PreferencesManager } from '../utils/PreferencesManager';
import { WebviewToExtensionMessage, ExtensionToWebviewMessage, InitialState, PodInfo } from '../types/messages';

/**
 * Interface for storing panel information.
 * Each panel is associated with a specific cluster context.
 */
interface PanelInfo {
    panel: vscode.WebviewPanel;
    logsProvider: LogsProvider;
    currentPod: PodInfo;
}

/**
 * PodLogsViewerPanel manages webview panels for Pod Logs Viewer.
 * Supports multiple simultaneous panels (one per cluster).
 * Follows the FreeDashboardPanel pattern with cluster-specific registry.
 */
export class PodLogsViewerPanel {
    /**
     * Map of open webview panels keyed by contextName.
     * Allows reusing existing panels when the same cluster's logs are viewed again.
     */
    private static openPanels: Map<string, PanelInfo> = new Map();
    
    /**
     * Extension context for managing subscriptions.
     */
    private static extensionContext: vscode.ExtensionContext | undefined;

    /**
     * Preferences manager instance for accessing user preferences.
     */
    private static preferencesManager: PreferencesManager | undefined;

    /**
     * Map of pending log lines per contextName, waiting to be batched and sent.
     */
    private static pendingLogLines: Map<string, string[]> = new Map();

    /**
     * Map of batch interval timers per contextName for scheduled log sends.
     */
    private static batchIntervals: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Map of total line counts per contextName for tracking log volume.
     */
    private static totalLineCounts: Map<string, number> = new Map();

    /**
     * Map tracking whether warning has been shown for "All" option exceeding 10,000 lines per contextName.
     */
    private static allLimitWarningsShown: Map<string, boolean> = new Map();

    /**
     * Map tracking active container streams for "all" containers mode.
     * Key: contextName, Value: Set of container names with active streams.
     */
    private static activeContainerStreams: Map<string, Set<string>> = new Map();

    /**
     * Map tracking LogsProvider instances for "all" containers mode.
     * Key: contextName, Value: Map of container name to LogsProvider instance.
     */
    private static allContainersLogsProviders: Map<string, Map<string, LogsProvider>> = new Map();

    /**
     * Show a Pod Logs Viewer webview panel.
     * Creates a new panel or reveals an existing one for the given cluster.
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
        // Store the extension context for later use
        PodLogsViewerPanel.extensionContext = context;

        // Create a unique key for this panel
        const panelKey = contextName;

        // If we already have a panel for this cluster, reveal it
        const existingPanelInfo = PodLogsViewerPanel.openPanels.get(panelKey);
        if (existingPanelInfo) {
            existingPanelInfo.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create LogsProvider instance to fetch container information
        const logsProvider = new LogsProvider(contextName);

        try {
            // Fetch container list for the pod
            const containers = await logsProvider.getPodContainers(namespace, podName);

            if (containers.length === 0) {
                vscode.window.showErrorMessage(`No containers found in pod ${podName}`);
                logsProvider.dispose();
                return;
            }

            // Determine selected container
            let selectedContainer: string;
            
            if (containers.length === 1) {
                // Single container: auto-select
                selectedContainer = containers[0];
            } else {
                // Multiple containers: show QuickPick
                const quickPickItems = [...containers, 'All Containers'];
                const selection = await vscode.window.showQuickPick(quickPickItems, {
                    placeHolder: 'Select container to view logs'
                });

                if (!selection) {
                    // User cancelled
                    logsProvider.dispose();
                    return;
                }

                selectedContainer = selection === 'All Containers' ? 'all' : selection;
            }

            // Create a new panel with selected container
            await PodLogsViewerPanel.createPanel(
                context,
                contextName,
                clusterName,
                podName,
                namespace,
                selectedContainer,
                logsProvider
            );
        } catch (error) {
            // Handle errors fetching containers
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to fetch containers for pod ${podName}: ${errorMessage}`);
            logsProvider.dispose();
        }
    }

    /**
     * Create a new webview panel for pod logs.
     * 
     * @param context - The VS Code extension context
     * @param contextName - The kubectl context name
     * @param clusterName - The display name of the cluster
     * @param podName - The name of the pod
     * @param namespace - The namespace of the pod
     * @param container - The container name (or 'all' for all containers)
     * @param logsProvider - The LogsProvider instance for this panel
     */
    private static async createPanel(
        context: vscode.ExtensionContext,
        contextName: string,
        clusterName: string,
        podName: string,
        namespace: string,
        container: string,
        logsProvider: LogsProvider
    ): Promise<void> {
        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9PodLogs',
            `Logs: ${clusterName}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Create pod info
        const podInfo: PodInfo = {
            name: podName,
            namespace,
            container,
            contextName,
            clusterName
        };

        // Store the panel, logs provider, and pod info in our map
        PodLogsViewerPanel.openPanels.set(contextName, {
            panel,
            logsProvider,
            currentPod: podInfo
        });

        // Set webview HTML content
        panel.webview.html = PodLogsViewerPanel.getWebviewContent(
            panel.webview,
            context.extensionUri
        );

        // Set up message handling
        PodLogsViewerPanel.setupMessageHandling(panel, contextName, context);

        // NOTE: Do NOT start streaming here - wait for webview 'ready' message
        // to avoid race conditions. Streaming will be started via sendInitialState()
        // when the webview is ready to receive messages.

        // Handle panel disposal
        panel.onDidDispose(
            () => {
                // Clean up batching
                PodLogsViewerPanel.cleanupBatching(contextName);
                
                const panelInfo = PodLogsViewerPanel.openPanels.get(contextName);
                if (panelInfo) {
                    // Clean up single container stream
                    if (panelInfo.logsProvider) {
                        panelInfo.logsProvider.dispose();
                    }
                    
                    // Clean up "all" containers streams if active
                    const containerProviders = PodLogsViewerPanel.allContainersLogsProviders.get(contextName);
                    if (containerProviders) {
                        for (const [, provider] of containerProviders) {
                            provider.stopStream();
                            provider.dispose();
                        }
                        PodLogsViewerPanel.allContainersLogsProviders.delete(contextName);
                    }
                    PodLogsViewerPanel.activeContainerStreams.delete(contextName);
                }
                PodLogsViewerPanel.openPanels.delete(contextName);
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Set up bidirectional message handling between extension and webview.
     * 
     * @param panel - The webview panel
     * @param contextName - The cluster context name
     * @param context - The VS Code extension context
     */
    private static setupMessageHandling(
        panel: vscode.WebviewPanel,
        contextName: string,
        context: vscode.ExtensionContext
    ): void {
        panel.webview.onDidReceiveMessage(
            async (message: WebviewToExtensionMessage) => {
                const timestamp = new Date().toISOString();
                console.log(`[PodLogsViewerPanel ${timestamp}] ⬅️ Received message: ${message.type}`);
                
                await PodLogsViewerPanel.handleMessage(contextName, message);
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Handle messages received from webview.
     * 
     * @param contextName - The cluster context name
     * @param message - The message from webview
     */
    private static async handleMessage(
        contextName: string,
        message: WebviewToExtensionMessage
    ): Promise<void> {
        const timestamp = new Date().toISOString();
        
        switch (message.type) {
            case 'ready':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'ready' message`);
                await PodLogsViewerPanel.sendInitialState(contextName);
                break;
            case 'refresh':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'refresh' message`);
                // TODO: Implement refresh in future story
                break;
            case 'toggleFollow':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'toggleFollow' message, enabled=${message.enabled}`);
                await PodLogsViewerPanel.handleToggleFollow(contextName, message.enabled);
                break;
            case 'toggleTimestamps':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'toggleTimestamps' message, enabled=${message.enabled}`);
                await PodLogsViewerPanel.handleToggleTimestamps(contextName, message.enabled);
                break;
            case 'copy':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'copy' message`);
                await PodLogsViewerPanel.handleCopy(message.lines);
                break;
            case 'export':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'export' message`);
                await PodLogsViewerPanel.handleExport(contextName, message.lines, message.podName, message.containerName, message.includeTimestamps);
                break;
            case 'setLineLimit':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'setLineLimit' message, limit=${message.limit}`);
                await PodLogsViewerPanel.handleSetLineLimit(contextName, message.limit);
                break;
            case 'setPrevious':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'setPrevious' message, enabled=${message.enabled}`);
                await PodLogsViewerPanel.handleSetPrevious(contextName, message.enabled);
                break;
            case 'switchContainer':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'switchContainer' message, container=${message.container}`);
                await PodLogsViewerPanel.handleSwitchContainer(contextName, message.container);
                break;
            default:
                console.log(`[PodLogsViewerPanel ${timestamp}] ❌ Unknown message type:`, message);
        }
    }

    /**
     * Handle follow mode toggle request from webview.
     * Updates preferences and restarts stream with new follow setting.
     * 
     * @param contextName - The cluster context name
     * @param enabled - Whether follow mode should be enabled
     */
    private static async handleToggleFollow(contextName: string, enabled: boolean): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] handleToggleFollow: enabled=${enabled}`);
        
        const panelInfo = PodLogsViewerPanel.openPanels.get(contextName);
        if (!panelInfo) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ No panel found for context: ${contextName}`);
            return;
        }

        // Ensure PreferencesManager is initialized
        if (!PodLogsViewerPanel.preferencesManager && PodLogsViewerPanel.extensionContext) {
            PodLogsViewerPanel.preferencesManager = new PreferencesManager(PodLogsViewerPanel.extensionContext);
        }

        if (!PodLogsViewerPanel.preferencesManager) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Cannot initialize PreferencesManager - no extension context`);
            return;
        }

        try {
            // Get current preferences
            const preferences = PodLogsViewerPanel.preferencesManager.getPreferences(contextName);
            
            // Update follow mode preference
            const updatedPreferences = { ...preferences, followMode: enabled };
            
            // Save preferences to persist per cluster
            await PodLogsViewerPanel.preferencesManager.savePreferences(contextName, updatedPreferences);
            
            // Stop current stream
            panelInfo.logsProvider.stopStream();
            PodLogsViewerPanel.cleanupBatching(contextName);
            
            // Restart stream with new follow setting
            await PodLogsViewerPanel.startStreaming(contextName);
            
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
     * @param contextName - The cluster context name
     * @param enabled - Whether timestamps should be enabled
     */
    private static async handleToggleTimestamps(contextName: string, enabled: boolean): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] handleToggleTimestamps: enabled=${enabled}`);
        
        const panelInfo = PodLogsViewerPanel.openPanels.get(contextName);
        if (!panelInfo) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ No panel found for context: ${contextName}`);
            return;
        }

        // Ensure PreferencesManager is initialized
        if (!PodLogsViewerPanel.preferencesManager && PodLogsViewerPanel.extensionContext) {
            PodLogsViewerPanel.preferencesManager = new PreferencesManager(PodLogsViewerPanel.extensionContext);
        }

        if (!PodLogsViewerPanel.preferencesManager) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Cannot initialize PreferencesManager - no extension context`);
            return;
        }

        try {
            // Get current preferences
            const preferences = PodLogsViewerPanel.preferencesManager.getPreferences(contextName);
            
            // Update timestamps preference
            const updatedPreferences = { ...preferences, showTimestamps: enabled };
            
            // Save preferences to persist per cluster
            await PodLogsViewerPanel.preferencesManager.savePreferences(contextName, updatedPreferences);
            
            // Stop current stream
            panelInfo.logsProvider.stopStream();
            PodLogsViewerPanel.cleanupBatching(contextName);
            
            // Restart stream with new timestamps setting
            await PodLogsViewerPanel.startStreaming(contextName);
            
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
     * @param contextName - The cluster context name
     * @param enabled - Whether to show previous container logs
     */
    private static async handleSetPrevious(contextName: string, enabled: boolean): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] handleSetPrevious: enabled=${enabled}`);
        
        const panelInfo = PodLogsViewerPanel.openPanels.get(contextName);
        if (!panelInfo) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ No panel found for context: ${contextName}`);
            return;
        }

        // Ensure PreferencesManager is initialized
        if (!PodLogsViewerPanel.preferencesManager && PodLogsViewerPanel.extensionContext) {
            PodLogsViewerPanel.preferencesManager = new PreferencesManager(PodLogsViewerPanel.extensionContext);
        }

        if (!PodLogsViewerPanel.preferencesManager) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Cannot initialize PreferencesManager - no extension context`);
            return;
        }

        try {
            // Get current preferences
            const preferences = PodLogsViewerPanel.preferencesManager.getPreferences(contextName);
            
            // Update showPrevious preference
            const updatedPreferences = { ...preferences, showPrevious: enabled };
            
            // Save preferences to persist per cluster
            await PodLogsViewerPanel.preferencesManager.savePreferences(contextName, updatedPreferences);
            
            // Stop current stream
            panelInfo.logsProvider.stopStream();
            PodLogsViewerPanel.cleanupBatching(contextName);
            
            // Clear logs in webview by sending empty logData
            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'logData',
                data: []
            });
            
            // Send updated preferences to webview
            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'preferencesUpdated',
                preferences: updatedPreferences
            });
            
            // Restart stream with new previous setting
            PodLogsViewerPanel.startStreaming(contextName);
            
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
     * @param contextName - The cluster context name
     * @param limit - The line limit value (number, 'all', or 'custom')
     */
    private static async handleSetLineLimit(
        contextName: string,
        limit: number | 'all' | 'custom'
    ): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] handleSetLineLimit: limit=${limit}`);
        
        const panelInfo = PodLogsViewerPanel.openPanels.get(contextName);
        if (!panelInfo) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ No panel found for context: ${contextName}`);
            return;
        }

        // Ensure PreferencesManager is initialized
        if (!PodLogsViewerPanel.preferencesManager && PodLogsViewerPanel.extensionContext) {
            PodLogsViewerPanel.preferencesManager = new PreferencesManager(PodLogsViewerPanel.extensionContext);
        }

        if (!PodLogsViewerPanel.preferencesManager) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Cannot initialize PreferencesManager - no extension context`);
            return;
        }

        try {
            // Get current preferences
            const preferences = PodLogsViewerPanel.preferencesManager.getPreferences(contextName);
            
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
            
            // Update line limit preference
            const updatedPreferences = { ...preferences, lineLimit: newLimit };
            
            // Save preferences to persist per cluster
            await PodLogsViewerPanel.preferencesManager.savePreferences(contextName, updatedPreferences);
            
            // Stop current stream
            panelInfo.logsProvider.stopStream();
            PodLogsViewerPanel.cleanupBatching(contextName);
            
            // Clear logs in webview by sending empty logData
            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'logData',
                data: []
            });
            
            // Send updated preferences to webview
            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'preferencesUpdated',
                preferences: updatedPreferences
            });
            
            // Restart stream with new line limit
            await PodLogsViewerPanel.startStreaming(contextName);
            
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
     * @param contextName - The cluster context name
     * @param container - The container name to switch to (or 'all' for all containers)
     */
    private static async handleSwitchContainer(contextName: string, container: string | 'all'): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] handleSwitchContainer: container=${container}`);
        
        const panelInfo = PodLogsViewerPanel.openPanels.get(contextName);
        if (!panelInfo) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ No panel found for context: ${contextName}`);
            return;
        }

        try {
            // Stop current stream(s)
            if (panelInfo.currentPod.container === 'all') {
                // Stop all container streams
                const containerProviders = PodLogsViewerPanel.allContainersLogsProviders.get(contextName);
                if (containerProviders) {
                    for (const [, provider] of containerProviders) {
                        provider.stopStream();
                        provider.dispose();
                    }
                    PodLogsViewerPanel.allContainersLogsProviders.delete(contextName);
                }
                PodLogsViewerPanel.activeContainerStreams.delete(contextName);
            } else {
                // Stop single container stream
                panelInfo.logsProvider.stopStream();
            }
            PodLogsViewerPanel.cleanupBatching(contextName);
            
            // Update currentPod.container
            panelInfo.currentPod.container = container;
            
            // Clear webview logs by sending empty logData
            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'logData',
                data: []
            });
            
            // Send updated pod info to webview
            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'initialState',
                data: {
                    pod: panelInfo.currentPod,
                    preferences: PodLogsViewerPanel.preferencesManager 
                        ? PodLogsViewerPanel.preferencesManager.getPreferences(contextName)
                        : { followMode: true, showTimestamps: false, lineLimit: 1000, showPrevious: false },
                    containers: await panelInfo.logsProvider.getPodContainers(
                        panelInfo.currentPod.namespace,
                        panelInfo.currentPod.name
                    )
                }
            });
            
            // Start new stream(s) for selected container
            await PodLogsViewerPanel.startStreaming(contextName);
            
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
     * @param contextName - The cluster context name
     * @param lines - Array of log lines to export
     * @param podName - Name of the pod
     * @param containerName - Name of the container
     * @param includeTimestamps - Whether timestamps should be included
     */
    private static async handleExport(
        contextName: string,
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
     * @param contextName - The cluster context name
     */
    private static async sendInitialState(contextName: string): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] sendInitialState called for context: ${contextName}`);
        
        const panelInfo = PodLogsViewerPanel.openPanels.get(contextName);
        if (!panelInfo) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ No panel found for context: ${contextName}`);
            return;
        }

        // Ensure PreferencesManager is initialized
        if (!PodLogsViewerPanel.preferencesManager && PodLogsViewerPanel.extensionContext) {
            PodLogsViewerPanel.preferencesManager = new PreferencesManager(PodLogsViewerPanel.extensionContext);
        }

        if (!PodLogsViewerPanel.preferencesManager) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Cannot initialize PreferencesManager - no extension context`);
            return;
        }

        try {
            // Get preferences for this cluster
            const preferences = PodLogsViewerPanel.preferencesManager.getPreferences(contextName);
            
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
            
            // Start streaming logs now that webview is ready
            try {
                await PodLogsViewerPanel.startStreaming(contextName);
                console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Streaming started successfully after initialState`);
            } catch (streamError) {
                const streamErrorMessage = streamError instanceof Error ? streamError.message : 'Unknown error';
                console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Failed to start streaming after initialState: ${streamErrorMessage}`);
                // Send error to webview
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
     * @param contextName - The cluster context name
     */
    private static async startStreaming(contextName: string): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] startStreaming called for context: ${contextName}`);

        const panelInfo = PodLogsViewerPanel.openPanels.get(contextName);
        if (!panelInfo) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ No panel found for context: ${contextName}`);
            return;
        }

        // Ensure PreferencesManager is initialized
        if (!PodLogsViewerPanel.preferencesManager && PodLogsViewerPanel.extensionContext) {
            PodLogsViewerPanel.preferencesManager = new PreferencesManager(PodLogsViewerPanel.extensionContext);
        }

        if (!PodLogsViewerPanel.preferencesManager) {
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Cannot initialize PreferencesManager - no extension context`);
            return;
        }

        try {
            // Get preferences for this cluster
            const preferences = PodLogsViewerPanel.preferencesManager.getPreferences(contextName);

            // Initialize pending lines array for this context
            PodLogsViewerPanel.pendingLogLines.set(contextName, []);
            
            // Reset line count tracking for new stream
            PodLogsViewerPanel.totalLineCounts.set(contextName, 0);
            
            // Reset warning flag for new stream
            PodLogsViewerPanel.allLimitWarningsShown.set(contextName, false);

            // Set up batching interval (100ms as per spec)
            const batchInterval = setInterval(() => {
                PodLogsViewerPanel.sendBatchedLines(contextName);
            }, 100);
            PodLogsViewerPanel.batchIntervals.set(contextName, batchInterval);

            // Handle "all" containers mode vs single container
            if (panelInfo.currentPod.container === 'all') {
                // Get all containers for this pod
                const containers = await panelInfo.logsProvider.getPodContainers(
                    panelInfo.currentPod.namespace,
                    panelInfo.currentPod.name
                );

                // Initialize tracking for this context
                const containerProviders = new Map<string, LogsProvider>();
                PodLogsViewerPanel.allContainersLogsProviders.set(contextName, containerProviders);
                const activeStreams = new Set<string>();
                PodLogsViewerPanel.activeContainerStreams.set(contextName, activeStreams);

                // Start a stream for each container
                for (const containerName of containers) {
                    try {
                        // Create a new LogsProvider for this container
                        const containerProvider = new LogsProvider(contextName);
                        containerProviders.set(containerName, containerProvider);
                        activeStreams.add(containerName);

                        // Start streaming with container-specific callback that prefixes lines
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
                            (chunk) => PodLogsViewerPanel.handleLogData(contextName, chunk, containerName),
                            (error) => {
                                console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Stream error for container ${containerName}:`, error.message);
                                activeStreams.delete(containerName);
                                if (activeStreams.size === 0) {
                                    PodLogsViewerPanel.handleStreamError(contextName, error);
                                }
                            },
                            () => {
                                console.log(`[PodLogsViewerPanel ${timestamp}] Stream closed for container: ${containerName}`);
                                activeStreams.delete(containerName);
                                if (activeStreams.size === 0) {
                                    PodLogsViewerPanel.handleStreamClose(contextName);
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
                // Single container mode - use existing logic
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
                    (chunk) => PodLogsViewerPanel.handleLogData(contextName, chunk),
                    (error) => PodLogsViewerPanel.handleStreamError(contextName, error),
                    () => PodLogsViewerPanel.handleStreamClose(contextName)
                );

                console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Stream setup completed for container: ${panelInfo.currentPod.container}`);
            }

            // Send connected status
            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'streamStatus',
                status: 'connected'
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Failed to start streaming: ${errorMessage}`);
            PodLogsViewerPanel.handleStreamError(contextName, error as Error);
        }
    }

    /**
     * Handle log data chunk received from Kubernetes API.
     * Splits chunk into lines and adds them to pending batch.
     * If containerName is provided (for "all" containers mode), prefixes each line with [container-name].
     * 
     * @param contextName - The cluster context name
     * @param chunk - The log data chunk as a string
     * @param containerName - Optional container name to prefix lines with (for "all" containers mode)
     */
    private static handleLogData(contextName: string, chunk: string, containerName?: string): void {
        let pendingLines = PodLogsViewerPanel.pendingLogLines.get(contextName);
        if (!pendingLines) {
            // Initialize if not exists (shouldn't happen, but be safe)
            pendingLines = [];
            PodLogsViewerPanel.pendingLogLines.set(contextName, pendingLines);
        }

        // Split chunk by newlines and filter empty strings
        const lines = chunk.split('\n').filter(line => line.length > 0);
        
        if (lines.length === 0) {
            // No lines to add
            return;
        }
        
        // Prefix lines with container name if provided (for "all" containers mode)
        const prefixedLines = containerName 
            ? lines.map(line => `[${containerName}] ${line}`)
            : lines;
        
        // Add lines to pending batch
        pendingLines.push(...prefixedLines);
        
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] 📥 Received ${lines.length} log line(s) for context ${contextName}, total pending: ${pendingLines.length}`);
    }

    /**
     * Send batched log lines to webview.
     * Called every 100ms by the batch interval timer.
     * 
     * @param contextName - The cluster context name
     */
    private static sendBatchedLines(contextName: string): void {
        const panelInfo = PodLogsViewerPanel.openPanels.get(contextName);
        if (!panelInfo) {
            // Panel was disposed, cleanup will handle this
            return;
        }

        const pendingLines = PodLogsViewerPanel.pendingLogLines.get(contextName);
        if (!pendingLines || pendingLines.length === 0) {
            // No lines to send
            return;
        }

        // Update total line count
        const currentCount = PodLogsViewerPanel.totalLineCounts.get(contextName) || 0;
        const newCount = currentCount + pendingLines.length;
        PodLogsViewerPanel.totalLineCounts.set(contextName, newCount);

        // Check for warning if "All" option is selected and we haven't shown warning yet
        if (PodLogsViewerPanel.preferencesManager) {
            const preferences = PodLogsViewerPanel.preferencesManager.getPreferences(contextName);
            const warningShown = PodLogsViewerPanel.allLimitWarningsShown.get(contextName) || false;
            
            if (preferences.lineLimit === 'all' && newCount > 10000 && !warningShown) {
                vscode.window.showWarningMessage(
                    'Large log volume (>10,000 lines) may affect performance'
                );
                PodLogsViewerPanel.allLimitWarningsShown.set(contextName, true);
            }
        }

        // Send batched lines
        const linesToSend = [...pendingLines]; // Create copy before clearing
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] 📤 Sending ${linesToSend.length} batched log line(s) to webview`);
        
        PodLogsViewerPanel.sendMessage(panelInfo.panel, {
            type: 'logData',
            data: linesToSend
        });

        // Clear pending lines
        pendingLines.length = 0;
    }

    /**
     * Handle stream error from Kubernetes API.
     * Detects specific error types and handles them appropriately.
     * Triggers auto-reconnect for recoverable connection errors.
     * 
     * @param contextName - The cluster context name
     * @param error - The error that occurred
     */
    private static handleStreamError(contextName: string, error: Error): void {
        const timestamp = new Date().toISOString();
        console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Stream error for context ${contextName}:`, error.message);

        const panelInfo = PodLogsViewerPanel.openPanels.get(contextName);
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
                PodLogsViewerPanel.attemptReconnect(contextName, error);
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

        // Clean up batching
        PodLogsViewerPanel.cleanupBatching(contextName);
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
     * @param contextName - The cluster context name
     * @param _error - The error that triggered the reconnection attempt (unused, kept for API consistency)
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private static async attemptReconnect(contextName: string, _error: Error): Promise<void> {
        const timestamp = new Date().toISOString();
        const panelInfo = PodLogsViewerPanel.openPanels.get(contextName);
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
                // Restart streaming (this will attempt to reconnect)
                await PodLogsViewerPanel.startStreaming(contextName);
                
                // Success - send connected status
                PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                    type: 'streamStatus',
                    status: 'connected'
                });
                
                // Show success notification
                vscode.window.showInformationMessage('Reconnected successfully');
                console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Reconnected successfully`);
            } catch (reconnectError) {
                console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Reconnection attempt ${reconnectAttempts} failed:`, reconnectError);
                // Check if this is still a recoverable error
                const reconnectErrorObj = reconnectError as Error;
                const errorType = PodLogsViewerPanel.detectErrorType(reconnectErrorObj);
                
                if (errorType === 'connectionFailed') {
                    // Still a connection error, try again
                    await attemptReconnectInternal();
                } else {
                    // Changed to non-recoverable error, handle it
                    PodLogsViewerPanel.handleStreamError(contextName, reconnectErrorObj);
                }
            }
        };

        await attemptReconnectInternal();
    }

    /**
     * Handle stream close from Kubernetes API.
     * Sends disconnected status to webview and cleans up batching.
     * 
     * @param contextName - The cluster context name
     */
    private static handleStreamClose(contextName: string): void {
        const timestamp = new Date().toISOString();
        console.log(`[PodLogsViewerPanel ${timestamp}] Stream closed for context: ${contextName}`);

        const panelInfo = PodLogsViewerPanel.openPanels.get(contextName);
        if (panelInfo) {
            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'streamStatus',
                status: 'disconnected'
            });
        }

        // Clean up batching
        PodLogsViewerPanel.cleanupBatching(contextName);
    }

    /**
     * Clean up batching infrastructure for a context.
     * Clears interval timer and pending lines.
     * 
     * @param contextName - The cluster context name
     */
    private static cleanupBatching(contextName: string): void {
        // Clear batch interval
        const interval = PodLogsViewerPanel.batchIntervals.get(contextName);
        if (interval) {
            clearInterval(interval);
            PodLogsViewerPanel.batchIntervals.delete(contextName);
        }

        // Clear pending lines
        PodLogsViewerPanel.pendingLogLines.delete(contextName);
        
        // Clear line count tracking
        PodLogsViewerPanel.totalLineCounts.delete(contextName);
        
        // Clear warning flag
        PodLogsViewerPanel.allLimitWarningsShown.delete(contextName);
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
        const nonce = getNonce();
        const cspSource = webview.cspSource;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource};">
    <link href="${stylesUri}" rel="stylesheet">
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

