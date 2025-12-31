import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { PortForwardManager } from '../services/PortForwardManager';

/**
 * Command handler to copy the local URL of a port forward to clipboard.
 * This is triggered from the port forward context menu in the tree view.
 * 
 * @param treeItem The port forward tree item that was right-clicked
 */
export async function copyPortForwardURLCommand(treeItem: ClusterTreeItem): Promise<void> {
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
        
        // 4. Copy URL to clipboard
        const url = `http://localhost:${forwardInfo.localPort}`;
        await vscode.env.clipboard.writeText(url);
        
        // 5. Show success notification
        vscode.window.showInformationMessage(`Copied: ${url}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to copy port forward URL:', errorMessage);
        vscode.window.showErrorMessage(
            `Failed to copy port forward URL: ${errorMessage}`
        );
    }
}

