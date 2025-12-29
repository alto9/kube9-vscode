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
 * DaemonSets subcategory handler.
 * Provides functionality to fetch and display daemonsets and their pods.
 */
export class DaemonSetsSubcategory {
    /**
     * Retrieves daemonset items for the DaemonSets subcategory.
     * Queries kubectl to get all daemonsets across all namespaces and creates tree items for display.
     * 
     * @param resourceData Cluster context and cluster information
     * @param kubeconfigPath Path to the kubeconfig file
     * @param errorHandler Callback to handle kubectl errors
     * @returns Array of daemonset tree items
     */
    public static async getDaemonSetItems(
        resourceData: TreeItemData,
        kubeconfigPath: string,
        errorHandler: ErrorHandler
    ): Promise<ClusterTreeItem[]> {
        const contextName = resourceData.context.name;
        const clusterName = resourceData.cluster?.name || contextName;
        
        // Query daemonsets using kubectl
        const result = await WorkloadCommands.getDaemonSets(
            kubeconfigPath,
            contextName
        );

        // Handle errors if they occurred
        if (result.error) {
            errorHandler(result.error, clusterName);
            return [];
        }

        // If no daemonsets found, return empty array
        if (result.daemonsets.length === 0) {
            return [];
        }

        // Create tree items for each daemonset
        const daemonsetItems = result.daemonsets.map(daemonsetInfo => {
            // Create tree item with 'daemonset' type for individual daemonset
            const item = new ClusterTreeItem(
                daemonsetInfo.name,
                'daemonset',
                vscode.TreeItemCollapsibleState.Collapsed,
                {
                    ...resourceData,
                    resourceName: daemonsetInfo.name,
                    namespace: daemonsetInfo.namespace,
                    labelSelector: daemonsetInfo.selector
                }
            );
            
            // Set context value for "View YAML" menu
            item.contextValue = 'resource:DaemonSet';

            // Set description to show namespace and node status
            const nodeStatus = `${daemonsetInfo.readyNodes}/${daemonsetInfo.desiredNodes} nodes`;
            item.description = `${daemonsetInfo.namespace} • ${nodeStatus}`;

            // Set icon based on node status
            if (daemonsetInfo.readyNodes === daemonsetInfo.desiredNodes && daemonsetInfo.desiredNodes > 0) {
                // All nodes ready
                item.iconPath = new vscode.ThemeIcon(
                    'check-all',
                    new vscode.ThemeColor('testing.iconPassed')
                );
            } else if (daemonsetInfo.readyNodes > 0) {
                // Some nodes ready
                item.iconPath = new vscode.ThemeIcon(
                    'sync',
                    new vscode.ThemeColor('editorWarning.foreground')
                );
            } else {
                // No nodes ready
                item.iconPath = new vscode.ThemeIcon(
                    'circle-outline',
                    new vscode.ThemeColor('testing.iconFailed')
                );
            }

            // Set tooltip with detailed information
            item.tooltip = `DaemonSet: ${daemonsetInfo.name}\nNamespace: ${daemonsetInfo.namespace}\nNodes: ${nodeStatus}`;

            return item;
        });

        return daemonsetItems;
    }

    /**
     * Retrieves pod items for a specific daemonset.
     * Queries kubectl to get pods matching the daemonset's label selector.
     * 
     * @param resourceData Cluster context and cluster information (includes resourceName and namespace)
     * @param kubeconfigPath Path to the kubeconfig file
     * @param labelSelector Label selector for finding pods
     * @param errorHandler Callback to handle kubectl errors
     * @returns Array of pod tree items
     */
    public static async getPodsForDaemonSet(
        resourceData: TreeItemData,
        kubeconfigPath: string,
        labelSelector: string,
        errorHandler: ErrorHandler
    ): Promise<PodTreeItem[]> {
        const contextName = resourceData.context.name;
        const clusterName = resourceData.cluster?.name || contextName;
        const daemonsetName = resourceData.resourceName || 'Unknown';
        const namespace = resourceData.namespace || 'default';
        
        // Query pods using kubectl with label selector
        const result = await WorkloadCommands.getPodsForDaemonSet(
            kubeconfigPath,
            contextName,
            daemonsetName,
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
                    parentResource: daemonsetName
                },
                resourceData
            );
            podItem.updatePortForwardBadge();
            return podItem;
        });

        return podItems;
    }
}


