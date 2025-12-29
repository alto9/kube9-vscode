import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { PortForwardManager } from '../services/PortForwardManager';

/**
 * Command handler to stop a single port forward.
 * This is triggered from the port forward context menu in the tree view.
 * 
 * @param treeItem The port forward tree item that was right-clicked
 */
export async function stopPortForwardCommand(treeItem: ClusterTreeItem): Promise<void> {
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
        
        // 3. Get forward info from manager to display in confirmation
        const manager = PortForwardManager.getInstance();
        const forwardInfo = manager.getForward(forwardId);
        
        if (!forwardInfo) {
            vscode.window.showErrorMessage('Port forward not found');
            return;
        }
        
        // 4. Show confirmation dialog with forward details
        const confirm = await vscode.window.showWarningMessage(
            `Stop port forward localhost:${forwardInfo.localPort} → ${forwardInfo.namespace}/${forwardInfo.podName}:${forwardInfo.remotePort}?`,
            'Stop',
            'Cancel'
        );
        
        if (confirm !== 'Stop') {
            return;
        }
        
        // 5. Call manager.stopForward(forwardId)
        await manager.stopForward(forwardId);
        
        // 6. Show success notification
        vscode.window.showInformationMessage(
            `Port forward stopped: localhost:${forwardInfo.localPort}`
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to stop port forward:', errorMessage);
        vscode.window.showErrorMessage(
            `Failed to stop port forward: ${errorMessage}`
        );
    }
}

