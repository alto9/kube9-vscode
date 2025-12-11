import * as vscode from 'vscode';
import { ClusterTreeItem } from '../ClusterTreeItem';
import { TreeItemData } from '../TreeItemTypes';
import { NamespaceCommands } from '../../kubectl/NamespaceCommands';
import { KubectlError } from '../../kubernetes/KubectlError';
import { getNamespaceForContext } from '../../utils/kubectlContext';

/**
 * Type for error handler callback.
 */
type ErrorHandler = (error: KubectlError, clusterName: string) => void;

/**
 * Namespaces category handler.
 * Provides functionality to fetch and display cluster namespaces.
 */
export class NamespacesCategory {
    /**
     * Retrieves namespace items for the Namespaces category.
     * Queries kubectl to get all namespaces and creates tree items for display.
     * 
     * @param resourceData Cluster context and cluster information
     * @param kubeconfigPath Path to the kubeconfig file
     * @param errorHandler Callback to handle kubectl errors
     * @returns Array of namespace tree items
     */
    public static async getNamespaceItems(
        resourceData: TreeItemData,
        kubeconfigPath: string,
        errorHandler: ErrorHandler
    ): Promise<ClusterTreeItem[]> {
        const contextName = resourceData.context.name;
        const clusterName = resourceData.cluster?.name || contextName;
        
        // Query namespaces using kubectl
        const result = await NamespaceCommands.getNamespaces(
            kubeconfigPath,
            contextName
        );

        // Handle errors if they occurred
        if (result.error) {
            errorHandler(result.error, clusterName);
            return [];
        }

        // If no namespaces found (empty cluster), return empty array
        if (result.namespaces.length === 0) {
            return [];
        }

        // Get the active namespace for this specific context (not necessarily the current context)
        let activeNamespace: string | null = null;
        try {
            activeNamespace = await getNamespaceForContext(contextName);
        } catch (error) {
            // If we can't get the active namespace, just continue without it
            console.warn(`Failed to get active namespace for context '${contextName}':`, error);
        }

        // Create tree items for each namespace
        const namespaceItems = result.namespaces.map(namespaceInfo => {
            const item = new ClusterTreeItem(
                namespaceInfo.name,
                'namespace',
                vscode.TreeItemCollapsibleState.None,
                resourceData
            );

            // Check if this namespace is the active namespace
            const isActive = activeNamespace === namespaceInfo.name;
            item.isActiveNamespace = isActive;

            // Set contextValue based on active state for menu conditions
            item.contextValue = isActive ? 'namespace:active' : 'namespace:inactive';

            // Set icon based on active state
            if (isActive) {
                // Active namespace gets a checkmark icon
                item.iconPath = new vscode.ThemeIcon(
                    'check',
                    new vscode.ThemeColor('testing.iconPassed')
                );
            } else {
                // Inactive namespaces use icon based on namespace status
                switch (namespaceInfo.status) {
                    case 'Active':
                        item.iconPath = new vscode.ThemeIcon(
                            'symbol-namespace',
                            new vscode.ThemeColor('testing.iconPassed')
                        );
                        break;
                    case 'Terminating':
                        item.iconPath = new vscode.ThemeIcon(
                            'symbol-namespace',
                            new vscode.ThemeColor('editorWarning.foreground')
                        );
                        break;
                    default: // Unknown
                        item.iconPath = new vscode.ThemeIcon('symbol-namespace');
                        break;
                }
            }

            // Set tooltip with detailed information
            const activeText = isActive ? ' (Active in kubectl context)' : '';
            item.tooltip = `Namespace: ${namespaceInfo.name}${activeText}\nStatus: ${namespaceInfo.status}`;

            // Make namespace clickable to open webview
            item.command = {
                command: 'kube9.openNamespace',
                title: 'Open Namespace',
                arguments: [
                    contextName,
                    clusterName,
                    namespaceInfo.name
                ]
            };
            
            return item;
        });

        return namespaceItems;
    }
}

