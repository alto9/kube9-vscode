import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { PortForwardManager } from '../services/PortForwardManager';
import { getClusterTreeProvider } from '../extension';

/**
 * Command handler to focus the tree view on the pod associated with a port forward.
 * This is triggered from the port forward context menu in the tree view.
 * 
 * @param treeItem The port forward tree item that was right-clicked
 */
export async function viewPortForwardPodCommand(treeItem: ClusterTreeItem): Promise<void> {
    try {
        // 1. Validate tree item
        if (!treeItem || treeItem.contextValue !== 'portForward') {
            vscode.window.showErrorMessage('Invalid port forward selected');
            return;
        }
        
        // 2. Extract forwardId from resourceData
        if (!treeItem.resourceData || !treeItem.resourceData.forwardId) {
            vscode.window.showErrorMessage('Port forward ID not found');
            return;
        }
        
        const forwardId = treeItem.resourceData.forwardId;
        
        // 3. Get forward info from manager
        const manager = PortForwardManager.getInstance();
        const forwardInfo = manager.getForward(forwardId);
        
        if (!forwardInfo) {
            vscode.window.showErrorMessage('Port forward not found');
            return;
        }
        
        // 4. Focus tree view
        await vscode.commands.executeCommand('kube9ClusterView.focus');
        
        // 5. Refresh tree to ensure resources are loaded
        const treeProvider = getClusterTreeProvider();
        treeProvider.refresh();
        
        // 6. Show informational message
        // Note: Direct resource reveal not available yet, so we inform the user
        const resourceLabel = forwardInfo.resourceType === 'service'
            ? `Service ${forwardInfo.resourceName}`
            : `Pod ${forwardInfo.resourceName}`;
        vscode.window.showInformationMessage(
            `Tree view focused. Look for ${resourceLabel} in namespace ${forwardInfo.namespace}`
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to view port forward pod:', errorMessage);
        vscode.window.showErrorMessage(
            `Failed to view port forward pod: ${errorMessage}`
        );
    }
}

