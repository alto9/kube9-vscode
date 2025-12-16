import * as vscode from 'vscode';
import * as k8s from '@kubernetes/client-node';
import { ClusterTreeItem } from '../ClusterTreeItem';
import { TreeItemData } from '../TreeItemTypes';
import { NamespaceCommands, NamespaceInfo } from '../../kubectl/NamespaceCommands';
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

    /**
     * Retrieves namespace items from pre-fetched cache data.
     * Transforms k8s.V1Namespace[] to NamespaceInfo[] format and creates tree items.
     * This method is used when cluster resources have been pre-fetched in parallel.
     * 
     * @param resourceData Cluster context and cluster information
     * @param v1Namespaces Pre-fetched V1Namespace array from the API
     * @param _kubeconfigPath Path to the kubeconfig file (unused but kept for signature compatibility)
     * @param _errorHandler Callback to handle errors (unused but kept for signature compatibility)
     * @returns Array of namespace tree items
     */
    public static async getNamespaceItemsFromCache(
        resourceData: TreeItemData,
        v1Namespaces: k8s.V1Namespace[],
        _kubeconfigPath: string, // eslint-disable-line @typescript-eslint/no-unused-vars
        _errorHandler: ErrorHandler // eslint-disable-line @typescript-eslint/no-unused-vars
    ): Promise<ClusterTreeItem[]> {
        const contextName = resourceData.context.name;
        const clusterName = resourceData.cluster?.name || contextName;

        // If no namespaces found (empty cluster), return empty array
        if (v1Namespaces.length === 0) {
            return [];
        }

        // Transform V1Namespace[] to NamespaceInfo[] format
        const namespaces: NamespaceInfo[] = v1Namespaces.map(ns => ({
            name: ns.metadata?.name || 'Unknown',
            status: ns.status?.phase || 'Unknown'
        }));

        // Sort namespaces alphabetically by name
        namespaces.sort((a, b) => a.name.localeCompare(b.name));

        // Get the active namespace for this specific context (not necessarily the current context)
        let activeNamespace: string | null = null;
        try {
            activeNamespace = await getNamespaceForContext(contextName);
        } catch (error) {
            // If we can't get the active namespace, just continue without it
            console.warn(`Failed to get active namespace for context '${contextName}':`, error);
        }

        // Create tree items for each namespace
        const namespaceItems = namespaces.map(namespaceInfo => {
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

