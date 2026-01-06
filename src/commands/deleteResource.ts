import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { TreeItemData } from '../tree/TreeItemTypes';
import { TreeItemFactory } from '../tree/TreeItemFactory';
import { getKubernetesApiClient } from '../kubernetes/apiClient';
import * as k8s from '@kubernetes/client-node';

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
 * OutputChannel for delete operation logging.
 * Created lazily on first use.
 */
let deleteOutputChannel: vscode.OutputChannel | undefined;

/**
 * Gets or creates the OutputChannel for delete operation logging.
 * 
 * @returns The OutputChannel instance
 */
function getDeleteOutputChannel(): vscode.OutputChannel {
    if (!deleteOutputChannel) {
        deleteOutputChannel = vscode.window.createOutputChannel('kube9 Delete Operations');
    }
    return deleteOutputChannel;
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
        const resourceInfo = namespace 
            ? `${resourceType} '${resourceName}' in namespace '${namespace}'`
            : `${resourceType} '${resourceName}' (cluster-scoped)`;

        const warningMessage = generateWarningMessage(resourceType);
        
        // Create a clear, single confirmation dialog with all options
        const baseMessage = `Are you sure you want to delete ${resourceInfo}?`;
        const message = `${baseMessage}\n\n⚠️ ${warningMessage}`;

        const deleteButton = 'Delete';
        const forceDeleteButton = 'Force Delete';

        const action = await vscode.window.showWarningMessage(
            message,
            { modal: true },
            deleteButton,
            forceDeleteButton
        );

        // Handle user selection
        if (action === deleteButton) {
            return {
                resourceType,
                resourceName,
                namespace,
                forceDelete: false
            };
        } else if (action === forceDeleteButton) {
            return {
                resourceType,
                resourceName,
                namespace,
                forceDelete: true
            };
        }

        // User cancelled or closed dialog
        return undefined;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error showing delete confirmation dialog:', errorMessage);
        vscode.window.showErrorMessage(`Failed to show delete confirmation: ${errorMessage}`);
        return undefined;
    }
}


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
 * Executes delete operation using the Kubernetes API client to delete a Kubernetes resource.
 * Shows progress indication and handles errors appropriately.
 * 
 * @param options - Delete options including resource type, name, namespace, and force flag
 * @param kubeconfigPath - Path to the kubeconfig file (unused, kept for backward compatibility)
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
                // Set context on API client
                const apiClient = getKubernetesApiClient();
                apiClient.setContext(contextName);
                
                // Prepare delete options body
                const deleteOptionsBody: k8s.V1DeleteOptions = {
                    gracePeriodSeconds: options.forceDelete ? 0 : undefined,
                    propagationPolicy: options.forceDelete ? 'Background' : undefined
                };
                
                // Route to appropriate delete method based on resource type
                const resourceType = options.resourceType.toLowerCase();
                
                if (options.namespace) {
                    // Namespaced resource
                    const deleteParams = {
                        name: options.resourceName,
                        namespace: options.namespace,
                        body: deleteOptionsBody
                    };
                    
                    switch (resourceType) {
                        case 'pod':
                            await apiClient.core.deleteNamespacedPod(deleteParams);
                            break;
                        case 'service':
                            await apiClient.core.deleteNamespacedService(deleteParams);
                            break;
                        case 'configmap':
                            await apiClient.core.deleteNamespacedConfigMap(deleteParams);
                            break;
                        case 'secret':
                            await apiClient.core.deleteNamespacedSecret(deleteParams);
                            break;
                        case 'deployment':
                            await apiClient.apps.deleteNamespacedDeployment(deleteParams);
                            break;
                        case 'statefulset':
                            await apiClient.apps.deleteNamespacedStatefulSet(deleteParams);
                            break;
                        case 'daemonset':
                            await apiClient.apps.deleteNamespacedDaemonSet(deleteParams);
                            break;
                        case 'replicaset':
                            await apiClient.apps.deleteNamespacedReplicaSet(deleteParams);
                            break;
                        case 'job':
                            await apiClient.batch.deleteNamespacedJob(deleteParams);
                            break;
                        case 'cronjob':
                            await apiClient.batch.deleteNamespacedCronJob(deleteParams);
                            break;
                        case 'persistentvolumeclaim':
                            await apiClient.core.deleteNamespacedPersistentVolumeClaim(deleteParams);
                            break;
                        default:
                            throw new Error(`Unsupported namespaced resource type: ${options.resourceType}`);
                    }
                } else {
                    // Cluster-scoped resource
                    const deleteParams = {
                        name: options.resourceName,
                        body: deleteOptionsBody
                    };
                    
                    switch (resourceType) {
                        case 'node':
                            await apiClient.core.deleteNode(deleteParams);
                            break;
                        case 'namespace':
                            await apiClient.core.deleteNamespace(deleteParams);
                            break;
                        case 'persistentvolume':
                            await apiClient.core.deletePersistentVolume(deleteParams);
                            break;
                        case 'storageclass':
                            await apiClient.storage.deleteStorageClass(deleteParams);
                            break;
                        default:
                            throw new Error(`Unsupported cluster-scoped resource type: ${options.resourceType}`);
                    }
                }

                // Deletion succeeded
                return { success: true, shouldRefresh: true };
            } catch (error: unknown) {
                // Handle error using specialized delete error handler
                // Convert API error to kubectl-like error format for compatibility
                const apiError = error as { statusCode?: number; code?: number; body?: { message?: string }; message?: string };
                const kubectlLikeError = {
                    code: apiError.statusCode || apiError.code,
                    message: apiError.body?.message || apiError.message || 'Unknown error',
                    stderr: apiError.body?.message || apiError.message || '',
                    stdout: ''
                };
                const errorResult = handleDeleteError(kubectlLikeError, options);
                
                // Get output channel for logging
                const outputChannel = getDeleteOutputChannel();
                
                // Log error details to Output panel
                const timestamp = new Date().toISOString();
                const resourceDisplay = options.namespace
                    ? `${options.resourceType} '${options.resourceName}' in namespace '${options.namespace}'`
                    : `${options.resourceType} '${options.resourceName}'`;
                
                outputChannel.appendLine(`[${timestamp}] Failed to delete ${resourceDisplay}`);
                outputChannel.appendLine(`Error Type: ${errorResult.errorType}`);
                outputChannel.appendLine(`Message: ${errorResult.message}`);
                
                // Log additional error details if available
                const err = error as { 
                    stderr?: Buffer | string;
                    stdout?: Buffer | string;
                    message?: string;
                };
                if (err.stderr) {
                    const stderr = Buffer.isBuffer(err.stderr) ? err.stderr.toString() : err.stderr;
                    outputChannel.appendLine(`Stderr: ${stderr}`);
                }
                if (err.stdout) {
                    const stdout = Buffer.isBuffer(err.stdout) ? err.stdout.toString() : err.stdout;
                    outputChannel.appendLine(`Stdout: ${stdout}`);
                }
                if (err.message) {
                    outputChannel.appendLine(`Error Message: ${err.message}`);
                }
                outputChannel.appendLine(''); // Empty line for readability
                
                // Show output channel if it's not already visible
                outputChannel.show(true);
                
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

