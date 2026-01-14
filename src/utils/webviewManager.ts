import * as vscode from 'vscode';
import { DescribeWebview } from '../webview/DescribeWebview';
import { NamespaceWebview } from '../webview/NamespaceWebview';
import { PodLogsViewerPanel } from '../webview/PodLogsViewerPanel';
import { EventViewerPanel } from '../webview/EventViewerPanel';
import { HealthReportPanel } from '../webview/HealthReportPanel';
import { HelmPackageManagerPanel } from '../webview/HelmPackageManagerPanel';
import { NodeDescribeWebview } from '../webview/NodeDescribeWebview';
import { DeploymentDescribeWebview } from '../webview/DeploymentDescribeWebview';
import { FreeDashboardPanel } from '../dashboard/FreeDashboardPanel';
import { OperatedDashboardPanel } from '../dashboard/OperatedDashboardPanel';

/**
 * Closes all webview panels associated with a specific kubectl context.
 * 
 * This function identifies and closes webviews that are displaying resources
 * from the specified context. This is useful when switching contexts to
 * prevent showing stale data from the previous context.
 * 
 * @param contextName - The context name whose webviews should be closed
 */
export async function closeWebviewsForContext(contextName: string): Promise<void> {
    try {
        // Close webviews that match the context
        // Note: We check panel titles and content to identify context-specific webviews
        
        // Close Describe webview if it matches the context
        // DescribeWebview uses a static currentPanel, so we check if it exists
        // and if the resource belongs to the context being switched from
        // Since we can't easily check the context from the panel, we'll close it
        // if it exists (it will be recreated with the new context when needed)
        try {
            // Access the private static currentPanel through type assertion
            // This is a workaround since we can't access private static members directly
            const describePanel = (DescribeWebview as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel;
            if (describePanel) {
                describePanel.dispose();
            }
        } catch (e) {
            // Ignore errors when closing describe webview
        }

        // Close other webview panels that might be context-specific
        // These panels are managed statically, so we need to check each one
        const panelsToCheck = [
            { name: 'NamespaceWebview', getPanel: () => (NamespaceWebview as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'PodLogsViewerPanel', getPanel: () => (PodLogsViewerPanel as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'EventViewerPanel', getPanel: () => (EventViewerPanel as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'HealthReportPanel', getPanel: () => (HealthReportPanel as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'HelmPackageManagerPanel', getPanel: () => (HelmPackageManagerPanel as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'NodeDescribeWebview', getPanel: () => (NodeDescribeWebview as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'DeploymentDescribeWebview', getPanel: () => (DeploymentDescribeWebview as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'FreeDashboardPanel', getPanel: () => (FreeDashboardPanel as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'OperatedDashboardPanel', getPanel: () => (OperatedDashboardPanel as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel }
        ];

        for (const { name, getPanel } of panelsToCheck) {
            try {
                const panel = getPanel();
                if (panel) {
                    // Check if panel title or content indicates it's for the old context
                    // For now, we'll close all panels to be safe, as context switching
                    // should refresh all views anyway
                    const panelTitle = panel.title.toLowerCase();
                    const contextLower = contextName.toLowerCase();
                    
                    // If panel title contains the context name, close it
                    if (panelTitle.includes(contextLower)) {
                        panel.dispose();
                    }
                }
            } catch (e) {
                // Ignore errors for individual panels
                console.debug(`Failed to check/close ${name}:`, e);
            }
        }

        console.log(`Closed webviews for context: ${contextName}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to close webviews for context ${contextName}:`, errorMessage);
        // Don't throw - closing webviews is best effort
    }
}
