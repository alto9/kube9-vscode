import * as vscode from 'vscode';
import { HelmPackageManagerPanel } from '../webview/HelmPackageManagerPanel';
import { getExtensionContext } from '../extension';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { getKubernetesApiClient } from '../kubernetes/apiClient';

/**
 * Command handler to open the Helm Package Manager webview.
 * This is triggered from the tree view or command palette.
 * 
 * @param item Optional tree item containing cluster context information
 */
export async function openPackageManager(item?: ClusterTreeItem): Promise<void> {
    try {
        const context = getExtensionContext();
        let contextName: string | undefined;

        // If tree item is provided, extract context and switch to it
        if (item?.resourceData?.context?.name) {
            contextName = item.resourceData.context.name;
            // Switch to the cluster's context before opening the panel
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
        }

        HelmPackageManagerPanel.createOrShow(context, contextName);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error in openPackageManager:', errorMessage);
        vscode.window.showErrorMessage(
            `Failed to open Helm Package Manager: ${errorMessage}`
        );
    }
}

