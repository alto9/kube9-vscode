import * as vscode from 'vscode';
import { KubectlError } from '../kubernetes/KubectlError';
import { getKubernetesApiClient } from '../kubernetes/apiClient';


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


/**
 * Applies the restart annotation to a Kubernetes workload resource.
 * Uses the Kubernetes API client to patch the resource with the restart annotation.
 * 
 * @param name - The name of the workload resource
 * @param namespace - The namespace containing the resource (undefined for cluster-scoped)
 * @param kind - The Kubernetes resource kind (Deployment, StatefulSet, or DaemonSet)
 * @param contextName - The kubectl context name
 * @param kubeconfigPath - The path to the kubeconfig file (unused, kept for backward compatibility)
 * @throws {KubectlError} If API patch operation fails
 */
export async function applyRestartAnnotation(
    name: string,
    namespace: string | undefined,
    kind: string,
    contextName: string,
    _kubeconfigPath: string // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<void> {
    // Generate ISO 8601 timestamp
    const timestamp = new Date().toISOString();
    
    // Create annotation key
    const annotationKey = 'kubectl.kubernetes.io/restartedAt';
    
    // Set context on API client
    const apiClient = getKubernetesApiClient();
    apiClient.setContext(contextName);
    
    // Use strategic merge patch - this automatically creates nested objects if they don't exist
    // and merges the annotation into existing annotations
    const mergePatch = {
        spec: {
            template: {
                metadata: {
                    annotations: {
                        [annotationKey]: timestamp
                    }
                }
            }
        }
    };
    
    try {
        // Route to appropriate patch method based on workload type
        if (!namespace) {
            throw new Error('Workload resources must have a namespace');
        }
        
        switch (kind) {
            case 'Deployment':
                await apiClient.apps.patchNamespacedDeployment({
                    name,
                    namespace,
                    body: mergePatch
                });
                break;
            case 'StatefulSet':
                await apiClient.apps.patchNamespacedStatefulSet({
                    name,
                    namespace,
                    body: mergePatch
                });
                break;
            case 'DaemonSet':
                await apiClient.apps.patchNamespacedDaemonSet({
                    name,
                    namespace,
                    body: mergePatch
                });
                break;
            default:
                throw new Error(`Unsupported workload kind: ${kind}`);
        }
        
        console.log(`Successfully applied restart annotation to ${kind}/${name}`);
    } catch (error: unknown) {
        // Convert execution error to structured KubectlError
        const kubectlError = KubectlError.fromExecError(error, contextName);
        
        // Log detailed error for debugging
        console.error(`Failed to apply restart annotation to ${kind}/${name}`, {
            errorType: kubectlError.type,
            contextName,
            resourceName: name,
            namespace,
            kind,
            details: kubectlError.getDetails()
        });
        
        // Throw KubectlError directly for caller to handle
        throw kubectlError;
    }
}

/**
 * Workload status information extracted from Kubernetes API.
 */
export interface WorkloadStatus {
    desiredReplicas: number;
    readyReplicas: number;
    updatedReplicas: number;
    availableReplicas: number;
}


/**
 * Sleep utility function for creating delays in async code.
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the specified delay
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Queries the status of a Kubernetes workload resource using the Kubernetes API client.
 * Extracts replica counts from the workload status.
 * 
 * @param name - The name of the workload resource
 * @param namespace - The namespace containing the resource (undefined for cluster-scoped)
 * @param kind - The Kubernetes resource kind (Deployment, StatefulSet, or DaemonSet)
 * @param contextName - The kubectl context name
 * @param kubeconfigPath - The path to the kubeconfig file (unused, kept for backward compatibility)
 * @returns WorkloadStatus with replica counts
 * @throws {KubectlError} If API call fails or resource not found
 */
