import * as vscode from 'vscode';
import { PortForwardManager } from '../services/PortForwardManager';

/**
 * Command handler to stop all active port forwards.
 * This is triggered from the command palette.
 */
export async function stopAllPortForwardsCommand(): Promise<void> {
    try {
        const manager = PortForwardManager.getInstance();
        const forwards = manager.getAllForwards();
        
        // Show info message if no forwards active
        if (forwards.length === 0) {
            vscode.window.showInformationMessage('No active port forwards');
            return;
        }
        
        // Show warning confirmation dialog with count
        const confirm = await vscode.window.showWarningMessage(
            `Stop all ${forwards.length} active port forward(s)?`,
            'Stop All',
            'Cancel'
        );
        
        if (confirm !== 'Stop All') {
            return;
        }
        
        // Use withProgress for progress indication
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Stopping all port forwards...',
            cancellable: false
        }, async () => {
            await manager.stopAllForwards();
        });
        
        // Show success notification
        vscode.window.showInformationMessage('All port forwards stopped');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to stop all port forwards:', errorMessage);
        vscode.window.showErrorMessage(
            `Failed to stop all port forwards: ${errorMessage}`
        );
    }
}

