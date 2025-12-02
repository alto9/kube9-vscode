import * as vscode from 'vscode';
import { OperatorDashboardStatus } from './types';

/**
 * Generates the HTML content for the Operated Dashboard webview.
 * Uses VSCode CSS variables for theming and includes message passing infrastructure.
 * Displays operator status badge, operator metrics, and conditional content placeholder.
 * 
 * @param webview - The webview instance for CSP configuration
 * @param clusterName - The name of the cluster to display in the dashboard
 * @param operatorStatus - The operator status for this cluster
 * @returns HTML content string
 */
export function getOperatedDashboardHtml(
    webview: vscode.Webview, 
    clusterName: string,
    operatorStatus: OperatorDashboardStatus
): string {
    const cspSource = webview.cspSource;
    
    return '<!DOCTYPE html>\n' +
        '<html lang="en">\n' +
        '<head>\n' +
        '    <meta charset="UTF-8">\n' +
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
        '    <meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src ' + cspSource + ' \'unsafe-inline\'; script-src ' + cspSource + ' \'unsafe-inline\';">\n' +
        '    <title>Dashboard: ' + clusterName + '</title>\n' +
        '    <style>\n' +
        '        body {\n' +
        '            font-family: var(--vscode-font-family);\n' +
        '            color: var(--vscode-foreground);\n' +
        '            background-color: var(--vscode-editor-background);\n' +
        '            padding: 0;\n' +
        '            margin: 0;\n' +
        '            overflow-x: hidden;\n' +
        '        }\n' +
        '        .dashboard-container { max-width: 1400px; margin: 0 auto; padding: 20px; }\n' +
        '        .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--vscode-panel-border); }\n' +
        '        .dashboard-header h1 { margin: 0; font-size: 24px; font-weight: 600; }\n' +
        '        .dashboard-subtitle { display: flex; align-items: center; gap: 16px; margin-top: 8px; font-size: 14px; color: var(--vscode-descriptionForeground); }\n' +
        '        .cluster-name { font-weight: 500; color: var(--vscode-foreground); }\n' +
        '        .operator-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }\n' +
        '        .last-updated { font-size: 12px; color: var(--vscode-descriptionForeground); display: flex; align-items: center; gap: 8px; }\n' +
        '        .refresh-indicator { display: none; width: 14px; height: 14px; border: 2px solid var(--vscode-panel-border); border-top: 2px solid var(--vscode-progressBar-background); border-radius: 50%; animation: spin 1s linear infinite; }\n' +
        '        .refresh-indicator.visible { display: inline-block; }\n' +
        '        .refresh-button { background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px; }\n' +
        '        .refresh-button:hover { background-color: var(--vscode-button-hoverBackground); }\n' +
        '        .refresh-button:disabled { opacity: 0.5; cursor: not-allowed; }\n' +
        '        .loading-spinner { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; }\n' +
        '        .spinner { width: 40px; height: 40px; border: 4px solid var(--vscode-panel-border); border-top: 4px solid var(--vscode-progressBar-background); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }\n' +
        '        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }\n' +
        '        .loading-message { color: var(--vscode-descriptionForeground); font-size: 14px; }\n' +
        '        .error-message { background-color: var(--vscode-inputValidation-errorBackground); border: 1px solid var(--vscode-inputValidation-errorBorder); color: var(--vscode-inputValidation-errorForeground); padding: 16px; border-radius: 4px; margin: 20px 0; display: none; }\n' +
        '        .error-message.visible { display: block; }\n' +
        '        .error-title { font-weight: 600; margin-bottom: 8px; }\n' +
        '        .error-details { font-size: 13px; opacity: 0.9; }\n' +
        '        .dashboard-content { display: none; }\n' +
        '        .dashboard-content.visible { display: block; }\n' +
        '        .stats-cards-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin: 24px 0; }\n' +
        '        .stats-card { background-color: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 20px; display: flex; align-items: center; gap: 16px; transition: background-color 0.2s; }\n' +
        '        .stats-card:hover { background-color: var(--vscode-list-hoverBackground); }\n' +
        '        .card-icon { font-size: 32px; }\n' +
        '        .card-content { flex: 1; }\n' +
        '        .card-title { font-size: 13px; color: var(--vscode-descriptionForeground); margin-bottom: 4px; }\n' +
        '        .card-value { font-size: 28px; font-weight: 600; }\n' +
        '        .conditional-content-placeholder { background-color: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center; }\n' +
        '        .placeholder-message { color: var(--vscode-descriptionForeground); font-size: 14px; font-style: italic; }\n' +
        '        .conditional-content { background-color: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 24px; margin: 24px 0; }\n' +
        '        .conditional-content.ai-recommendations { border-left: 4px solid var(--vscode-charts-blue); }\n' +
        '        .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }\n' +
        '        .section-header h2 { margin: 0; font-size: 18px; font-weight: 600; }\n' +
        '        .section-icon { font-size: 24px; }\n' +
        '        .recommendations-list { display: flex; flex-direction: column; gap: 12px; }\n' +
        '        .recommendation-card { background-color: var(--vscode-list-hoverBackground); border-radius: 6px; padding: 16px; border-left: 3px solid var(--vscode-charts-blue); transition: background-color 0.2s; }\n' +
        '        .recommendation-card:hover { background-color: var(--vscode-list-activeSelectionBackground); }\n' +
        '        .recommendation-card.high { border-left-color: var(--vscode-charts-red); }\n' +
        '        .recommendation-card.medium { border-left-color: var(--vscode-charts-yellow); }\n' +
        '        .recommendation-card.low { border-left-color: var(--vscode-charts-blue); }\n' +
        '        .rec-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }\n' +
        '        .rec-type-icon { font-size: 16px; }\n' +
        '        .rec-severity { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-left: auto; }\n' +
        '        .rec-severity.high { background-color: var(--vscode-charts-red); color: var(--vscode-editor-background); }\n' +
        '        .rec-severity.medium { background-color: var(--vscode-charts-yellow); color: var(--vscode-editor-background); }\n' +
        '        .rec-severity.low { background-color: var(--vscode-charts-blue); color: var(--vscode-editor-background); }\n' +
        '        .rec-title { margin: 0 0 8px 0; font-size: 15px; font-weight: 600; }\n' +
        '        .rec-description { margin: 0; font-size: 13px; color: var(--vscode-descriptionForeground); line-height: 1.5; }\n' +
        '        .empty-recommendations { text-align: center; padding: 40px 20px; color: var(--vscode-descriptionForeground); }\n' +
        '        .empty-recommendations-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }\n' +
        '        .empty-recommendations-message { font-size: 14px; }\n' +
        '        .operator-metrics { background-color: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 20px; margin: 24px 0; }\n' +
        '        .operator-metrics h2 { margin: 0 0 16px 0; font-size: 16px; font-weight: 600; }\n' +
        '        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 16px; }\n' +
        '        .metric-card { background-color: var(--vscode-list-hoverBackground); border-radius: 6px; padding: 16px; }\n' +
        '        .metric-label { font-size: 13px; color: var(--vscode-descriptionForeground); margin-bottom: 8px; }\n' +
        '        .metric-value { font-size: 24px; font-weight: 600; }\n' +
        '        .workload-details { background-color: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 20px; margin: 24px 0; }\n' +
        '        .workload-details h2 { margin: 0 0 16px 0; font-size: 16px; font-weight: 600; }\n' +
        '        .workload-table { width: 100%; border-collapse: collapse; }\n' +
        '        .workload-table tr { border-bottom: 1px solid var(--vscode-panel-border); }\n' +
        '        .workload-table tr:last-child { border-bottom: none; }\n' +
        '        .workload-table td { padding: 12px 8px; font-size: 14px; }\n' +
        '        .workload-table td:first-child { color: var(--vscode-descriptionForeground); }\n' +
        '        .workload-table td:last-child { text-align: right; font-weight: 600; }\n' +
        '        .hidden { display: none; }\n' +
        '        .conditional-content.upsell-cta { border-left: 4px solid var(--vscode-charts-yellow); background: linear-gradient(135deg, var(--vscode-editor-background) 0%, var(--vscode-list-hoverBackground) 100%); }\n' +
        '        .upsell-content { padding: 8px 0; }\n' +
        '        .upsell-headline { margin: 0 0 20px 0; font-size: 20px; font-weight: 600; }\n' +
        '        .benefits-list { list-style: none; padding: 0; margin: 0 0 24px 0; }\n' +
        '        .benefits-list li { display: flex; align-items: center; gap: 12px; padding: 10px 0; font-size: 14px; }\n' +
        '        .benefit-icon { font-size: 16px; color: var(--vscode-charts-green); font-weight: bold; min-width: 20px; }\n' +
        '        .cta-button { background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; margin: 8px 0; transition: background-color 0.2s; }\n' +
        '        .cta-button:hover { background-color: var(--vscode-button-hoverBackground); }\n' +
        '        .cta-subtext { margin: 12px 0 0 0; font-size: 13px; color: var(--vscode-descriptionForeground); font-style: italic; }\n' +
        '    </style>\n' +
        '</head>\n' +
        '<body>\n' +
        '    <div id="dashboard-root" class="dashboard-container">\n' +
        '        <div id="loading" class="loading-spinner">\n' +
        '            <div class="spinner"></div>\n' +
        '            <div class="loading-message">Loading cluster statistics...</div>\n' +
        '        </div>\n' +
        '        <div id="error" class="error-message">\n' +
        '            <div class="error-title">Error Loading Dashboard</div>\n' +
        '            <div id="error-details" class="error-details"></div>\n' +
        '        </div>\n' +
        '        <div id="content" class="dashboard-content">\n' +
        '            <div class="dashboard-header">\n' +
        '                <div>\n' +
        '                    <h1>Cluster Dashboard</h1>\n' +
        '                    <div class="dashboard-subtitle">\n' +
        '                        <span class="cluster-name">' + clusterName + '</span>\n' +
        '                        <span class="operator-badge ' + operatorStatus.mode + '">Operator: ' + operatorStatus.mode + '</span>\n' +
        '                        <span id="last-updated" class="last-updated">\n' +
        '                            <span>Last updated: --</span>\n' +
        '                            <span id="refresh-indicator" class="refresh-indicator"></span>\n' +
        '                        </span>\n' +
        '                    </div>\n' +
        '                </div>\n' +
        '                <button id="refresh-button" class="refresh-button"><span>&#8635;</span> Refresh</button>\n' +
        '            </div>\n' +
        '            <div id="stats-cards" class="stats-cards-container"></div>\n' +
        '            <div id="conditional-content" class="conditional-content-placeholder">\n' +
        '                <div class="placeholder-message">Loading conditional content...</div>\n' +
        '            </div>\n' +
        '            <div class="operator-metrics">\n' +
        '                <h2>Operator Metrics</h2>\n' +
        '                <div class="metrics-grid">\n' +
        '                    <div class="metric-card"><div class="metric-label">Collectors Running</div><div id="collectors-running" class="metric-value">--</div></div>\n' +
        '                    <div class="metric-card"><div class="metric-label">Data Points Collected</div><div id="data-points-collected" class="metric-value">--</div></div>\n' +
        '                    <div class="metric-card"><div class="metric-label">Last Collection</div><div id="last-collection-time" class="metric-value">--</div></div>\n' +
        '                </div>\n' +
        '            </div>\n' +
        '            <div class="workload-details">\n' +
        '                <h2>Workload Details</h2>\n' +
        '                <table id="workload-table" class="workload-table"></table>\n' +
        '            </div>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '    <script>\n' +
        '        const vscode = acquireVsCodeApi();\n' +
        '        const loadingElement = document.getElementById("loading");\n' +
        '        const errorElement = document.getElementById("error");\n' +
        '        const contentElement = document.getElementById("content");\n' +
        '        const errorDetailsElement = document.getElementById("error-details");\n' +
        '        const refreshButton = document.getElementById("refresh-button");\n' +
        '        const lastUpdatedElement = document.getElementById("last-updated");\n' +
        '        const refreshIndicator = document.getElementById("refresh-indicator");\n' +
        '        const statsCardsContainer = document.getElementById("stats-cards");\n' +
        '        const workloadTableElement = document.getElementById("workload-table");\n' +
        '        const collectorsRunningElement = document.getElementById("collectors-running");\n' +
        '        const dataPointsCollectedElement = document.getElementById("data-points-collected");\n' +
        '        const lastCollectionTimeElement = document.getElementById("last-collection-time");\n' +
        '        function showLoading() { loadingElement.classList.remove("hidden"); errorElement.classList.remove("visible"); contentElement.classList.remove("visible"); if (refreshIndicator) { refreshIndicator.classList.remove("visible"); } }\n' +
        '        function showRefreshing() { if (refreshIndicator) { refreshIndicator.classList.add("visible"); } if (refreshButton) { refreshButton.disabled = true; } }\n' +
        '        function hideRefreshing() { if (refreshIndicator) { refreshIndicator.classList.remove("visible"); } if (refreshButton) { refreshButton.disabled = false; } }\n' +
        '        function showError(errorMessage) { loadingElement.classList.add("hidden"); errorElement.classList.add("visible"); contentElement.classList.remove("visible"); errorDetailsElement.textContent = errorMessage; hideRefreshing(); }\n' +
        '        function showContent() { loadingElement.classList.add("hidden"); errorElement.classList.remove("visible"); contentElement.classList.add("visible"); hideRefreshing(); }\n' +
        '        function formatNumber(num) { return num.toLocaleString(); }\n' +
        '        function getRecommendationIcon(type) { const icons = { "optimization": "\\u26A1", "cost": "\\uD83D\\uDCB0", "security": "\\uD83D\\uDD12", "reliability": "\\uD83D\\uDEE1" }; return icons[type] || "\\uD83D\\uDCA1"; }\n' +
        '        function renderAIRecommendations(recommendations) {\n' +
        '            const container = document.getElementById("conditional-content");\n' +
        '            if (!recommendations || recommendations.length === 0) {\n' +
        '                container.className = "conditional-content ai-recommendations";\n' +
        '                container.innerHTML = "<div class=\\"section-header\\"><span class=\\"section-icon\\">&#128161;</span><h2>AI Recommendations</h2></div><div class=\\"empty-recommendations\\"><div class=\\"empty-recommendations-icon\\">&#128161;</div><div class=\\"empty-recommendations-message\\">No recommendations available at this time.</div></div>";\n' +
        '                return;\n' +
        '            }\n' +
        '            const recommendationsHtml = recommendations.map(rec => "<div class=\\"recommendation-card " + rec.severity + "\\"><div class=\\"rec-header\\"><span class=\\"rec-type-icon\\">" + getRecommendationIcon(rec.type) + "</span><span class=\\"rec-severity " + rec.severity + "\\">" + rec.severity + "</span></div><h3 class=\\"rec-title\\">" + rec.title + "</h3><p class=\\"rec-description\\">" + rec.description + "</p></div>").join("");\n' +
        '            container.className = "conditional-content ai-recommendations";\n' +
        '            container.innerHTML = "<div class=\\"section-header\\"><span class=\\"section-icon\\">&#128161;</span><h2>AI Recommendations</h2></div><div class=\\"recommendations-list\\">" + recommendationsHtml + "</div>";\n' +
        '        }\n' +
        '        function renderUpsellCTA() {\n' +
        '            const container = document.getElementById("conditional-content");\n' +
        '            container.className = "conditional-content upsell-cta";\n' +
        '            container.innerHTML = "<div class=\\"section-header\\"><span class=\\"section-icon\\">&#11088;</span><h2>Enhance Your Dashboard</h2></div><div class=\\"upsell-content\\"><h3 class=\\"upsell-headline\\">Unlock AI-Powered Cluster Insights</h3><ul class=\\"benefits-list\\"><li><span class=\\"benefit-icon\\">&#10003;</span><span>Get intelligent optimization recommendations</span></li><li><span class=\\"benefit-icon\\">&#10003;</span><span>Receive cost-saving suggestions</span></li><li><span class=\\"benefit-icon\\">&#10003;</span><span>Identify security vulnerabilities proactively</span></li><li><span class=\\"benefit-icon\\">&#10003;</span><span>Access advanced analytics and reporting</span></li></ul><button class=\\"cta-button\\" onclick=\\"handleConfigureApiKey()\\"><span>&#128273;</span>Configure API Key</button><p class=\\"cta-subtext\\">Add your API key to enable AI-powered insights and recommendations.</p></div>";\n' +
        '        }\n' +
        '        function handleConfigureApiKey() { vscode.postMessage({ type: "configureApiKey" }); }\n' +
        '        function updateDashboardData(data) {\n' +
        '            if (data.lastUpdated) { const date = new Date(data.lastUpdated); const textSpan = lastUpdatedElement.querySelector("span:first-child"); if (textSpan) { textSpan.textContent = "Last updated: " + date.toLocaleTimeString(); } }\n' +
        '            if (data.namespaceCount !== undefined || data.workloads || data.nodes) { updateStatsCards(data); }\n' +
        '            if (data.workloads) { updateWorkloadTable(data.workloads); }\n' +
        '            if (data.operatorMetrics) { collectorsRunningElement.textContent = data.operatorMetrics.collectorsRunning || 0; dataPointsCollectedElement.textContent = formatNumber(data.operatorMetrics.dataPointsCollected || 0); lastCollectionTimeElement.textContent = data.operatorMetrics.lastCollectionTime ? new Date(data.operatorMetrics.lastCollectionTime).toLocaleTimeString() : "--"; }\n' +
        '            if (data.conditionalContentType === "ai-recommendations" && data.aiRecommendations) { renderAIRecommendations(data.aiRecommendations); } else if (data.conditionalContentType === "upsell-cta") { renderUpsellCTA(); } else if (data.conditionalContentType === "degraded-warning") { renderUpsellCTA(); }\n' +
        '            showContent();\n' +
        '        }\n' +
        '        function updateStatsCards(data) {\n' +
        '            const cards = [{ icon: "&#128230;", title: "Namespaces", value: data.namespaceCount || 0 }, { icon: "&#128640;", title: "Deployments", value: (data.workloads && data.workloads.deployments) || 0 }, { icon: "&#128203;", title: "Pods", value: (data.workloads && data.workloads.pods) || 0 }, { icon: "&#128187;", title: "Nodes", value: data.nodes ? (data.nodes.readyNodes + "/" + data.nodes.totalNodes) : "0/0" }];\n' +
        '            statsCardsContainer.innerHTML = cards.map(card => "<div class=\\"stats-card\\"><div class=\\"card-icon\\">" + card.icon + "</div><div class=\\"card-content\\"><div class=\\"card-title\\">" + card.title + "</div><div class=\\"card-value\\">" + card.value + "</div></div></div>").join("");\n' +
        '        }\n' +
        '        function updateWorkloadTable(workloads) {\n' +
        '            const rows = [{ label: "Deployments", value: workloads.deployments || 0 }, { label: "StatefulSets", value: workloads.statefulsets || 0 }, { label: "DaemonSets", value: workloads.daemonsets || 0 }, { label: "ReplicaSets", value: workloads.replicasets || 0 }, { label: "Jobs", value: workloads.jobs || 0 }, { label: "CronJobs", value: workloads.cronjobs || 0 }, { label: "Pods", value: workloads.pods || 0 }];\n' +
        '            workloadTableElement.innerHTML = rows.map(row => "<tr><td>" + row.label + "</td><td>" + row.value + "</td></tr>").join("");\n' +
        '        }\n' +
        '        window.addEventListener("message", event => {\n' +
        '            const message = event.data;\n' +
        '            switch (message.type) {\n' +
        '                case "updateData": updateDashboardData(message.data); break;\n' +
        '                case "loading": showLoading(); break;\n' +
        '                case "refreshing": showRefreshing(); break;\n' +
        '                case "error": showError(message.error); break;\n' +
        '            }\n' +
        '        });\n' +
        '        if (refreshButton) { refreshButton.addEventListener("click", () => { refreshButton.disabled = true; vscode.postMessage({ type: "refresh" }); }); }\n' +
        '        vscode.postMessage({ type: "requestData" });\n' +
        '    </script>\n' +
        '</body>\n' +
        '</html>';
}

