import * as vscode from 'vscode';
import { WorkloadCommands } from '../kubectl/WorkloadCommands';
import { transformDeploymentData, DeploymentDescribeData } from './deploymentDataTransformer';
import { getResourceCache, CACHE_TTL } from '../kubernetes/cache';

/**
 * Message sent from webview to extension.
 */
interface WebviewMessage {
    command: 'refresh' | 'navigateToReplicaSet' | 'copyValue';
    replicaSetName?: string;
    name?: string;
    namespace?: string;
    value?: string;
    content?: string;
}

/**
 * DeploymentDescribeWebview manages a webview panel for displaying deployment details.
 * Uses singleton pattern to reuse a single panel instance.
 */
export class DeploymentDescribeWebview {
    /**
     * The single shared webview panel instance.
     * Reused for all deployment describe actions.
     */
    private static currentPanel: vscode.WebviewPanel | undefined;
    
    /**
     * Extension context stored for later use.
     */
    private static extensionContext: vscode.ExtensionContext | undefined;
    
    /**
     * Current deployment name being displayed.
     */
    private static currentDeploymentName: string | undefined;
    
    /**
     * Current namespace being displayed.
     */
    private static currentNamespace: string | undefined;
    
    /**
     * Current kubeconfig path.
     */
    private static kubeconfigPath: string | undefined;
    
    /**
     * Current context name.
     */
    private static contextName: string | undefined;

