import * as vscode from 'vscode';
import { NodeCommands } from '../kubectl/NodeCommands';
import { PodCommands } from '../kubectl/PodCommands';
import { transformNodeData, NodeDescribeData } from './nodeDescribeTransformer';
import { getResourceCache, CACHE_TTL } from '../kubernetes/cache';

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
            // Update HTML content to ensure proper structure
            NodeDescribeWebview.currentPanel.webview.html = NodeDescribeWebview.getWebviewContent(
                NodeDescribeWebview.currentPanel.webview
            );
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

        // Set HTML content with complete structure
        panel.webview.html = NodeDescribeWebview.getWebviewContent(
            panel.webview
        );

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
     * Clear cached node data for a specific node.
     * 
     * @param contextName The Kubernetes context name
     * @param nodeName The node name
     */
    private static clearNodeCache(contextName: string, nodeName: string): void {
        const cache = getResourceCache();
        const cacheKey = `node-describe:${contextName}:${nodeName}`;
        cache.invalidate(cacheKey);
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

        // Check cache first
        const cache = getResourceCache();
        const cacheKey = `node-describe:${contextName}:${nodeName}`;
        const cached = cache.get<NodeDescribeData>(cacheKey);
        if (cached) {
            panel.webview.postMessage({
                command: 'updateNodeData',
                data: cached
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

            // Cache for 30 seconds
            cache.set(cacheKey, transformedData, CACHE_TTL.NODES);

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
                        const contextName = NodeDescribeWebview.contextName;
                        const nodeName = NodeDescribeWebview.currentNodeName;
                        if (contextName && nodeName) {
                            NodeDescribeWebview.clearNodeCache(contextName, nodeName);
                        }
                        await NodeDescribeWebview.refreshNodeData();
                        break;
                    }
                    
                    case 'navigateToPod': {
                        const podName = message.podName || message.name;
                        const namespace = message.namespace;
                        if (podName) {
                            await vscode.commands.executeCommand('kube9.revealPod', podName, namespace);
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
     * Generate the HTML content for the Node Describe webview.
     * Includes complete HTML structure with all sections, CSS styling, and JavaScript.
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
    <title>Node Describe</title>
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

        .node-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 15px;
            margin-bottom: 20px;
        }

        .node-title {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .node-name {
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

        .status-banner {
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
        }

        .status-banner.status-ready {
            background-color: rgba(0, 200, 0, 0.1);
            color: #00c800;
            border: 1px solid rgba(0, 200, 0, 0.3);
        }

        .status-banner.status-notready {
            background-color: rgba(255, 0, 0, 0.1);
            color: var(--vscode-errorForeground);
            border: 1px solid rgba(255, 0, 0, 0.3);
        }

        .status-banner.status-unknown {
            background-color: rgba(128, 128, 128, 0.1);
            color: var(--vscode-descriptionForeground);
            border: 1px solid rgba(128, 128, 128, 0.3);
        }

        .status-icon {
            font-size: 16px;
            font-weight: bold;
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

        .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: 500;
        }

        .status-indicator.true {
            background-color: rgba(0, 200, 0, 0.1);
            color: #00c800;
        }

        .status-indicator.false {
            background-color: rgba(255, 0, 0, 0.1);
            color: var(--vscode-errorForeground);
        }

        .status-indicator.unknown {
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

        .address-list, .label-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .address-item, .label-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .address-item:last-child, .label-item:last-child {
            border-bottom: none;
        }

        .address-type, .label-key {
            font-weight: 600;
            min-width: 120px;
            color: var(--vscode-foreground);
        }

        .address-value, .label-value {
            flex: 1;
            color: var(--vscode-foreground);
            font-family: var(--vscode-editor-font-family);
            word-break: break-all;
        }

        .pod-link {
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            text-decoration: none;
        }

        .pod-link:hover {
            text-decoration: underline;
        }

        .allocation-item {
            margin-bottom: 20px;
        }

        .allocation-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 13px;
            color: var(--vscode-foreground);
        }

        .allocation-bars {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .allocation-bar-item {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .allocation-bar-label {
            min-width: 80px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
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
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="node-header">
            <h1 class="node-title">Node / <span class="node-name" id="node-name">Loading...</span></h1>
            <div class="header-actions">
                <button id="refresh-btn" class="action-btn">
                    <span class="btn-icon">🔄</span>
                    <span class="btn-text">Refresh</span>
                </button>
            </div>
        </div>

        <!-- Status Banner -->
        <div class="status-banner" id="status-banner">
            <span class="status-icon" id="status-icon">⏳</span>
            <span class="status-text" id="status-text">Loading...</span>
        </div>

        <!-- Overview Section -->
        <div class="section">
            <h2>Overview</h2>
            <div class="info-grid" id="overview-grid">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>

        <!-- Resources Section -->
        <div class="section">
            <h2>Resources</h2>
            <table>
                <thead>
                    <tr>
                        <th>Resource</th>
                        <th>Capacity</th>
                        <th>Allocatable</th>
                        <th>Used</th>
                        <th>Available</th>
                        <th>Usage</th>
                    </tr>
                </thead>
                <tbody id="resources-tbody">
                    <!-- Will be populated by JavaScript -->
                </tbody>
            </table>
        </div>

        <!-- Conditions Section -->
        <div class="section">
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

        <!-- Pods Section -->
        <div class="section">
            <h2>Pods</h2>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Namespace</th>
                        <th>Status</th>
                        <th>CPU Request</th>
                        <th>Memory Request</th>
                        <th>CPU Limit</th>
                        <th>Memory Limit</th>
                        <th>Restarts</th>
                        <th>Age</th>
                    </tr>
                </thead>
                <tbody id="pods-tbody">
                    <!-- Will be populated by JavaScript -->
                </tbody>
            </table>
        </div>

        <!-- Addresses Section -->
        <div class="section">
            <h2>Addresses</h2>
            <ul class="address-list" id="addresses-list">
                <!-- Will be populated by JavaScript -->
            </ul>
        </div>

        <!-- Labels Section -->
        <div class="section">
            <h2>Labels</h2>
            <ul class="label-list" id="labels-list">
                <!-- Will be populated by JavaScript -->
            </ul>
        </div>

        <!-- Taints Section -->
        <div class="section">
            <h2>Taints</h2>
            <table>
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>Value</th>
                        <th>Effect</th>
                    </tr>
                </thead>
                <tbody id="taints-tbody">
                    <!-- Will be populated by JavaScript -->
                </tbody>
            </table>
        </div>

        <!-- Allocation Section -->
        <div class="section">
            <h2>Allocation</h2>
            <div id="allocation-container">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'updateNodeData') {
                renderNodeData(message.data);
            } else if (message.command === 'error') {
                showError(message.message);
            }
        });

        let currentNodeName = '';

        function renderNodeData(data) {
            if (!data) return;

            currentNodeName = data.name || 'Unknown';

            // Update node name in header
            const nodeNameEl = document.getElementById('node-name');
            if (nodeNameEl) {
                nodeNameEl.textContent = currentNodeName;
            }

            // Update status banner
            const statusBanner = document.getElementById('status-banner');
            const statusIcon = document.getElementById('status-icon');
            const statusText = document.getElementById('status-text');
            if (statusBanner && statusIcon && statusText) {
                const status = data.overview?.status || 'Unknown';
                statusBanner.className = 'status-banner status-' + status.toLowerCase();
                
                if (status === 'Ready') {
                    statusIcon.textContent = '✓';
                    statusText.textContent = 'Node is Ready';
                } else if (status === 'NotReady') {
                    statusIcon.textContent = '⚠';
                    statusText.textContent = 'Node is Not Ready';
                } else {
                    statusIcon.textContent = '?';
                    statusText.textContent = 'Node status is Unknown';
                }
            }

            // Render all sections
            if (data.overview) renderOverview(data.overview);
            if (data.resources) renderResources(data.resources);
            if (data.conditions) renderConditions(data.conditions);
            if (data.pods) renderPods(data.pods);
            if (data.addresses) renderAddresses(data.addresses);
            if (data.labels) renderLabels(data.labels);
            if (data.taints) renderTaints(data.taints);
            if (data.allocation) renderAllocation(data.allocation);

            // Setup interactive elements
            setupCopyButtons();
            setupPodNavigation();
        }

        function renderOverview(overview) {
            const grid = document.getElementById('overview-grid');
            if (!grid) return;

            const items = [
                { label: 'Name', value: overview.name || 'N/A' },
                { label: 'Status', value: overview.status || 'Unknown' },
                { label: 'Roles', value: overview.roles && overview.roles.length > 0 ? overview.roles.join(', ') : 'None' },
                { label: 'Creation Timestamp', value: overview.creationTimestamp || 'N/A' },
                { label: 'Kubernetes Version', value: overview.kubernetesVersion || 'N/A' },
                { label: 'Container Runtime', value: overview.containerRuntime || 'N/A' },
                { label: 'OS Image', value: overview.osImage || 'N/A' },
                { label: 'Kernel Version', value: overview.kernelVersion || 'N/A' },
                { label: 'Architecture', value: overview.architecture || 'N/A' }
            ];

            grid.innerHTML = items.map(item => 
                '<div class="info-item">' +
                    '<div class="info-label">' + escapeHtml(item.label) + '</div>' +
                    '<div class="info-value">' + escapeHtml(item.value) + '</div>' +
                '</div>'
            ).join('');
        }

        function renderResources(resources) {
            const tbody = document.getElementById('resources-tbody');
            if (!tbody) return;

            const resourceTypes = [
                { key: 'cpu', label: 'CPU' },
                { key: 'memory', label: 'Memory' },
                { key: 'pods', label: 'Pods' },
                { key: 'ephemeralStorage', label: 'Ephemeral Storage' }
            ];

            tbody.innerHTML = resourceTypes.map(type => {
                const resource = resources[type.key];
                if (!resource) return '';

                const progressBar = createProgressBar(
                    resource.usagePercentage,
                    resource.used,
                    resource.allocatable
                );

                return '<tr>' +
                    '<td>' + escapeHtml(type.label) + '</td>' +
                    '<td>' + escapeHtml(resource.capacity) + '</td>' +
                    '<td>' + escapeHtml(resource.allocatable) + '</td>' +
                    '<td>' + escapeHtml(resource.used) + '</td>' +
                    '<td>' + escapeHtml(resource.available) + '</td>' +
                    '<td>' + progressBar + '</td>' +
                '</tr>';
            }).join('');
        }

        function renderConditions(conditions) {
            const tbody = document.getElementById('conditions-tbody');
            if (!tbody) return;

            if (!conditions || conditions.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No conditions available</td></tr>';
                return;
            }

            tbody.innerHTML = conditions.map(condition => {
                const statusIndicator = getStatusIndicator(condition.status, condition.type);
                return '<tr>' +
                    '<td>' + escapeHtml(condition.type) + '</td>' +
                    '<td>' + statusIndicator + '</td>' +
                    '<td>' + escapeHtml(condition.reason || 'N/A') + '</td>' +
                    '<td>' + escapeHtml(condition.message || 'N/A') + '</td>' +
                    '<td>' + escapeHtml(condition.relativeTime || 'N/A') + '</td>' +
                '</tr>';
            }).join('');
        }

        function renderPods(pods) {
            const tbody = document.getElementById('pods-tbody');
            if (!tbody) return;

            if (!pods || pods.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No pods running on this node</td></tr>';
                return;
            }

            tbody.innerHTML = pods.map(pod => {
                const podLink = '<a href="#" class="pod-link" data-pod-name="' + escapeHtml(pod.name) + '" data-pod-namespace="' + escapeHtml(pod.namespace) + '">' + escapeHtml(pod.name) + '</a>';
                return '<tr>' +
                    '<td>' + podLink + '</td>' +
                    '<td>' + escapeHtml(pod.namespace) + '</td>' +
                    '<td>' + escapeHtml(pod.status) + '</td>' +
                    '<td>' + escapeHtml(pod.cpuRequest || '0') + '</td>' +
                    '<td>' + escapeHtml(pod.memoryRequest || '0') + '</td>' +
                    '<td>' + escapeHtml(pod.cpuLimit || '0') + '</td>' +
                    '<td>' + escapeHtml(pod.memoryLimit || '0') + '</td>' +
                    '<td>' + escapeHtml(String(pod.restartCount || 0)) + '</td>' +
                    '<td>' + escapeHtml(pod.age || 'N/A') + '</td>' +
                '</tr>';
            }).join('');
        }

        function renderAddresses(addresses) {
            const list = document.getElementById('addresses-list');
            if (!list) return;

            if (!addresses || addresses.length === 0) {
                list.innerHTML = '<li class="empty-state">No addresses available</li>';
                return;
            }

            list.innerHTML = addresses.map(addr => 
                '<li class="address-item">' +
                    '<span class="address-type">' + escapeHtml(addr.type) + '</span>' +
                    '<span class="address-value">' + escapeHtml(addr.address) + '</span>' +
                    '<button class="copy-btn" data-copy-value="' + escapeHtml(addr.address) + '" title="Copy address">' +
                        '<span class="copy-icon">📋</span>' +
                    '</button>' +
                '</li>'
            ).join('');
        }

        function renderLabels(labels) {
            const list = document.getElementById('labels-list');
            if (!list) return;

            const labelEntries = Object.entries(labels || {});
            if (labelEntries.length === 0) {
                list.innerHTML = '<li class="empty-state">No labels configured</li>';
                return;
            }

            list.innerHTML = labelEntries.map(([key, value]) => {
                const labelPair = key + '=' + value;
                return '<li class="label-item">' +
                    '<span class="label-key">' + escapeHtml(key) + '</span>' +
                    '<span class="label-value">' + escapeHtml(value) + '</span>' +
                    '<button class="copy-btn" data-copy-value="' + escapeHtml(labelPair) + '" title="Copy label">' +
                        '<span class="copy-icon">📋</span>' +
                    '</button>' +
                '</li>';
            }).join('');
        }

        function renderTaints(taints) {
            const tbody = document.getElementById('taints-tbody');
            if (!tbody) return;

            if (!taints || taints.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No taints configured</td></tr>';
                return;
            }

            tbody.innerHTML = taints.map(taint => 
                '<tr>' +
                    '<td>' + escapeHtml(taint.key) + '</td>' +
                    '<td>' + escapeHtml(taint.value || '') + '</td>' +
                    '<td>' + escapeHtml(taint.effect) + '</td>' +
                '</tr>'
            ).join('');
        }

        function renderAllocation(allocation) {
            const container = document.getElementById('allocation-container');
            if (!container) return;

            const cpu = allocation.cpu;
            const memory = allocation.memory;

            container.innerHTML = 
                '<div class="allocation-item">' +
                    '<div class="allocation-label">' +
                        '<span>CPU</span>' +
                        '<span>Allocatable: ' + escapeHtml(cpu.allocatable) + '</span>' +
                    '</div>' +
                    '<div class="allocation-bars">' +
                        '<div class="allocation-bar-item">' +
                            '<span class="allocation-bar-label">Requests:</span>' +
                            createProgressBar(cpu.requestsPercentage, cpu.requests, cpu.allocatable) +
                        '</div>' +
                        '<div class="allocation-bar-item">' +
                            '<span class="allocation-bar-label">Limits:</span>' +
                            createProgressBar(cpu.limitsPercentage, cpu.limits, cpu.allocatable) +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="allocation-item">' +
                    '<div class="allocation-label">' +
                        '<span>Memory</span>' +
                        '<span>Allocatable: ' + escapeHtml(memory.allocatable) + '</span>' +
                    '</div>' +
                    '<div class="allocation-bars">' +
                        '<div class="allocation-bar-item">' +
                            '<span class="allocation-bar-label">Requests:</span>' +
                            createProgressBar(memory.requestsPercentage, memory.requests, memory.allocatable) +
                        '</div>' +
                        '<div class="allocation-bar-item">' +
                            '<span class="allocation-bar-label">Limits:</span>' +
                            createProgressBar(memory.limitsPercentage, memory.limits, memory.allocatable) +
                        '</div>' +
                    '</div>' +
                '</div>';
        }

        function createProgressBar(percentage, used, total) {
            const safePercentage = Math.min(100, Math.max(0, Math.round(percentage || 0)));
            let colorClass = 'low';
            if (safePercentage >= 80) {
                colorClass = 'high';
            } else if (safePercentage >= 50) {
                colorClass = 'medium';
            }

            return '<div class="progress-bar-container">' +
                '<div class="progress-bar">' +
                    '<div class="progress-bar-fill ' + colorClass + '" style="width: ' + safePercentage + '%"></div>' +
                '</div>' +
                '<span class="progress-percentage">' + safePercentage + '%</span>' +
                '<span class="progress-values">' + escapeHtml(String(used)) + ' / ' + escapeHtml(String(total)) + '</span>' +
            '</div>';
        }

        function getStatusIndicator(status, type) {
            let indicatorClass = 'unknown';
            let icon = '?';
            let text = 'Unknown';

            if (status === 'True') {
                if (type === 'Ready') {
                    indicatorClass = 'true';
                    icon = '✓';
                    text = 'True';
                } else {
                    // For conditions like MemoryPressure, DiskPressure, etc., True is bad
                    indicatorClass = 'false';
                    icon = '⚠';
                    text = 'True';
                }
            } else if (status === 'False') {
                if (type === 'Ready') {
                    indicatorClass = 'false';
                    icon = '⚠';
                    text = 'False';
                } else {
                    // For conditions like MemoryPressure, DiskPressure, etc., False is good
                    indicatorClass = 'true';
                    icon = '✓';
                    text = 'False';
                }
            }

            const iconClass = indicatorClass === 'true' ? 'check' : 'warning';
            return '<span class="status-indicator ' + indicatorClass + '">' +
                '<span class="status-icon-' + iconClass + '">' + icon + '</span>' +
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

        function setupPodNavigation() {
            // Remove existing listeners by cloning nodes
            const podLinks = document.querySelectorAll('.pod-link');
            podLinks.forEach(link => {
                const newLink = link.cloneNode(true);
                link.parentNode.replaceChild(newLink, link);
            });

            // Attach new listeners
            document.querySelectorAll('.pod-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const podName = link.getAttribute('data-pod-name');
                    const podNamespace = link.getAttribute('data-pod-namespace');
                    if (podName) {
                        vscode.postMessage({
                            command: 'navigateToPod',
                            name: podName,
                            namespace: podNamespace || undefined
                        });
                    }
                });
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

        function showError(message) {
            const container = document.querySelector('.container');
            if (!container) return;
            
            // Remove existing error messages
            const existingErrors = container.querySelectorAll('.error-message');
            existingErrors.forEach(err => err.remove());

            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            container.insertBefore(errorDiv, container.firstChild);
        }

        // Refresh button handler
        document.getElementById('refresh-btn').addEventListener('click', () => {
            vscode.postMessage({ command: 'refresh' });
        });
    </script>
</body>
</html>`;
    }

    /**
     * Escape HTML special characters to prevent XSS.
     * 
     * @param unsafe The string to escape
     * @returns The escaped string
     */
    private static escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

