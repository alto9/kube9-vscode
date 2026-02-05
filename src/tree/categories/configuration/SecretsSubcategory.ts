import * as vscode from 'vscode';
import { ClusterTreeItem } from '../../ClusterTreeItem';
import { TreeItemData } from '../../TreeItemTypes';
import { ConfigurationCommands } from '../../../kubectl/ConfigurationCommands';
import { KubectlError } from '../../../kubernetes/KubectlError';
import { getNamespaceForContext } from '../../../utils/kubectlContext';

/**
 * Type for error handler callback.
 */
type ErrorHandler = (error: KubectlError, clusterName: string) => void;

/**
 * Secrets subcategory handler.
 * Provides functionality to fetch and display secrets.
 */
export class SecretsSubcategory {
    /**
     * Retrieves secret items for the Secrets subcategory.
     * Queries kubectl to get secrets, filtered by the active namespace if one is set.
     * When an active namespace is set, only secrets from that namespace are displayed.
     * When no namespace is set (cluster-wide view), all secrets are displayed.
     * 
     * @param resourceData Cluster context and cluster information
     * @param kubeconfigPath Path to the kubeconfig file
     * @param errorHandler Callback to handle kubectl errors
     * @returns Array of secret tree items
     */
    public static async getSecretItems(
        resourceData: TreeItemData,
        kubeconfigPath: string,
        errorHandler: ErrorHandler
    ): Promise<ClusterTreeItem[]> {
        const contextName = resourceData.context.name;
        const clusterName = resourceData.cluster?.name || contextName;
        
        // Get the currently selected namespace from kubectl context (not the default namespace)
        // This respects namespace selection made in the UI via "Set as Active Namespace"
        let namespace: string | undefined;
        try {
            const currentNamespace = await getNamespaceForContext(contextName);
            // If a namespace is set in kubectl context, use it for filtering
            // If null (cluster-wide view), pass undefined to fetch all namespaces
            namespace = currentNamespace || undefined;
        } catch (error) {
            console.warn('Failed to get current namespace, fetching all secrets:', error);
            // Fall back to fetching all secrets if we can't determine current namespace
            namespace = undefined;
        }
        
        // Query secrets using kubectl (filtered by namespace if set)
        const result = await ConfigurationCommands.getSecrets(
            kubeconfigPath,
            contextName,
            namespace
        );

        // Handle errors if they occurred
        if (result.error) {
            errorHandler(result.error, clusterName);
            return [];
        }

        // If no secrets found, return empty array
        if (result.secrets.length === 0) {
            return [];
        }

        // Create tree items for each secret
        const secretItems = result.secrets.map(secretInfo => {
            // Create tree item with 'secret' type
            const item = new ClusterTreeItem(
                `${secretInfo.namespace}/${secretInfo.name}`,
                'secret',
                vscode.TreeItemCollapsibleState.None,
                {
                    ...resourceData,
                    resourceName: secretInfo.name,
                    namespace: secretInfo.namespace
                }
            );
            
            // Set context value for "View YAML" menu
            item.contextValue = 'resource:Secret';

            // Set description to show secret type
            item.description = secretInfo.type;

            // Set icon to match Secrets category
            item.iconPath = new vscode.ThemeIcon('key');

            // Set tooltip with detailed information (no sensitive data)
            item.tooltip = `Secret: ${secretInfo.name}\nNamespace: ${secretInfo.namespace}\nType: ${secretInfo.type}`;

            // Set command to open Describe webview on left-click
            item.command = {
                command: 'kube9.describeResource',
                title: 'Describe Secret',
                arguments: [item]
            };

            return item;
        });

        return secretItems;
    }
}


