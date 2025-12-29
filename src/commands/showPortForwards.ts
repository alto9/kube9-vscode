import * as vscode from 'vscode';

/**
 * Command handler to focus the tree view on the Port Forwarding category.
 * This is triggered from the command palette.
 */
export async function showPortForwardsCommand(): Promise<void> {
    try {
        // Execute kube9ClusterView.focus command to focus tree
        await vscode.commands.executeCommand('kube9ClusterView.focus');
        
        // Tree will naturally show Port Forwarding category when expanded
        // User can manually expand it if needed
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to show port forwards:', errorMessage);
        vscode.window.showErrorMessage(
            `Failed to show port forwards: ${errorMessage}`
        );
    }
}

