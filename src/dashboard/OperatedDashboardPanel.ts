import * as vscode from 'vscode';
import { getOperatedDashboardHtml } from './operatedDashboardHtml';
import { OperatorDashboardStatus } from './types';
import { getAIRecommendations } from './AIRecommendationsQuery';
import { DashboardDataProvider } from './DashboardDataProvider';
import { DashboardRefreshManager } from './RefreshManager';
import { getOperatorDashboardStatus } from './OperatorStatusQuery';
import { OperatorStatusClient } from '../services/OperatorStatusClient';
import { OperatorStatusMode } from '../kubernetes/OperatorStatusTypes';

/**
 * Interface for storing panel information.
 * Each panel is associated with a specific cluster context.
 */
interface PanelInfo {
    panel: vscode.WebviewPanel;
    kubeconfigPath: string;
    contextName: string;
    clusterName: string;
    operatorStatus: OperatorDashboardStatus;
    refreshManager: DashboardRefreshManager;
}

/**
 * OperatedDashboardPanel manages webview panels for Operated Dashboards.
 * Supports multiple simultaneous panels (one per cluster).
 * Displays operator metrics and conditional content (AI recommendations or upsell CTA).
 */
export class OperatedDashboardPanel {
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
     * Show an Operated Dashboard webview panel.
     * Creates a new panel or reveals an existing one for the given cluster.
     * 
     * @param context - The VS Code extension context
     * @param kubeconfigPath - Path to the kubeconfig file
     * @param contextName - The kubectl context name
     * @param clusterName - The display name of the cluster
     * @param operatorStatus - The operator status for this cluster
     */
    public static async show(
        context: vscode.ExtensionContext,
        kubeconfigPath: string,
        contextName: string,
        clusterName: string,
        operatorStatus: OperatorDashboardStatus
    ): Promise<void> {
        // Store the extension context for later use
        OperatedDashboardPanel.extensionContext = context;

        // Create a unique key for this dashboard panel
        const panelKey = contextName;

        // If we already have a panel for this cluster, reveal it
        const existingPanelInfo = OperatedDashboardPanel.openPanels.get(panelKey);
        if (existingPanelInfo) {
            existingPanelInfo.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9OperatedDashboard',
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
        OperatedDashboardPanel.openPanels.set(panelKey, {
            panel,
            kubeconfigPath,
            contextName,
            clusterName,
            operatorStatus,
            refreshManager
        });

        // Handle messages from the webview (register BEFORE setting HTML to prevent race condition)
        const messageHandlerDisposable = panel.webview.onDidReceiveMessage(
            async (message) => {
                await OperatedDashboardPanel.handleWebviewMessage(
                    message,
                    panel,
                    kubeconfigPath,
                    contextName
                );
            }
        );
        context.subscriptions.push(messageHandlerDisposable);

        // Set the webview's HTML content
        panel.webview.html = getOperatedDashboardHtml(panel.webview, clusterName, operatorStatus);

        // Proactively send initial data (postMessage is queued until webview is ready)
        await OperatedDashboardPanel.sendDashboardDataWithStatusCheck(
            panel,
            kubeconfigPath,
            contextName,
            true  // isInitialLoad = true
        );

        // Start auto-refresh
        refreshManager.startAutoRefresh(
            panel,
            kubeconfigPath,
            contextName,
            OperatedDashboardPanel.sendDashboardDataWithStatusCheck.bind(OperatedDashboardPanel)
        );

        // Handle panel disposal
        panel.onDidDispose(
            () => {
                const panelInfo = OperatedDashboardPanel.openPanels.get(panelKey);
                if (panelInfo) {
                    panelInfo.refreshManager.stopAutoRefresh();
                }
                OperatedDashboardPanel.openPanels.delete(panelKey);
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
                await OperatedDashboardPanel.sendDashboardData(
                    panel,
                    kubeconfigPath,
                    contextName,
                    true  // Initial load
                );
                break;

            case 'refresh':
                await OperatedDashboardPanel.sendDashboardData(
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
     * Determine which conditional content type to display based on operator status.
     * Implements the logic from the free-operated-dashboard-spec:
     * - degraded health -> degraded-warning
     * - hasApiKey && mode=enabled -> ai-recommendations
     * - otherwise -> no conditional content
     * 
     * @param operatorStatus - The operator status for this cluster
     * @returns The type of conditional content to display, or null if none
     */
    private static determineConditionalContentType(
        operatorStatus: OperatorDashboardStatus
    ): 'ai-recommendations' | 'degraded-warning' | null {
        // Check for degraded health first (highest priority)
        if (operatorStatus.health === 'degraded') {
            return 'degraded-warning';
        }
        
        // Check if API key present AND mode is enabled
        if (operatorStatus.hasApiKey && operatorStatus.mode === 'enabled') {
            return 'ai-recommendations';
        }
        
        // No conditional content to show
        return null;
    }

    /**
     * Send dashboard data with operator status re-check.
     * This method is called by the refresh manager to ensure operator status
     * is re-queried on each refresh, allowing detection of API key configuration changes.
     * 
     * @param panel - The webview panel
     * @param kubeconfigPath - Path to the kubeconfig file
     * @param contextName - The kubectl context name
     * @param isInitialLoad - Whether this is the initial load (default: false)
     */
    private static async sendDashboardDataWithStatusCheck(
        panel: vscode.WebviewPanel,
        kubeconfigPath: string,
        contextName: string,
        isInitialLoad: boolean = false
    ): Promise<void> {
        // Re-query operator status to detect changes (e.g., API key configuration)
        const freshOperatorStatus = await getOperatorDashboardStatus(contextName);
        
        // Update stored operator status in panel info
        const panelInfo = OperatedDashboardPanel.openPanels.get(contextName);
        if (panelInfo && freshOperatorStatus) {
            panelInfo.operatorStatus = freshOperatorStatus;
        }
        
        // Call existing sendDashboardData method
        await OperatedDashboardPanel.sendDashboardData(
            panel,
            kubeconfigPath,
            contextName,
            isInitialLoad
        );
    }

    /**
     * Send dashboard data to the webview.
     * Fetches operator dashboard data and AI recommendations if API key is configured.
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

            // Get panel info to check operator status
            const panelInfo = OperatedDashboardPanel.openPanels.get(contextName);
            
            // Determine which conditional content to display
            const conditionalContentType = panelInfo 
                ? OperatedDashboardPanel.determineConditionalContentType(panelInfo.operatorStatus)
                : null;
            
            // Fetch operator dashboard data
            const operatorData = await DashboardDataProvider.getOperatorDashboardData(
                kubeconfigPath,
                contextName
            );

            // Construct dashboard data with operator metrics
            let dashboardData: {
                namespaceCount: number;
                workloads: {
                    deployments: number;
                    statefulsets: number;
                    daemonsets: number;
                    replicasets: number;
                    jobs: number;
                    cronjobs: number;
                    pods: number;
                };
                nodes: {
                    totalNodes: number;
                    readyNodes: number;
                    cpuCapacity: string;
                    memoryCapacity: string;
                };
                operatorMetrics: {
                    collectorsRunning: number;
                    dataPointsCollected: number;
                    lastCollectionTime: string;
                };
                lastUpdated: string;
                hasApiKey: boolean;
                conditionalContentType: string | null;
                aiRecommendations?: Array<{id: string; type: string; severity: string; title: string; description: string}>;
            };

            // If operator data is available, use it
            if (operatorData) {
                dashboardData = {
                    namespaceCount: operatorData.namespaceCount,
                    workloads: operatorData.workloads,
                    nodes: operatorData.nodes,
                    operatorMetrics: {
                        collectorsRunning: operatorData.operatorMetrics.collectorsRunning,
                        dataPointsCollected: operatorData.operatorMetrics.dataPointsCollected,
                        lastCollectionTime: operatorData.operatorMetrics.lastCollectionTime.toISOString()
                    },
                    lastUpdated: operatorData.lastUpdated.toISOString(),
                    hasApiKey: panelInfo?.operatorStatus.hasApiKey || false,
                    conditionalContentType: conditionalContentType
                };
            } else {
                // Fallback: Operator ConfigMap doesn't exist yet, query kubectl directly
                console.log(`Operator ConfigMap not found, falling back to kubectl queries for context ${contextName}`);
                
                const [namespaceCount, workloads, nodes] = await Promise.allSettled([
                    DashboardDataProvider.getNamespaceCount(kubeconfigPath, contextName),
                    DashboardDataProvider.getWorkloadCounts(kubeconfigPath, contextName),
                    DashboardDataProvider.getNodeInfo(kubeconfigPath, contextName)
                ]);
                
                // Get collection stats from operator status
                const operatorStatusClient = new OperatorStatusClient();
                const operatorStatus = await operatorStatusClient.getStatus(kubeconfigPath, contextName, false);
                
                // Extract collection stats if operator is installed
                const collectionStats = (operatorStatus.mode !== OperatorStatusMode.Basic && operatorStatus.status?.collectionStats)
                    ? operatorStatus.status.collectionStats
                    : {
                        totalSuccessCount: 0,
                        totalFailureCount: 0,
                        collectionsStoredCount: 0,
                        lastSuccessTime: null
                    };

                dashboardData = {
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
                    operatorMetrics: {
                        collectorsRunning: 0, // Not tracked individually anymore
                        dataPointsCollected: collectionStats.totalSuccessCount,
                        lastCollectionTime: collectionStats.lastSuccessTime || new Date().toISOString()
                    },
                    lastUpdated: new Date().toISOString(),
                    hasApiKey: panelInfo?.operatorStatus.hasApiKey || false,
                    conditionalContentType: conditionalContentType
                };
            }

            // Only query AI recommendations if we're showing that panel
            if (conditionalContentType === 'ai-recommendations') {
                const aiRecommendations = await getAIRecommendations(contextName);
                if (aiRecommendations && aiRecommendations.recommendations.length > 0) {
                    dashboardData.aiRecommendations = aiRecommendations.recommendations;
                }
            }

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
        return OperatedDashboardPanel.openPanels;
    }

    /**
     * Close all open dashboard panels.
     * Used for cleanup during testing or extension deactivation.
     */
    public static closeAllPanels(): void {
        for (const panelInfo of OperatedDashboardPanel.openPanels.values()) {
            // Ensure refresh interval is cleared even if dispose events don't fire
            panelInfo.refreshManager.stopAutoRefresh();
            panelInfo.panel.dispose();
        }
        OperatedDashboardPanel.openPanels.clear();
    }
}

