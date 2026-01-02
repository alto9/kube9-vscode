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
                        const deploymentName = DeploymentDescribeWebview.currentDeploymentName;
                        
                        if (!replicaSetName) {
                            vscode.window.showErrorMessage('ReplicaSet name is required');
                            break;
                        }
                        
                        if (!deploymentName) {
                            vscode.window.showErrorMessage('Deployment name not available');
                            break;
                        }
                        
                        try {
                            await vscode.commands.executeCommand(
                                'kube9.revealReplicaSet',
                                replicaSetName,
                                deploymentName,
                                namespace || 'default'
                            );
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            console.error('Failed to navigate to ReplicaSet:', errorMessage);
                            vscode.window.showErrorMessage(`Failed to navigate to ReplicaSet: ${errorMessage}`);
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
        (function() {
            const vscode = acquireVsCodeApi();
            
            window.addEventListener('message', event => {
                const message = event.data;
                
                switch (message.command) {
                    case 'updateDeploymentData':
                        renderDeploymentData(message.data);
                        hideLoading();
                        break;
                    case 'error':
                        showError(message.message);
                        hideLoading();
                        break;
                }
            });
            
            function renderDeploymentData(data) {
                if (!data) return;
                
                // Update deployment name in header
                const nameEl = document.getElementById('deployment-name');
                if (nameEl && data.name) {
                    nameEl.textContent = data.name;
                }
                
                // Hide error message
                hideError();
                
                // Render all sections
                if (data.overview) renderOverview(data.overview);
                if (data.replicaStatus) renderReplicaStatus(data.replicaStatus);
                if (data.strategy) renderStrategy(data.strategy);
                if (data.podTemplate) renderPodTemplate(data.podTemplate);
                if (data.conditions) renderConditions(data.conditions);
                if (data.replicaSets) renderReplicaSets(data.replicaSets);
                if (data.labels || data.selectors) renderLabels(data.labels, data.selectors);
                if (data.events) renderEvents(data.events);
                if (data.annotations) renderAnnotations(data.annotations);
                
                // Setup interactive elements
                setupCopyButtons();
                setupReplicaSetNavigation();
            }
            
            function renderOverview(overview) {
                const grid = document.getElementById('overview-grid');
                const section = document.getElementById('overview-section');
                if (!grid || !section) return;
                
                const statusBadge = overview.status === 'Available' 
                    ? '<span class="status-indicator success">✓ Available</span>'
                    : overview.status === 'Progressing'
                    ? '<span class="status-indicator warning">⚠ Progressing</span>'
                    : overview.status === 'Failed'
                    ? '<span class="status-indicator error">✗ Failed</span>'
                    : '<span class="status-indicator info">? Unknown</span>';
                
                const items = [
                    { label: 'Name', value: overview.name || 'N/A' },
                    { label: 'Namespace', value: overview.namespace || 'N/A' },
                    { label: 'Status', value: statusBadge },
                    { label: 'Status Message', value: overview.statusMessage || 'N/A' },
                    { label: 'Creation Timestamp', value: overview.creationTimestamp || 'N/A' },
                    { label: 'Age', value: overview.age || 'N/A' },
                    { label: 'Generation', value: String(overview.generation || 0) },
                    { label: 'Observed Generation', value: String(overview.observedGeneration || 0) },
                    { label: 'Paused', value: overview.paused ? 'Yes' : 'No' }
                ];
                
                grid.innerHTML = items.map(item => 
                    '<div class="info-item">' +
                        '<div class="info-label">' + escapeHtml(item.label) + '</div>' +
                        '<div class="info-value">' + item.value + '</div>' +
                    '</div>'
                ).join('');
                
                section.style.display = 'block';
            }
            
            function renderReplicaStatus(replicaStatus) {
                const grid = document.getElementById('replica-status-grid');
                const section = document.getElementById('replica-status-section');
                if (!grid || !section) return;
                
                const items = [
                    {
                        label: 'Desired',
                        value: String(replicaStatus.desired || 0),
                        showProgress: false
                    },
                    {
                        label: 'Current',
                        value: String(replicaStatus.current || 0),
                        showProgress: false
                    },
                    {
                        label: 'Ready',
                        value: String(replicaStatus.ready || 0),
                        total: replicaStatus.desired || 0,
                        showProgress: true,
                        percentage: replicaStatus.readyPercentage || 0
                    },
                    {
                        label: 'Available',
                        value: String(replicaStatus.available || 0),
                        total: replicaStatus.desired || 0,
                        showProgress: true,
                        percentage: replicaStatus.availablePercentage || 0
                    },
                    {
                        label: 'Unavailable',
                        value: String(replicaStatus.unavailable || 0),
                        showProgress: false
                    },
                    {
                        label: 'Up-to-date',
                        value: String(replicaStatus.upToDate || 0),
                        showProgress: false
                    }
                ];
                
                grid.innerHTML = items.map(item => {
                    let valueClass = '';
                    if (item.label === 'Ready' || item.label === 'Available') {
                        valueClass = !replicaStatus.isHealthy ? ' warning' : '';
                    }
                    
                    let progressHtml = '';
                    if (item.showProgress && item.total !== undefined) {
                        progressHtml = createProgressBar(item.value, item.total, item.label);
                    }
                    
                    return '<div class="replica-status-item">' +
                        '<div class="replica-status-label">' + escapeHtml(item.label) + '</div>' +
                        '<div class="replica-status-value' + valueClass + '">' + escapeHtml(item.value) + '</div>' +
                        progressHtml +
                    '</div>';
                }).join('');
                
                section.style.display = 'block';
            }
            
            function renderStrategy(strategy) {
                const content = document.getElementById('strategy-content');
                const section = document.getElementById('strategy-section');
                if (!content || !section) return;
                
                const items = [
                    { label: 'Type', value: strategy.type || 'N/A' },
                    { label: 'Max Surge', value: strategy.maxSurge || 'N/A' },
                    { label: 'Max Unavailable', value: strategy.maxUnavailable || 'N/A' },
                    { label: 'Revision History Limit', value: String(strategy.revisionHistoryLimit || 10) },
                    { label: 'Progress Deadline Seconds', value: String(strategy.progressDeadlineSeconds || 600) },
                    { label: 'Min Ready Seconds', value: String(strategy.minReadySeconds || 0) }
                ];
                
                content.innerHTML = items.map(item => 
                    '<div class="info-item">' +
                        '<div class="info-label">' + escapeHtml(item.label) + '</div>' +
                        '<div class="info-value">' + escapeHtml(item.value) + '</div>' +
                    '</div>'
                ).join('');
                
                section.style.display = 'block';
            }
            
            function renderPodTemplate(podTemplate) {
                const content = document.getElementById('pod-template-content');
                const section = document.getElementById('pod-template-section');
                if (!content || !section) return;
                
                let html = '';
                
                // Containers
                if (podTemplate.containers && podTemplate.containers.length > 0) {
                    html += '<div class="container-list">';
                    podTemplate.containers.forEach(container => {
                        html += renderContainer(container, 'Container');
                    });
                    html += '</div>';
                }
                
                // Init Containers
                if (podTemplate.initContainers && podTemplate.initContainers.length > 0) {
                    html += '<h3 style="margin-top: 20px; margin-bottom: 10px;">Init Containers</h3>';
                    html += '<div class="container-list">';
                    podTemplate.initContainers.forEach(container => {
                        html += renderContainer(container, 'Init Container');
                    });
                    html += '</div>';
                }
                
                // Volumes
                if (podTemplate.volumes && podTemplate.volumes.length > 0) {
                    html += '<h3 style="margin-top: 20px; margin-bottom: 10px;">Volumes</h3>';
                    html += '<div class="info-grid">';
                    podTemplate.volumes.forEach(volume => {
                        html += '<div class="info-item">' +
                            '<div class="info-label">' + escapeHtml(volume.name) + '</div>' +
                            '<div class="info-value">' + escapeHtml(volume.type) + 
                            (volume.source ? ' (' + escapeHtml(volume.source) + ')' : '') + '</div>' +
                        '</div>';
                    });
                    html += '</div>';
                }
                
                // Pod-level settings
                html += '<div class="info-grid" style="margin-top: 20px;">';
                html += '<div class="info-item">' +
                    '<div class="info-label">Restart Policy</div>' +
                    '<div class="info-value">' + escapeHtml(podTemplate.restartPolicy || 'Always') + '</div>' +
                '</div>';
                html += '<div class="info-item">' +
                    '<div class="info-label">Service Account</div>' +
                    '<div class="info-value">' + escapeHtml(podTemplate.serviceAccount || 'default') + '</div>' +
                '</div>';
                
                // Security Context
                if (podTemplate.securityContext) {
                    const sc = podTemplate.securityContext;
                    const scItems = [];
                    if (sc.runAsUser !== null) scItems.push('RunAsUser: ' + sc.runAsUser);
                    if (sc.runAsGroup !== null) scItems.push('RunAsGroup: ' + sc.runAsGroup);
                    if (sc.fsGroup !== null) scItems.push('FSGroup: ' + sc.fsGroup);
                    if (sc.runAsNonRoot !== null) scItems.push('RunAsNonRoot: ' + sc.runAsNonRoot);
                    
                    if (scItems.length > 0) {
                        html += '<div class="info-item">' +
                            '<div class="info-label">Security Context</div>' +
                            '<div class="info-value">' + escapeHtml(scItems.join(', ')) + '</div>' +
                        '</div>';
                    }
                }
                
                html += '</div>';
                
                content.innerHTML = html;
                section.style.display = 'block';
            }
            
            function renderContainer(container, type) {
                let html = '<div class="container-item">';
                html += '<div class="container-header">' + escapeHtml(type) + ': ' + escapeHtml(container.name) + '</div>';
                
                html += '<div class="container-details">';
                html += '<div><strong>Image:</strong> ' + escapeHtml(container.image || 'N/A') + '</div>';
                html += '<div><strong>Image Pull Policy:</strong> ' + escapeHtml(container.imagePullPolicy || 'IfNotPresent') + '</div>';
                
                // Ports
                if (container.ports && container.ports.length > 0) {
                    const portsStr = container.ports.map(p => 
                        escapeHtml(p.name || '') + ':' + p.containerPort + '/' + escapeHtml(p.protocol || 'TCP')
                    ).join(', ');
                    html += '<div><strong>Ports:</strong> ' + portsStr + '</div>';
                }
                
                // Resources
                if (container.resources) {
                    if (container.resources.hasRequests) {
                        html += '<div><strong>Requests:</strong> CPU: ' + escapeHtml(container.resources.requests.cpu) + 
                            ', Memory: ' + escapeHtml(container.resources.requests.memory) + '</div>';
                    }
                    if (container.resources.hasLimits) {
                        html += '<div><strong>Limits:</strong> CPU: ' + escapeHtml(container.resources.limits.cpu) + 
                            ', Memory: ' + escapeHtml(container.resources.limits.memory) + '</div>';
                    }
                }
                
                // Environment Variables
                if (container.env && container.env.count > 0) {
                    let envInfo = container.env.count + ' env var(s)';
                    if (container.env.hasSecrets) envInfo += ', includes Secrets';
                    if (container.env.hasConfigMaps) envInfo += ', includes ConfigMaps';
                    html += '<div><strong>Environment:</strong> ' + escapeHtml(envInfo) + '</div>';
                }
                
                // Volume Mounts
                if (container.volumeMounts && container.volumeMounts.count > 0) {
                    html += '<div><strong>Volume Mounts:</strong> ' + escapeHtml(String(container.volumeMounts.count)) + 
                        ' mount(s): ' + escapeHtml(container.volumeMounts.paths.join(', ')) + '</div>';
                }
                
                html += '</div>';
                
                // Probes
                if (container.livenessProbe || container.readinessProbe || container.startupProbe) {
                    html += '<div style="margin-top: 10px;">';
                    if (container.livenessProbe) {
                        html += '<div><strong>Liveness Probe:</strong> ' + escapeHtml(container.livenessProbe.details) + 
                            ' (initialDelay: ' + container.livenessProbe.initialDelaySeconds + 
                            's, period: ' + container.livenessProbe.periodSeconds + 's)</div>';
                    }
                    if (container.readinessProbe) {
                        html += '<div><strong>Readiness Probe:</strong> ' + escapeHtml(container.readinessProbe.details) + 
                            ' (initialDelay: ' + container.readinessProbe.initialDelaySeconds + 
                            's, period: ' + container.readinessProbe.periodSeconds + 's)</div>';
                    }
                    if (container.startupProbe) {
                        html += '<div><strong>Startup Probe:</strong> ' + escapeHtml(container.startupProbe.details) + 
                            ' (initialDelay: ' + container.startupProbe.initialDelaySeconds + 
                            's, period: ' + container.startupProbe.periodSeconds + 's)</div>';
                    }
                    html += '</div>';
                }
                
                html += '</div>';
                return html;
            }
            
            function renderConditions(conditions) {
                const tbody = document.getElementById('conditions-tbody');
                const section = document.getElementById('conditions-section');
                if (!tbody || !section) return;
                
                if (!conditions || conditions.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No conditions available</td></tr>';
                    section.style.display = 'block';
                    return;
                }
                
                tbody.innerHTML = conditions.map(condition => {
                    const statusIndicator = getStatusIndicator(condition.status, condition.severity);
                    return '<tr>' +
                        '<td>' + escapeHtml(condition.type) + '</td>' +
                        '<td>' + statusIndicator + '</td>' +
                        '<td>' + escapeHtml(condition.reason || 'N/A') + '</td>' +
                        '<td>' + escapeHtml(condition.message || 'N/A') + '</td>' +
                        '<td>' + escapeHtml(condition.relativeTime || 'N/A') + '</td>' +
                    '</tr>';
                }).join('');
                
                section.style.display = 'block';
            }
            
            function renderReplicaSets(replicaSets) {
                const tbody = document.getElementById('replicasets-tbody');
                const section = document.getElementById('replicasets-section');
                if (!tbody || !section) return;
                
                if (!replicaSets || replicaSets.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No ReplicaSets found</td></tr>';
                    section.style.display = 'block';
                    return;
                }
                
                tbody.innerHTML = replicaSets.map(rs => {
                    const rowClass = rs.isCurrent ? 'current' : '';
                    const rsLink = '<a href="#" class="replicaset-link" data-replicaset-name="' + escapeHtml(rs.name) + 
                        '" data-replicaset-namespace="' + escapeHtml(rs.namespace) + '">' + escapeHtml(rs.name) + '</a>';
                    return '<tr class="' + rowClass + '">' +
                        '<td>' + rsLink + '</td>' +
                        '<td>' + escapeHtml(String(rs.revision)) + '</td>' +
                        '<td>' + escapeHtml(String(rs.desired)) + '</td>' +
                        '<td>' + escapeHtml(String(rs.current)) + '</td>' +
                        '<td>' + escapeHtml(String(rs.ready)) + '</td>' +
                        '<td>' + escapeHtml(String(rs.available)) + '</td>' +
                        '<td>' + escapeHtml(rs.age || 'N/A') + '</td>' +
                        '<td>' + escapeHtml(rs.images.join(', ') || 'N/A') + '</td>' +
                    '</tr>';
                }).join('');
                
                section.style.display = 'block';
            }
            
            function renderLabels(labels, selectors) {
                const content = document.getElementById('selectors-labels-content');
                const section = document.getElementById('selectors-labels-section');
                if (!content || !section) return;
                
                let html = '';
                
                // Selectors
                if (selectors && Object.keys(selectors).length > 0) {
                    html += '<h3 style="margin-bottom: 10px;">Selectors</h3>';
                    html += '<ul class="selector-list">';
                    Object.entries(selectors).forEach(([key, value]) => {
                        const pair = key + '=' + value;
                        html += '<li class="selector-item">' +
                            '<span class="selector-key">' + escapeHtml(key) + '</span>' +
                            '<span class="selector-value">' + escapeHtml(value) + '</span>' +
                            '<button class="copy-btn" data-copy-value="' + escapeHtml(pair) + '" title="Copy selector">' +
                                '<span class="copy-icon">📋</span>' +
                            '</button>' +
                        '</li>';
                    });
                    html += '</ul>';
                }
                
                // Labels
                if (labels && Object.keys(labels).length > 0) {
                    html += '<h3 style="margin-top: 20px; margin-bottom: 10px;">Labels</h3>';
                    html += '<ul class="label-list">';
                    Object.entries(labels).forEach(([key, value]) => {
                        const pair = key + '=' + value;
                        html += '<li class="label-item">' +
                            '<span class="label-key">' + escapeHtml(key) + '</span>' +
                            '<span class="label-value">' + escapeHtml(value) + '</span>' +
                            '<button class="copy-btn" data-copy-value="' + escapeHtml(pair) + '" title="Copy label">' +
                                '<span class="copy-icon">📋</span>' +
                            '</button>' +
                        '</li>';
                    });
                    html += '</ul>';
                }
                
                if (!html) {
                    html = '<div class="empty-state">No selectors or labels configured</div>';
                }
                
                content.innerHTML = html;
                section.style.display = 'block';
            }
            
            function renderEvents(events) {
                const tbody = document.getElementById('events-tbody');
                const section = document.getElementById('events-section');
                if (!tbody || !section) return;
                
                if (!events || events.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No recent events</td></tr>';
                    section.style.display = 'block';
                    return;
                }
                
                tbody.innerHTML = events.map(event => {
                    const rowClass = event.type === 'Warning' ? 'warning' : '';
                    return '<tr class="' + rowClass + '">' +
                        '<td>' + escapeHtml(event.type || 'Normal') + '</td>' +
                        '<td>' + escapeHtml(event.reason || 'N/A') + '</td>' +
                        '<td>' + escapeHtml(event.message || 'N/A') + '</td>' +
                        '<td>' + escapeHtml(event.relativeTime || 'N/A') + '</td>' +
                        '<td>' + escapeHtml(event.source || 'N/A') + '</td>' +
                        '<td>' + escapeHtml(String(event.count || 1)) + '</td>' +
                    '</tr>';
                }).join('');
                
                section.style.display = 'block';
            }
            
            function renderAnnotations(annotations) {
                const content = document.getElementById('annotations-content');
                const section = document.getElementById('annotations-section');
                if (!content || !section) return;
                
                if (!annotations || Object.keys(annotations).length === 0) {
                    content.innerHTML = '<div class="empty-state">No annotations configured</div>';
                    section.style.display = 'block';
                    return;
                }
                
                const annotationEntries = Object.entries(annotations);
                const maxLength = 200;
                
                content.innerHTML = annotationEntries.map(([key, value], index) => {
                    const valueStr = String(value || '');
                    const isLong = valueStr.length > maxLength;
                    const displayValue = isLong ? valueStr.substring(0, maxLength) + '...' : valueStr;
                    const annotationId = 'annotation-' + index;
                    
                    return '<div class="annotation-item">' +
                        '<div class="annotation-key">' + escapeHtml(key) + '</div>' +
                        '<div class="annotation-value' + (isLong ? ' truncated' : '') + '" id="' + annotationId + '-value">' + 
                            escapeHtml(displayValue) + 
                        '</div>' +
                        (isLong ? '<button class="expand-btn" id="' + annotationId + '-btn" onclick="toggleAnnotation(&quot;' + annotationId + '&quot;, ' + 
                            JSON.stringify(escapeHtml(valueStr)).replace(/"/g, '&quot;') + ')">Show more</button>' : '') +
                        '<button class="copy-btn" data-copy-value="' + escapeHtml(valueStr) + '" title="Copy annotation" style="margin-left: 10px;">' +
                            '<span class="copy-icon">📋</span>' +
                        '</button>' +
                    '</div>';
                }).join('');
                
                section.style.display = 'block';
            }
            
            function createProgressBar(current, total, label) {
                const currentNum = parseInt(current) || 0;
                const totalNum = parseInt(total) || 0;
                const percentage = totalNum > 0 ? Math.min(100, Math.max(0, Math.round((currentNum / totalNum) * 100))) : 0;
                
                let colorClass = 'low';
                if (percentage >= 80) {
                    colorClass = 'high';
                } else if (percentage >= 50) {
                    colorClass = 'medium';
                }
                
                return '<div class="progress-bar-container">' +
                    '<div class="progress-bar">' +
                        '<div class="progress-bar-fill ' + colorClass + '" style="width: ' + percentage + '%"></div>' +
                    '</div>' +
                    '<span class="progress-percentage">' + percentage + '%</span>' +
                '</div>';
            }
            
            function getStatusIndicator(status, severity) {
                let indicatorClass = 'unknown';
                let icon = '?';
                let text = 'Unknown';
                
                if (severity === 'success') {
                    indicatorClass = 'success';
                    icon = '✓';
                    text = status || 'True';
                } else if (severity === 'error') {
                    indicatorClass = 'error';
                    icon = '⚠';
                    text = status || 'False';
                } else if (severity === 'warning') {
                    indicatorClass = 'warning';
                    icon = '⚠';
                    text = status || 'True';
                } else {
                    indicatorClass = 'info';
                    icon = '?';
                    text = status || 'Unknown';
                }
                
                return '<span class="status-indicator ' + indicatorClass + '">' +
                    '<span class="status-icon-' + (indicatorClass === 'success' || indicatorClass === 'true' ? 'check' : 'warning') + '">' + icon + '</span>' +
                    '<span>' + text + '</span>' +
                '</span>';
            }
            
            function setupCopyButtons() {
                // Remove existing listeners by cloning nodes
                const copyButtons = document.querySelectorAll('.copy-btn');
                copyButtons.forEach(btn => {
                    const newBtn = btn.cloneNode(true);
                    btn.parentNode.replaceChild(newBtn, btn);
                });
                
                // Attach new listeners
                document.querySelectorAll('.copy-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const value = btn.getAttribute('data-copy-value');
                        if (value) {
                            vscode.postMessage({ command: 'copyValue', value: value });
                        }
                    });
                });
            }
            
            function setupReplicaSetNavigation() {
                // Remove existing listeners by cloning nodes
                const rsLinks = document.querySelectorAll('.replicaset-link');
                rsLinks.forEach(link => {
                    const newLink = link.cloneNode(true);
                    link.parentNode.replaceChild(newLink, link);
                });
                
                // Attach new listeners
                document.querySelectorAll('.replicaset-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const rsName = link.getAttribute('data-replicaset-name');
                        const rsNamespace = link.getAttribute('data-replicaset-namespace');
                        if (rsName) {
                            vscode.postMessage({
                                command: 'navigateToReplicaSet',
                                replicaSetName: rsName,
                                name: rsName,
                                namespace: rsNamespace || undefined
                            });
                        }
                    });
                });
            }
            
            function showLoading() {
                const loadingEl = document.getElementById('loading');
                if (loadingEl) {
                    loadingEl.classList.remove('hidden');
                }
                hideError();
            }
            
            function hideLoading() {
                const loadingEl = document.getElementById('loading');
                if (loadingEl) {
                    loadingEl.classList.add('hidden');
                }
            }
            
            function showError(message) {
                const errorEl = document.getElementById('error-message');
                if (errorEl) {
                    errorEl.textContent = escapeHtml(message);
                    errorEl.classList.remove('hidden');
                }
            }
            
            function hideError() {
                const errorEl = document.getElementById('error-message');
                if (errorEl) {
                    errorEl.classList.add('hidden');
                }
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
            
            function toggleAnnotation(annotationId, fullValue) {
                const valueEl = document.getElementById(annotationId + '-value');
                const btnEl = document.getElementById(annotationId + '-btn');
                if (valueEl && btnEl) {
                    if (valueEl.classList.contains('truncated')) {
                        valueEl.textContent = fullValue;
                        valueEl.classList.remove('truncated');
                        btnEl.textContent = 'Show less';
                    } else {
                        const truncated = fullValue.substring(0, 200) + '...';
                        valueEl.textContent = truncated;
                        valueEl.classList.add('truncated');
                        btnEl.textContent = 'Show more';
                    }
                }
            }
            
            // Make toggleAnnotation available globally for onclick handlers
            window.toggleAnnotation = toggleAnnotation;
            
            // Setup refresh button
            const refreshBtn = document.getElementById('refresh-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    vscode.postMessage({ command: 'refresh' });
                    showLoading();
                });
            }
        })();
    </script>
</body>
</html>`;
    }
}

