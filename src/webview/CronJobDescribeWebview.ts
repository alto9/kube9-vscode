import * as vscode from 'vscode';
import { WorkloadCommands, CronJobDetailsResult, CronJobEventsResult, FullJobsResult } from '../kubectl/WorkloadCommands';
import { transformCronJobData } from './cronJobDataTransformer';
import { CronJobDescribeData } from '../providers/CronJobDescribeProvider';
import { getResourceCache, CACHE_TTL } from '../kubernetes/cache';
import { DescribeWebview } from './DescribeWebview';

/**
 * Message sent from webview to extension.
 */
interface WebviewMessage {
    command: 'refresh' | 'navigateToJob' | 'copyValue';
    jobName?: string;
    name?: string;
    namespace?: string;
    value?: string;
    content?: string;
}

/**
 * CronJobDescribeWebview manages a webview panel for displaying CronJob details.
 * Uses singleton pattern to reuse a single panel instance.
 */
export class CronJobDescribeWebview {
    /**
     * The single shared webview panel instance.
     * Reused for all CronJob describe actions.
     */
    private static currentPanel: vscode.WebviewPanel | undefined;
    
    /**
     * Extension context stored for later use.
     */
    private static extensionContext: vscode.ExtensionContext | undefined;
    
    /**
     * Current CronJob name being displayed.
     */
    private static currentCronJobName: string | undefined;
    
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
     * Show the CronJob Describe webview for a cronjob.
     * Creates a new panel if none exists, or reuses and updates the existing panel.
     * Uses the shared DescribeWebview panel to ensure all describe views share one tab.
     * 
     * @param context The VS Code extension context
     * @param cronjobName Name of the cronjob to describe
     * @param namespace Namespace where the cronjob is located
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the Kubernetes context
     */
    public static async show(
        context: vscode.ExtensionContext,
        cronjobName: string,
        namespace: string,
        kubeconfigPath: string,
        contextName: string
    ): Promise<void> {
        // Store the extension context for later use
        CronJobDescribeWebview.extensionContext = context;
        CronJobDescribeWebview.currentCronJobName = cronjobName;
        CronJobDescribeWebview.currentNamespace = namespace;
        CronJobDescribeWebview.kubeconfigPath = kubeconfigPath;
        CronJobDescribeWebview.contextName = contextName;

        // Check if there's a shared panel from DescribeWebview
        const sharedPanel = DescribeWebview.getSharedPanel();

        // If there's a shared panel (from any describe view), reuse it
        if (sharedPanel) {
            CronJobDescribeWebview.currentPanel = sharedPanel;
            CronJobDescribeWebview.currentPanel.title = `CronJob / ${cronjobName}`;
            // Update HTML content to ensure proper structure
            CronJobDescribeWebview.currentPanel.webview.html = CronJobDescribeWebview.getWebviewContent(
                CronJobDescribeWebview.currentPanel.webview
            );
            await CronJobDescribeWebview.refreshCronJobData();
            CronJobDescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        // If we have our own panel but shared panel is gone, reuse our panel
        if (CronJobDescribeWebview.currentPanel) {
            CronJobDescribeWebview.currentPanel.title = `CronJob / ${cronjobName}`;
            CronJobDescribeWebview.currentCronJobName = cronjobName;
            CronJobDescribeWebview.currentNamespace = namespace;
            CronJobDescribeWebview.kubeconfigPath = kubeconfigPath;
            CronJobDescribeWebview.contextName = contextName;
            // Update HTML content to ensure proper structure
            CronJobDescribeWebview.currentPanel.webview.html = CronJobDescribeWebview.getWebviewContent(
                CronJobDescribeWebview.currentPanel.webview
            );
            await CronJobDescribeWebview.refreshCronJobData();
            CronJobDescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            // Register our panel as the shared panel
            DescribeWebview.setSharedPanel(CronJobDescribeWebview.currentPanel);
            return;
        }

        // Create title with cronjob name
        const title = `CronJob / ${cronjobName}`;

        // Create a new webview panel with the SHARED panel ID
        const panel = vscode.window.createWebviewPanel(
            'kube9Describe',  // Use the shared panel ID
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        CronJobDescribeWebview.currentPanel = panel;
        // Register this panel as the shared panel for all describe views
        DescribeWebview.setSharedPanel(panel);

        // Set HTML content with complete structure
        panel.webview.html = CronJobDescribeWebview.getWebviewContent(
            panel.webview
        );

        // Set up message handlers
        CronJobDescribeWebview.setupMessageHandlers(panel, context);

        // Fetch and display initial data
        await CronJobDescribeWebview.refreshCronJobData();

        // Handle panel disposal
        panel.onDidDispose(
            () => {
                CronJobDescribeWebview.currentPanel = undefined;
                CronJobDescribeWebview.currentCronJobName = undefined;
                CronJobDescribeWebview.currentNamespace = undefined;
                CronJobDescribeWebview.kubeconfigPath = undefined;
                CronJobDescribeWebview.contextName = undefined;
                // Clear the shared panel reference
                DescribeWebview.setSharedPanel(undefined);
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Clear cached cronjob data for a specific cronjob.
     * 
     * @param contextName The Kubernetes context name
     * @param namespace The namespace
     * @param cronjobName The cronjob name
     */
    private static clearCronJobCache(contextName: string, namespace: string, cronjobName: string): void {
        const cache = getResourceCache();
        const cacheKey = `cronjob-describe:${contextName}:${namespace}:${cronjobName}`;
        cache.invalidate(cacheKey);
    }

    /**
     * Refresh cronjob data by fetching from Kubernetes API and updating the webview.
     */
    private static async refreshCronJobData(): Promise<void> {
        if (!CronJobDescribeWebview.currentPanel) {
            return;
        }

        const panel = CronJobDescribeWebview.currentPanel;
        const cronjobName = CronJobDescribeWebview.currentCronJobName;
        const namespace = CronJobDescribeWebview.currentNamespace;
        const kubeconfigPath = CronJobDescribeWebview.kubeconfigPath;
        const contextName = CronJobDescribeWebview.contextName;

        if (!cronjobName || !namespace || !kubeconfigPath || !contextName) {
            panel.webview.postMessage({
                command: 'error',
                message: 'Missing required parameters for cronjob data fetch'
            });
            return;
        }

        // Check cache first
        const cache = getResourceCache();
        const cacheKey = `cronjob-describe:${contextName}:${namespace}:${cronjobName}`;
        const cached = cache.get<CronJobDescribeData>(cacheKey);
        if (cached) {
            panel.webview.postMessage({
                command: 'updateCronJobData',
                data: cached
            });
            return;
        }

        try {
            // Fetch cronjob details, jobs, and events in parallel
            const [cronjobResult, jobsResult, eventsResult] = await Promise.all([
                WorkloadCommands.getCronJobDetails(cronjobName, namespace, kubeconfigPath, contextName),
                WorkloadCommands.getFullJobsForCronJob(kubeconfigPath, contextName, cronjobName, namespace),
                WorkloadCommands.getCronJobEvents(cronjobName, namespace, kubeconfigPath, contextName)
            ]);

            // Check for cronjob error
            if (cronjobResult.error) {
                panel.webview.postMessage({
                    command: 'error',
                    message: `Failed to fetch cronjob details: ${cronjobResult.error.message || 'Unknown error'}`
                });
                return;
            }

            // Check if cronjob data is available
            if (!cronjobResult.cronjob) {
                panel.webview.postMessage({
                    command: 'error',
                    message: 'CronJob not found or unavailable'
                });
                return;
            }

            // Log warnings for jobs/events errors but continue
            if (jobsResult.error) {
                console.log(`Warning: Failed to fetch jobs: ${jobsResult.error.message || 'Unknown error'}`);
            }

            if (eventsResult.error) {
                console.log(`Warning: Failed to fetch events: ${eventsResult.error.message || 'Unknown error'}`);
            }

            // Transform data for webview
            const transformedData = transformCronJobData(
                cronjobResult.cronjob,
                jobsResult.jobs || [],
                eventsResult.events || []
            );

            // Cache for 30 seconds
            cache.set(cacheKey, transformedData, CACHE_TTL.DEPLOYMENTS);

            // Post transformed data to webview
            panel.webview.postMessage({
                command: 'updateCronJobData',
                data: transformedData
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error refreshing cronjob data:', errorMessage);
            panel.webview.postMessage({
                command: 'error',
                message: `Failed to refresh cronjob data: ${errorMessage}`
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
                        const contextName = CronJobDescribeWebview.contextName;
                        const namespace = CronJobDescribeWebview.currentNamespace;
                        const cronjobName = CronJobDescribeWebview.currentCronJobName;
                        if (contextName && namespace && cronjobName) {
                            CronJobDescribeWebview.clearCronJobCache(contextName, namespace, cronjobName);
                        }
                        await CronJobDescribeWebview.refreshCronJobData();
                        break;
                    }
                    
                    case 'navigateToJob': {
                        const jobName = message.jobName || message.name;
                        const namespace = message.namespace || CronJobDescribeWebview.currentNamespace;
                        if (jobName && namespace) {
                            // For now, show info message - job describe view can be implemented later
                            vscode.window.showInformationMessage(`Job: ${jobName} in ${namespace}`);
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
     * Generate the HTML content for the CronJob Describe webview.
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
    <title>CronJob Describe</title>
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

        .cronjob-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 15px;
            margin-bottom: 20px;
        }

        .cronjob-title {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .cronjob-name {
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

        .status-banner.status-active {
            background-color: rgba(0, 200, 0, 0.1);
            color: #00c800;
            border: 1px solid rgba(0, 200, 0, 0.3);
        }

        .status-banner.status-suspended {
            background-color: rgba(255, 170, 0, 0.1);
            color: #ffaa00;
            border: 1px solid rgba(255, 170, 0, 0.3);
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

        .schedule-box {
            padding: 16px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background-color: var(--vscode-editor-background);
            margin-bottom: 20px;
        }

        .schedule-expression {
            font-family: var(--vscode-editor-font-family);
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-textLink-foreground);
        }

        .schedule-human {
            font-size: 14px;
            margin-bottom: 12px;
            color: var(--vscode-foreground);
        }

        .schedule-times {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }

        .schedule-time {
            display: flex;
            flex-direction: column;
            gap: 4px;
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

        table tbody tr.active {
            background-color: rgba(0, 200, 0, 0.1);
        }

        table tbody tr.failed {
            background-color: rgba(255, 0, 0, 0.1);
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

        .status-indicator.success {
            background-color: rgba(0, 200, 0, 0.1);
            color: #00c800;
        }

        .status-indicator.error {
            background-color: rgba(255, 0, 0, 0.1);
            color: var(--vscode-errorForeground);
        }

        .status-indicator.warning {
            background-color: rgba(255, 170, 0, 0.1);
            color: #ffaa00;
        }

        .status-indicator.info {
            background-color: rgba(128, 128, 128, 0.1);
            color: var(--vscode-descriptionForeground);
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

        .label-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .label-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .label-item:last-child {
            border-bottom: none;
        }

        .label-key {
            font-weight: 600;
            min-width: 120px;
            color: var(--vscode-foreground);
        }

        .label-value {
            flex: 1;
            color: var(--vscode-foreground);
            font-family: var(--vscode-editor-font-family);
            word-break: break-all;
        }

        .job-link {
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            text-decoration: none;
        }

        .job-link:hover {
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
        <div class="cronjob-header">
            <h1 class="cronjob-title">CronJob / <span class="cronjob-name" id="cronjob-name">Loading...</span></h1>
            <div class="header-actions">
                <button id="refresh-btn" class="action-btn">
                    <span class="btn-icon">🔄</span>
                    <span class="btn-text">Refresh</span>
                </button>
            </div>
        </div>

        <!-- Loading Indicator -->
        <div id="loading" class="loading">Loading CronJob details...</div>

        <!-- Error Message -->
        <div id="error-message" class="error-message hidden"></div>

        <!-- Status Banner -->
        <div class="status-banner" id="status-banner" style="display: none;">
            <span class="status-icon" id="status-icon">⏳</span>
            <span class="status-text" id="status-text">Loading...</span>
        </div>

        <!-- Overview Section -->
        <div class="section" id="overview-section" style="display: none;">
            <h2>Overview</h2>
            <div class="info-grid" id="overview-grid">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>

        <!-- Schedule Section -->
        <div class="section" id="schedule-section" style="display: none;">
            <h2>Schedule</h2>
            <div class="schedule-box" id="schedule-box">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>

        <!-- Job History Section -->
        <div class="section" id="job-history-section" style="display: none;">
            <h2>Job History</h2>
            <div id="job-history-summary" style="margin-bottom: 15px;">
                <!-- Will be populated by JavaScript -->
            </div>
            <table id="active-jobs-table" style="display: none;">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Started</th>
                        <th>Age</th>
                        <th>Active</th>
                        <th>Succeeded</th>
                        <th>Failed</th>
                    </tr>
                </thead>
                <tbody id="active-jobs-tbody">
                    <!-- Will be populated by JavaScript -->
                </tbody>
            </table>
        </div>

        <!-- Job Template Section -->
        <div class="section" id="job-template-section" style="display: none;">
            <h2>Job Template</h2>
            <div id="job-template-content">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>

        <!-- Configuration Section -->
        <div class="section" id="configuration-section" style="display: none;">
            <h2>Configuration</h2>
            <div class="info-grid" id="configuration-grid">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>

        <!-- Labels Section -->
        <div class="section" id="labels-section" style="display: none;">
            <h2>Labels</h2>
            <ul class="label-list" id="labels-list">
                <!-- Will be populated by JavaScript -->
            </ul>
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
    </div>

    <script>
        (function() {
            const vscode = acquireVsCodeApi();
            
            window.addEventListener('message', event => {
                const message = event.data;
                
                switch (message.command) {
                    case 'updateCronJobData':
                        renderCronJobData(message.data);
                        hideLoading();
                        break;
                    case 'error':
                        showError(message.message);
                        hideLoading();
                        break;
                }
            });
            
            function renderCronJobData(data) {
                if (!data) return;
                
                // Update cronjob name in header
                const nameEl = document.getElementById('cronjob-name');
                if (nameEl && data.overview) {
                    nameEl.textContent = data.overview.name;
                }
                
                // Hide error message
                hideError();
                
                // Render all sections
                if (data.overview) renderOverview(data.overview);
                if (data.schedule) renderSchedule(data.schedule);
                if (data.jobHistory) renderJobHistory(data.jobHistory);
                if (data.jobTemplate) renderJobTemplate(data.jobTemplate);
                if (data.configuration) renderConfiguration(data.configuration);
                if (data.labels) renderLabels(data.labels);
                if (data.events) renderEvents(data.events);
                
                // Setup interactive elements
                setupCopyButtons();
                setupJobNavigation();
            }
            
            function renderOverview(overview) {
                const grid = document.getElementById('overview-grid');
                const section = document.getElementById('overview-section');
                const banner = document.getElementById('status-banner');
                const icon = document.getElementById('status-icon');
                const text = document.getElementById('status-text');
                
                if (!grid || !section) return;
                
                // Update status banner
                if (banner && icon && text) {
                    if (overview.suspended) {
                        banner.className = 'status-banner status-suspended';
                        icon.textContent = '⏸';
                        text.textContent = 'CronJob is Suspended';
                    } else {
                        banner.className = 'status-banner status-active';
                        icon.textContent = '✓';
                        text.textContent = 'CronJob is Active';
                    }
                    banner.style.display = 'flex';
                }
                
                const items = [
                    { label: 'Name', value: overview.name || 'N/A' },
                    { label: 'Namespace', value: overview.namespace || 'N/A' },
                    { label: 'Status', value: overview.suspended ? 'Suspended' : 'Active' },
                    { label: 'Creation Timestamp', value: overview.creationTimestamp || 'N/A' },
                    { label: 'Age', value: overview.age || 'N/A' },
                    { label: 'UID', value: overview.uid || 'N/A' }
                ];
                
                grid.innerHTML = items.map(item => 
                    '<div class="info-item">' +
                        '<div class="info-label">' + escapeHtml(item.label) + '</div>' +
                        '<div class="info-value">' + escapeHtml(item.value) + '</div>' +
                    '</div>'
                ).join('');
                
                section.style.display = 'block';
            }
            
            function renderSchedule(schedule) {
                const box = document.getElementById('schedule-box');
                const section = document.getElementById('schedule-section');
                if (!box || !section) return;
                
                let html = '<div class="schedule-expression">' + escapeHtml(schedule.schedule) + '</div>';
                html += '<div class="schedule-human">' + escapeHtml(schedule.humanReadable) + '</div>';
                
                html += '<div class="schedule-times">';
                
                if (schedule.lastScheduleTime) {
                    html += '<div class="schedule-time">' +
                        '<div class="info-label">Last Schedule</div>' +
                        '<div class="info-value">' + escapeHtml(schedule.lastScheduleRelative || schedule.lastScheduleTime) + '</div>' +
                    '</div>';
                }
                
                if (schedule.nextScheduleTime) {
                    html += '<div class="schedule-time">' +
                        '<div class="info-label">Next Schedule</div>' +
                        '<div class="info-value">' + escapeHtml(schedule.nextScheduleRelative || schedule.nextScheduleTime) + '</div>' +
                    '</div>';
                }
                
                if (schedule.timezone) {
                    html += '<div class="schedule-time">' +
                        '<div class="info-label">Timezone</div>' +
                        '<div class="info-value">' + escapeHtml(schedule.timezone) + '</div>' +
                    '</div>';
                }
                
                html += '</div>';
                
                box.innerHTML = html;
                section.style.display = 'block';
            }
            
            function renderJobHistory(jobHistory) {
                const section = document.getElementById('job-history-section');
                const summary = document.getElementById('job-history-summary');
                const table = document.getElementById('active-jobs-table');
                const tbody = document.getElementById('active-jobs-tbody');
                if (!section || !summary || !table || !tbody) return;
                
                // Summary
                let summaryHtml = '<div class="info-grid">';
                summaryHtml += '<div class="info-item">' +
                    '<div class="info-label">Active Jobs</div>' +
                    '<div class="info-value">' + (jobHistory.activeCount || 0) + '</div>' +
                '</div>';
                summaryHtml += '<div class="info-item">' +
                    '<div class="info-label">Successful Completions</div>' +
                    '<div class="info-value">' + (jobHistory.successfulCompletions || 0) + '</div>' +
                '</div>';
                summaryHtml += '<div class="info-item">' +
                    '<div class="info-label">Failed Completions</div>' +
                    '<div class="info-value">' + (jobHistory.failedCompletions || 0) + '</div>' +
                '</div>';
                
                if (jobHistory.lastSuccessfulJob) {
                    summaryHtml += '<div class="info-item">' +
                        '<div class="info-label">Last Successful Job</div>' +
                        '<div class="info-value">' + escapeHtml(jobHistory.lastSuccessfulJob.name) + 
                        ' (' + escapeHtml(jobHistory.lastSuccessfulJob.relativeTime) + ')' +
                        '</div>' +
                    '</div>';
                }
                
                if (jobHistory.lastFailedJob) {
                    summaryHtml += '<div class="info-item">' +
                        '<div class="info-label">Last Failed Job</div>' +
                        '<div class="info-value">' + escapeHtml(jobHistory.lastFailedJob.name) + 
                        ' (' + escapeHtml(jobHistory.lastFailedJob.relativeTime) + ')' +
                        '</div>' +
                    '</div>';
                }
                
                summaryHtml += '</div>';
                summary.innerHTML = summaryHtml;
                
                // Active jobs table
                if (jobHistory.activeJobs && jobHistory.activeJobs.length > 0) {
                    tbody.innerHTML = jobHistory.activeJobs.map(job => {
                        const jobLink = '<a href="#" class="job-link" data-job-name="' + escapeHtml(job.name) + 
                            '" data-job-namespace="' + escapeHtml(job.namespace) + '">' + escapeHtml(job.name) + '</a>';
                        return '<tr class="active">' +
                            '<td>' + jobLink + '</td>' +
                            '<td>' + escapeHtml(job.status) + '</td>' +
                            '<td>' + escapeHtml(job.startTime) + '</td>' +
                            '<td>' + escapeHtml(job.age) + '</td>' +
                            '<td>' + escapeHtml(String(job.active)) + '</td>' +
                            '<td>' + escapeHtml(String(job.succeeded)) + '</td>' +
                            '<td>' + escapeHtml(String(job.failed)) + '</td>' +
                        '</tr>';
                    }).join('');
                    table.style.display = 'table';
                } else {
                    table.style.display = 'none';
                }
                
                section.style.display = 'block';
            }
            
            function renderJobTemplate(jobTemplate) {
                const content = document.getElementById('job-template-content');
                const section = document.getElementById('job-template-section');
                if (!content || !section) return;
                
                let html = '';
                
                // Containers
                if (jobTemplate.containers && jobTemplate.containers.length > 0) {
                    html += '<div class="container-list">';
                    jobTemplate.containers.forEach(container => {
                        html += renderContainer(container, 'Container');
                    });
                    html += '</div>';
                }
                
                // Init Containers
                if (jobTemplate.initContainers && jobTemplate.initContainers.length > 0) {
                    html += '<h3 style="margin-top: 20px; margin-bottom: 10px;">Init Containers</h3>';
                    html += '<div class="container-list">';
                    jobTemplate.initContainers.forEach(container => {
                        html += renderContainer(container, 'Init Container');
                    });
                    html += '</div>';
                }
                
                // Volumes
                if (jobTemplate.volumes && jobTemplate.volumes.length > 0) {
                    html += '<h3 style="margin-top: 20px; margin-bottom: 10px;">Volumes</h3>';
                    html += '<div class="info-grid">';
                    jobTemplate.volumes.forEach(volume => {
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
                    '<div class="info-value">' + escapeHtml(jobTemplate.restartPolicy || 'Never') + '</div>' +
                '</div>';
                if (jobTemplate.serviceAccountName) {
                    html += '<div class="info-item">' +
                        '<div class="info-label">Service Account</div>' +
                        '<div class="info-value">' + escapeHtml(jobTemplate.serviceAccountName) + '</div>' +
                    '</div>';
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
                
                if (container.command && container.command.length > 0) {
                    html += '<div><strong>Command:</strong> ' + escapeHtml(container.command.join(' ')) + '</div>';
                }
                
                if (container.args && container.args.length > 0) {
                    html += '<div><strong>Args:</strong> ' + escapeHtml(container.args.join(' ')) + '</div>';
                }
                
                // Ports
                if (container.ports && container.ports.length > 0) {
                    const portsStr = container.ports.map(p => 
                        (p.name || '') + ':' + p.containerPort + '/' + escapeHtml(p.protocol || 'TCP')
                    ).join(', ');
                    html += '<div><strong>Ports:</strong> ' + portsStr + '</div>';
                }
                
                // Resources
                if (container.resources) {
                    if (container.resources.requests && (container.resources.requests.cpu || container.resources.requests.memory)) {
                        html += '<div><strong>Requests:</strong> ';
                        if (container.resources.requests.cpu) {
                            html += 'CPU: ' + escapeHtml(container.resources.requests.cpu);
                        }
                        if (container.resources.requests.memory) {
                            if (container.resources.requests.cpu) html += ', ';
                            html += 'Memory: ' + escapeHtml(container.resources.requests.memory);
                        }
                        html += '</div>';
                    }
                    if (container.resources.limits && (container.resources.limits.cpu || container.resources.limits.memory)) {
                        html += '<div><strong>Limits:</strong> ';
                        if (container.resources.limits.cpu) {
                            html += 'CPU: ' + escapeHtml(container.resources.limits.cpu);
                        }
                        if (container.resources.limits.memory) {
                            if (container.resources.limits.cpu) html += ', ';
                            html += 'Memory: ' + escapeHtml(container.resources.limits.memory);
                        }
                        html += '</div>';
                    }
                }
                
                // Environment Variables
                if (container.env && container.env.length > 0) {
                    html += '<div><strong>Environment:</strong> ' + container.env.length + ' variable(s)</div>';
                }
                
                // Volume Mounts
                if (container.volumeMounts && container.volumeMounts.length > 0) {
                    html += '<div><strong>Volume Mounts:</strong> ' + container.volumeMounts.length + ' mount(s)</div>';
                }
                
                html += '</div>';
                html += '</div>';
                return html;
            }
            
            function renderConfiguration(config) {
                const grid = document.getElementById('configuration-grid');
                const section = document.getElementById('configuration-section');
                if (!grid || !section) return;
                
                const items = [
                    { label: 'Concurrency Policy', value: config.concurrencyPolicy || 'Allow' },
                    { label: 'Starting Deadline Seconds', value: config.startingDeadlineSeconds ? String(config.startingDeadlineSeconds) : 'Not set' },
                    { label: 'Successful Jobs History Limit', value: String(config.successfulJobsHistoryLimit ?? 3) },
                    { label: 'Failed Jobs History Limit', value: String(config.failedJobsHistoryLimit ?? 1) }
                ];
                
                if (config.completions !== undefined) {
                    items.push({ label: 'Completions', value: String(config.completions) });
                }
                if (config.parallelism !== undefined) {
                    items.push({ label: 'Parallelism', value: String(config.parallelism) });
                }
                if (config.backoffLimit !== undefined) {
                    items.push({ label: 'Backoff Limit', value: String(config.backoffLimit) });
                }
                
                grid.innerHTML = items.map(item => 
                    '<div class="info-item">' +
                        '<div class="info-label">' + escapeHtml(item.label) + '</div>' +
                        '<div class="info-value">' + escapeHtml(item.value) + '</div>' +
                    '</div>'
                ).join('');
                
                section.style.display = 'block';
            }
            
            function renderLabels(labels) {
                const list = document.getElementById('labels-list');
                const section = document.getElementById('labels-section');
                if (!list || !section) return;
                
                const labelEntries = Object.entries(labels || {});
                if (labelEntries.length === 0) {
                    list.innerHTML = '<li class="empty-state">No labels configured</li>';
                    section.style.display = 'block';
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
            
            function setupJobNavigation() {
                // Remove existing listeners by cloning nodes
                const jobLinks = document.querySelectorAll('.job-link');
                jobLinks.forEach(link => {
                    const newLink = link.cloneNode(true);
                    link.parentNode.replaceChild(newLink, link);
                });
                
                // Attach new listeners
                document.querySelectorAll('.job-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const jobName = link.getAttribute('data-job-name');
                        const jobNamespace = link.getAttribute('data-job-namespace');
                        if (jobName) {
                            vscode.postMessage({
                                command: 'navigateToJob',
                                jobName: jobName,
                                name: jobName,
                                namespace: jobNamespace || undefined
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
