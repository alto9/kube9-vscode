import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { getClusterTreeProvider } from '../extension';
import { KubectlError, KubectlErrorType } from '../kubernetes/KubectlError';
import { getKubernetesApiClient } from '../kubernetes/apiClient';


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
 * Queries the status of a Kubernetes pod using the Kubernetes API client.
 * Verifies the pod exists and extracts its status and container information.
 * 
 * @param podName - The name of the pod to query
 * @param namespace - The namespace containing the pod
 * @param contextName - The kubectl context name
 * @param kubeconfigPath - The path to the kubeconfig file (unused, kept for backward compatibility)
 * @returns PodStatusResponse with pod status and container information
 * @throws {KubectlError} If API call fails or pod not found
 */
async function queryPodStatus(
    podName: string,
    namespace: string,
    contextName: string,
    _kubeconfigPath: string // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<PodStatusResponse> {
    try {
        // Set context on API client
        const apiClient = getKubernetesApiClient();
        apiClient.setContext(contextName);
        
        // Fetch pod from API
        const pod = await apiClient.core.readNamespacedPod({
            name: podName,
            namespace
        });
        
        // Transform k8s.V1Pod to PodStatusResponse format
        const response: PodStatusResponse = {
            metadata: {
                name: pod.metadata?.name || podName,
                namespace: pod.metadata?.namespace || namespace
            },
            spec: {
                containers: (pod.spec?.containers || []).map(container => ({
                    name: container.name || '',
                    image: container.image || ''
                })),
                initContainers: (pod.spec?.initContainers || []).map(container => ({
                    name: container.name || '',
                    image: container.image || ''
                }))
            },
            status: {
                phase: (pod.status?.phase as PodStatusResponse['status']['phase']) || 'Unknown'
            }
        };
        
        return response;
    } catch (error: unknown) {
        // Create structured error for detailed handling
        const kubectlError = KubectlError.fromExecError(error, contextName);
        throw kubectlError;
    }
}

/**
 * Prompts user to select a container from a list of container names.
 * For single-container pods, returns the container name immediately without prompting.
 * 
 * @param containerNames - Array of container names from the pod
 * @returns Selected container name, or undefined if user cancelled
 */
async function selectContainer(containerNames: string[]): Promise<string | undefined> {
    // Single container: return immediately without prompt
    if (containerNames.length === 1) {
        return containerNames[0];
    }
    
    // Multiple containers: show quick pick dialog
    const selected = await vscode.window.showQuickPick(containerNames, {
        title: 'Select Container',
        placeHolder: 'Choose a container to open terminal in'
    });
    
    return selected; // Returns undefined if user cancelled
}

/**
 * Builds the kubectl exec command string for opening an interactive terminal in a pod.
 * 
 * @param podName - The name of the pod to exec into
 * @param namespace - The namespace containing the pod
 * @param context - The kubectl context name
 * @param containerName - Optional container name for multi-container pods
 * @returns Complete kubectl exec command string ready for terminal execution
 */
function buildKubectlExecCommand(
    podName: string,
    namespace: string,
    context: string,
    containerName?: string
): string {
    // Build command components
    const parts = [
        'kubectl',
        'exec',
        '-it',
        podName,
        `-n ${namespace}`,
        `--context ${context}`
    ];
    
    // Add container flag only if container name is provided
    if (containerName) {
        parts.push(`-c ${containerName}`);
    }
    
    // Add shell command
    parts.push('-- /bin/sh');
    
    // Join all parts with spaces
    return parts.join(' ');
}

/**
 * Builds the terminal name string for VS Code terminal display.
 * 
 * @param podName - The name of the pod
 * @param namespace - The namespace containing the pod
 * @param containerName - Optional container name for multi-container pods
 * @returns Terminal name string formatted as "Kube9: namespace/pod-name" or "Kube9: namespace/pod-name (container)"
 */
function buildTerminalName(
    podName: string,
    namespace: string,
    containerName?: string
): string {
    const baseName = `Kube9: ${namespace}/${podName}`;
    
    // Add container name for multi-container pods
    if (containerName) {
        return `${baseName} (${containerName})`;
    }
    
    return baseName;
}

