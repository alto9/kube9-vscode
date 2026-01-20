import * as vscode from 'vscode';

/**
 * Generates the HTML content for the Free Dashboard webview.
 * Uses VSCode CSS variables for theming and includes message passing infrastructure.
 * 
 * @param webview - The webview instance for CSP configuration
 * @param clusterName - The name of the cluster to display in the dashboard
 * @returns HTML content string
 */
export function getDashboardHtml(webview: vscode.Webview, clusterName: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
    <title>Dashboard: ${clusterName}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 0;
            margin: 0;
            overflow-x: hidden;
        }
        
        .dashboard-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .dashboard-header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        .dashboard-subtitle {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-top: 8px;
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
        }
        
        .cluster-name {
            font-weight: 500;
            color: var(--vscode-foreground);
        }
        
        .last-updated {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .refresh-indicator {
            display: none;
            width: 14px;
            height: 14px;
            border: 2px solid var(--vscode-panel-border);
            border-top: 2px solid var(--vscode-progressBar-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        .refresh-indicator.visible {
            display: inline-block;
        }
        
        .refresh-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .refresh-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .refresh-button:active {
            opacity: 0.8;
        }
        
        .refresh-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .loading-spinner {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            text-align: center;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--vscode-panel-border);
            border-top: 4px solid var(--vscode-progressBar-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .loading-message {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }
        
        .error-message {
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-inputValidation-errorForeground);
            padding: 16px;
            border-radius: 4px;
            margin: 20px 0;
            display: none;
        }
        
        .error-message.visible {
            display: block;
        }
        
        .error-title {
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .error-details {
            font-size: 13px;
            opacity: 0.9;
        }
        
        .dashboard-content {
            display: none;
        }
        
        .dashboard-content.visible {
            display: block;
        }
        
        .stats-cards-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin: 24px 0;
        }
        
        .stats-card {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            transition: background-color 0.2s;
        }
        
        .stats-card:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .card-icon {
            font-size: 32px;
            color: var(--vscode-charts-blue);
        }
        
        .card-content {
            flex: 1;
        }
        
        .card-title {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
        }
        
        .card-value {
            font-size: 28px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        .charts-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 16px;
            margin: 24px 0;
        }
        
        .chart-wrapper {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
        }
        
        .chart-wrapper h2 {
            margin: 0 0 16px 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        .workload-details {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
        }
        
        .workload-details h2 {
            margin: 0 0 16px 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        .workload-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .workload-table tr {
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .workload-table tr:last-child {
            border-bottom: none;
        }
        
        .workload-table td {
            padding: 12px 8px;
            font-size: 14px;
        }
        
        .workload-table td:first-child {
            color: var(--vscode-descriptionForeground);
        }
        
        .workload-table td:last-child {
            text-align: right;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        .hidden {
            display: none;
        }
        
        /* Chart styles */
        .chart-bar-container {
            margin-bottom: 12px;
        }
        
        .chart-bar-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }
        
        .chart-bar-label {
            min-width: 120px;
            font-size: 13px;
            color: var(--vscode-foreground);
        }
        
        .chart-bar-track {
            flex: 1;
            height: 24px;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 0;
            overflow: hidden;
            position: relative;
        }
        
        .chart-bar-fill {
            height: 100%;
            transition: width 0.3s ease;
            display: block;
            border-radius: 0;
            min-width: 0;
        }
        
        .chart-bar-fill.blue {
            background-color: var(--vscode-charts-blue);
        }
        
        .chart-bar-fill.green {
            background-color: var(--vscode-charts-green);
        }
        
        .chart-bar-fill.yellow {
            background-color: var(--vscode-charts-yellow);
        }
        
        .chart-bar-fill.orange {
            background-color: var(--vscode-charts-orange);
        }
        
        .chart-bar-fill.purple {
            background-color: var(--vscode-charts-purple);
        }
        
        .chart-bar-fill.red {
            background-color: var(--vscode-charts-red);
        }
        
        .chart-bar-value {
            min-width: 40px;
            text-align: right;
            font-size: 13px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        .chart-empty-state {
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
            font-style: italic;
            text-align: center;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div id="dashboard-root" class="dashboard-container">
        <!-- Loading spinner (shown initially) -->
        <div id="loading" class="loading-spinner">
            <div class="spinner"></div>
            <div class="loading-message">Loading cluster statistics...</div>
        </div>
        
        <!-- Error message (hidden initially) -->
        <div id="error" class="error-message">
            <div class="error-title">Error Loading Dashboard</div>
            <div id="error-details" class="error-details"></div>
        </div>
        
        <!-- Dashboard content (hidden until data loads) -->
        <div id="content" class="dashboard-content">
            <div class="dashboard-header">
                <div>
                    <h1>Cluster Dashboard</h1>
                    <div class="dashboard-subtitle">
                        <span class="cluster-name">${clusterName}</span>
                        <span id="last-updated" class="last-updated">
                            <span>Last updated: --</span>
                            <span id="refresh-indicator" class="refresh-indicator"></span>
                        </span>
                    </div>
                </div>
                <button id="refresh-button" class="refresh-button">
                    <span>↻</span> Refresh
                </button>
            </div>
            
            <!-- Stats cards -->
            <div id="stats-cards" class="stats-cards-container">
                <!-- Stats cards will be populated by JavaScript -->
            </div>
            
            <!-- Charts -->
            <div class="charts-container">
                <div class="chart-wrapper">
                    <h2>Workload Distribution</h2>
                    <div id="workload-chart" class="chart-bar-container">
                        <!-- Chart bars will be populated by JavaScript -->
                    </div>
                </div>
                
                <div class="chart-wrapper">
                    <h2>Node Health</h2>
                    <div id="node-health-chart" class="chart-bar-container">
                        <!-- Chart bars will be populated by JavaScript -->
                    </div>
                </div>
            </div>
            
            <!-- Workload details table -->
            <div class="workload-details">
                <h2>Workload Details</h2>
                <table id="workload-table" class="workload-table">
                    <!-- Table rows will be populated by JavaScript -->
                </table>
            </div>
        </div>
    </div>
    
    <script>
        // Acquire VS Code API
        const vscode = acquireVsCodeApi();
        
        // Get DOM elements
        const loadingElement = document.getElementById('loading');
        const errorElement = document.getElementById('error');
        const contentElement = document.getElementById('content');
        const errorDetailsElement = document.getElementById('error-details');
        const refreshButton = document.getElementById('refresh-button');
        const lastUpdatedElement = document.getElementById('last-updated');
        const refreshIndicator = document.getElementById('refresh-indicator');
        const statsCardsContainer = document.getElementById('stats-cards');
        const workloadTableElement = document.getElementById('workload-table');
        
        // Show loading state (initial load only)
        function showLoading() {
            loadingElement.classList.remove('hidden');
            errorElement.classList.remove('visible');
            contentElement.classList.remove('visible');
            if (refreshIndicator) {
                refreshIndicator.classList.remove('visible');
            }
        }
        
        // Show refreshing state (subtle indicator, keep content visible)
        function showRefreshing() {
            if (refreshIndicator) {
                refreshIndicator.classList.add('visible');
            }
            if (refreshButton) {
                refreshButton.disabled = true;
            }
        }
        
        // Hide refreshing indicator
        function hideRefreshing() {
            if (refreshIndicator) {
                refreshIndicator.classList.remove('visible');
            }
            if (refreshButton) {
                refreshButton.disabled = false;
            }
        }
        
        // Show error state
        function showError(errorMessage) {
            loadingElement.classList.add('hidden');
            errorElement.classList.add('visible');
            contentElement.classList.remove('visible');
            errorDetailsElement.textContent = errorMessage;
            hideRefreshing();
        }
        
        // Show content state
        function showContent() {
            loadingElement.classList.add('hidden');
            errorElement.classList.remove('visible');
            contentElement.classList.add('visible');
            hideRefreshing();
        }
        
        // Update dashboard data
        function updateDashboardData(data) {
            // Update last updated timestamp
            if (data.lastUpdated) {
                const date = new Date(data.lastUpdated);
                const textSpan = lastUpdatedElement.querySelector('span:first-child');
                if (textSpan) {
                    textSpan.textContent = 'Last updated: ' + date.toLocaleTimeString();
                }
            }
            
            // Update stats cards
            if (data.namespaceCount !== undefined || data.workloads || data.nodes) {
                updateStatsCards(data);
            }
            
            // Update workload table
            if (data.workloads) {
                updateWorkloadTable(data.workloads);
            }
            
            // Update charts
            if (data.workloads) {
                updateWorkloadChart(data.workloads);
            }
            if (data.nodes) {
                updateNodeHealthChart(data.nodes);
            }
            
            // Show content
            showContent();
        }
        
        // Update stats cards
        function updateStatsCards(data) {
            const cards = [
                {
                    icon: '📦',
                    title: 'Namespaces',
                    value: data.namespaceCount || 0
                },
                {
                    icon: '🚀',
                    title: 'Deployments',
                    value: data.workloads?.deployments || 0
                },
                {
                    icon: '📋',
                    title: 'Pods',
                    value: data.workloads?.pods || 0
                },
                {
                    icon: '🖥️',
                    title: 'Nodes',
                    value: data.nodes ? (data.nodes.readyNodes + '/' + data.nodes.totalNodes) : '0/0'
                }
            ];
            
            statsCardsContainer.innerHTML = cards.map(card => 
                '<div class="stats-card">' +
                    '<div class="card-icon">' + card.icon + '</div>' +
                    '<div class="card-content">' +
                        '<div class="card-title">' + card.title + '</div>' +
                        '<div class="card-value">' + card.value + '</div>' +
                    '</div>' +
                '</div>'
            ).join('');
        }
        
        // Update workload table
        function updateWorkloadTable(workloads) {
            const rows = [
                { label: 'Deployments', value: workloads.deployments || 0 },
                { label: 'StatefulSets', value: workloads.statefulsets || 0 },
                { label: 'DaemonSets', value: workloads.daemonsets || 0 },
                { label: 'ReplicaSets', value: workloads.replicasets || 0 },
                { label: 'Jobs', value: workloads.jobs || 0 },
                { label: 'CronJobs', value: workloads.cronjobs || 0 },
                { label: 'Pods', value: workloads.pods || 0 }
            ];
            
            workloadTableElement.innerHTML = rows.map(row =>
                '<tr>' +
                    '<td>' + row.label + '</td>' +
                    '<td>' + row.value + '</td>' +
                '</tr>'
            ).join('');
        }
        
        // Update workload distribution chart
        function updateWorkloadChart(workloads) {
            const chartElement = document.getElementById('workload-chart');
            if (!chartElement) return;
            
            const chartData = [
                { label: 'Deployments', value: workloads.deployments || 0, color: 'blue' },
                { label: 'StatefulSets', value: workloads.statefulsets || 0, color: 'green' },
                { label: 'DaemonSets', value: workloads.daemonsets || 0, color: 'yellow' },
                { label: 'Jobs', value: workloads.jobs || 0, color: 'orange' },
                { label: 'CronJobs', value: workloads.cronjobs || 0, color: 'purple' }
            ];
            
            // Calculate total for percentages
            const total = chartData.reduce((sum, item) => sum + item.value, 0);
            
            if (total === 0) {
                chartElement.innerHTML = '<div class="chart-empty-state">No workloads found</div>';
                return;
            }
            
            // Render bars
            chartElement.innerHTML = chartData.map(item => {
                const percentage = (item.value / total) * 100;
                return (
                    '<div class="chart-bar-row">' +
                        '<div class="chart-bar-label">' + item.label + '</div>' +
                        '<div class="chart-bar-track">' +
                            '<div class="chart-bar-fill ' + item.color + '" style="width: ' + percentage + '%"></div>' +
                        '</div>' +
                        '<div class="chart-bar-value">' + item.value + '</div>' +
                    '</div>'
                );
            }).join('');
        }
        
        // Update node health chart
        function updateNodeHealthChart(nodes) {
            const chartElement = document.getElementById('node-health-chart');
            if (!chartElement) return;
            
            const totalNodes = nodes.totalNodes || 0;
            const readyNodes = nodes.readyNodes || 0;
            const notReadyNodes = totalNodes - readyNodes;
            
            if (totalNodes === 0) {
                chartElement.innerHTML = '<div class="chart-empty-state">No nodes found</div>';
                return;
            }
            
            const readyPercentage = (readyNodes / totalNodes) * 100;
            const notReadyPercentage = (notReadyNodes / totalNodes) * 100;
            
            chartElement.innerHTML = (
                '<div class="chart-bar-row">' +
                    '<div class="chart-bar-label">Ready</div>' +
                    '<div class="chart-bar-track">' +
                        '<div class="chart-bar-fill green" style="width: ' + readyPercentage + '%"></div>' +
                    '</div>' +
                    '<div class="chart-bar-value">' + readyNodes + '</div>' +
                '</div>' +
                '<div class="chart-bar-row">' +
                    '<div class="chart-bar-label">Not Ready</div>' +
                    '<div class="chart-bar-track">' +
                        '<div class="chart-bar-fill red" style="width: ' + notReadyPercentage + '%"></div>' +
                    '</div>' +
                    '<div class="chart-bar-value">' + notReadyNodes + '</div>' +
                '</div>'
            );
        }
        
        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'updateData':
                    updateDashboardData(message.data);
                    break;
                    
                case 'loading':
                    showLoading();
                    break;
                    
                case 'refreshing':
                    showRefreshing();
                    break;
                    
                case 'error':
                    showError(message.error);
                    break;
            }
        });
        
        // Refresh button click handler
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                refreshButton.disabled = true;
                vscode.postMessage({ type: 'refresh' });
            });
        }
        
        // Request initial data (fallback - extension sends data proactively)
        vscode.postMessage({ type: 'requestData' });
    </script>
</body>
</html>`;
}

