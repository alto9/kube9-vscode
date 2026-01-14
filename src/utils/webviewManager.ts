import * as vscode from 'vscode';
import { DescribeWebview } from '../webview/DescribeWebview';
import { NamespaceWebview } from '../webview/NamespaceWebview';
import { PodLogsViewerPanel } from '../webview/PodLogsViewerPanel';
import { EventViewerPanel } from '../webview/EventViewerPanel';
import { HealthReportPanel } from '../webview/HealthReportPanel';
import { HelmPackageManagerPanel } from '../webview/HelmPackageManagerPanel';
import { NodeDescribeWebview } from '../webview/NodeDescribeWebview';
import { DeploymentDescribeWebview } from '../webview/DeploymentDescribeWebview';
import { TutorialWebview } from '../webview/TutorialWebview';
import { ClusterManagerWebview } from '../webview/ClusterManagerWebview';
import { ArgoCDApplicationWebviewProvider } from '../webview/ArgoCDApplicationWebviewProvider';
import { FreeDashboardPanel } from '../dashboard/FreeDashboardPanel';
import { OperatedDashboardPanel } from '../dashboard/OperatedDashboardPanel';

/**
 * Closes all webview panels when switching kubectl contexts.
 * 
 * This function closes ALL webview panels unconditionally when switching contexts
 * to prevent showing stale data from the previous context. All webviews are
 * context-specific and should be closed when the context changes.
 * 
 * @param contextName - The context name being switched from (for logging purposes)
 */
export async function closeWebviewsForContext(contextName: string): Promise<void> {
    try {
        // Close ALL webview panels unconditionally when switching contexts
        // All webviews display cluster-specific data and should be closed
        
        let closedCount = 0;

        // Close Describe webview
        try {
            const describePanel = (DescribeWebview as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel;
            if (describePanel) {
                describePanel.dispose();
                closedCount++;
            }
        } catch (e) {
            // Ignore errors when closing describe webview
        }

        // Close ALL ArgoCD application panels
        // ArgoCDApplicationWebviewProvider uses a Map keyed by "context:namespace:name"
        // We close all panels unconditionally when switching contexts
        try {
            const openPanels = (ArgoCDApplicationWebviewProvider as unknown as { openPanels?: Map<string, { panel: vscode.WebviewPanel; context: string }> }).openPanels;
            if (openPanels) {
                const panelsToClose: vscode.WebviewPanel[] = [];
                for (const [, panelInfo] of openPanels.entries()) {
                    // Close ALL panels - they all display cluster-specific data
                    panelsToClose.push(panelInfo.panel);
                }
                for (const panel of panelsToClose) {
                    try {
                        panel.dispose();
                        closedCount++;
                    } catch (e) {
                        console.debug('Failed to close ArgoCD panel:', e);
                    }
                }
            }
        } catch (e) {
            console.debug('Failed to close ArgoCD panels:', e);
        }

        // Close all other webview panels
        // These panels are managed statically, so we need to check each one
        const panelsToCheck = [
            { name: 'NamespaceWebview', getPanel: () => (NamespaceWebview as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'PodLogsViewerPanel', getPanel: () => (PodLogsViewerPanel as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'EventViewerPanel', getPanel: () => (EventViewerPanel as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'HealthReportPanel', getPanel: () => (HealthReportPanel as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'HelmPackageManagerPanel', getPanel: () => (HelmPackageManagerPanel as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'NodeDescribeWebview', getPanel: () => (NodeDescribeWebview as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'DeploymentDescribeWebview', getPanel: () => (DeploymentDescribeWebview as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'TutorialWebview', getPanel: () => (TutorialWebview as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'ClusterManagerWebview', getPanel: () => (ClusterManagerWebview as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'FreeDashboardPanel', getPanel: () => (FreeDashboardPanel as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'OperatedDashboardPanel', getPanel: () => (OperatedDashboardPanel as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel }
        ];
        for (const { name, getPanel } of panelsToCheck) {
            try {
                const panel = getPanel();
                if (panel) {
                    // Close ALL panels unconditionally - they all display cluster-specific data
                    panel.dispose();
                    closedCount++;
                }
            } catch (e) {
                // Ignore errors for individual panels
                console.debug(`Failed to close ${name}:`, e);
            }
        }

        console.log(`Closed ${closedCount} webview(s) when switching from context: ${contextName}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to close webviews for context ${contextName}:`, errorMessage);
        // Don't throw - closing webviews is best effort
    }
}
