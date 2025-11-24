import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { KubectlError } from '../kubernetes/KubectlError';

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
 * Generates a context-aware warning message based on the resource type being deleted.
 * 
 * @param resourceType - The type of Kubernetes resource (e.g., "Deployment", "Pod", "Service")
 * @returns A warning message specific to the resource type, or a generic message for unknown types
 */
function generateWarningMessage(resourceType: string): string {
    switch (resourceType) {
        case 'Deployment':
            return 'Deleting this Deployment will also delete its managed Pods. Pods may be recreated if controlled by a ReplicaSet.';
        case 'StatefulSet':
            return 'Deleting this StatefulSet will delete its Pods in reverse order. Associated PersistentVolumeClaims will NOT be deleted.';
        case 'DaemonSet':
            return 'Deleting this DaemonSet will remove Pods from all nodes where it is running.';
        case 'Service':
            return 'This will remove the network endpoint for this Service. Dependent applications may lose connectivity.';
        case 'ConfigMap':
            return 'Pods using this ConfigMap may fail to start or lose configuration data.';
        case 'Secret':
            return 'Applications using this Secret will lose access to credentials and sensitive data.';
        case 'PersistentVolumeClaim':
            return 'Deleting this PVC may delete the underlying PersistentVolume depending on the reclaim policy.';
        case 'Pod':
            return 'This Pod will be permanently deleted. If managed by a controller, it may be recreated.';
        default:
            return 'This resource will be permanently deleted.';
    }
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

        const warningMessage = generateWarningMessage(resourceType);
        const quickPick = vscode.window.createQuickPick<ForceDeleteQuickPickItem>();
        quickPick.title = `Delete ${resourceType}?`;
        quickPick.placeholder = `${resourceInfo}\n\n⚠️ ${warningMessage}\n\nPress Enter to continue or select force delete option`;
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
        const baseMessage = namespace
            ? `Are you sure you want to delete ${resourceType} '${resourceName}' in namespace '${namespace}'?`
            : `Are you sure you want to delete ${resourceType} '${resourceName}'?`;
        
        const message = `${baseMessage}\n\n⚠️ ${warningMessage}`;

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

/**
 * Timeout for kubectl delete commands in milliseconds.
 */
const KUBECTL_TIMEOUT_MS = 30000;

/**
 * Promisified version of execFile for async/await usage.
 */
const execFileAsync = promisify(execFile);

/**
 * Executes kubectl delete command to delete a Kubernetes resource.
 * Shows progress indication and handles errors appropriately.
 * 
 * @param options - Delete options including resource type, name, namespace, and force flag
 * @param kubeconfigPath - Path to the kubeconfig file
 * @param contextName - Name of the kubectl context to use
 * @returns Promise resolving to true if deletion succeeded, false otherwise
 */
export async function executeKubectlDelete(
    options: DeleteResourceOptions,
    kubeconfigPath: string,
    contextName: string
): Promise<boolean> {
    return await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Deleting ${options.resourceType} ${options.resourceName}...`,
            cancellable: false
        },
        async () => {
            try {
                // Build kubectl command arguments
                const args: string[] = [
                    'delete',
                    options.resourceType.toLowerCase(),
                    options.resourceName
                ];

                // Add namespace flag only for namespaced resources
                if (options.namespace) {
                    args.push('-n', options.namespace);
                }

                // Add output format and cluster context flags
                args.push(
                    '--output=json',
                    `--kubeconfig=${kubeconfigPath}`,
                    `--context=${contextName}`
                );

                // Note: forceDelete flag is ignored in this story (handled in story 005)

                // Execute kubectl delete command
                await execFileAsync(
                    'kubectl',
                    args,
                    {
                        timeout: KUBECTL_TIMEOUT_MS,
                        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                        env: { ...process.env }
                    }
                );

                // Deletion succeeded
                return true;
            } catch (error: unknown) {
                // kubectl failed - create structured error for detailed handling
                const kubectlError = KubectlError.fromExecError(error, contextName);
                
                // Log error details for debugging
                console.error(`Failed to delete ${options.resourceType} ${options.resourceName}: ${kubectlError.getDetails()}`);
                
                // Show error notification to user
                vscode.window.showErrorMessage(
                    `Failed to delete ${options.resourceType} ${options.resourceName}: ${kubectlError.getUserMessage()}`
                );
                
                // Return failure status
                return false;
            }
        }
    );
}

