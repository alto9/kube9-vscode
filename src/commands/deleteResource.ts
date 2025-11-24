import * as vscode from 'vscode';

/**
 * Options for deleting a Kubernetes resource.
 */
export interface DeleteResourceOptions {
    resourceType: string;      // e.g., "Deployment", "Pod", "Service"
    resourceName: string;       // Name of the resource
    namespace: string | undefined;  // Namespace containing the resource (undefined for cluster-scoped)
    forceDelete: boolean;      // Whether to use --grace-period=0 --force flags
}

/**
 * Interface for force delete quick pick item
 */
interface ForceDeleteQuickPickItem extends vscode.QuickPickItem {
    isForceDelete: boolean;
}

/**
 * Shows a confirmation dialog for deleting a Kubernetes resource.
 * Displays resource details and provides a force delete option.
 * 
 * @param resourceType - The type of resource being deleted (e.g., "Deployment", "Pod")
 * @param resourceName - The name of the resource
 * @param namespace - The namespace containing the resource (undefined for cluster-scoped resources)
 * @returns DeleteResourceOptions if user confirms deletion, undefined if cancelled
 */
export async function showDeleteConfirmation(
    resourceType: string,
    resourceName: string,
    namespace: string | undefined
): Promise<DeleteResourceOptions | undefined> {
    try {
        // Step 1: Show QuickPick for force delete option
        const namespaceDisplay = namespace || 'Cluster-scoped';
        const resourceInfo = namespace 
            ? `${resourceType} '${resourceName}' in namespace '${namespace}'`
            : `${resourceType} '${resourceName}' (cluster-scoped)`;

        const forceDeleteItem: ForceDeleteQuickPickItem = {
            label: '$(check) Force delete (removes finalizers)',
            description: 'Use --grace-period=0 --force flags',
            isForceDelete: true,
            picked: false  // Not selected by default
        };

        const quickPick = vscode.window.createQuickPick<ForceDeleteQuickPickItem>();
        quickPick.title = `Delete ${resourceType}?`;
        quickPick.placeholder = `${resourceInfo}\n\nPress Enter to continue or select force delete option`;
        quickPick.items = [forceDeleteItem];
        quickPick.canSelectMany = true;  // Allow toggling the checkbox-like item
        quickPick.ignoreFocusOut = true;  // Make it modal-like

        // Track force delete state
        let forceDeleteSelected = false;

        // Show QuickPick and wait for user selection
        const quickPickPromise = new Promise<boolean | undefined>((resolve) => {
            // Update force delete state when selection changes
            quickPick.onDidChangeSelection((items) => {
                forceDeleteSelected = items.some(item => item.isForceDelete === true);
            });

            quickPick.onDidAccept(() => {
                quickPick.dispose();
                resolve(forceDeleteSelected);
            });

            quickPick.onDidHide(() => {
                quickPick.dispose();
                resolve(undefined);  // User cancelled QuickPick (ESC key)
            });
        });

        quickPick.show();
        const forceDeleteResult = await quickPickPromise;

        // If user cancelled QuickPick (ESC), return undefined
        if (forceDeleteResult === undefined) {
            return undefined;
        }

        const forceDelete = forceDeleteResult || false;

        // Step 2: Show warning message with Delete/Cancel buttons
        const message = namespace
            ? `Are you sure you want to delete ${resourceType} '${resourceName}' in namespace '${namespace}'?`
            : `Are you sure you want to delete ${resourceType} '${resourceName}'?`;

        const deleteButton = 'Delete';
        const cancelButton = 'Cancel';

        const action = await vscode.window.showWarningMessage(
            message,
            { modal: true },
            deleteButton,
            cancelButton
        );

        // If user clicked Delete, return options; otherwise return undefined
        if (action === deleteButton) {
            return {
                resourceType,
                resourceName,
                namespace,
                forceDelete
            };
        }

        return undefined;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error showing delete confirmation dialog:', errorMessage);
        vscode.window.showErrorMessage(`Failed to show delete confirmation: ${errorMessage}`);
        return undefined;
    }
}

