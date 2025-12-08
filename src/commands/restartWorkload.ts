import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { KubectlError } from '../kubernetes/KubectlError';

/**
 * Timeout for kubectl patch commands in milliseconds.
 */
const KUBECTL_TIMEOUT_MS = 30000;

/**
 * Promisified version of execFile for async/await usage.
 */
const execFileAsync = promisify(execFile);

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
 * Maps Kubernetes resource kind to kubectl resource name.
 * 
 * @param kind - The Kubernetes resource kind (e.g., "Deployment", "StatefulSet")
 * @returns The kubectl resource name (e.g., "deployment", "statefulset")
 */
function getKubectlResourceName(kind: string): string {
    const kindMap: { [key: string]: string } = {
        'Deployment': 'deployment',
        'StatefulSet': 'statefulset',
        'DaemonSet': 'daemonset'
    };
    
    const resourceName = kindMap[kind];
    if (!resourceName) {
        throw new Error(`Unsupported workload kind: ${kind}`);
    }
    
    return resourceName;
}

/**
 * Applies the restart annotation to a Kubernetes workload resource.
 * Uses kubectl patch with JSON Patch format to add/update the restart annotation.
 * 
 * @param name - The name of the workload resource
 * @param namespace - The namespace containing the resource (undefined for cluster-scoped)
 * @param kind - The Kubernetes resource kind (Deployment, StatefulSet, or DaemonSet)
 * @param contextName - The kubectl context name
 * @param kubeconfigPath - The path to the kubeconfig file
 * @throws {KubectlError} If kubectl patch command fails
 */
export async function applyRestartAnnotation(
    name: string,
    namespace: string | undefined,
    kind: string,
    contextName: string,
    kubeconfigPath: string
): Promise<void> {
    // Generate ISO 8601 timestamp
    const timestamp = new Date().toISOString();
    
    // Create annotation key
    const annotationKey = 'kubectl.kubernetes.io/restartedAt';
    
    // Escape forward slash for JSON Patch path (RFC 6901: / becomes ~1)
    const escapedKey = annotationKey.replace('/', '~1');
    
    // Create JSON Patch payload
    const patch = [
        {
            op: 'add',
            path: `/spec/template/metadata/annotations/${escapedKey}`,
            value: timestamp
        }
    ];
    
    // Get kubectl resource name
    const resourceName = getKubectlResourceName(kind);
    
    // Build kubectl patch command arguments
    const args = [
        'patch',
        resourceName,
        name,
        '--type=json',
        `-p=${JSON.stringify(patch)}`,
        `--kubeconfig=${kubeconfigPath}`,
        `--context=${contextName}`
    ];
    
    // Add namespace flag for namespaced resources
    if (namespace) {
        args.push('-n', namespace);
    }
    
    try {
        // Execute kubectl patch command
        await execFileAsync('kubectl', args, {
            timeout: KUBECTL_TIMEOUT_MS,
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            env: { ...process.env }
        });
        
        console.log(`Successfully applied restart annotation to ${kind}/${name}`);
    } catch (error: unknown) {
        // Convert execution error to structured KubectlError
        const kubectlError = KubectlError.fromExecError(error, contextName);
        
        // Log detailed error for debugging
        console.error(`Failed to apply restart annotation to ${kind}/${name}: ${kubectlError.getDetails()}`);
        
        // Throw error for caller to handle
        throw new Error(`Failed to apply restart annotation: ${kubectlError.getUserMessage()}`);
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
 * Kubernetes workload resource response structure.
 */
interface WorkloadResource {
    metadata?: {
        name?: string;
        namespace?: string;
    };
    spec?: {
        replicas?: number;
    };
    status?: {
        replicas?: number;
        readyReplicas?: number;
        updatedReplicas?: number;
        availableReplicas?: number;
        // DaemonSet specific fields
        desiredNumberScheduled?: number;
        numberReady?: number;
        updatedNumberScheduled?: number;
        numberAvailable?: number;
    };
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
 * Queries the status of a Kubernetes workload resource.
 * Extracts replica counts from the workload status.
 * 
 * @param name - The name of the workload resource
 * @param namespace - The namespace containing the resource (undefined for cluster-scoped)
 * @param kind - The Kubernetes resource kind (Deployment, StatefulSet, or DaemonSet)
 * @param contextName - The kubectl context name
 * @param kubeconfigPath - The path to the kubeconfig file
 * @returns WorkloadStatus with replica counts
 * @throws Error if kubectl command fails or resource not found
 */
export async function getWorkloadStatus(
    name: string,
    namespace: string | undefined,
    kind: string,
    contextName: string,
    kubeconfigPath: string
): Promise<WorkloadStatus> {
    // Get kubectl resource name
    const resourceName = getKubectlResourceName(kind);
    
    // Build kubectl get command arguments
    const args = [
        'get',
        resourceName,
        name,
        '--output=json',
        `--kubeconfig=${kubeconfigPath}`,
        `--context=${contextName}`
    ];
    
    // Add namespace flag for namespaced resources
    if (namespace) {
        args.push('-n', namespace);
    }
    
    try {
        // Execute kubectl get command
        const { stdout } = await execFileAsync('kubectl', args, {
            timeout: KUBECTL_TIMEOUT_MS,
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            env: { ...process.env }
        });
        
        // Parse JSON response
        const resource: WorkloadResource = JSON.parse(stdout);
        
        // Extract replica counts based on workload type
        const spec = resource.spec || {};
        const status = resource.status || {};
        
        // For DaemonSets, use different field names
        if (kind === 'DaemonSet') {
            return {
                desiredReplicas: status.desiredNumberScheduled || 0,
                readyReplicas: status.numberReady || 0,
                updatedReplicas: status.updatedNumberScheduled || 0,
                availableReplicas: status.numberAvailable || 0
            };
        }
        
        // For Deployments and StatefulSets
        return {
            desiredReplicas: spec.replicas || 0,
            readyReplicas: status.readyReplicas || 0,
            updatedReplicas: status.updatedReplicas || 0,
            availableReplicas: status.availableReplicas || 0
        };
    } catch (error: unknown) {
        // Convert execution error to structured KubectlError
        const kubectlError = KubectlError.fromExecError(error, contextName);
        
        // Log detailed error for debugging
        console.error(`Failed to get workload status for ${kind}/${name}: ${kubectlError.getDetails()}`);
        
        // Throw error for caller to handle
        throw new Error(`Failed to get workload status: ${kubectlError.getUserMessage()}`);
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
 * @throws Error if rollout times out after 5 minutes
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
    throw new Error('Rollout timed out after 5 minutes');
}

