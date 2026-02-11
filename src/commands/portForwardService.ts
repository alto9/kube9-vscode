import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { getClusterTreeProvider } from '../extension';
import { PortForwardManager, PortForwardConfig } from '../services/PortForwardManager';
import { getKubernetesApiClient } from '../kubernetes/apiClient';

/**
 * Interface for Service port information.
 */
interface ServicePortInfo {
    port: number;
    name?: string;
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
 * Interface for Service metadata.
 */
interface ServiceMetadata {
    name: string;
    namespace: string;
    context: string;
}

/**
 * Queries Service ports from the Kubernetes API.
 *
 * @param serviceName - The name of the Service
 * @param namespace - The namespace containing the Service
 * @param contextName - The kubectl context name
 * @returns Array of Service port info, or empty if query fails
 */
async function getServicePorts(
    serviceName: string,
    namespace: string,
    contextName: string
): Promise<ServicePortInfo[]> {
    const client = getKubernetesApiClient();
    client.setContext(contextName);

    const service = await client.core.readNamespacedService({
        name: serviceName,
        namespace
    });

    const ports: ServicePortInfo[] = [];
    for (const p of service.spec?.ports || []) {
        const port = p.port ?? 0;
        if (port > 0) {
            ports.push({
                port,
                name: p.name,
                protocol: p.protocol
            });
        }
    }
    return ports;
}

/**
 * Prompts user to select a remote port from Service ports or enter a custom port.
 *
 * @param servicePorts - Array of Service ports
 * @returns Selected port information, or undefined if user cancelled
 */
async function selectRemotePort(
    servicePorts: ServicePortInfo[]
): Promise<RemotePortSelection | undefined> {
    interface PortQuickPickItem extends vscode.QuickPickItem {
        port: number;
    }

    const items: PortQuickPickItem[] = [];

    for (const sp of servicePorts) {
        const label = sp.name
            ? `${sp.port} (${sp.name})`
            : `${sp.port}`;
        const description = sp.protocol ? `Protocol: ${sp.protocol}` : undefined;

        items.push({
            label,
            description,
            port: sp.port
        });
    }

    items.push({
        label: '$(add) Custom port...',
        description: 'Enter a port number manually',
        port: -1
    });

    const selected = await vscode.window.showQuickPick(items, {
        title: 'Select Remote Port',
        placeHolder: 'Choose the port on the Service to forward',
        ignoreFocusOut: true
    });

    if (!selected) {
        return undefined;
    }

    if (selected.port === -1) {
        const customPort = await vscode.window.showInputBox({
            title: 'Enter Remote Port',
            prompt: 'Enter the port number on the Service',
            placeHolder: 'e.g., 80',
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
        name: servicePorts.find(sp => sp.port === selected.port)?.name
    };
}

/**
 * Prompts user to select a local port with validation and availability checking.
 *
 * @param remotePort - The remote port that was selected
 * @param manager - PortForwardManager instance for port availability checks
 * @returns Selected local port number, or undefined if user cancelled
 */
async function selectLocalPort(
    remotePort: number,
    manager: PortForwardManager
): Promise<number | undefined> {
    const remotePortAvailable = await manager.isPortAvailable(remotePort);
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
            const port = parseInt(value, 10);
            if (isNaN(port)) {
                return 'Port must be a number';
            }
            if (port < 1024 || port > 65535) {
                return 'Port must be between 1024 and 65535';
            }
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
 * Handles port forward errors with user-friendly messages.
 */
function handlePortForwardError(
    error: unknown,
    metadata: ServiceMetadata,
    remotePort: number,
    localPort: number
): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('already in use') || errorMessage.includes('port')) {
        const match = errorMessage.match(/Try port (\d+)/);
        const suggestedPort = match ? parseInt(match[1], 10) : localPort + 1;
        vscode.window.showErrorMessage(errorMessage, `Use ${suggestedPort}`).then(action => {
            if (action === `Use ${suggestedPort}`) {
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
            `Permission denied: You need portforward permission in namespace '${metadata.namespace}'`,
            'View RBAC Docs'
        ).then(action => {
            if (action === 'View RBAC Docs') {
                vscode.env.openExternal(
                    vscode.Uri.parse('https://kubernetes.io/docs/reference/access-authn-authz/rbac/')
                );
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
 * Command handler to start port forwarding for a Kubernetes Service resource.
 * Triggered from the tree view context menu when right-clicking a Service.
 *
 * @param treeItem The Service tree item that was right-clicked
 */
export async function portForwardServiceCommand(treeItem: ClusterTreeItem): Promise<void> {
    let serviceName = 'unknown';
    let namespace = 'default';
    let contextName = 'unknown';

    try {
        if (!treeItem || treeItem.contextValue !== 'resource:Service') {
            vscode.window.showErrorMessage('Failed to start port forward: Invalid resource (expected Service)');
            return;
        }

        if (!treeItem.resourceData) {
            vscode.window.showErrorMessage('Failed to start port forward: Missing resource data');
            return;
        }

        serviceName = treeItem.resourceData.resourceName ||
            (typeof treeItem.label === 'string' ? treeItem.label : treeItem.label?.toString() || '');
        namespace = treeItem.resourceData.namespace || 'default';
        contextName = treeItem.resourceData.context?.name || '';

        const treeProvider = getClusterTreeProvider();
        const kubeconfigPath = treeProvider.getKubeconfigPath();
        if (!kubeconfigPath) {
            vscode.window.showErrorMessage('Failed to start port forward: Kubeconfig path not available');
            return;
        }

        if (!serviceName || !contextName) {
            vscode.window.showErrorMessage('Failed to start port forward: Missing resource information');
            return;
        }

        const metadata: ServiceMetadata = {
            name: serviceName,
            namespace,
            context: contextName
        };

        let servicePorts: ServicePortInfo[];
        try {
            servicePorts = await getServicePorts(serviceName, namespace, contextName);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(
                `Failed to query Service '${serviceName}': ${errorMsg}`
            );
            return;
        }

        if (servicePorts.length === 0) {
            vscode.window.showErrorMessage(
                `Service '${serviceName}' has no ports. Cannot start port forward.`
            );
            return;
        }

        const remotePortSelection = await selectRemotePort(servicePorts);
        if (!remotePortSelection) {
            return;
        }

        const remotePort = remotePortSelection.port;

        const manager = PortForwardManager.getInstance();
        const localPort = await selectLocalPort(remotePort, manager);
        if (!localPort) {
            return;
        }

        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Starting port forward for Service ${serviceName}...`,
                    cancellable: false
                },
                async () => {
                    const config: PortForwardConfig = {
                        resourceType: 'service',
                        serviceName: metadata.name,
                        namespace: metadata.namespace,
                        context: metadata.context,
                        localPort,
                        remotePort
                    };

                    await manager.startForward(config);
                }
            );

            const action = await vscode.window.showInformationMessage(
                `Port forward established: localhost:${localPort} → ${metadata.namespace}/${metadata.name}:${remotePort}`,
                'Open Browser',
                'Show Forwards'
            );

            if (action === 'Open Browser') {
                vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${localPort}`));
            } else if (action === 'Show Forwards') {
                vscode.commands.executeCommand('kube9.showPortForwards');
            }
        } catch (error) {
            handlePortForwardError(error, metadata, remotePort, localPort);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error in portForwardServiceCommand:', {
            serviceName,
            namespace,
            contextName,
            error: errorMessage
        });
        vscode.window.showErrorMessage(`Failed to start port forward: ${errorMessage}`);
    }
}
