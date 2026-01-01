import * as vscode from 'vscode';
import * as k8s from '@kubernetes/client-node';
import { ClusterTreeItem } from '../ClusterTreeItem';
import { TreeItemData } from '../TreeItemTypes';
import { NodeCommands, NodeInfo } from '../../kubectl/NodeCommands';
import { KubectlError } from '../../kubernetes/KubectlError';

/**
 * Type for error handler callback.
 */
type ErrorHandler = (error: KubectlError, clusterName: string) => void;

/**
 * Nodes category handler.
 * Provides functionality to fetch and display cluster nodes.
 */
export class NodesCategory {
    /**
     * Retrieves node items for the Nodes category.
     * Queries kubectl to get all nodes and creates tree items for display.
     * 
     * @param resourceData Cluster context and cluster information
     * @param kubeconfigPath Path to the kubeconfig file
     * @param errorHandler Callback to handle kubectl errors
     * @returns Array of node tree items
     */
    public static async getNodeItems(
        resourceData: TreeItemData,
        kubeconfigPath: string,
        errorHandler: ErrorHandler
    ): Promise<ClusterTreeItem[]> {
        const contextName = resourceData.context.name;
        const clusterName = resourceData.cluster?.name || contextName;
        
        // Query nodes using kubectl
        const result = await NodeCommands.getNodes(
            kubeconfigPath,
            contextName
        );

        // Handle errors if they occurred
        if (result.error) {
            errorHandler(result.error, clusterName);
            return [];
        }

        // If no nodes found (empty cluster), return empty array
        if (result.nodes.length === 0) {
            return [];
        }

        // Create tree items for each node
        const nodeItems = result.nodes.map(nodeInfo => {
            const item = new ClusterTreeItem(
                nodeInfo.name,
                'nodes',
                vscode.TreeItemCollapsibleState.None,
                {
                    ...resourceData,
                    resourceName: nodeInfo.name
                }
            );
            
            // Set context value for "View YAML" menu
            item.contextValue = 'resource:Node';

            // Set description to show roles
            if (nodeInfo.roles.length > 0) {
                item.description = nodeInfo.roles.join(', ');
            }

            // Set icon based on node status
            switch (nodeInfo.status) {
                case 'Ready':
                    item.iconPath = new vscode.ThemeIcon(
                        'check',
                        new vscode.ThemeColor('testing.iconPassed')
                    );
                    break;
                case 'NotReady':
                    item.iconPath = new vscode.ThemeIcon(
                        'warning',
                        new vscode.ThemeColor('testing.iconFailed')
                    );
                    break;
                default: // Unknown
                    item.iconPath = new vscode.ThemeIcon('question');
                    break;
            }

            // Set tooltip with detailed information
            item.tooltip = `Node: ${nodeInfo.name}\nStatus: ${nodeInfo.status}\nRoles: ${nodeInfo.roles.join(', ')}`;

            // Set command to open describe webview on click
            item.command = {
                command: 'kube9.describeNode',
                title: 'Describe Node',
                arguments: [nodeInfo, resourceData]
            };
            
            return item;
        });

        return nodeItems;
    }

    /**
     * Retrieves node items from pre-fetched cache data.
     * Transforms k8s.V1Node[] to NodeInfo[] format and creates tree items.
     * This method is used when cluster resources have been pre-fetched in parallel.
     * 
     * @param resourceData Cluster context and cluster information
     * @param v1Nodes Pre-fetched V1Node array from the API
     * @param errorHandler Callback to handle errors (unused but kept for signature compatibility)
     * @returns Array of node tree items
     */
    public static async getNodeItemsFromCache(
        resourceData: TreeItemData,
        v1Nodes: k8s.V1Node[],
        _errorHandler: ErrorHandler // eslint-disable-line @typescript-eslint/no-unused-vars
    ): Promise<ClusterTreeItem[]> {

        // If no nodes found (empty cluster), return empty array
        if (v1Nodes.length === 0) {
            return [];
        }

        // Transform V1Node[] to NodeInfo[] format
        const nodes: NodeInfo[] = v1Nodes.map(node => {
            const name = node.metadata?.name || 'Unknown';
            
            // Extract roles from labels
            const labels = node.metadata?.labels || {};
            const roles: string[] = [];
            
            // Check for common role labels
            if (labels['node-role.kubernetes.io/control-plane'] !== undefined || 
                labels['node-role.kubernetes.io/master'] !== undefined) {
                roles.push('control-plane');
            }
            
            // Check for other role labels
            Object.keys(labels).forEach(key => {
                if (key.startsWith('node-role.kubernetes.io/') && 
                    !key.includes('control-plane') && 
                    !key.includes('master')) {
                    const role = key.replace('node-role.kubernetes.io/', '');
                    if (role && !roles.includes(role)) {
                        roles.push(role);
                    }
                }
            });
            
            // If no roles found, default to 'worker'
            if (roles.length === 0) {
                roles.push('worker');
            }
            
            // Determine node status from conditions
            let status = 'Unknown';
            const conditions = node.status?.conditions || [];
            const readyCondition = conditions.find(c => c.type === 'Ready');
            
            if (readyCondition) {
                status = readyCondition.status === 'True' ? 'Ready' : 'NotReady';
            }
            
            return {
                name,
                status,
                roles
            };
        });

        // Sort nodes alphabetically by name
        nodes.sort((a, b) => a.name.localeCompare(b.name));

        // Create tree items for each node
        const nodeItems = nodes.map(nodeInfo => {
            const item = new ClusterTreeItem(
                nodeInfo.name,
                'nodes',
                vscode.TreeItemCollapsibleState.None,
                {
                    ...resourceData,
                    resourceName: nodeInfo.name
                }
            );
            
            // Set context value for "View YAML" menu
            item.contextValue = 'resource:Node';

            // Set description to show roles
            if (nodeInfo.roles.length > 0) {
                item.description = nodeInfo.roles.join(', ');
            }

            // Set icon based on node status
            switch (nodeInfo.status) {
                case 'Ready':
                    item.iconPath = new vscode.ThemeIcon(
                        'check',
                        new vscode.ThemeColor('testing.iconPassed')
                    );
                    break;
                case 'NotReady':
                    item.iconPath = new vscode.ThemeIcon(
                        'warning',
                        new vscode.ThemeColor('testing.iconFailed')
                    );
                    break;
                default: // Unknown
                    item.iconPath = new vscode.ThemeIcon('question');
                    break;
            }

            // Set tooltip with detailed information
            item.tooltip = `Node: ${nodeInfo.name}\nStatus: ${nodeInfo.status}\nRoles: ${nodeInfo.roles.join(', ')}`;

            // Set command to open describe webview on click
            item.command = {
                command: 'kube9.describeNode',
                title: 'Describe Node',
                arguments: [nodeInfo, resourceData]
            };
            
            return item;
        });

        return nodeItems;
    }
}

