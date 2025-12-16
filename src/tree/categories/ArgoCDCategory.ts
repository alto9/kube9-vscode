import * as vscode from 'vscode';
import { ClusterTreeItem } from '../ClusterTreeItem';
import { TreeItemData } from '../TreeItemTypes';
import { KubectlError, KubectlErrorType } from '../../kubernetes/KubectlError';
import { ArgoCDService } from '../../services/ArgoCDService';
import { ArgoCDNotFoundError, ArgoCDPermissionError } from '../../types/argocd';
import { getApplicationIcon } from '../../utils/argoCDIcons';

/**
 * Type for error handler callback.
 */
type ErrorHandler = (error: KubectlError, clusterName: string) => void;

/**
 * OutputChannel for ArgoCD category logging.
 * Created lazily on first use.
 */
let outputChannel: vscode.OutputChannel | undefined;

/**
 * Gets or creates the OutputChannel for ArgoCD category logging.
 * 
 * @returns The OutputChannel instance
 */
function getOutputChannel(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('kube9 ArgoCD Category');
    }
    return outputChannel;
}

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
     * @param bypassCache If true, bypasses cache and queries the cluster directly
     * @returns Array of ArgoCD application tree items
     */
    public static async getArgoCDApplicationItems(
        resourceData: TreeItemData,
        kubeconfigPath: string,
        errorHandler: ErrorHandler,
        argoCDService: ArgoCDService,
        bypassCache = false
    ): Promise<ClusterTreeItem[]> {
        const contextName = resourceData.context.name;
        
        try {
            // Check if ArgoCD is installed
            const installationStatus = await argoCDService.isInstalled(contextName, bypassCache);
            
            // If ArgoCD is not installed, return empty array
            if (!installationStatus.installed) {
                return [];
            }
            
            // Get applications
            const applications = await argoCDService.getApplications(contextName, bypassCache);
            
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
                item.iconPath = getApplicationIcon(app.syncStatus.status, app.healthStatus.status);
                
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
                
                // Set command for left-click activation to open webview
                if (!item.command) {
                    item.command = {
                        command: 'kube9.argocd.viewDetails',
                        title: 'View Details',
                        arguments: [item]
                    };
                }
                
                return item;
            });
            
            return applicationItems;
        } catch (error) {
            // Handle errors gracefully with specific error type handling
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            
            // Handle ArgoCD-specific errors
            if (error instanceof ArgoCDNotFoundError) {
                getOutputChannel().appendLine(
                    `[INFO] ArgoCD applications not found for context ${contextName}: ${errorMessage}`
                );
                return [];
            }
            
            if (error instanceof ArgoCDPermissionError) {
                getOutputChannel().appendLine(
                    `[WARNING] Permission denied accessing ArgoCD applications for context ${contextName}: ${errorMessage}`
                );
                // Call error handler if provided to show user-facing message
                if (errorHandler) {
                    // Create a KubectlError for the error handler
                    const kubectlError = new KubectlError(
                        KubectlErrorType.PermissionDenied,
                        `Permission denied: Cannot access ArgoCD applications in context '${contextName}'`,
                        errorMessage,
                        contextName
                    );
                    errorHandler(kubectlError, contextName);
                }
                return [];
            }
            
            // Handle KubectlError types
            if (error instanceof KubectlError) {
                getOutputChannel().appendLine(
                    `[ERROR] kubectl error when fetching ArgoCD applications for context ${contextName}: ${error.getDetails()}`
                );
                
                // Call error handler if provided
                if (errorHandler) {
                    errorHandler(error, contextName);
                }
                
                // For network/timeout errors, return empty array gracefully
                // (ArgoCDService should have already tried cache fallback)
                if (
                    error.type === KubectlErrorType.ConnectionFailed ||
                    error.type === KubectlErrorType.Timeout
                ) {
                    getOutputChannel().appendLine(
                        `[INFO] Network/timeout error - returning empty array for context ${contextName}`
                    );
                    return [];
                }
                
                // For permission errors, return empty array
                if (error.type === KubectlErrorType.PermissionDenied) {
                    return [];
                }
                
                // For other errors, return empty array to prevent crash
                return [];
            }
            
            // Handle unknown errors
            getOutputChannel().appendLine(
                `[ERROR] Unexpected error fetching ArgoCD applications for context ${contextName}: ${errorMessage}`
            );
            if (errorStack) {
                getOutputChannel().appendLine(`[ERROR] Stack trace: ${errorStack}`);
            }
            
            // Return empty array to prevent extension crash
            return [];
        }
    }
}

