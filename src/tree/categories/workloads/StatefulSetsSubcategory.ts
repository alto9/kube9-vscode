import * as vscode from 'vscode';
import { ClusterTreeItem } from '../../ClusterTreeItem';
import { TreeItemData } from '../../TreeItemTypes';
import { WorkloadCommands } from '../../../kubectl/WorkloadCommands';
import { PodTreeItem } from '../../items/PodTreeItem';
import { KubectlError } from '../../../kubernetes/KubectlError';

/**
 * Type for error handler callback.
 */
type ErrorHandler = (error: KubectlError, clusterName: string) => void;

/**
 * StatefulSets subcategory handler.
 * Provides functionality to fetch and display statefulsets and their pods.
 */
export class StatefulSetsSubcategory {
    /**
     * Retrieves statefulset items for the StatefulSets subcategory.
     * Queries kubectl to get all statefulsets across all namespaces and creates tree items for display.
     * 
     * @param resourceData Cluster context and cluster information
     * @param kubeconfigPath Path to the kubeconfig file
     * @param errorHandler Callback to handle kubectl errors
     * @returns Array of statefulset tree items
     */
    public static async getStatefulSetItems(
        resourceData: TreeItemData,
        kubeconfigPath: string,
        errorHandler: ErrorHandler
    ): Promise<ClusterTreeItem[]> {
        const contextName = resourceData.context.name;
        const clusterName = resourceData.cluster?.name || contextName;
        
        // Query statefulsets using kubectl
        const result = await WorkloadCommands.getStatefulSets(
            kubeconfigPath,
            contextName
        );

        // Handle errors if they occurred
        if (result.error) {
            errorHandler(result.error, clusterName);
            return [];
        }

        // If no statefulsets found, return empty array
        if (result.statefulsets.length === 0) {
            return [];
        }

        // Create tree items for each statefulset
        const statefulsetItems = result.statefulsets.map(statefulsetInfo => {
            // Create tree item with 'statefulset' type for individual statefulset
            const item = new ClusterTreeItem(
                statefulsetInfo.name,
                'statefulset',
                vscode.TreeItemCollapsibleState.Collapsed,
                {
                    ...resourceData,
                    resourceName: statefulsetInfo.name,
                    namespace: statefulsetInfo.namespace,
                    labelSelector: statefulsetInfo.selector
                }
            );
            
            // Set context value for "View YAML" menu
            item.contextValue = 'resource:StatefulSet';

            // Set description to show namespace and replica status
            const replicaStatus = `${statefulsetInfo.readyReplicas}/${statefulsetInfo.replicas} ready`;
            item.description = `${statefulsetInfo.namespace} • ${replicaStatus}`;

            // Set icon based on replica status
            if (statefulsetInfo.readyReplicas === statefulsetInfo.replicas && statefulsetInfo.replicas > 0) {
                // All replicas ready
                item.iconPath = new vscode.ThemeIcon(
                    'check-all',
                    new vscode.ThemeColor('testing.iconPassed')
                );
            } else if (statefulsetInfo.readyReplicas > 0) {
                // Some replicas ready
                item.iconPath = new vscode.ThemeIcon(
                    'sync',
                    new vscode.ThemeColor('editorWarning.foreground')
                );
            } else {
                // No replicas ready
                item.iconPath = new vscode.ThemeIcon(
                    'circle-outline',
                    new vscode.ThemeColor('testing.iconFailed')
                );
            }

            // Set tooltip with detailed information
            item.tooltip = `StatefulSet: ${statefulsetInfo.name}\nNamespace: ${statefulsetInfo.namespace}\nReplicas: ${replicaStatus}`;

            return item;
        });

        return statefulsetItems;
    }

    /**
     * Retrieves pod items for a specific statefulset.
     * Queries kubectl to get pods matching the statefulset's label selector.
     * 
     * @param resourceData Cluster context and cluster information (includes resourceName and namespace)
     * @param kubeconfigPath Path to the kubeconfig file
     * @param labelSelector Label selector for finding pods
     * @param errorHandler Callback to handle kubectl errors
     * @returns Array of pod tree items
     */
    public static async getPodsForStatefulSet(
        resourceData: TreeItemData,
        kubeconfigPath: string,
        labelSelector: string,
        errorHandler: ErrorHandler
    ): Promise<PodTreeItem[]> {
        const contextName = resourceData.context.name;
        const clusterName = resourceData.cluster?.name || contextName;
        const statefulsetName = resourceData.resourceName || 'Unknown';
        const namespace = resourceData.namespace || 'default';
        
        // Query pods using kubectl with label selector
        const result = await WorkloadCommands.getPodsForStatefulSet(
            kubeconfigPath,
            contextName,
            statefulsetName,
            namespace,
            labelSelector
        );

        // Handle errors if they occurred
        if (result.error) {
            errorHandler(result.error, clusterName);
            return [];
        }

        // If no pods found, return empty array
        if (result.pods.length === 0) {
            return [];
        }

        // Create PodTreeItem for each pod
        const podItems = result.pods.map(podInfo => {
            // Map phase to PodStatus type
            let status: 'Running' | 'Pending' | 'Succeeded' | 'Failed' | 'Unknown' = 'Unknown';
            if (podInfo.phase === 'Running' || podInfo.phase === 'Pending' || 
                podInfo.phase === 'Succeeded' || podInfo.phase === 'Failed') {
                status = podInfo.phase as 'Running' | 'Pending' | 'Succeeded' | 'Failed';
            }

            const podItem = new PodTreeItem(
                {
                    name: podInfo.name,
                    namespace: podInfo.namespace,
                    status,
                    parentResource: statefulsetName
                },
                resourceData
            );
            podItem.updatePortForwardBadge();
            return podItem;
        });

        return podItems;
    }
}

