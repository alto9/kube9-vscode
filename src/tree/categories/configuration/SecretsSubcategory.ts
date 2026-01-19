import * as vscode from 'vscode';
import { ClusterTreeItem } from '../../ClusterTreeItem';
import { TreeItemData } from '../../TreeItemTypes';
import { ConfigurationCommands } from '../../../kubectl/ConfigurationCommands';
import { KubectlError } from '../../../kubernetes/KubectlError';

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
     * Queries kubectl to get all secrets across all namespaces and creates tree items for display.
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
        
        // Query secrets using kubectl
        const result = await ConfigurationCommands.getSecrets(
            kubeconfigPath,
            contextName
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


