import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { getClusterTreeProvider } from '../extension';
import { KubectlError, KubectlErrorType } from '../kubernetes/KubectlError';
import { PortForwardManager, PortForwardConfig } from '../services/PortForwardManager';
import { getKubernetesApiClient } from '../kubernetes/apiClient';

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
 * Interface for container port information.
 */
interface ContainerPort {
    name?: string;
    containerPort: number;
    protocol?: string;
}

/**
 * Interface for remote port selection result.
 */
interface RemotePortSelection {
    port: number;
    name?: string;
}

/**
 * Interface for pod metadata.
 */
interface PodMetadata {
    name: string;
    namespace: string;
    context: string;
    status: string;
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
 * Queries container ports from a pod's spec using the Kubernetes API client.
 * 
 * @param podName - The name of the pod
 * @param namespace - The namespace containing the pod
 * @param contextName - The kubectl context name
 * @returns Array of container ports, or empty array if query fails
 */
async function getContainerPorts(
    podName: string,
    namespace: string,
    contextName: string
): Promise<ContainerPort[]> {
    try {
        const client = getKubernetesApiClient();
        client.setContext(contextName);
        
        const pod = await client.core.readNamespacedPod({
            name: podName,
            namespace: namespace
        });
        
        const ports: ContainerPort[] = [];
        for (const container of pod.spec?.containers || []) {
            if (container.ports) {
                for (const port of container.ports) {
                    ports.push({
                        name: port.name,
                        containerPort: port.containerPort || 0,
                        protocol: port.protocol
                    });
                }
            }
        }
        
        return ports;
    } catch (error) {
        // Fallback: allow custom port entry even if can't read pod
        console.error('Failed to read pod ports:', error);
        return [];
    }
}

/**
 * Prompts user to select a remote port from container ports or enter a custom port.
 * 
 * @param containerPorts - Array of container ports from pod spec
 * @returns Selected port information, or undefined if user cancelled
 */
async function selectRemotePort(
    containerPorts: ContainerPort[]
): Promise<RemotePortSelection | undefined> {
    interface PortQuickPickItem extends vscode.QuickPickItem {
        port: number;
    }
    
    const items: PortQuickPickItem[] = [];
    
    // Add known container ports
    for (const cp of containerPorts) {
        const label = cp.name
            ? `${cp.containerPort} (${cp.name})`
            : `${cp.containerPort}`;
        const description = cp.protocol ? `Protocol: ${cp.protocol}` : undefined;
        
        items.push({
            label,
            description,
            port: cp.containerPort
        });
    }
    
    // Add custom port option
    items.push({
        label: '$(add) Custom port...',
        description: 'Enter a port number manually',
        port: -1 // Sentinel value
    });
    
    const selected = await vscode.window.showQuickPick(items, {
        title: 'Select Remote Port',
        placeHolder: 'Choose the port on the pod to forward',
        ignoreFocusOut: true
    });
    
    if (!selected) {
        return undefined; // User cancelled
    }
    
    // Handle custom port entry
    if (selected.port === -1) {
        const customPort = await vscode.window.showInputBox({
            title: 'Enter Remote Port',
            prompt: 'Enter the port number on the pod',
            placeHolder: 'e.g., 8080',
            validateInput: (value) => {
                const port = parseInt(value, 10);
                if (isNaN(port) || port < 1 || port > 65535) {
                    return 'Port must be a number between 1 and 65535';
                }
                return undefined;
            },
            ignoreFocusOut: true
        });
        
        if (!customPort) {
            return undefined;
        }
        
        return { port: parseInt(customPort, 10) };
    }
    
    return {
        port: selected.port,
        name: containerPorts.find(cp => cp.containerPort === selected.port)?.name
    };
}

/**
 * Prompts user to select a local port with intelligent defaults and availability checking.
 * 
 * @param remotePort - The remote port that was selected
 * @param manager - PortForwardManager instance for port availability checks
 * @returns Selected local port number, or undefined if user cancelled
 */
async function selectLocalPort(
    remotePort: number,
    manager: PortForwardManager
): Promise<number | undefined> {
    // Check if remote port is available locally
    const remotePortAvailable = await manager.isPortAvailable(remotePort);
    
    // Build default value and placeholder
    const defaultPort = remotePortAvailable ? remotePort : undefined;
    const suggestedPort = defaultPort || await manager.findNextAvailablePort(remotePort >= 1024 ? remotePort : 1024);
    
    const placeHolder = defaultPort
        ? `Default: ${defaultPort} (same as remote)`
        : `Suggested: ${suggestedPort} (${remotePort} is in use)`;
    
    const localPortInput = await vscode.window.showInputBox({
        title: 'Select Local Port',
        prompt: 'Choose the local port to bind on localhost',
        value: suggestedPort.toString(),
        placeHolder,
        validateInput: async (value) => {
            // Validate format
            const port = parseInt(value, 10);
            if (isNaN(port)) {
                return 'Port must be a number';
            }
            
            // Validate range (non-privileged ports)
            if (port < 1024 || port > 65535) {
                return 'Port must be between 1024 and 65535';
            }
            
            // Check availability (async validation)
            const available = await manager.isPortAvailable(port);
            if (!available) {
                try {
                    const alternative = await manager.findNextAvailablePort(port + 1);
                    return `Port ${port} is already in use. Try ${alternative}?`;
                } catch {
                    return `Port ${port} is already in use`;
                }
            }
            
            return undefined;
        },
        ignoreFocusOut: true
    });
    
    if (!localPortInput) {
        return undefined;
    }
    
    return parseInt(localPortInput, 10);
}

/**
 * Handles port forward errors with user-friendly messages and action buttons.
 * 
 * @param error - The error that occurred
 * @param metadata - Pod metadata
 * @param remotePort - Remote port that was attempted
 * @param localPort - Local port that was attempted
 */
function handlePortForwardError(
    error: unknown,
    metadata: PodMetadata,
    remotePort: number,
    localPort: number
): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Handle port conflict
    if (errorMessage.includes('already in use') || errorMessage.includes('port')) {
        const match = errorMessage.match(/Try port (\d+)/);
        const suggestedPort = match ? parseInt(match[1], 10) : localPort + 1;
        
        vscode.window.showErrorMessage(
            errorMessage,
            `Use ${suggestedPort}`
        ).then(action => {
            if (action === `Use ${suggestedPort}`) {
                // Retry with suggested port
                // Note: This would require refactoring to pass the retry port
                // For now, just show the error
                vscode.window.showInformationMessage(
                    `Please try again with port ${suggestedPort}`
                );
            }
        });
    } else if (errorMessage.includes('kubectl not found') || errorMessage.includes('ENOENT')) {
        vscode.window.showErrorMessage(
            'kubectl not found. Please install kubectl to use port forwarding.',
            'Install kubectl'
        ).then(action => {
            if (action === 'Install kubectl') {
                vscode.env.openExternal(
                    vscode.Uri.parse('https://kubernetes.io/docs/tasks/tools/install-kubectl/')
                );
            }
        });
    } else if (errorMessage.includes('Permission denied') || errorMessage.includes('Forbidden')) {
        vscode.window.showErrorMessage(
            `Permission denied: You need pods/portforward permission in namespace '${metadata.namespace}'`,
            'View RBAC Docs'
        ).then(action => {
            if (action === 'View RBAC Docs') {
                vscode.env.openExternal(
                    vscode.Uri.parse('https://kubernetes.io/docs/reference/access-authn-authz/rbac/')
                );
            }
        });
    } else if (errorMessage.includes('timeout') || errorMessage.includes('Connection timeout')) {
        vscode.window.showErrorMessage(
            `Port forward connection timed out. Check pod logs and try again.`,
            'Retry'
        ).then(action => {
            if (action === 'Retry') {
                // Note: Would need to store metadata to retry
                vscode.window.showInformationMessage('Please try the port forward again');
            }
        });
    } else {
        vscode.window.showErrorMessage(
            `Failed to start port forward: ${errorMessage}`,
            'Retry'
        ).then(action => {
            if (action === 'Retry') {
                vscode.window.showInformationMessage('Please try the port forward again');
            }
        });
    }
}

