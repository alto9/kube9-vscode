import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { TreeItemData } from '../tree/TreeItemTypes';
import { TreeItemFactory } from '../tree/TreeItemFactory';

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
 * Result of error handling for delete operations.
 */
export interface DeleteErrorResult {
    errorType: 'rbac' | 'notfound' | 'timeout' | 'network' | 'generic';
    message: string;
    shouldRefresh: boolean;
    actionButtons: string[];
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
            description: 'Use this for resources stuck in terminating state. This skips graceful deletion and removes finalizers.',
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
 * Handles kubectl delete errors by parsing stderr and detecting specific error types.
 * Returns structured error information with user-friendly messages and action buttons.
 * 
 * @param error - The error from execFile/child_process
 * @param options - Delete options including resource type and name
 * @returns DeleteErrorResult with error type, message, refresh flag, and action buttons
 */
function handleDeleteError(
    error: unknown,
    options: DeleteResourceOptions
): DeleteErrorResult {
    const err = error as { 
        killed?: boolean; 
        signal?: string; 
        code?: string | number; 
        stderr?: Buffer | string;
        stdout?: Buffer | string;
        message?: string;
    };

    // Extract stderr and stdout for analysis
    const stderr = err.stderr 
        ? (Buffer.isBuffer(err.stderr) ? err.stderr.toString() : err.stderr).trim()
        : '';
    const stdout = err.stdout
        ? (Buffer.isBuffer(err.stdout) ? err.stdout.toString() : err.stdout).trim()
        : '';
    const errorMessage = err.message || 'Unknown error';
    const details = stderr || stdout || errorMessage;
    const lowerDetails = details.toLowerCase();

    // Detect timeout (killed by timeout or SIGTERM)
    if (err.killed || err.signal === 'SIGTERM') {
        return {
            errorType: 'timeout',
            message: `Deletion timed out. Resource may be stuck due to finalizers. Try force delete option.`,
            shouldRefresh: true, // Refresh to show resource in Terminating state
            actionButtons: ['Force Delete']
        };
    }

    // Detect RBAC/permission errors
    if (
        lowerDetails.includes('forbidden') ||
        lowerDetails.includes('user cannot delete') ||
        lowerDetails.includes('permission denied') ||
        lowerDetails.includes('access denied') ||
        lowerDetails.includes('not authorized')
    ) {
        return {
            errorType: 'rbac',
            message: `Permission denied: You don't have permission to delete this ${options.resourceType}. Check your RBAC permissions.`,
            shouldRefresh: false, // Don't refresh - resource still exists
            actionButtons: []
        };
    }

    // Detect resource not found errors
    if (
        lowerDetails.includes('notfound') ||
        lowerDetails.includes('not found') ||
        lowerDetails.includes('does not exist')
    ) {
        return {
            errorType: 'notfound',
            message: `Resource not found: ${options.resourceType} ${options.resourceName} may have been deleted already.`,
            shouldRefresh: true, // Refresh to sync current state
            actionButtons: []
        };
    }

    // Detect network/cluster connection errors
    if (
        lowerDetails.includes('connection refused') ||
        lowerDetails.includes('could not resolve') ||
        lowerDetails.includes('no such host') ||
        lowerDetails.includes('connection timed out') ||
        lowerDetails.includes('unreachable') ||
        lowerDetails.includes('dial tcp') ||
        lowerDetails.includes('unable to connect') ||
        lowerDetails.includes('network') ||
        lowerDetails.includes('connect: connection refused')
    ) {
        return {
            errorType: 'network',
            message: `Deletion failed: Unable to connect to cluster. Check your connection and try again.`,
            shouldRefresh: false, // Don't refresh - connection issue, resource may still exist
            actionButtons: ['Retry']
        };
    }

    // Generic error - show kubectl stderr message
    return {
        errorType: 'generic',
        message: `Failed to delete ${options.resourceType} ${options.resourceName}: ${details}`,
        shouldRefresh: false,
        actionButtons: []
    };
}

/**
 * Maps a Kubernetes resource type to its corresponding tree category/subcategory type.
 * Returns the category type that should be refreshed after deleting this resource.
 * 
 * @param resourceType - The Kubernetes resource type (e.g., "Deployment", "Pod", "ConfigMap")
 * @returns The tree item category type (e.g., "deployments", "configmaps") or undefined if mapping not found
 */
export function getCategoryTypeForResource(resourceType: string): string | undefined {
    // Normalize resource type to handle case variations
    const normalizedType = resourceType.toLowerCase();
    
    // Map resource types to their category/subcategory types
    const resourceToCategoryMap: { [key: string]: string } = {
        // Workload resources
        'deployment': 'deployments',
        'statefulset': 'statefulsets',
        'daemonset': 'daemonsets',
        'cronjob': 'cronjobs',
        'pod': 'workloads', // Pods can be under multiple subcategories, refresh workloads category
        
        // Storage resources
        'persistentvolume': 'persistentVolumes',
        'persistentvolumeclaim': 'persistentVolumeClaims',
        'storageclass': 'storageClasses',
        
        // Configuration resources
        'configmap': 'configmaps',
        'secret': 'secrets',
        
        // Cluster resources
        'node': 'nodes',
        'namespace': 'namespaces',
        
        // Custom resources
        'customresourcedefinition': 'customResources',
        'crd': 'customResources',
    };
    
    return resourceToCategoryMap[normalizedType];
}

/**
 * Constructs a category tree item for selective tree refresh after resource deletion.
 * Creates the appropriate category tree item based on the resource type and resource data.
 * 
 * @param resourceType - The Kubernetes resource type that was deleted (e.g., "Deployment", "Pod")
 * @param resourceData - The tree item data containing cluster context information
 * @returns A ClusterTreeItem for the category that should be refreshed, or undefined if category cannot be determined
 */
export function createCategoryTreeItemForRefresh(
    resourceType: string,
    resourceData: TreeItemData
): ClusterTreeItem | undefined {
    const categoryType = getCategoryTypeForResource(resourceType);
    
    if (!categoryType) {
        return undefined;
    }
    
    // Create the appropriate category tree item based on category type
    switch (categoryType) {
        case 'nodes':
            return TreeItemFactory.createNodesCategory(resourceData);
        case 'namespaces':
            return TreeItemFactory.createNamespacesCategory(resourceData);
        case 'workloads':
            return TreeItemFactory.createWorkloadsCategory(resourceData);
        case 'deployments':
        case 'statefulsets':
        case 'daemonsets':
        case 'cronjobs':
            // For subcategories, we need to create the parent workloads category
            // since subcategories are children of workloads
            return TreeItemFactory.createWorkloadsCategory(resourceData);
        case 'storage':
        case 'persistentVolumes':
        case 'persistentVolumeClaims':
        case 'storageClasses':
            // For storage subcategories, create the parent storage category
            return TreeItemFactory.createStorageCategory(resourceData);
        case 'configmaps':
        case 'secrets':
            // For configuration subcategories, create the parent configuration category
            return TreeItemFactory.createConfigurationCategory(resourceData);
        case 'customResources':
            return TreeItemFactory.createCustomResourcesCategory(resourceData);
        case 'helm':
            return TreeItemFactory.createHelmCategory(resourceData);
        default:
            return undefined;
    }
}

/**
 * Result of kubectl delete operation.
 */
export interface DeleteResult {
    success: boolean;
    shouldRefresh: boolean;
}

/**
 * Executes kubectl delete command to delete a Kubernetes resource.
 * Shows progress indication and handles errors appropriately.
 * 
 * @param options - Delete options including resource type, name, namespace, and force flag
 * @param kubeconfigPath - Path to the kubeconfig file
 * @param contextName - Name of the kubectl context to use
 * @returns Promise resolving to DeleteResult with success status and refresh indication
 */
export async function executeKubectlDelete(
    options: DeleteResourceOptions,
    kubeconfigPath: string,
    contextName: string
): Promise<DeleteResult> {
    const progressTitle = options.forceDelete
        ? `Force deleting ${options.resourceType} ${options.resourceName}...`
        : `Deleting ${options.resourceType} ${options.resourceName}...`;

    return await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: progressTitle,
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

                // Add force delete flags if forceDelete is enabled
                if (options.forceDelete) {
                    args.push('--grace-period=0', '--force');
                }

                // Add output format and cluster context flags
                args.push(
                    '--output=json',
                    `--kubeconfig=${kubeconfigPath}`,
                    `--context=${contextName}`
                );

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
                return { success: true, shouldRefresh: true };
            } catch (error: unknown) {
                // Handle error using specialized delete error handler
                const errorResult = handleDeleteError(error, options);
                
                // Log error details for debugging
                console.error(`Failed to delete ${options.resourceType} ${options.resourceName}: ${errorResult.message}`);
                
                // Show appropriate notification based on error type
                let userSelection: string | undefined;
                if (errorResult.errorType === 'notfound') {
                    // Show info message for not found (not an error)
                    await vscode.window.showInformationMessage(errorResult.message);
                } else {
                    // Show error message with action buttons if available
                    if (errorResult.actionButtons.length > 0) {
                        userSelection = await vscode.window.showErrorMessage(
                            errorResult.message,
                            ...errorResult.actionButtons
                        );
                    } else {
                        await vscode.window.showErrorMessage(errorResult.message);
                    }
                }

                // Handle action button clicks
                if (userSelection === 'Force Delete') {
                    // Retry deletion with force delete enabled
                    const forceOptions: DeleteResourceOptions = {
                        ...options,
                        forceDelete: true
                    };
                    return await executeKubectlDelete(forceOptions, kubeconfigPath, contextName);
                } else if (userSelection === 'Retry') {
                    // Retry same deletion operation
                    return await executeKubectlDelete(options, kubeconfigPath, contextName);
                }

                // Return failure status with refresh indication
                return { success: false, shouldRefresh: errorResult.shouldRefresh };
            }
        }
    );
}

