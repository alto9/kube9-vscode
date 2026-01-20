import * as vscode from 'vscode';
import { getDashboardHtml } from './dashboardHtml';
import { DashboardDataProvider } from './DashboardDataProvider';
import { DashboardRefreshManager } from './RefreshManager';

/**
 * Interface for storing panel information.
 * Each panel is associated with a specific cluster context.
 */
interface PanelInfo {
    panel: vscode.WebviewPanel;
    kubeconfigPath: string;
    contextName: string;
    clusterName: string;
    refreshManager: DashboardRefreshManager;
}

/**
 * FreeDashboardPanel manages webview panels for Free (Non-Operated) Dashboards.
 * Supports multiple simultaneous panels (one per cluster).
 */
export class FreeDashboardPanel {
    /**
     * Map of open webview panels keyed by contextName.
     * Allows reusing existing panels when the same dashboard is opened again.
     */
    private static openPanels: Map<string, PanelInfo> = new Map();
    
    /**
     * Extension context for managing subscriptions.
     */
    private static extensionContext: vscode.ExtensionContext | undefined;

    /**
     * Show a Free Dashboard webview panel.
     * Creates a new panel or reveals an existing one for the given cluster.
     * 
     * @param context - The VS Code extension context
     * @param kubeconfigPath - Path to the kubeconfig file
     * @param contextName - The kubectl context name
     * @param clusterName - The display name of the cluster
     */
    public static async show(
        context: vscode.ExtensionContext,
        kubeconfigPath: string,
        contextName: string,
        clusterName: string
    ): Promise<void> {
        // Store the extension context for later use
        FreeDashboardPanel.extensionContext = context;

        // Create a unique key for this dashboard panel
        const panelKey = contextName;

        // If we already have a panel for this cluster, reveal it
        const existingPanelInfo = FreeDashboardPanel.openPanels.get(panelKey);
        if (existingPanelInfo) {
            existingPanelInfo.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9FreeDashboard',
            `Dashboard: ${clusterName}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'src', 'dashboard')
                ]
            }
        );

        // Create refresh manager for this panel
        const refreshManager = new DashboardRefreshManager();

        // Store the panel and its context in our map
        FreeDashboardPanel.openPanels.set(panelKey, {
            panel,
            kubeconfigPath,
            contextName,
            clusterName,
            refreshManager
        });

        // Handle messages from the webview (register BEFORE setting HTML to prevent race condition)
        const messageHandlerDisposable = panel.webview.onDidReceiveMessage(
            async (message) => {
                await FreeDashboardPanel.handleWebviewMessage(
                    message,
                    panel,
                    kubeconfigPath,
                    contextName
                );
            }
        );
        context.subscriptions.push(messageHandlerDisposable);

        // Set the webview's HTML content
        panel.webview.html = getDashboardHtml(panel.webview, clusterName);

        // Proactively send initial data (fire-and-forget to avoid blocking panel creation)
        // postMessage is queued by the browser until webview is ready
        FreeDashboardPanel.sendDashboardData(
            panel,
            kubeconfigPath,
            contextName,
            true  // isInitialLoad = true
        ).catch(error => {
            console.error('Failed to send initial dashboard data:', error);
        });

        // Start auto-refresh
        refreshManager.startAutoRefresh(
            panel,
            kubeconfigPath,
            contextName,
            FreeDashboardPanel.sendDashboardData.bind(FreeDashboardPanel)
        );

        // Handle panel disposal
        panel.onDidDispose(
            () => {
                const panelInfo = FreeDashboardPanel.openPanels.get(panelKey);
                if (panelInfo) {
                    panelInfo.refreshManager.stopAutoRefresh();
                }
                FreeDashboardPanel.openPanels.delete(panelKey);
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Handle messages received from the webview.
     * 
     * @param message - The message from the webview
     * @param panel - The webview panel
     * @param kubeconfigPath - Path to the kubeconfig file
     * @param contextName - The kubectl context name
     */
    private static async handleWebviewMessage(
        message: { type: string; [key: string]: unknown },
        panel: vscode.WebviewPanel,
        kubeconfigPath: string,
        contextName: string
    ): Promise<void> {
        switch (message.type) {
            case 'requestData':
                // Fallback handler in case proactive send fails
                await FreeDashboardPanel.sendDashboardData(
                    panel,
                    kubeconfigPath,
                    contextName,
                    true  // Initial load
                );
                break;

            case 'refresh':
                await FreeDashboardPanel.sendDashboardData(
                    panel,
                    kubeconfigPath,
                    contextName,
                    false  // Not initial load - show subtle indicator
                );
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    }

    /**
     * Send dashboard data to the webview.
     * Fetches real cluster data via kubectl queries using DashboardDataProvider.
     * 
     * @param panel - The webview panel
     * @param kubeconfigPath - Path to the kubeconfig file
     * @param contextName - The kubectl context name
     * @param isInitialLoad - Whether this is the initial load (default: false)
     */
    private static async sendDashboardData(
        panel: vscode.WebviewPanel,
        kubeconfigPath: string,
        contextName: string,
        isInitialLoad: boolean = false
    ): Promise<void> {
        try {
            // Send loading or refreshing state based on load type
            panel.webview.postMessage({ 
                type: isInitialLoad ? 'loading' : 'refreshing' 
            });

            // Fetch all dashboard data in parallel for performance
            const [namespaceCount, workloads, nodes] = await Promise.allSettled([
                DashboardDataProvider.getNamespaceCount(kubeconfigPath, contextName),
                DashboardDataProvider.getWorkloadCounts(kubeconfigPath, contextName),
                DashboardDataProvider.getNodeInfo(kubeconfigPath, contextName)
            ]);

            // Extract values from settled promises, using defaults on failure
            const dashboardData = {
                namespaceCount: namespaceCount.status === 'fulfilled' ? namespaceCount.value : 0,
                workloads: workloads.status === 'fulfilled' ? workloads.value : {
                    deployments: 0,
                    statefulsets: 0,
                    daemonsets: 0,
                    replicasets: 0,
                    jobs: 0,
                    cronjobs: 0,
                    pods: 0
                },
                nodes: nodes.status === 'fulfilled' ? nodes.value : {
                    totalNodes: 0,
                    readyNodes: 0,
                    cpuCapacity: 'N/A',
                    memoryCapacity: 'N/A'
                },
                lastUpdated: new Date().toISOString()
            };

            // Send data to webview
            panel.webview.postMessage({
                type: 'updateData',
                data: dashboardData
            });
        } catch (error) {
            // Send error to webview
            const errorMessage = error instanceof Error ? error.message : String(error);
            panel.webview.postMessage({
                type: 'error',
                error: `Failed to load dashboard data: ${errorMessage}`
            });
        }
    }

    /**
     * Get all open dashboard panels.
     * Used for testing purposes.
     * 
     * @returns Map of open panels
     */
    public static getOpenPanels(): Map<string, PanelInfo> {
        return FreeDashboardPanel.openPanels;
    }

    /**
     * Close all open dashboard panels.
     * Used for cleanup during testing or extension deactivation.
     */
    public static closeAllPanels(): void {
        for (const panelInfo of FreeDashboardPanel.openPanels.values()) {
            // Ensure refresh interval is cleared even if dispose events don't fire
            panelInfo.refreshManager.stopAutoRefresh();
            panelInfo.panel.dispose();
        }
        FreeDashboardPanel.openPanels.clear();
    }
}

