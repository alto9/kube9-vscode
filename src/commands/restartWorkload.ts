import * as vscode from 'vscode';

/**
 * Result of restart confirmation dialog.
 */
export interface RestartDialogResult {
    confirmed: boolean;        // true if user clicked Restart or Restart and Wait
    waitForRollout: boolean;   // true if user selected "Restart and Wait"
}

/**
 * Shows a confirmation dialog for restarting a Kubernetes workload.
 * Explains the rolling restart mechanism and provides option to wait for rollout completion.
 * 
 * @param resourceName - The name of the resource being restarted
 * @returns RestartDialogResult if user confirms restart, undefined if cancelled
 */
export async function showRestartConfirmationDialog(
    resourceName: string
): Promise<RestartDialogResult | undefined> {
    try {
        // Create clear explanation message
        const baseMessage = `Restart ${resourceName}?`;
        const detailMessage = `This will trigger a rolling restart of all pods.\n\nThe restart annotation will be added to the pod template, causing the controller to recreate all pods gradually.`;
        const message = `${baseMessage}\n\n${detailMessage}`;
        
        const restartButton = 'Restart';
        const restartAndWaitButton = 'Restart and Wait';

        const action = await vscode.window.showInformationMessage(
            message,
            { modal: true },
            restartButton,
            restartAndWaitButton
        );

        // Handle user selection
        if (action === restartButton) {
            return {
                confirmed: true,
                waitForRollout: false
            };
        } else if (action === restartAndWaitButton) {
            return {
                confirmed: true,
                waitForRollout: true
            };
        }

        // User cancelled or closed dialog
        return undefined;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error showing restart confirmation dialog:', errorMessage);
        vscode.window.showErrorMessage(`Failed to show restart confirmation: ${errorMessage}`);
        return undefined;
    }
}

