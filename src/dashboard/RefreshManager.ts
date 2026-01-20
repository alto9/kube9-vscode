import * as vscode from 'vscode';

/**
 * DashboardRefreshManager handles automatic periodic refresh of dashboard data.
 * 
 * This class manages a 30-second interval that triggers dashboard data refresh
 * only when the panel is visible, preventing unnecessary kubectl queries when
 * the dashboard is not in view.
 */
export class DashboardRefreshManager {
    /**
     * The active refresh interval, or null if not running.
     */
    private refreshInterval: NodeJS.Timeout | null = null;
    
    /**
     * Refresh interval in milliseconds (30 seconds).
     */
    private readonly REFRESH_INTERVAL_MS = 30000;

    /**
     * Start automatic refresh for a dashboard panel.
     * 
     * This method starts a periodic refresh that calls the provided callback
     * every 30 seconds, but only when the panel is visible. If an interval
     * is already running, it will be stopped before starting a new one to
     * prevent multiple intervals from stacking up.
     * 
     * The callback is always invoked with isInitialLoad=false since auto-refresh
     * occurs after the initial data load.
     * 
     * @param panel - The webview panel to monitor for visibility
     * @param kubeconfigPath - Path to the kubeconfig file
     * @param contextName - The kubectl context name
     * @param refreshCallback - Callback function to execute on each refresh
     */
    startAutoRefresh(
        panel: vscode.WebviewPanel,
        kubeconfigPath: string,
        contextName: string,
        refreshCallback: (panel: vscode.WebviewPanel, kubeconfigPath: string, contextName: string, isInitialLoad?: boolean) => Promise<void>
    ): void {
        // Clear any existing interval to prevent stacking
        this.stopAutoRefresh();

        // Start new interval
        this.refreshInterval = setInterval(async () => {
            // Only refresh if panel is visible to avoid unnecessary queries
            if (panel.visible) {
                // Always pass false for isInitialLoad during auto-refresh
                await refreshCallback(panel, kubeconfigPath, contextName, false);
            }
        }, this.REFRESH_INTERVAL_MS);
        // Avoid keeping the Node process alive in tests
        if (typeof this.refreshInterval.unref === 'function') {
            this.refreshInterval.unref();
        }
    }

    /**
     * Stop the automatic refresh interval.
     * 
     * This method should be called when the panel is disposed to clean up
     * resources and prevent memory leaks.
     */
    stopAutoRefresh(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

