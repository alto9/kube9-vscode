import * as vscode from 'vscode';
import { NodeCommands } from '../kubectl/NodeCommands';
import { PodCommands } from '../kubectl/PodCommands';
import { transformNodeData } from './nodeDescribeTransformer';

/**
 * Message sent from webview to extension.
 */
interface WebviewMessage {
    command: 'refresh' | 'navigateToPod' | 'copyValue';
    podName?: string;
    name?: string;
    namespace?: string;
    value?: string;
    content?: string;
}

/**
 * NodeDescribeWebview manages a webview panel for displaying node details.
 * Uses singleton pattern to reuse a single panel instance.
 */
export class NodeDescribeWebview {
    /**
     * The single shared webview panel instance.
     * Reused for all node describe actions.
     */
    private static currentPanel: vscode.WebviewPanel | undefined;
    
    /**
     * Extension context stored for later use.
     */
    private static extensionContext: vscode.ExtensionContext | undefined;
    
    /**
     * Current node name being displayed.
     */
    private static currentNodeName: string | undefined;
    
    /**
     * Current kubeconfig path.
     */
    private static kubeconfigPath: string | undefined;
    
    /**
     * Current context name.
     */
    private static contextName: string | undefined;

    /**
     * Show the Node Describe webview for a node.
     * Creates a new panel if none exists, or reuses and updates the existing panel.
     * 
     * @param context The VS Code extension context
     * @param nodeName Name of the node to describe
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the Kubernetes context
     */
    public static async show(
        context: vscode.ExtensionContext,
        nodeName: string,
        kubeconfigPath: string,
        contextName: string
    ): Promise<void> {
        // Store the extension context for later use
        NodeDescribeWebview.extensionContext = context;
        NodeDescribeWebview.currentNodeName = nodeName;
        NodeDescribeWebview.kubeconfigPath = kubeconfigPath;
        NodeDescribeWebview.contextName = contextName;

        // If we already have a panel, reuse it and update the content
        if (NodeDescribeWebview.currentPanel) {
            NodeDescribeWebview.currentPanel.title = `Node / ${nodeName}`;
            NodeDescribeWebview.currentNodeName = nodeName;
            NodeDescribeWebview.kubeconfigPath = kubeconfigPath;
            NodeDescribeWebview.contextName = contextName;
            await NodeDescribeWebview.refreshNodeData();
            NodeDescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create title with node name
        const title = `Node / ${nodeName}`;

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9NodeDescribe',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        NodeDescribeWebview.currentPanel = panel;

        // Set placeholder HTML content
        panel.webview.html = '<html><body><h1>Loading node data...</h1></body></html>';

        // Set up message handlers
        NodeDescribeWebview.setupMessageHandlers(panel, context);

        // Fetch and display initial data
        await NodeDescribeWebview.refreshNodeData();

        // Handle panel disposal
        panel.onDidDispose(
            () => {
                NodeDescribeWebview.currentPanel = undefined;
                NodeDescribeWebview.currentNodeName = undefined;
                NodeDescribeWebview.kubeconfigPath = undefined;
                NodeDescribeWebview.contextName = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Refresh node data by fetching from Kubernetes API and updating the webview.
     */
    private static async refreshNodeData(): Promise<void> {
        if (!NodeDescribeWebview.currentPanel) {
            return;
        }

        const panel = NodeDescribeWebview.currentPanel;
        const nodeName = NodeDescribeWebview.currentNodeName;
        const kubeconfigPath = NodeDescribeWebview.kubeconfigPath;
        const contextName = NodeDescribeWebview.contextName;

        if (!nodeName || !kubeconfigPath || !contextName) {
            panel.webview.postMessage({
                command: 'error',
                message: 'Missing required parameters for node data fetch'
            });
            return;
        }

        try {
            // Fetch node details and pods in parallel
            const [nodeResult, podsResult] = await Promise.all([
                NodeCommands.getNodeDetails(kubeconfigPath, contextName, nodeName),
                PodCommands.getPodsOnNode(kubeconfigPath, contextName, nodeName)
            ]);

            // Check for errors
            if (nodeResult.error) {
                panel.webview.postMessage({
                    command: 'error',
                    message: `Failed to fetch node details: ${nodeResult.error.message || 'Unknown error'}`
                });
                return;
            }

            if (podsResult.error) {
                // Log pod error but continue with node data
                console.log(`Warning: Failed to fetch pods: ${podsResult.error.message || 'Unknown error'}`);
            }

            // Check if node data is available
            if (!nodeResult.node) {
                panel.webview.postMessage({
                    command: 'error',
                    message: 'Node not found or unavailable'
                });
                return;
            }

            // Transform data for webview
            const transformedData = transformNodeData(nodeResult.node, podsResult.pods);

            // Post transformed data to webview
            panel.webview.postMessage({
                command: 'updateNodeData',
                data: transformedData
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error refreshing node data:', errorMessage);
            panel.webview.postMessage({
                command: 'error',
                message: `Failed to refresh node data: ${errorMessage}`
            });
        }
    }

    /**
     * Set up message handlers for webview communication.
     * 
     * @param panel The webview panel
     * @param context The VS Code extension context
     */
    private static setupMessageHandlers(
        panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext
    ): void {
        panel.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                switch (message.command) {
                    case 'refresh': {
                        await NodeDescribeWebview.refreshNodeData();
                        break;
                    }
                    
                    case 'navigateToPod': {
                        // Stub implementation - will be implemented in story 010
                        const podName = message.podName || message.name;
                        const namespace = message.namespace;
                        console.log('Navigate to pod:', podName, namespace);
                        break;
                    }
                    
                    case 'copyValue': {
                        const value = message.value || message.content;
                        if (value) {
                            try {
                                await vscode.env.clipboard.writeText(value);
                                vscode.window.showInformationMessage('Copied to clipboard');
                            } catch (error) {
                                const errorMessage = error instanceof Error ? error.message : String(error);
                                console.error('Failed to copy to clipboard:', errorMessage);
                                vscode.window.showErrorMessage(`Failed to copy: ${errorMessage}`);
                            }
                        }
                        break;
                    }
                    
                    default: {
                        console.log('Unknown message command:', message.command);
                    }
                }
            },
            null,
            context.subscriptions
        );
    }
}