/**
 * Command handler to start port forwarding for a Kubernetes Pod resource.
 * This is triggered from the tree view context menu.
 * 
 * @param treeItem The Pod tree item that was right-clicked
 */
export async function portForwardPodCommand(treeItem: ClusterTreeItem): Promise<void> {
    // Declare variables outside try block for error handling access
    let podName = 'unknown';
    let namespace = 'default';
    let contextName = 'unknown';
    
    try {
        // 1. Validate tree item
        if (!treeItem || !treeItem.contextValue?.startsWith('resource:')) {
            vscode.window.showErrorMessage('Failed to start port forward: Invalid resource');
            return;
        }
        
        // 2. Validate that this is specifically a Pod resource
        if (treeItem.contextValue !== 'resource:Pod') {
            vscode.window.showErrorMessage('Failed to start port forward: Resource is not a Pod');
            return;
        }
        
        // 3. Validate resourceData exists
        if (!treeItem.resourceData) {
            vscode.window.showErrorMessage('Failed to start port forward: Missing resource data');
            return;
        }
        
        // 4. Extract pod metadata
        podName = treeItem.resourceData.resourceName || (typeof treeItem.label === 'string' ? treeItem.label : treeItem.label?.toString() || '');
        namespace = treeItem.resourceData.namespace || 'default';
        
        // Get kubeconfig path from tree provider
        const treeProvider = getClusterTreeProvider();
        const kubeconfigPath = treeProvider.getKubeconfigPath();
        if (!kubeconfigPath) {
            vscode.window.showErrorMessage('Failed to start port forward: Kubeconfig path not available');
            return;
        }
        
        // Get context name from resourceData
        contextName = treeItem.resourceData.context.name;
        
        if (!podName || !contextName) {
            vscode.window.showErrorMessage('Failed to start port forward: Missing resource information');
            return;
        }
        
        const metadata: PodMetadata = {
            name: podName,
            namespace,
            context: contextName,
            status: ''
        };
        
        // 5. Query pod status
        let podStatus: PodStatusResponse;
        try {
            podStatus = await queryPodStatus(podName, namespace, contextName, kubeconfigPath);
        } catch (error) {
            const kubectlError = error instanceof KubectlError ? error : KubectlError.fromExecError(error, contextName);
            
            if (kubectlError.type === KubectlErrorType.BinaryNotFound) {
                vscode.window.showErrorMessage(
                    'kubectl not found. Please install kubectl to use port forwarding.',
                    'Install kubectl'
                ).then(action => {
                    if (action === 'Install kubectl') {
                        vscode.env.openExternal(
                            vscode.Uri.parse('https://kubernetes.io/docs/tasks/tools/install-kubectl/')
                        );
                    }
                });
                return;
            }
            
            vscode.window.showErrorMessage(
                `Failed to query pod status: ${kubectlError.getUserMessage()}`
            );
            return;
        }
        
        // 6. Verify pod is in Running state
        if (podStatus.status.phase !== 'Running') {
            vscode.window.showErrorMessage(
                `Cannot port forward: Pod '${podName}' is not in Running state (current: ${podStatus.status.phase})`
            );
            return;
        }
        
        metadata.status = podStatus.status.phase;
        
        // 7. Query container ports
        const containerPorts = await getContainerPorts(podName, namespace, contextName);
        
        // 8. Show remote port selection
        const remotePortSelection = await selectRemotePort(containerPorts);
        if (!remotePortSelection) {
            // User cancelled
            return;
        }
        
        const remotePort = remotePortSelection.port;
        
        // 9. Show local port selection
        const manager = PortForwardManager.getInstance();
        const localPort = await selectLocalPort(remotePort, manager);
        if (!localPort) {
            // User cancelled
            return;
        }
        
        // 10. Start port forward with progress indication
        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Starting port forward for ${podName}...`,
                    cancellable: false
                },
                async () => {
                    const config: PortForwardConfig = {
                        podName: metadata.name,
                        namespace: metadata.namespace,
                        context: metadata.context,
                        localPort: localPort,
                        remotePort: remotePort
                    };
                    
                    await manager.startForward(config);
                    
                    // Success notification with action buttons
                    const action = await vscode.window.showInformationMessage(
                        `✅ Port forward established: localhost:${localPort} → ${metadata.namespace}/${metadata.name}:${remotePort}`,
                        'Open Browser',
                        'Show Forwards'
                    );
                    
                    if (action === 'Open Browser') {
                        vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${localPort}`));
                    } else if (action === 'Show Forwards') {
                        vscode.commands.executeCommand('kube9.showPortForwards');
                    }
                }
            );
        } catch (error) {
            handlePortForwardError(error, metadata, remotePort, localPort);
        }
        
    } catch (error) {
        // Convert error to KubectlError if not already
        const kubectlError = error instanceof KubectlError 
            ? error 
            : KubectlError.fromExecError(error, contextName);
        
        const errorMessage = kubectlError.getUserMessage();
        console.error('Error in portForwardPodCommand:', {
            errorType: kubectlError.type,
            podName,
            namespace,
            contextName,
            details: kubectlError.getDetails(),
            error: error instanceof Error ? error.message : String(error)
        });
        vscode.window.showErrorMessage(`Failed to start port forward: ${errorMessage}`);
    }
}

