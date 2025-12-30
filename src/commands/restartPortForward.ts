import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { PortForwardManager, PortForwardConfig } from '../services/PortForwardManager';

/**
 * Command handler to restart a port forward.
 * Stops the current forward and starts a new one with the same configuration.
 * This is triggered from the port forward context menu in the tree view.
 * 
 * @param treeItem The port forward tree item that was right-clicked
 */
export async function restartPortForwardCommand(treeItem: ClusterTreeItem): Promise<void> {
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
        
        // 4. Extract config from forward info
        const config: PortForwardConfig = {
            podName: forwardInfo.podName,
            namespace: forwardInfo.namespace,
            context: forwardInfo.context,
            localPort: forwardInfo.localPort,
            remotePort: forwardInfo.remotePort
        };
        
        // 5. Restart forward with progress indication
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Restarting port forward...`,
            cancellable: false
        }, async () => {
            // Stop the current forward
            await manager.stopForward(forwardId);
            
            // Start a new forward with the same config
            await manager.startForward(config);
        });
        
        // 6. Show success notification
        vscode.window.showInformationMessage(
            `Port forward restarted: localhost:${config.localPort} → ${config.namespace}/${config.podName}:${config.remotePort}`
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to restart port forward:', errorMessage);
        vscode.window.showErrorMessage(
            `Failed to restart port forward: ${errorMessage}`
        );
    }
}