    /**
     * Show the Deployment Describe webview for a deployment.
     * Creates a new panel if none exists, or reuses and updates the existing panel.
     * 
     * @param context The VS Code extension context
     * @param deploymentName Name of the deployment to describe
     * @param namespace Namespace where the deployment is located
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the Kubernetes context
     */
    public static async show(
        context: vscode.ExtensionContext,
        deploymentName: string,
        namespace: string,
        kubeconfigPath: string,
        contextName: string
    ): Promise<void> {
        // Store the extension context for later use
        DeploymentDescribeWebview.extensionContext = context;
        DeploymentDescribeWebview.currentDeploymentName = deploymentName;
        DeploymentDescribeWebview.currentNamespace = namespace;
        DeploymentDescribeWebview.kubeconfigPath = kubeconfigPath;
        DeploymentDescribeWebview.contextName = contextName;

        // If we already have a panel, reuse it and update the content
        if (DeploymentDescribeWebview.currentPanel) {
            DeploymentDescribeWebview.currentPanel.title = `Deployment / ${deploymentName}`;
            DeploymentDescribeWebview.currentDeploymentName = deploymentName;
            DeploymentDescribeWebview.currentNamespace = namespace;
            DeploymentDescribeWebview.kubeconfigPath = kubeconfigPath;
            DeploymentDescribeWebview.contextName = contextName;
            // Update HTML content to ensure proper structure
            DeploymentDescribeWebview.currentPanel.webview.html = DeploymentDescribeWebview.getWebviewContent(
                DeploymentDescribeWebview.currentPanel.webview
            );
            await DeploymentDescribeWebview.refreshDeploymentData();
            DeploymentDescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create title with deployment name
        const title = `Deployment / ${deploymentName}`;

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9DeploymentDescribe',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        DeploymentDescribeWebview.currentPanel = panel;

        // Set HTML content with complete structure
        panel.webview.html = DeploymentDescribeWebview.getWebviewContent(
            panel.webview
        );

        // Set up message handlers
        DeploymentDescribeWebview.setupMessageHandlers(panel, context);

        // Fetch and display initial data
        await DeploymentDescribeWebview.refreshDeploymentData();

        // Handle panel disposal
        panel.onDidDispose(
            () => {
                DeploymentDescribeWebview.currentPanel = undefined;
                DeploymentDescribeWebview.currentDeploymentName = undefined;
                DeploymentDescribeWebview.currentNamespace = undefined;
                DeploymentDescribeWebview.kubeconfigPath = undefined;
                DeploymentDescribeWebview.contextName = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Clear cached deployment data for a specific deployment.
     * 
     * @param contextName The Kubernetes context name
     * @param namespace The namespace
     * @param deploymentName The deployment name
     */
    private static clearDeploymentCache(contextName: string, namespace: string, deploymentName: string): void {
        const cache = getResourceCache();
        const cacheKey = `deployment-describe:${contextName}:${namespace}:${deploymentName}`;
        cache.invalidate(cacheKey);
    }

    /**
     * Refresh deployment data by fetching from Kubernetes API and updating the webview.
     */
    private static async refreshDeploymentData(): Promise<void> {
        if (!DeploymentDescribeWebview.currentPanel) {
            return;
        }

        const panel = DeploymentDescribeWebview.currentPanel;
        const deploymentName = DeploymentDescribeWebview.currentDeploymentName;
        const namespace = DeploymentDescribeWebview.currentNamespace;
        const kubeconfigPath = DeploymentDescribeWebview.kubeconfigPath;
        const contextName = DeploymentDescribeWebview.contextName;

        if (!deploymentName || !namespace || !kubeconfigPath || !contextName) {
            panel.webview.postMessage({
                command: 'error',
                message: 'Missing required parameters for deployment data fetch'
            });
            return;
        }

        // Check cache first
        const cache = getResourceCache();
        const cacheKey = `deployment-describe:${contextName}:${namespace}:${deploymentName}`;
        const cached = cache.get<DeploymentDescribeData>(cacheKey);
        if (cached) {
            panel.webview.postMessage({
                command: 'updateDeploymentData',
                data: cached
            });
            return;
        }

        try {
            // Fetch deployment details first to get UID for ReplicaSets query
            const deploymentResult = await WorkloadCommands.getDeploymentDetails(
                deploymentName,
                namespace,
                kubeconfigPath,
                contextName
            );

            // Check for deployment error
            if (deploymentResult.error) {
                panel.webview.postMessage({
                    command: 'error',
                    message: `Failed to fetch deployment details: ${deploymentResult.error.message || 'Unknown error'}`
                });
                return;
            }

            // Check if deployment data is available
            if (!deploymentResult.deployment) {
                panel.webview.postMessage({
                    command: 'error',
                    message: 'Deployment not found or unavailable'
                });
                return;
            }

            // Get deployment UID for ReplicaSets query
            const deploymentUid = deploymentResult.deployment.metadata?.uid;
            if (!deploymentUid) {
                panel.webview.postMessage({
                    command: 'error',
                    message: 'Deployment UID not available'
                });
                return;
            }

            // Fetch ReplicaSets and events in parallel
            const [replicaSetsResult, eventsResult] = await Promise.all([
                WorkloadCommands.getRelatedReplicaSets(
                    deploymentName,
                    deploymentUid,
                    namespace,
                    kubeconfigPath,
                    contextName
                ),
                WorkloadCommands.getDeploymentEvents(
                    deploymentName,
                    namespace,
                    kubeconfigPath,
                    contextName
                )
            ]);

            // Check for ReplicaSets error (log but continue)
            if (replicaSetsResult.error) {
                console.log(`Warning: Failed to fetch ReplicaSets: ${replicaSetsResult.error.message || 'Unknown error'}`);
            }

            // Check for events error (log but continue)
            if (eventsResult.error) {
                console.log(`Warning: Failed to fetch events: ${eventsResult.error.message || 'Unknown error'}`);
            }

            // Transform data for webview
            const transformedData = transformDeploymentData(
                deploymentResult.deployment,
                replicaSetsResult.replicaSets || [],
                eventsResult.events || []
            );

            // Cache for deployment TTL
            cache.set(cacheKey, transformedData, CACHE_TTL.DEPLOYMENTS);

            // Post transformed data to webview
            panel.webview.postMessage({
                command: 'updateDeploymentData',
                data: transformedData
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error refreshing deployment data:', errorMessage);
            panel.webview.postMessage({
                command: 'error',
                message: `Failed to refresh deployment data: ${errorMessage}`
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
                        const contextName = DeploymentDescribeWebview.contextName;
                        const namespace = DeploymentDescribeWebview.currentNamespace;
                        const deploymentName = DeploymentDescribeWebview.currentDeploymentName;
                        if (contextName && namespace && deploymentName) {
                            DeploymentDescribeWebview.clearDeploymentCache(contextName, namespace, deploymentName);
                        }
                        await DeploymentDescribeWebview.refreshDeploymentData();
                        break;
                    }
                    
                    case 'navigateToReplicaSet': {
                        const replicaSetName = message.replicaSetName || message.name;
                        const namespace = message.namespace || DeploymentDescribeWebview.currentNamespace;
                        if (replicaSetName) {
                            // For now, show info message (full implementation in story 011)
                            vscode.window.showInformationMessage(
                                `Navigate to ReplicaSet ${replicaSetName} in namespace ${namespace || 'default'}`
                            );
                        }
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

    /**
     * Generate the HTML content for the Deployment Describe webview.
     * Placeholder implementation - full HTML will be implemented in story 007.
     * 
     * @param webview The webview instance
     * @returns HTML content string
     */
    private static getWebviewContent(
        webview: vscode.Webview
    ): string {
        const cspSource = webview.cspSource;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src ${cspSource} 'unsafe-inline';">
    <title>Deployment Describe</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .loading {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
        .error-message {
            padding: 20px;
            background-color: rgba(255, 0, 0, 0.1);
            border: 1px solid var(--vscode-errorForeground);
            border-radius: 4px;
            color: var(--vscode-errorForeground);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="loading">Loading deployment details...</div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'updateDeploymentData') {
                // Full rendering logic will be implemented in story 008
                document.querySelector('.loading').textContent = 'Deployment data loaded (rendering will be implemented in story 008)';
            } else if (message.command === 'error') {
                const container = document.querySelector('.container');
                container.innerHTML = '<div class="error-message">' + escapeHtml(message.message) + '</div>';
            }
        });
        
        function escapeHtml(unsafe) {
            if (unsafe === null || unsafe === undefined) return '';
            const str = String(unsafe);
            return str
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    </script>
</body>
</html>`;
    }
}

