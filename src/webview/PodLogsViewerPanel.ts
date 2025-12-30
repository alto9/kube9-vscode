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

        // Handle panel disposal
        panel.onDidDispose(
            () => {
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
                // TODO: Implement toggleFollow in future story
                break;
            default:
                console.log(`[PodLogsViewerPanel ${timestamp}] ❌ Unknown message type:`, message);
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

