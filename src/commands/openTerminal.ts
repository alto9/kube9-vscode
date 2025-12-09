import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { getClusterTreeProvider } from '../extension';

/**
 * Command handler to open a terminal for a Kubernetes Pod resource.
 * This is triggered from the tree view context menu.
 * 
 * @param treeItem The Pod tree item that was right-clicked
 */
export async function openTerminalCommand(treeItem: ClusterTreeItem): Promise<void> {
    try {
        // 1. Validate tree item
        if (!treeItem || !treeItem.contextValue?.startsWith('resource:')) {
            vscode.window.showErrorMessage('Failed to open terminal: Invalid resource');
            return;
        }
        
        // 2. Validate that this is specifically a Pod resource
        if (treeItem.contextValue !== 'resource:Pod') {
            vscode.window.showErrorMessage('Failed to open terminal: Resource is not a Pod');
            return;
        }
        
        // 3. Validate resourceData exists
        if (!treeItem.resourceData) {
            vscode.window.showErrorMessage('Failed to open terminal: Missing resource data');
            return;
        }
        
        // 4. Extract pod metadata
        const podName = treeItem.resourceData.resourceName || (typeof treeItem.label === 'string' ? treeItem.label : treeItem.label?.toString() || '');
        const namespace = treeItem.resourceData.namespace || 'default';
        
        // Get kubeconfig path from tree provider
        const treeProvider = getClusterTreeProvider();
        const kubeconfigPath = treeProvider.getKubeconfigPath();
        if (!kubeconfigPath) {
            vscode.window.showErrorMessage('Failed to open terminal: Kubeconfig path not available');
            return;
        }
        
        // Get context name from resourceData
        const contextName = treeItem.resourceData.context.name;
        
        if (!podName || !contextName) {
            vscode.window.showErrorMessage('Failed to open terminal: Missing resource information');
            return;
        }
        
        // Log extracted information for verification
        console.log('Open terminal command invoked:', {
            podName,
            namespace,
            contextName,
            kubeconfigPath
        });
        
        // TODO: Query pod status, select container, create terminal
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error in openTerminalCommand:', errorMessage);
        vscode.window.showErrorMessage(
            `Failed to open terminal: ${errorMessage}`
        );
    }
}

