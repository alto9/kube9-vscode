import * as vscode from 'vscode';
import { LogsProvider } from '../providers/LogsProvider';
import { PreferencesManager } from '../utils/PreferencesManager';
import { WebviewToExtensionMessage, ExtensionToWebviewMessage, InitialState } from '../types/messages';

/**
 * Interface for storing pod information.
 * Represents the current pod being viewed in the panel.
 */
export interface PodInfo {
    name: string;
    namespace: string;
    container: string;
    contextName: string;
    clusterName: string;
}

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
            PodLogsViewerPanel.createPanel(
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
    private static createPanel(
        context: vscode.ExtensionContext,
        contextName: string,
        clusterName: string,
        podName: string,
        namespace: string,
        container: string,
        logsProvider: LogsProvider
    ): void {
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

        // Start streaming logs
        PodLogsViewerPanel.startStreaming(contextName);

        // Handle panel disposal
        panel.onDidDispose(
            () => {
                // Clean up batching
                PodLogsViewerPanel.cleanupBatching(contextName);
                
                const panelInfo = PodLogsViewerPanel.openPanels.get(contextName);
                if (panelInfo?.logsProvider) {
                    panelInfo.logsProvider.dispose();
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
            case 'copy':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'copy' message`);
                await PodLogsViewerPanel.handleCopy(message.lines);
                break;
            case 'export':
                console.log(`[PodLogsViewerPanel ${timestamp}] Processing 'export' message`);
                await PodLogsViewerPanel.handleExport(contextName, message.lines, message.podName, message.containerName, message.includeTimestamps);
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
            PodLogsViewerPanel.startStreaming(contextName);
            
            console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Follow mode ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Failed to toggle follow mode: ${errorMessage}`);
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

            // Create initial state
            const initialState: InitialState = {
                pod: panelInfo.currentPod,
                preferences: preferences,
                containers: containers
            };

            // Send initial state message
            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'initialState',
                data: initialState
            });

            console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Sent initialState for pod: ${panelInfo.currentPod.name}`);
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
     * 
     * @param contextName - The cluster context name
     */
    private static startStreaming(contextName: string): void {
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

            // Set up batching interval (100ms as per spec)
            const batchInterval = setInterval(() => {
                PodLogsViewerPanel.sendBatchedLines(contextName);
            }, 100);
            PodLogsViewerPanel.batchIntervals.set(contextName, batchInterval);

            // Start streaming logs
            panelInfo.logsProvider.streamLogs(
                panelInfo.currentPod.namespace,
                panelInfo.currentPod.name,
                panelInfo.currentPod.container === 'all' ? '' : panelInfo.currentPod.container,
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

            // Send connected status
            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'streamStatus',
                status: 'connected'
            });

            console.log(`[PodLogsViewerPanel ${timestamp}] ✅ Started streaming for pod: ${panelInfo.currentPod.name}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Failed to start streaming: ${errorMessage}`);
            PodLogsViewerPanel.handleStreamError(contextName, error as Error);
        }
    }

    /**
     * Handle log data chunk received from Kubernetes API.
     * Splits chunk into lines and adds them to pending batch.
     * 
     * @param contextName - The cluster context name
     * @param chunk - The log data chunk as a string
     */
    private static handleLogData(contextName: string, chunk: string): void {
        const pendingLines = PodLogsViewerPanel.pendingLogLines.get(contextName);
        if (!pendingLines) {
            // Initialize if not exists (shouldn't happen, but be safe)
            PodLogsViewerPanel.pendingLogLines.set(contextName, []);
            return;
        }

        // Split chunk by newlines and filter empty strings
        const lines = chunk.split('\n').filter(line => line.length > 0);
        
        // Add lines to pending batch
        pendingLines.push(...lines);
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

        // Send batched lines
        PodLogsViewerPanel.sendMessage(panelInfo.panel, {
            type: 'logData',
            data: [...pendingLines] // Send copy of array
        });

        // Clear pending lines
        pendingLines.length = 0;
    }

    /**
     * Handle stream error from Kubernetes API.
     * Sends error status to webview and cleans up batching.
     * 
     * @param contextName - The cluster context name
     * @param error - The error that occurred
     */
    private static handleStreamError(contextName: string, error: Error): void {
        const timestamp = new Date().toISOString();
        console.error(`[PodLogsViewerPanel ${timestamp}] ❌ Stream error for context ${contextName}:`, error.message);

        const panelInfo = PodLogsViewerPanel.openPanels.get(contextName);
        if (panelInfo) {
            PodLogsViewerPanel.sendMessage(panelInfo.panel, {
                type: 'streamStatus',
                status: 'error'
            });
        }

        // Clean up batching
        PodLogsViewerPanel.cleanupBatching(contextName);
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
            vscode.Uri.joinPath(extensionUri, 'dist', 'media', 'pod-logs', 'main.js')
        );
        const stylesUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'dist', 'media', 'pod-logs', 'styles.css')
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

