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

        // Helper function to safely dispose a panel
        const disposePanel = (panel: vscode.WebviewPanel | undefined, name: string): boolean => {
            if (panel) {
                try {
                    panel.dispose();
                    return true;
                } catch (e) {
                    console.debug(`Failed to dispose ${name} panel:`, e);
                    return false;
                }
            }
            return false;
        };

        // Close panels that store WebviewPanel directly
        const directPanels = [
            { name: 'DescribeWebview', getPanel: () => (DescribeWebview as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'NamespaceWebview', getPanel: () => (NamespaceWebview as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'TutorialWebview', getPanel: () => (TutorialWebview as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'DeploymentDescribeWebview', getPanel: () => (DeploymentDescribeWebview as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel },
            { name: 'NodeDescribeWebview', getPanel: () => (NodeDescribeWebview as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel }
        ];

        for (const { name, getPanel } of directPanels) {
            try {
                const panel = getPanel();
                if (disposePanel(panel, name)) {
                    closedCount++;
                }
            } catch (e) {
                console.debug(`Failed to access ${name}:`, e);
            }
        }

        // Close panels that store wrapper objects with .panel property
        // HelmPackageManagerPanel stores HelmPackageManagerPanel instance with .panel property
        try {
            const helmPanel = (HelmPackageManagerPanel as unknown as { currentPanel?: { panel: vscode.WebviewPanel } }).currentPanel;
            if (helmPanel && helmPanel.panel) {
                if (disposePanel(helmPanel.panel, 'HelmPackageManagerPanel')) {
                    closedCount++;
                }
            }
        } catch (e) {
            console.debug('Failed to close HelmPackageManagerPanel:', e);
        }

        // HealthReportPanel stores HealthReportPanel instance with _panel property
        try {
            const healthPanel = (HealthReportPanel as unknown as { currentPanel?: { _panel: vscode.WebviewPanel } }).currentPanel;
            if (healthPanel && healthPanel._panel) {
                if (disposePanel(healthPanel._panel, 'HealthReportPanel')) {
                    closedCount++;
                }
            }
        } catch (e) {
            console.debug('Failed to close HealthReportPanel:', e);
        }

        // ClusterManagerWebview stores ClusterManagerWebview instance with .panel property
        try {
            const clusterPanel = (ClusterManagerWebview as unknown as { currentPanel?: { panel: vscode.WebviewPanel } }).currentPanel;
            if (clusterPanel && clusterPanel.panel) {
                if (disposePanel(clusterPanel.panel, 'ClusterManagerWebview')) {
                    closedCount++;
                }
            }
        } catch (e) {
            console.debug('Failed to close ClusterManagerWebview:', e);
        }

        // Close panels stored in Maps
        // EventViewerPanel uses Map<string, EventViewerPanel> where each has .panel property
        try {
            const eventPanels = (EventViewerPanel as unknown as { panels?: Map<string, { panel: vscode.WebviewPanel }> }).panels;
            if (eventPanels) {
                for (const [, panelInstance] of eventPanels.entries()) {
                    if (panelInstance && panelInstance.panel) {
                        if (disposePanel(panelInstance.panel, 'EventViewerPanel')) {
                            closedCount++;
                        }
                    }
                }
            }
        } catch (e) {
            console.debug('Failed to close EventViewerPanel panels:', e);
        }

        // FreeDashboardPanel uses Map<string, PanelInfo> where PanelInfo has .panel property
        try {
            const freePanels = (FreeDashboardPanel as unknown as { openPanels?: Map<string, { panel: vscode.WebviewPanel }> }).openPanels;
            if (freePanels) {
                for (const [, panelInfo] of freePanels.entries()) {
                    if (panelInfo && panelInfo.panel) {
                        if (disposePanel(panelInfo.panel, 'FreeDashboardPanel')) {
                            closedCount++;
                        }
                    }
                }
            }
        } catch (e) {
            console.debug('Failed to close FreeDashboardPanel panels:', e);
        }

        // OperatedDashboardPanel uses Map<string, PanelInfo> where PanelInfo has .panel property
        try {
            const operatedPanels = (OperatedDashboardPanel as unknown as { openPanels?: Map<string, { panel: vscode.WebviewPanel }> }).openPanels;
            if (operatedPanels) {
                for (const [, panelInfo] of operatedPanels.entries()) {
                    if (panelInfo && panelInfo.panel) {
                        if (disposePanel(panelInfo.panel, 'OperatedDashboardPanel')) {
                            closedCount++;
                        }
                    }
                }
            }
        } catch (e) {
            console.debug('Failed to close OperatedDashboardPanel panels:', e);
        }

        // PodLogsViewerPanel uses Map<string, PanelInfo> where PanelInfo has .panel property
        try {
            const podLogsPanels = (PodLogsViewerPanel as unknown as { openPanels?: Map<string, { panel: vscode.WebviewPanel }> }).openPanels;
            if (podLogsPanels) {
                for (const [, panelInfo] of podLogsPanels.entries()) {
                    if (panelInfo && panelInfo.panel) {
                        if (disposePanel(panelInfo.panel, 'PodLogsViewerPanel')) {
                            closedCount++;
                        }
                    }
                }
            }
        } catch (e) {
            console.debug('Failed to close PodLogsViewerPanel panels:', e);
        }

        // ArgoCDApplicationWebviewProvider uses Map<string, PanelInfo> where PanelInfo has .panel property
        try {
            const argoPanels = (ArgoCDApplicationWebviewProvider as unknown as { openPanels?: Map<string, { panel: vscode.WebviewPanel }> }).openPanels;
            if (argoPanels) {
                for (const [, panelInfo] of argoPanels.entries()) {
                    if (panelInfo && panelInfo.panel) {
                        if (disposePanel(panelInfo.panel, 'ArgoCDApplicationWebviewProvider')) {
                            closedCount++;
                        }
                    }
                }
            }
        } catch (e) {
            console.debug('Failed to close ArgoCD panels:', e);
        }

        console.log(`Closed ${closedCount} webview(s) when switching from context: ${contextName}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to close webviews for context ${contextName}:`, errorMessage);
        // Don't throw - closing webviews is best effort
    }
}