/**
 * Formats error messages for terminal command failures with pod-specific context.
 * Provides user-friendly, actionable error messages based on error type and details.
 * 
 * @param kubectlError - The structured kubectl error
 * @param podName - The name of the pod
 * @param namespace - The namespace containing the pod
 * @returns User-friendly error message string
 */
function getTerminalErrorMessage(
    kubectlError: KubectlError,
    podName: string,
    namespace: string
): string {
    const errorDetails = kubectlError.getDetails().toLowerCase();
    
    // Check for kubectl binary not found
    if (kubectlError.type === KubectlErrorType.BinaryNotFound) {
        return 'kubectl not found. Please install kubectl to use this feature.';
    }
    
    // Check for pod not found errors (check error details for "not found" patterns)
    if (
        errorDetails.includes('notfound') ||
        errorDetails.includes('not found') ||
        errorDetails.includes('does not exist')
    ) {
        return `Pod '${podName}' not found in namespace '${namespace}'`;
    }
    
    // Check for permission denied errors
    if (kubectlError.type === KubectlErrorType.PermissionDenied) {
        return 'Permission denied: Unable to exec into pod. Check your RBAC permissions for pod/exec resource.';
    }
    
    // Check for connection/network errors
    if (kubectlError.type === KubectlErrorType.ConnectionFailed) {
        return `Failed to connect to pod: ${kubectlError.getDetails()}`;
    }
    
    // Generic error catch-all
    return `Failed to open terminal: ${kubectlError.getUserMessage()}`;
}

/**
 * Command handler to open a terminal for a Kubernetes Pod resource.
 * This is triggered from the tree view context menu.
 * 
 * @param treeItem The Pod tree item that was right-clicked
 */
export async function openTerminalCommand(treeItem: ClusterTreeItem): Promise<void> {
    // Declare variables outside try block for error handling access
    let podName = 'unknown';
    let namespace = 'default';
    let contextName = 'unknown';
    
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
        podName = treeItem.resourceData.resourceName || (typeof treeItem.label === 'string' ? treeItem.label : treeItem.label?.toString() || '');
        namespace = treeItem.resourceData.namespace || 'default';
        
        // Get kubeconfig path from tree provider
        const treeProvider = getClusterTreeProvider();
        const kubeconfigPath = treeProvider.getKubeconfigPath();
        if (!kubeconfigPath) {
            vscode.window.showErrorMessage('Failed to open terminal: Kubeconfig path not available');
            return;
        }
        
        // Get context name from resourceData
        contextName = treeItem.resourceData.context.name;
        
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
            const errorMessage = getTerminalErrorMessage(kubectlError, podName, namespace);
            console.error('Error querying pod status:', {
                errorType: kubectlError.type,
                podName,
                namespace,
                contextName,
                details: kubectlError.getDetails()
            });
            vscode.window.showErrorMessage(errorMessage);
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
        
        // Select container (prompts user if multiple containers)
        const selectedContainer = await selectContainer(containerNames);
        if (selectedContainer === undefined) {
            // User cancelled selection
            return;
        }
        
        // Build kubectl exec command and terminal name
        const kubectlCommand = buildKubectlExecCommand(podName, namespace, contextName, selectedContainer);
        const terminalName = buildTerminalName(podName, namespace, selectedContainer);
        
        // Create VS Code terminal with formatted name
        // Terminal will execute kubectl exec command immediately
        // User will see connection establishment
        // Once connected, shell prompt will appear
        // Terminal remains open even after exit for review
        const terminal = vscode.window.createTerminal({
            name: terminalName
        });
        
        // Send the kubectl exec command to the terminal
        terminal.sendText(kubectlCommand);
        
        // Focus the terminal so it's visible to the user
        terminal.show();
        
    } catch (error) {
        // Convert error to KubectlError if not already
        const kubectlError = error instanceof KubectlError 
            ? error 
            : KubectlError.fromExecError(error, contextName);
        
        const errorMessage = getTerminalErrorMessage(kubectlError, podName, namespace);
        console.error('Error in openTerminalCommand:', {
            errorType: kubectlError.type,
            podName,
            namespace,
            contextName,
            details: kubectlError.getDetails(),
            error: error instanceof Error ? error.message : String(error)
        });
        vscode.window.showErrorMessage(errorMessage);
    }
}

