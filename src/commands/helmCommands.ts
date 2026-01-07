import * as vscode from 'vscode';
import { HelmPackageManagerPanel } from '../webview/HelmPackageManagerPanel';
import { getExtensionContext } from '../extension';

/**
 * Command handler to open the Helm Package Manager webview.
 * This is triggered from the tree view or command palette.
 */
export async function openPackageManager(): Promise<void> {
    try {
        const context = getExtensionContext();
        HelmPackageManagerPanel.createOrShow(context);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error in openPackageManager:', errorMessage);
        vscode.window.showErrorMessage(
            `Failed to open Helm Package Manager: ${errorMessage}`
        );
    }
}