export async function getWorkloadStatus(
    name: string,
    namespace: string | undefined,
    kind: string,
    contextName: string,
    _kubeconfigPath: string // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<WorkloadStatus> {
    // Set context on API client
    const apiClient = getKubernetesApiClient();
    apiClient.setContext(contextName);
    
    if (!namespace) {
        throw new Error('Workload resources must have a namespace');
    }
    
    try {
        let desiredReplicas = 0;
        let readyReplicas = 0;
        let updatedReplicas = 0;
        let availableReplicas = 0;
        
        // Route to appropriate read method based on workload type
        switch (kind) {
            case 'Deployment': {
                const resource = await apiClient.apps.readNamespacedDeployment({
                    name,
                    namespace
                });
                desiredReplicas = resource.spec?.replicas || 0;
                readyReplicas = resource.status?.readyReplicas || 0;
                updatedReplicas = resource.status?.updatedReplicas || 0;
                availableReplicas = resource.status?.availableReplicas || 0;
                break;
            }
            case 'StatefulSet': {
                const resource = await apiClient.apps.readNamespacedStatefulSet({
                    name,
                    namespace
                });
                desiredReplicas = resource.spec?.replicas || 0;
                readyReplicas = resource.status?.readyReplicas || 0;
                updatedReplicas = resource.status?.updatedReplicas || 0;
                availableReplicas = resource.status?.availableReplicas || 0;
                break;
            }
            case 'DaemonSet': {
                const resource = await apiClient.apps.readNamespacedDaemonSet({
                    name,
                    namespace
                });
                desiredReplicas = resource.status?.desiredNumberScheduled || 0;
                readyReplicas = resource.status?.numberReady || 0;
                updatedReplicas = resource.status?.updatedNumberScheduled || 0;
                availableReplicas = resource.status?.numberAvailable || 0;
                break;
            }
            default:
                throw new Error(`Unsupported workload kind: ${kind}`);
        }
        
        return {
            desiredReplicas,
            readyReplicas,
            updatedReplicas,
            availableReplicas
        };
    } catch (error: unknown) {
        // Convert execution error to structured KubectlError
        const kubectlError = KubectlError.fromExecError(error, contextName);
        
        // Log detailed error for debugging
        console.error(`Failed to get workload status for ${kind}/${name}`, {
            errorType: kubectlError.type,
            contextName,
            resourceName: name,
            namespace,
            kind,
            details: kubectlError.getDetails()
        });
        
        // Throw KubectlError directly for caller to handle
        throw kubectlError;
    }
}

/**
 * Custom error for rollout timeout scenarios.
 * Provides context about which resource timed out.
 */
export class RolloutTimeoutError extends Error {
    public readonly resourceName: string;
    public readonly namespace: string | undefined;
    public readonly kind: string;
    public readonly contextName: string;

    constructor(
        resourceName: string,
        namespace: string | undefined,
        kind: string,
        contextName: string
    ) {
        const namespaceStr = namespace ? ` in namespace ${namespace}` : '';
        super(`Rollout did not complete within 5 minutes for ${kind} ${resourceName}${namespaceStr}`);
        this.name = 'RolloutTimeoutError';
        this.resourceName = resourceName;
        this.namespace = namespace;
        this.kind = kind;
        this.contextName = contextName;
    }
}

/**
 * Checks if a workload rollout is complete.
 * A rollout is complete when all replica counts match the desired count.
 * 
 * @param status - The workload status to check
 * @returns true if rollout is complete, false otherwise
 */
function isRolloutComplete(status: WorkloadStatus): boolean {
    return status.readyReplicas === status.desiredReplicas &&
           status.updatedReplicas === status.desiredReplicas &&
           status.availableReplicas === status.desiredReplicas;
}

/**
 * Watches the rollout status of a Kubernetes workload, polling every 2 seconds
 * until all replicas are ready or a 5-minute timeout is reached.
 * 
 * @param name - The name of the workload resource
 * @param namespace - The namespace containing the resource (undefined for cluster-scoped)
 * @param kind - The Kubernetes resource kind (Deployment, StatefulSet, or DaemonSet)
 * @param contextName - The kubectl context name
 * @param kubeconfigPath - The path to the kubeconfig file
 * @param progress - VS Code progress object for updating notification messages
 * @throws {RolloutTimeoutError} If rollout times out after 5 minutes
 * @throws {KubectlError} If kubectl command fails
 */
export async function watchRolloutStatus(
    name: string,
    namespace: string | undefined,
    kind: string,
    contextName: string,
    kubeconfigPath: string,
    progress: vscode.Progress<{ message?: string }>
): Promise<void> {
    const maxWaitTime = 300000; // 5 minutes in milliseconds
    const pollInterval = 2000; // 2 seconds in milliseconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
        // Get current workload status
        const status = await getWorkloadStatus(
            name,
            namespace,
            kind,
            contextName,
            kubeconfigPath
        );
        
        // Check if rollout is complete
        if (isRolloutComplete(status)) {
            progress.report({ message: 'Rollout complete' });
            return;
        }
        
        // Update progress notification with replica counts
        progress.report({
            message: `Rolling update in progress (${status.readyReplicas}/${status.desiredReplicas} ready)...`
        });
        
        // Wait before next poll
        await sleep(pollInterval);
    }
    
    // Timeout reached without completion
    // Log timeout with details before throwing
    console.error(`Rollout timeout for ${kind}/${name}`, {
        resourceName: name,
        namespace,
        kind,
        contextName,
        elapsedTime: Date.now() - startTime,
        maxWaitTime
    });
    
    throw new RolloutTimeoutError(name, namespace, kind, contextName);
}

