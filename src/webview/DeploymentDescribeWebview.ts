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
     * Includes complete HTML structure with all sections, CSS styling, and JavaScript placeholder.
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
            padding: 0;
            margin: 0;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .deployment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 15px;
            margin-bottom: 20px;
        }

        .deployment-title {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .deployment-name {
            color: var(--vscode-textLink-foreground);
        }

        .header-actions {
            display: flex;
            gap: 10px;
        }

        .action-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: var(--vscode-font-size);
            font-family: var(--vscode-font-family);
        }

        .action-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .btn-icon {
            font-size: 14px;
        }

        .section {
            margin-bottom: 30px;
        }

        .section h2 {
            margin: 0 0 15px 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--vscode-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 8px;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }

        .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .info-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .info-value {
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            word-break: break-word;
        }

        .replica-status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 10px;
        }

        .replica-status-item {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .replica-status-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .replica-status-value {
            font-size: 20px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .replica-status-value.warning {
            color: var(--vscode-errorForeground);
        }

        .progress-bar-container {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .progress-bar {
            flex: 1;
            height: 20px;
            background-color: var(--vscode-progressBar-background);
            border-radius: 2px;
            overflow: hidden;
            position: relative;
        }

        .progress-bar-fill {
            height: 100%;
            background-color: var(--vscode-progressBar-background);
            transition: width 0.3s ease;
        }

        .progress-bar-fill.low {
            background-color: #00c800;
        }

        .progress-bar-fill.medium {
            background-color: #ffaa00;
        }

        .progress-bar-fill.high {
            background-color: var(--vscode-errorForeground);
        }

        .progress-percentage {
            min-width: 45px;
            text-align: right;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        table thead {
            background-color: var(--vscode-editor-background);
            border-bottom: 2px solid var(--vscode-panel-border);
        }

        table th {
            text-align: left;
            padding: 10px;
            font-weight: 600;
            color: var(--vscode-foreground);
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        table td {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            color: var(--vscode-foreground);
        }

        table tbody tr:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        table tbody tr.current {
            background-color: rgba(0, 200, 0, 0.1);
        }

        table tbody tr.warning {
            background-color: rgba(255, 170, 0, 0.1);
        }

        .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: 500;
        }

        .status-indicator.true, .status-indicator.success {
            background-color: rgba(0, 200, 0, 0.1);
            color: #00c800;
        }

        .status-indicator.false, .status-indicator.error {
            background-color: rgba(255, 0, 0, 0.1);
            color: var(--vscode-errorForeground);
        }

        .status-indicator.unknown, .status-indicator.warning {
            background-color: rgba(255, 170, 0, 0.1);
            color: #ffaa00;
        }

        .status-indicator.info {
            background-color: rgba(128, 128, 128, 0.1);
            color: var(--vscode-descriptionForeground);
        }

        .status-icon-check {
            color: #00c800;
        }

        .status-icon-warning {
            color: var(--vscode-errorForeground);
        }

        .copy-btn {
            background: none;
            border: none;
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            padding: 4px;
            display: inline-flex;
            align-items: center;
            opacity: 0.7;
            transition: opacity 0.2s;
        }

        .copy-btn:hover {
            opacity: 1;
        }

        .copy-icon {
            font-size: 14px;
        }

        .label-list, .selector-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .label-item, .selector-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .label-item:last-child, .selector-item:last-child {
            border-bottom: none;
        }

        .label-key, .selector-key {
            font-weight: 600;
            min-width: 120px;
            color: var(--vscode-foreground);
        }

        .label-value, .selector-value {
            flex: 1;
            color: var(--vscode-foreground);
            font-family: var(--vscode-editor-font-family);
            word-break: break-all;
        }

        .replicaset-link {
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            text-decoration: none;
        }

        .replicaset-link:hover {
            text-decoration: underline;
        }

        .container-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-top: 10px;
        }

        .container-item {
            padding: 12px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background-color: var(--vscode-editor-background);
        }

        .container-header {
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-foreground);
        }

        .container-details {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-top: 8px;
            font-size: 13px;
        }

        .annotation-item {
            padding: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .annotation-item:last-child {
            border-bottom: none;
        }

        .annotation-key {
            font-weight: 600;
            margin-bottom: 4px;
            color: var(--vscode-foreground);
        }

        .annotation-value {
            color: var(--vscode-foreground);
            font-family: var(--vscode-editor-font-family);
            word-break: break-all;
            white-space: pre-wrap;
        }

        .annotation-value.truncated {
            max-height: 100px;
            overflow: hidden;
        }

        .expand-btn {
            background: none;
            border: none;
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            padding: 4px 0;
            font-size: 12px;
            margin-top: 4px;
        }

        .expand-btn:hover {
            text-decoration: underline;
        }

        .empty-state {
            padding: 20px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }

        .error-message {
            padding: 20px;
            background-color: rgba(255, 0, 0, 0.1);
            border: 1px solid var(--vscode-errorForeground);
            border-radius: 4px;
            color: var(--vscode-errorForeground);
            margin: 20px;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }

        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="deployment-header">
            <h1 class="deployment-title">Deployment / <span class="deployment-name" id="deployment-name">Loading...</span></h1>
            <div class="header-actions">
                <button id="refresh-btn" class="action-btn">
                    <span class="btn-icon">🔄</span>
                    <span class="btn-text">Refresh</span>
                </button>
            </div>
        </div>

        <!-- Loading Indicator -->
        <div id="loading" class="loading">Loading deployment details...</div>

        <!-- Error Message -->
        <div id="error-message" class="error-message hidden"></div>

        <!-- Overview Section -->
        <div class="section" id="overview-section" style="display: none;">
            <h2>Overview</h2>
            <div class="info-grid" id="overview-grid">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>

        <!-- Replica Status Section -->
        <div class="section" id="replica-status-section" style="display: none;">
            <h2>Replica Status</h2>
            <div class="replica-status-grid" id="replica-status-grid">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>

        <!-- Rollout Strategy Section -->
        <div class="section" id="strategy-section" style="display: none;">
            <h2>Rollout Strategy</h2>
            <div class="info-grid" id="strategy-content">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>

        <!-- Pod Template Section -->
        <div class="section" id="pod-template-section" style="display: none;">
            <h2>Pod Template</h2>
            <div id="pod-template-content">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>

        <!-- Conditions Section -->
        <div class="section" id="conditions-section" style="display: none;">
            <h2>Conditions</h2>
            <table>
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Reason</th>
                        <th>Message</th>
                        <th>Last Transition</th>
                    </tr>
                </thead>
                <tbody id="conditions-tbody">
                    <!-- Will be populated by JavaScript -->
                </tbody>
            </table>
        </div>

        <!-- ReplicaSets Section -->
        <div class="section" id="replicasets-section" style="display: none;">
            <h2>ReplicaSets</h2>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Revision</th>
                        <th>Desired</th>
                        <th>Current</th>
                        <th>Ready</th>
                        <th>Available</th>
                        <th>Age</th>
                        <th>Images</th>
                    </tr>
                </thead>
                <tbody id="replicasets-tbody">
                    <!-- Will be populated by JavaScript -->
                </tbody>
            </table>
        </div>

        <!-- Selectors & Labels Section -->
        <div class="section" id="selectors-labels-section" style="display: none;">
            <h2>Selectors & Labels</h2>
            <div id="selectors-labels-content">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>

        <!-- Events Section -->
        <div class="section" id="events-section" style="display: none;">
            <h2>Events</h2>
            <table>
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Reason</th>
                        <th>Message</th>
                        <th>Age</th>
                        <th>From</th>
                        <th>Count</th>
                    </tr>
                </thead>
                <tbody id="events-tbody">
                    <!-- Will be populated by JavaScript -->
                </tbody>
            </table>
        </div>

        <!-- Annotations Section -->
        <div class="section" id="annotations-section" style="display: none;">
            <h2>Annotations</h2>
            <div id="annotations-content">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'updateDeploymentData') {
                // Full rendering logic will be implemented in story 008
                const loadingEl = document.getElementById('loading');
                if (loadingEl) {
                    loadingEl.textContent = 'Deployment data loaded (rendering will be implemented in story 008)';
                }
            } else if (message.command === 'error') {
                const loadingEl = document.getElementById('loading');
                const errorEl = document.getElementById('error-message');
                if (loadingEl) loadingEl.classList.add('hidden');
                if (errorEl) {
                    errorEl.textContent = escapeHtml(message.message);
                    errorEl.classList.remove('hidden');
                }
            }
        });
        
        // Setup refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'refresh' });
            });
        }
        
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

