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
 * ConfigMaps subcategory handler.
 * Provides functionality to fetch and display configmaps.
 */
export class ConfigMapsSubcategory {
    /**
     * Retrieves configmap items for the ConfigMaps subcategory.
     * Queries kubectl to get all configmaps across all namespaces and creates tree items for display.
     * 
     * @param resourceData Cluster context and cluster information
     * @param kubeconfigPath Path to the kubeconfig file
     * @param errorHandler Callback to handle kubectl errors
     * @returns Array of configmap tree items
     */
    public static async getConfigMapItems(
        resourceData: TreeItemData,
        kubeconfigPath: string,
        errorHandler: ErrorHandler
    ): Promise<ClusterTreeItem[]> {
        const contextName = resourceData.context.name;
        const clusterName = resourceData.cluster?.name || contextName;
        
        // Query configmaps using kubectl
        const result = await ConfigurationCommands.getConfigMaps(
            kubeconfigPath,
            contextName
        );

        // Handle errors if they occurred
        if (result.error) {
            errorHandler(result.error, clusterName);
            return [];
        }

        // If no configmaps found, return empty array
        if (result.configMaps.length === 0) {
            return [];
        }

        // Create tree items for each configmap
        const configMapItems = result.configMaps.map(configMapInfo => {
            // Create tree item with 'configmap' type
            const item = new ClusterTreeItem(
                `${configMapInfo.namespace}/${configMapInfo.name}`,
                'configmap',
                vscode.TreeItemCollapsibleState.None,
                {
                    ...resourceData,
                    resourceName: configMapInfo.name,
                    namespace: configMapInfo.namespace
                }
            );
            
            // Set context value for "View YAML" menu
            item.contextValue = 'resource:ConfigMap';

            // Set description to show number of data keys
            const keyLabel = configMapInfo.dataKeys === 1 ? 'key' : 'keys';
            item.description = `${configMapInfo.dataKeys} ${keyLabel}`;

            // Set icon to match ConfigMaps category
            item.iconPath = new vscode.ThemeIcon('symbol-property');

            // Set tooltip with detailed information
            item.tooltip = `ConfigMap: ${configMapInfo.name}\nNamespace: ${configMapInfo.namespace}\nData Keys: ${configMapInfo.dataKeys}`;

            // Set command to open Describe webview on left-click
            item.command = {
                command: 'kube9.describeConfigMap',
                title: 'Describe ConfigMap',
                arguments: [{
                    name: configMapInfo.name,
                    namespace: configMapInfo.namespace,
                    context: contextName
                }]
            };

            return item;
        });

        return configMapItems;
    }
}

