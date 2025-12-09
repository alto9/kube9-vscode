import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { getClusterTreeProvider } from '../extension';
import { KubectlError } from '../kubernetes/KubectlError';

/**
 * Timeout for kubectl commands in milliseconds.
 */
const KUBECTL_TIMEOUT_MS = 30000;

/**
 * Promisified version of execFile for async/await usage.
 */
const execFileAsync = promisify(execFile);

/**
 * Interface for Kubernetes pod status response from kubectl get pod.
 */
interface PodStatusResponse {
    metadata: { name: string; namespace: string };
    spec: {
        containers: Array<{ name: string; image: string }>;
        initContainers?: Array<{ name: string; image: string }>;
    };
    status: {
        phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown';
    };
}

/**
 * Queries the status of a Kubernetes pod using kubectl.
 * Verifies the pod exists and extracts its status and container information.
 * 
 * @param podName - The name of the pod to query
 * @param namespace - The namespace containing the pod
 * @param contextName - The kubectl context name
 * @param kubeconfigPath - The path to the kubeconfig file
 * @returns PodStatusResponse with pod status and container information
 * @throws {KubectlError} If kubectl command fails or pod not found
 */
async function queryPodStatus(
    podName: string,
    namespace: string,
    contextName: string,
    kubeconfigPath: string
): Promise<PodStatusResponse> {
    // Build kubectl command arguments
    const args = [
        'get',
        'pod',
        podName,
        `--namespace=${namespace}`,
        '--output=json',
        `--kubeconfig=${kubeconfigPath}`,
        `--context=${contextName}`
    ];

    try {
        // Execute kubectl get pod command
        const { stdout } = await execFileAsync(
            'kubectl',
            args,
            {
                timeout: KUBECTL_TIMEOUT_MS,
                maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                env: { ...process.env }
            }
        );

        // Parse the JSON response
        const response: PodStatusResponse = JSON.parse(stdout);
        return response;
    } catch (error: unknown) {
        // Create structured error for detailed handling
        const kubectlError = KubectlError.fromExecError(error, contextName);
        throw kubectlError;
    }
}

/**
 * Command handler to open a terminal for a Kubernetes Pod resource.
 * This is triggered from the tree view context menu.
 * 
 * @param treeItem The Pod tree item that was right-clicked
 */
export async function openTerminalCommand(treeItem: ClusterTreeItem): Promise<void> {
    try {
        // 1. Validate tree item
        if (!treeItem || !treeItem.contextValue?.startsWith('resource:')) {
            vscode.window.showErrorMessage('Failed to open terminal: Invalid resource');
            return;
        }
        
        // 2. Validate that this is specifically a Pod resource
        if (treeItem.contextValue !== 'resource:Pod') {
            vscode.window.showErrorMessage('Failed to open terminal: Resource is not a Pod');
            return;
        }
        
        // 3. Validate resourceData exists
        if (!treeItem.resourceData) {
            vscode.window.showErrorMessage('Failed to open terminal: Missing resource data');
            return;
        }
        
        // 4. Extract pod metadata
        const podName = treeItem.resourceData.resourceName || (typeof treeItem.label === 'string' ? treeItem.label : treeItem.label?.toString() || '');
        const namespace = treeItem.resourceData.namespace || 'default';
        
        // Get kubeconfig path from tree provider
        const treeProvider = getClusterTreeProvider();
        const kubeconfigPath = treeProvider.getKubeconfigPath();
        if (!kubeconfigPath) {
            vscode.window.showErrorMessage('Failed to open terminal: Kubeconfig path not available');
            return;
        }
        
        // Get context name from resourceData
        const contextName = treeItem.resourceData.context.name;
        
        if (!podName || !contextName) {
            vscode.window.showErrorMessage('Failed to open terminal: Missing resource information');
            return;
        }
        
        // Log extracted information for verification
        console.log('Open terminal command invoked:', {
            podName,
            namespace,
            contextName,
            kubeconfigPath
        });
        
        // 5. Query pod status
        let podStatus: PodStatusResponse;
        try {
            podStatus = await queryPodStatus(podName, namespace, contextName, kubeconfigPath);
        } catch (error) {
            const kubectlError = error instanceof KubectlError ? error : KubectlError.fromExecError(error, contextName);
            console.error('Error querying pod status:', kubectlError.getDetails());
            vscode.window.showErrorMessage(
                `Failed to open terminal: ${kubectlError.getUserMessage()}`
            );
            return;
        }
        
        // 6. Verify pod is in Running state
        if (podStatus.status.phase !== 'Running') {
            vscode.window.showErrorMessage(
                `Cannot open terminal: Pod '${podName}' is not in Running state (current: ${podStatus.status.phase})`
            );
            return;
        }
        
        // 7. Extract container names (exclude init containers)
        const containerNames = podStatus.spec.containers.map(container => container.name);
        
        if (containerNames.length === 0) {
            vscode.window.showErrorMessage('Failed to open terminal: No containers found in pod');
            return;
        }
        
        // Store container list for next step (container selection)
        // TODO: Select container if multiple, create terminal
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error in openTerminalCommand:', errorMessage);
        vscode.window.showErrorMessage(
            `Failed to open terminal: ${errorMessage}`
        );
    }
}

