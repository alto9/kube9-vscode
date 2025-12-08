import * as vscode from 'vscode';
import { ClusterTreeItem } from '../ClusterTreeItem';
import { TreeItemData } from '../TreeItemTypes';
import { KubectlError } from '../../kubernetes/KubectlError';
import { ArgoCDService } from '../../services/ArgoCDService';
import { SyncStatusCode, HealthStatusCode } from '../../types/argocd';

/**
 * Type for error handler callback.
 */
type ErrorHandler = (error: KubectlError, clusterName: string) => void;

/**
 * ArgoCD category handler.
 * Provides functionality to fetch and display ArgoCD Applications.
 */
export class ArgoCDCategory {
    /**
     * Retrieves ArgoCD application items for the ArgoCD category.
     * Queries ArgoCDService to check if ArgoCD is installed and get application list.
     * 
     * @param resourceData Cluster context and cluster information
     * @param kubeconfigPath Path to the kubeconfig file
     * @param errorHandler Callback to handle kubectl errors
     * @param argoCDService ArgoCDService instance for querying applications
     * @returns Array of ArgoCD application tree items
     */
    public static async getArgoCDApplicationItems(
        resourceData: TreeItemData,
        kubeconfigPath: string,
        errorHandler: ErrorHandler,
        argoCDService: ArgoCDService
    ): Promise<ClusterTreeItem[]> {
        const contextName = resourceData.context.name;
        
        try {
            // Check if ArgoCD is installed
            const installationStatus = await argoCDService.isInstalled(contextName);
            
            // If ArgoCD is not installed, return empty array
            if (!installationStatus.installed) {
                return [];
            }
            
            // Get applications
            const applications = await argoCDService.getApplications(contextName);
            
            // If no applications found, return empty array
            if (applications.length === 0) {
                return [];
            }
            
            // Create tree items for each application
            const applicationItems = applications.map(app => {
                const item = new ClusterTreeItem(
                    app.name,
                    'argocdApplication',
                    vscode.TreeItemCollapsibleState.None,
                    {
                        ...resourceData,
                        resourceName: app.name,
                        namespace: app.namespace
                    }
                );
                
                // Set context value for context menu support
                item.contextValue = 'argocd-application';
                
                // Set description to show namespace or sync status
                if (app.namespace) {
                    item.description = app.namespace;
                }
                
                // Set icon based on sync and health status
                item.iconPath = this.getStatusIcon(app.syncStatus.status, app.healthStatus.status);
                
                // Set tooltip with detailed information
                const syncStatusText = app.syncStatus.status;
                const healthStatusText = app.healthStatus.status;
                const revision = app.syncStatus.revision || 'N/A';
                const tooltipLines = [
                    `Application: ${app.name}`,
                    `Namespace: ${app.namespace || 'N/A'}`,
                    `Sync Status: ${syncStatusText}`,
                    `Health Status: ${healthStatusText}`,
                    `Revision: ${revision}`
                ];
                
                if (app.healthStatus.message) {
                    tooltipLines.push(`Health Message: ${app.healthStatus.message}`);
                }
                
                item.tooltip = tooltipLines.join('\n');
                
                return item;
            });
            
            return applicationItems;
        } catch (error) {
            // Handle errors gracefully
            // Note: ArgoCDService errors might not be KubectlError, so we handle them generically
            // For now, we'll just return empty array on error
            // In a real scenario, we might want to log this differently
            
            return [];
        }
    }
    
    /**
     * Gets the appropriate icon for an application based on sync and health status.
     * Sync status takes priority, with health status as secondary indicator.
     * 
     * @param syncStatus Sync status code
     * @param healthStatus Health status code
     * @returns ThemeIcon with appropriate icon and color
     */
    private static getStatusIcon(
        syncStatus: SyncStatusCode,
        healthStatus: HealthStatusCode
    ): vscode.ThemeIcon {
        // Primary indicator: Sync status
        switch (syncStatus) {
            case 'Synced':
                // If synced, check health status for additional context
                if (healthStatus === 'Degraded') {
                    // Synced but degraded - show warning
                    return new vscode.ThemeIcon(
                        'warning',
                        new vscode.ThemeColor('editorWarning.foreground')
                    );
                } else if (healthStatus === 'Healthy') {
                    // Synced and healthy - show green check
                    return new vscode.ThemeIcon(
                        'check',
                        new vscode.ThemeColor('testing.iconPassed')
                    );
                } else {
                    // Synced but unknown health - show check
                    return new vscode.ThemeIcon(
                        'check',
                        new vscode.ThemeColor('testing.iconPassed')
                    );
                }
                
            case 'OutOfSync':
                // Out of sync - show yellow warning
                return new vscode.ThemeIcon(
                    'warning',
                    new vscode.ThemeColor('editorWarning.foreground')
                );
                
            case 'Unknown':
            default:
                // Unknown sync status - check health for context
                if (healthStatus === 'Degraded' || healthStatus === 'Missing') {
                    return new vscode.ThemeIcon(
                        'error',
                        new vscode.ThemeColor('testing.iconFailed')
                    );
                } else {
                    return new vscode.ThemeIcon('question');
                }
        }
    }
}

