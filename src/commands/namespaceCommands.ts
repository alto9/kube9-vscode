import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { setNamespace, clearNamespace, getContextInfo } from '../utils/kubectlContext';
import { getClusterTreeProvider } from '../extension';

/**
 * Command handler to set a namespace as the active namespace in kubectl context.
 * This is triggered from the tree view context menu.
 * 
 * @param item The namespace tree item that was right-clicked
 */
export async function setActiveNamespaceCommand(item: ClusterTreeItem): Promise<void> {
    try {
        // Validate that we have a namespace tree item
        if (!item || item.type !== 'namespace') {
            console.error('setActiveNamespaceCommand called with invalid item type');
            vscode.window.showErrorMessage('Failed to set active namespace: Invalid item type');
            return;
        }

        // Get the namespace name from the tree item label
        const namespaceName = typeof item.label === 'string' ? item.label : item.label?.toString();
        
        // Extract context name from tree item resource data
        const contextName = item.resourceData?.context?.name;
        
        // Validate that both namespace name and context name are present
        if (!namespaceName || !contextName) {
            console.error('setActiveNamespaceCommand called with item missing namespace name or context information');
            vscode.window.showErrorMessage('Failed to set namespace: missing namespace name or context information');
            return;
        }

        // Show progress indicator while updating context
        const success = await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Setting namespace '${namespaceName}' on context '${contextName}'...`,
                cancellable: false
            },
            async () => {
                // Call the kubectl utility to set the namespace
                return await setNamespace(namespaceName, contextName);
            }
        );

        if (success) {
            // Immediately fetch the updated context state and update cache
            // This ensures the tree view reflects the change immediately without waiting for watcher polling
            try {
                await getContextInfo(); // Updates cache with new state
                // Targeted refresh for only the affected cluster - more efficient than full tree refresh
                getClusterTreeProvider().refreshForNamespaceChange(contextName);
            } catch (refreshError) {
                // Log error but don't fail the operation - the watcher will eventually catch up
                console.error('Failed to immediately refresh tree after namespace change:', refreshError);
                // Fallback: trigger a targeted refresh anyway
                try {
                    getClusterTreeProvider().refreshForNamespaceChange(contextName);
                } catch (e) {
                    // Ignore refresh errors - watcher will catch up eventually
                }
            }

            // Show success notification
            vscode.window.showInformationMessage(
                `Namespace '${namespaceName}' set on context '${contextName}'`
            );
        } else {
            // Show error notification
            vscode.window.showErrorMessage(
                `Failed to set namespace on context '${contextName}'. The context may not exist in your kubeconfig.`
            );
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error in setActiveNamespaceCommand:', errorMessage);
        vscode.window.showErrorMessage(
            `Failed to set active namespace: ${errorMessage}`
        );
    }
}

/**
 * Command handler to clear the active namespace from kubectl context.
 * This returns to a cluster-wide view with no namespace filtering.
 * This is triggered from the tree view context menu.
 * 
 * @param item The namespace tree item that was right-clicked
 */
export async function clearActiveNamespaceCommand(item: ClusterTreeItem): Promise<void> {
    try {
        // Extract context name from tree item resource data
        const contextName = item.resourceData?.context?.name;
        
        // Validate that context name is present
        if (!contextName) {
            console.error('clearActiveNamespaceCommand called with item missing context information');
            vscode.window.showErrorMessage('Failed to clear namespace: missing context information');
            return;
        }

        // Show progress indicator while updating context
        const success = await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Clearing namespace on context '${contextName}'...`,
                cancellable: false
            },
            async () => {
                // Call the kubectl utility to clear the namespace
                return await clearNamespace(contextName);
            }
        );

        if (success) {
            // Immediately fetch the updated context state and update cache
            // This ensures the tree view reflects the change immediately without waiting for watcher polling
            try {
                await getContextInfo(); // Updates cache with new state
                // Targeted refresh for only the affected cluster - more efficient than full tree refresh
                getClusterTreeProvider().refreshForNamespaceChange(contextName);
            } catch (refreshError) {
                // Log error but don't fail the operation - the watcher will eventually catch up
                console.error('Failed to immediately refresh tree after namespace clear:', refreshError);
                // Fallback: trigger a targeted refresh anyway
                try {
                    getClusterTreeProvider().refreshForNamespaceChange(contextName);
                } catch (e) {
                    // Ignore refresh errors - watcher will catch up eventually
                }
            }

            // Show success notification
            vscode.window.showInformationMessage(
                `Namespace cleared on context '${contextName}'`
            );
        } else {
            // Show error notification
            vscode.window.showErrorMessage(
                `Failed to clear namespace on context '${contextName}'. The context may not exist in your kubeconfig.`
            );
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error in clearActiveNamespaceCommand:', errorMessage);
        vscode.window.showErrorMessage(
            `Failed to clear active namespace: ${errorMessage}`
        );
    }
}

