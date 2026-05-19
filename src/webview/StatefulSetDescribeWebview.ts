import * as vscode from 'vscode';
import { WorkloadCommands } from '../kubectl/WorkloadCommands';
import { transformStatefulSetData, StatefulSetDescribeData } from './statefulSetDataTransformer';
import { getResourceCache, CACHE_TTL } from '../kubernetes/cache';
import { DescribeWebview } from './DescribeWebview';
import { releaseExclusiveDescribePanelBindings } from './describeSharedPanelBindings';
import { notifyMajorWebviewOpened } from '../telemetry/webviewTelemetryOpen';

interface WebviewMessage {
    command: 'refresh' | 'copyValue' | 'viewYaml' | 'navigateToPod';
    value?: string;
    content?: string;
    podName?: string;
    namespace?: string;
}

/**
 * Webview for StatefulSet describe (structured detail page).
 * Mirrors {@link DeploymentDescribeWebview} patterns (shared panel, cache, messages).
 */
export class StatefulSetDescribeWebview {
    private static currentPanel: vscode.WebviewPanel | undefined;
    private static currentName: string | undefined;
    private static currentNamespace: string | undefined;
    private static kubeconfigPath: string | undefined;
    private static contextName: string | undefined;
    /** Owned subscription for STS messages; swapped whenever HTML/handlers refresh on a reused panel. */
    private static messageSubscription: vscode.Disposable | undefined;
    /** Owned subscription clearing STS bindings when this panel closes (including shared Describe reuse). */
    private static panelDisposeSubscription: vscode.Disposable | undefined;

    public static async show(
        context: vscode.ExtensionContext,
        statefulSetName: string,
        namespace: string,
        kubeconfigPath: string,
        contextName: string
    ): Promise<void> {
        releaseExclusiveDescribePanelBindings();
        StatefulSetDescribeWebview.currentName = statefulSetName;
        StatefulSetDescribeWebview.currentNamespace = namespace;
        StatefulSetDescribeWebview.kubeconfigPath = kubeconfigPath;
        StatefulSetDescribeWebview.contextName = contextName;

        const sharedPanel = DescribeWebview.getSharedPanel();

        if (sharedPanel) {
            StatefulSetDescribeWebview.currentPanel = sharedPanel;
            StatefulSetDescribeWebview.currentPanel.title = `StatefulSet / ${statefulSetName}`;
            StatefulSetDescribeWebview.currentName = statefulSetName;
            StatefulSetDescribeWebview.currentNamespace = namespace;
            StatefulSetDescribeWebview.kubeconfigPath = kubeconfigPath;
            StatefulSetDescribeWebview.contextName = contextName;
            StatefulSetDescribeWebview.currentPanel.webview.html = StatefulSetDescribeWebview.getWebviewContent(
                StatefulSetDescribeWebview.currentPanel.webview
            );
            StatefulSetDescribeWebview.attachPanelBindings(StatefulSetDescribeWebview.currentPanel);
            await StatefulSetDescribeWebview.refreshData();
            StatefulSetDescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        if (StatefulSetDescribeWebview.currentPanel) {
            StatefulSetDescribeWebview.currentPanel.title = `StatefulSet / ${statefulSetName}`;
            StatefulSetDescribeWebview.currentName = statefulSetName;
            StatefulSetDescribeWebview.currentNamespace = namespace;
            StatefulSetDescribeWebview.kubeconfigPath = kubeconfigPath;
            StatefulSetDescribeWebview.contextName = contextName;
            StatefulSetDescribeWebview.currentPanel.webview.html = StatefulSetDescribeWebview.getWebviewContent(
                StatefulSetDescribeWebview.currentPanel.webview
            );
            StatefulSetDescribeWebview.attachPanelBindings(StatefulSetDescribeWebview.currentPanel);
            await StatefulSetDescribeWebview.refreshData();
            StatefulSetDescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            DescribeWebview.setSharedPanel(StatefulSetDescribeWebview.currentPanel);
            return;
        }

        const title = `StatefulSet / ${statefulSetName}`;
        notifyMajorWebviewOpened('resource_describe');
        const panel = vscode.window.createWebviewPanel('kube9Describe', title, vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });

        StatefulSetDescribeWebview.currentPanel = panel;
        DescribeWebview.setSharedPanel(panel);

        panel.webview.html = StatefulSetDescribeWebview.getWebviewContent(panel.webview);
        StatefulSetDescribeWebview.attachPanelBindings(panel);
        await StatefulSetDescribeWebview.refreshData();
    }

    /**
     * (Re)attach webview subscriptions after replacing HTML when reusing {@link DescribeWebview}'s shared panel
     * or this class's singleton panel so message commands target the StatefulSet handlers.
     */
    private static attachPanelBindings(panel: vscode.WebviewPanel): void {
        StatefulSetDescribeWebview.detachPanelSubscriptions();
        StatefulSetDescribeWebview.setupMessageHandlers(panel);

        StatefulSetDescribeWebview.panelDisposeSubscription = panel.onDidDispose(() => {
            if (StatefulSetDescribeWebview.currentPanel === panel) {
                StatefulSetDescribeWebview.currentPanel = undefined;
                StatefulSetDescribeWebview.currentName = undefined;
                StatefulSetDescribeWebview.currentNamespace = undefined;
                StatefulSetDescribeWebview.kubeconfigPath = undefined;
                StatefulSetDescribeWebview.contextName = undefined;
                if (DescribeWebview.getSharedPanel() === panel) {
                    DescribeWebview.setSharedPanel(undefined);
                }
            }
            StatefulSetDescribeWebview.messageSubscription?.dispose();
            StatefulSetDescribeWebview.messageSubscription = undefined;
        });
    }

    /** Drops StatefulSet message handlers when another describe view takes the shared panel. */
    public static releaseMessageBindings(): void {
        StatefulSetDescribeWebview.detachPanelSubscriptions();
    }

    private static detachPanelSubscriptions(): void {
        StatefulSetDescribeWebview.messageSubscription?.dispose();
        StatefulSetDescribeWebview.messageSubscription = undefined;
        StatefulSetDescribeWebview.panelDisposeSubscription?.dispose();
        StatefulSetDescribeWebview.panelDisposeSubscription = undefined;
    }

    private static clearCache(contextName: string, namespace: string, name: string): void {
        const cache = getResourceCache();
        cache.invalidate(`statefulset-describe:${contextName}:${namespace}:${name}`);
    }

    private static async refreshData(): Promise<void> {
        if (!StatefulSetDescribeWebview.currentPanel) {
            return;
        }
        const panel = StatefulSetDescribeWebview.currentPanel;
        const name = StatefulSetDescribeWebview.currentName;
        const namespace = StatefulSetDescribeWebview.currentNamespace;
        const kubeconfigPath = StatefulSetDescribeWebview.kubeconfigPath;
        const contextName = StatefulSetDescribeWebview.contextName;
        if (!name || !namespace || !kubeconfigPath || !contextName) {
            panel.webview.postMessage({
                command: 'error',
                message: 'Missing required parameters for StatefulSet describe'
            });
            return;
        }

        const cache = getResourceCache();
        const cacheKey = `statefulset-describe:${contextName}:${namespace}:${name}`;
        const cached = cache.get<StatefulSetDescribeData>(cacheKey);
        if (cached) {
            panel.webview.postMessage({ command: 'updateStatefulSetData', data: cached });
            return;
        }

        try {
            const detail = await WorkloadCommands.getStatefulSetDetails(
                name,
                namespace,
                kubeconfigPath,
                contextName
            );
            if (detail.error) {
                panel.webview.postMessage({
                    command: 'error',
                    message: detail.error.getUserMessage()
                });
                return;
            }
            if (!detail.statefulSet) {
                panel.webview.postMessage({
                    command: 'error',
                    message: 'StatefulSet not found or unavailable'
                });
                return;
            }

            const sts = detail.statefulSet;
            const selector = Object.entries(sts.spec?.selector?.matchLabels || {})
                .map(([k, v]) => `${k}=${v}`)
                .join(',');

            const [podsRes, pvcRes, eventsRes] = await Promise.all([
                WorkloadCommands.getV1PodsForLabelSelector(
                    namespace,
                    selector,
                    kubeconfigPath,
                    contextName
                ),
                WorkloadCommands.listNamespacedPersistentVolumeClaims(
                    namespace,
                    kubeconfigPath,
                    contextName
                ),
                WorkloadCommands.getStatefulSetEvents(name, namespace, kubeconfigPath, contextName)
            ]);

            const dataLoadErrors: StatefulSetDescribeData['dataLoadErrors'] = {};
            if (podsRes.error) {
                dataLoadErrors.pods = podsRes.error.getUserMessage();
            }
            if (pvcRes.error) {
                dataLoadErrors.pvcs = pvcRes.error.getUserMessage();
            }
            if (eventsRes.error) {
                dataLoadErrors.events = eventsRes.error.getUserMessage();
            }

            const transformed = transformStatefulSetData(
                sts,
                podsRes.pods,
                pvcRes.items,
                eventsRes.events
            );
            if (Object.keys(dataLoadErrors).length > 0) {
                transformed.dataLoadErrors = dataLoadErrors;
            }

            cache.set(cacheKey, transformed, CACHE_TTL.DEPLOYMENTS);
            panel.webview.postMessage({ command: 'updateStatefulSetData', data: transformed });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error refreshing StatefulSet describe:', errorMessage);
            panel.webview.postMessage({
                command: 'error',
                message: `Failed to refresh StatefulSet: ${errorMessage}`
            });
        }
    }

    private static setupMessageHandlers(panel: vscode.WebviewPanel): void {
        StatefulSetDescribeWebview.messageSubscription = panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
            switch (message.command) {
                case 'refresh': {
                    const ctx = StatefulSetDescribeWebview.contextName;
                    const ns = StatefulSetDescribeWebview.currentNamespace;
                    const n = StatefulSetDescribeWebview.currentName;
                    if (ctx && ns && n) {
                        StatefulSetDescribeWebview.clearCache(ctx, ns, n);
                    }
                    await StatefulSetDescribeWebview.refreshData();
                    break;
                }
                case 'viewYaml': {
                    const n = StatefulSetDescribeWebview.currentName;
                    const ns = StatefulSetDescribeWebview.currentNamespace;
                    const cluster = StatefulSetDescribeWebview.contextName;
                    if (!n || !ns || !cluster) {
                        vscode.window.showErrorMessage('StatefulSet context not available');
                        break;
                    }
                    try {
                        const { getYAMLEditorManager } = await import('../extension');
                        const yamlEditorManager = getYAMLEditorManager();
                        await yamlEditorManager.openYAMLEditor({
                            kind: 'StatefulSet',
                            name: n,
                            namespace: ns,
                            apiVersion: 'apps/v1',
                            cluster
                        });
                    } catch (e) {
                        const msg = e instanceof Error ? e.message : String(e);
                        vscode.window.showErrorMessage(`Failed to open YAML: ${msg}`);
                    }
                    break;
                }
                case 'navigateToPod': {
                    const podName = message.podName;
                    const ns = message.namespace || StatefulSetDescribeWebview.currentNamespace;
                    if (!podName) {
                        vscode.window.showErrorMessage('Pod name is required');
                        break;
                    }
                    try {
                        await vscode.commands.executeCommand('kube9.revealPod', podName, ns || 'default');
                    } catch (e) {
                        const msg = e instanceof Error ? e.message : String(e);
                        vscode.window.showErrorMessage(`Failed to reveal pod: ${msg}`);
                    }
                    break;
                }
                case 'copyValue': {
                    const value = message.value || message.content;
                    if (value) {
                        try {
                            await vscode.env.clipboard.writeText(value);
                            vscode.window.showInformationMessage('Copied to clipboard');
                        } catch (e) {
                            const msg = e instanceof Error ? e.message : String(e);
                            vscode.window.showErrorMessage(`Failed to copy: ${msg}`);
                        }
                    }
                    break;
                }
                default:
                    console.log('Unknown StatefulSet describe message:', message.command);
            }
        });
    }

    private static getWebviewContent(webview: vscode.Webview): string {
        const cspSource = webview.cspSource;
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src ${cspSource} 'unsafe-inline';">
    <title>StatefulSet Describe</title>
    <style>
        body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background); padding: 0; margin: 0; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .resource-header { display: flex; justify-content: space-between; align-items: center;
            border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 15px; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
        .resource-title { margin: 0; font-size: 24px; font-weight: 600; }
        .header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .action-btn { display: flex; align-items: center; gap: 6px; padding: 6px 12px;
            background-color: var(--vscode-button-background); color: var(--vscode-button-foreground);
            border: none; border-radius: 2px; cursor: pointer; font-family: inherit; }
        .action-btn:hover { background-color: var(--vscode-button-hoverBackground); }
        .section { margin-bottom: 28px; }
        .section h2 { margin: 0 0 12px 0; font-size: 18px; font-weight: 600;
            border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 8px; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .info-item { display: flex; flex-direction: column; gap: 4px; }
        .info-label { font-size: 12px; color: var(--vscode-descriptionForeground); text-transform: uppercase; letter-spacing: 0.5px; }
        .info-value { word-break: break-word; }
        .warn-banner, .error-banner { padding: 12px 14px; border-radius: 4px; margin-bottom: 16px; }
        .warn-banner { background: rgba(255,170,0,0.12); border: 1px solid #ffaa00; color: var(--vscode-foreground); }
        .error-banner { background: rgba(255,0,0,0.1); border: 1px solid var(--vscode-errorForeground); color: var(--vscode-errorForeground); }
        .replica-status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
        .replica-status-value { font-size: 20px; font-weight: 600; }
        .replica-status-value.warn { color: var(--vscode-errorForeground); }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { text-align: left; padding: 10px; border-bottom: 1px solid var(--vscode-panel-border); }
        th { font-size: 12px; text-transform: uppercase; color: var(--vscode-descriptionForeground); }
        tr.warning { background: rgba(255,170,0,0.08); }
        .pod-link { color: var(--vscode-textLink-foreground); cursor: pointer; text-decoration: underline; background: none; border: none;
            font: inherit; padding: 0; }
        .empty-state { padding: 16px; color: var(--vscode-descriptionForeground); font-style: italic; text-align: center; }
        .copy-btn { background: none; border: none; color: var(--vscode-textLink-foreground); cursor: pointer; padding: 2px 6px; }
        .loading { text-align: center; padding: 40px; color: var(--vscode-descriptionForeground); }
        .hidden { display: none; }
        .label-list { list-style: none; padding: 0; margin: 0; }
        .label-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--vscode-panel-border); }
    </style>
</head>
<body>
    <div class="container">
        <div class="resource-header">
            <h1 class="resource-title">StatefulSet / <span id="sts-name">Loading…</span></h1>
            <div class="header-actions">
                <button id="yaml-btn" class="action-btn">View YAML</button>
                <button id="refresh-btn" class="action-btn">Refresh</button>
            </div>
        </div>
        <div id="loading" class="loading">Loading StatefulSet…</div>
        <div id="page-error" class="error-banner hidden"></div>
        <div id="warnings" class="hidden"></div>
        <div id="content" class="hidden">
            <div class="section" id="overview-section"><h2>Overview</h2><div class="info-grid" id="overview-grid"></div></div>
            <div class="section" id="replica-section"><h2>Replica status</h2><div class="replica-status-grid" id="replica-grid"></div></div>
            <div class="section" id="rollout-section"><h2>Rollout</h2><div class="info-grid" id="rollout-grid"></div></div>
            <div class="section" id="ordinal-section"><h2>Ordinal pods</h2><table><thead><tr>
                <th>Ordinal</th><th>Pod</th><th>Phase</th><th>Ready</th><th>Restarts</th><th>Node</th><th>Age</th><th>Notes</th>
            </tr></thead><tbody id="ordinal-body"></tbody></table></div>
            <div class="section" id="vct-section"><h2>Volume claim templates</h2><div id="vct-body"></div></div>
            <div class="section" id="pvc-section"><h2>PersistentVolumeClaims</h2><table><thead><tr>
                <th>Ordinal</th><th>Template</th><th>PVC</th><th>Found</th><th>Phase</th><th>Capacity</th><th>Storage class</th>
            </tr></thead><tbody id="pvc-body"></tbody></table></div>
            <div class="section" id="conditions-section"><h2>Conditions</h2><table><thead><tr>
                <th>Type</th><th>Status</th><th>Reason</th><th>Message</th><th>Since</th>
            </tr></thead><tbody id="conditions-body"></tbody></table></div>
            <div class="section" id="podtemplate-section"><h2>Pod template</h2><div id="podtemplate-body"></div></div>
            <div class="section" id="labels-section"><h2>Labels & selectors</h2><div id="labels-body"></div></div>
            <div class="section" id="events-section"><h2>Recent events</h2><table><thead><tr>
                <th>Type</th><th>Reason</th><th>Message</th><th>Age</th><th>From</th><th>Count</th>
            </tr></thead><tbody id="events-body"></tbody></table></div>
        </div>
    </div>
    <script>
    (function() {
        var vscode = acquireVsCodeApi();
        window.addEventListener('message', function(event) {
            var message = event.data;
            if (message.command === 'updateStatefulSetData') {
                hideError();
                render(message.data);
                document.getElementById('loading').classList.add('hidden');
                document.getElementById('content').classList.remove('hidden');
            } else if (message.command === 'error') {
                document.getElementById('loading').classList.add('hidden');
                showError(message.message);
            }
        });
        function showError(msg) {
            var el = document.getElementById('page-error');
            el.textContent = msg;
            el.classList.remove('hidden');
            document.getElementById('content').classList.add('hidden');
        }
        function hideError() {
            var el = document.getElementById('page-error');
            el.classList.add('hidden');
            el.textContent = '';
        }
        function escapeHtml(u) {
            if (u == null) return '';
            return String(u).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
        }
        function render(data) {
            document.getElementById('sts-name').textContent = data.name || '';
            var warnEl = document.getElementById('warnings');
            var parts = [];
            var errs = data.dataLoadErrors || {};
            if (errs.pods) parts.push('Pods: ' + errs.pods);
            if (errs.pvcs) parts.push('PVCs: ' + errs.pvcs);
            if (errs.events) parts.push('Events: ' + errs.events);
            if (parts.length) {
                warnEl.innerHTML = '<div class="warn-banner">' + parts.map(escapeHtml).join('<br/>') + '</div>';
                warnEl.classList.remove('hidden');
            } else {
                warnEl.innerHTML = '';
                warnEl.classList.add('hidden');
            }
            var o = data.overview;
            document.getElementById('overview-grid').innerHTML = [
                ['Replicas (desired)', String(o.replicas)],
                ['Current / Ready / Updated', (o.currentReplicas + ' / ' + o.readyReplicas + ' / ' + o.updatedReplicas)],
                ['Service name', o.serviceName || '—'],
                ['Update strategy', o.updateStrategyType],
                ['Pod management', o.podManagementPolicy],
                ['Selector', o.selectorDisplay || '—'],
                ['Namespace', o.namespace],
                ['Age', o.age || '—'],
                ['Generation / Observed', o.generation + ' / ' + o.observedGeneration],
                ['Rollout summary', o.rolloutSummary]
            ].map(function(row) {
                return '<div class="info-item"><div class="info-label">' + escapeHtml(row[0]) + '</div><div class="info-value">' + escapeHtml(row[1]) + '</div></div>';
            }).join('');
            var rs = data.replicaStatus;
            var repClass = rs.isHealthy ? '' : ' warn';
            document.getElementById('replica-grid').innerHTML = [
                ['Desired', String(rs.desired)],
                ['Current', String(rs.current), repClass],
                ['Ready', String(rs.ready), repClass],
                ['Updated', String(rs.updated)]
            ].map(function(item) {
                var cls = item[2] ? ' class="replica-status-value' + item[2] + '"' : ' class="replica-status-value"';
                return '<div class="info-item"><div class="info-label">' + escapeHtml(item[0]) + '</div><div' + cls + '>' + escapeHtml(item[1]) + '</div></div>';
            }).join('');
            var r = data.rollout;
            document.getElementById('rollout-grid').innerHTML = [
                ['Current revision', r.currentRevision || '—'],
                ['Update revision', r.updateRevision || '—'],
                ['Collision count', String(r.collisionCount)],
                ['Partition', r.partition == null ? '—' : String(r.partition)]
            ].map(function(row) {
                return '<div class="info-item"><div class="info-label">' + escapeHtml(row[0]) + '</div><div class="info-value">' + escapeHtml(row[1]) + '</div></div>';
            }).join('');
            var ob = document.getElementById('ordinal-body');
            if (!data.ordinalPods || !data.ordinalPods.length) {
                ob.innerHTML = '<tr><td colspan="8" class="empty-state">No replicas configured or unable to list pods</td></tr>';
            } else {
                ob.innerHTML = data.ordinalPods.map(function(row) {
                    var rowClass = !row.podPresent || row.phase === 'Failed' || (row.readyDisplay && row.readyDisplay.indexOf('NotReady') >= 0) ? ' class="warning"' : '';
                    var podCell = row.podPresent
                        ? '<button type="button" class="pod-link" data-pod="' + escapeHtml(row.expectedPodName) + '">' + escapeHtml(row.expectedPodName) + '</button>'
                        : '<em>missing</em>';
                    return '<tr' + rowClass + '><td>' + row.ordinal + '</td><td>' + podCell + '</td><td>' + escapeHtml(row.phase) +
                        '</td><td>' + escapeHtml(row.readyDisplay) + '</td><td>' + row.restartCount + '</td><td>' + escapeHtml(row.nodeName) +
                        '</td><td>' + escapeHtml(row.age) + '</td><td>' + escapeHtml(row.statusDetail) + '</td></tr>';
                }).join('');
            }
            var vct = data.volumeClaimTemplates || [];
            document.getElementById('vct-body').innerHTML = vct.length === 0
                ? '<div class="empty-state">No volumeClaimTemplates</div>'
                : '<table><thead><tr><th>Name</th><th>Access modes</th><th>Storage request</th><th>Storage class</th></tr></thead><tbody>' +
                vct.map(function(t) {
                    return '<tr><td>' + escapeHtml(t.name) + '</td><td>' + escapeHtml((t.accessModes || []).join(', ')) +
                        '</td><td>' + escapeHtml(t.storageRequest) + '</td><td>' + escapeHtml(t.storageClassName) + '</td></tr>';
                }).join('') + '</tbody></table>';
            var pvcB = document.getElementById('pvc-body');
            if (!data.ordinalPvcs || !data.ordinalPvcs.length) {
                pvcB.innerHTML = '<tr><td colspan="7" class="empty-state">No PVC rows (no templates or zero replicas)</td></tr>';
            } else {
                pvcB.innerHTML = data.ordinalPvcs.map(function(p) {
                    var rowClass = !p.found ? ' class="warning"' : '';
                    return '<tr' + rowClass + '><td>' + p.ordinal + '</td><td>' + escapeHtml(p.templateName) + '</td><td>' + escapeHtml(p.pvcName) +
                        '</td><td>' + (p.found ? 'Yes' : 'No') + '</td><td>' + escapeHtml(p.phase) + '</td><td>' + escapeHtml(p.capacity) +
                        '</td><td>' + escapeHtml(p.storageClassName) + '</td></tr>';
                }).join('');
            }
            var condBody = document.getElementById('conditions-body');
            if (!data.conditions || !data.conditions.length) {
                condBody.innerHTML = '<tr><td colspan="5" class="empty-state">No conditions reported</td></tr>';
            } else {
                condBody.innerHTML = data.conditions.map(function(c) {
                    return '<tr><td>' + escapeHtml(c.type) + '</td><td>' + escapeHtml(c.status) + '</td><td>' + escapeHtml(c.reason) +
                        '</td><td>' + escapeHtml(c.message) + '</td><td>' + escapeHtml(c.relativeTime) + '</td></tr>';
                }).join('');
            }
            var pt = data.podTemplate || {};
            var pth = '';
            if (pt.containers && pt.containers.length) {
                pth += '<h3>Containers</h3><ul class="label-list">';
                pt.containers.forEach(function(c) {
                    pth += '<li class="label-item">' + escapeHtml(c.name) + ' — ' + escapeHtml(c.image || '') + '</li>';
                });
                pth += '</ul>';
            }
            if (pt.volumes && pt.volumes.length) {
                pth += '<h3>Volumes</h3><div class="info-value">' + String(pt.volumes.length) + ' volume(s)</div>';
            }
            document.getElementById('podtemplate-body').innerHTML = pth || '<div class="empty-state">No pod template</div>';
            var sel = data.selectors || {};
            var lab = data.labels || {};
            var lh = '<h3>Selectors</h3>';
            if (Object.keys(sel).length === 0) lh += '<div class="empty-state">None</div>';
            else lh += '<ul class="label-list">' + Object.keys(sel).map(function(k) {
                var pair = k + '=' + sel[k];
                return '<li class="label-item"><span>' + escapeHtml(pair) + '</span><button class="copy-btn" data-copy="' + escapeHtml(pair) + '">Copy</button></li>';
            }).join('') + '</ul>';
            lh += '<h3>Labels</h3>';
            if (Object.keys(lab).length === 0) lh += '<div class="empty-state">None</div>';
            else lh += '<ul class="label-list">' + Object.keys(lab).map(function(k) {
                var pair = k + '=' + lab[k];
                return '<li class="label-item"><span>' + escapeHtml(pair) + '</span><button class="copy-btn" data-copy="' + escapeHtml(pair) + '">Copy</button></li>';
            }).join('') + '</ul>';
            document.getElementById('labels-body').innerHTML = lh;
            var evb = document.getElementById('events-body');
            if (!data.events || !data.events.length) {
                evb.innerHTML = '<tr><td colspan="6" class="empty-state">No recent events</td></tr>';
            } else {
                evb.innerHTML = data.events.map(function(ev) {
                    var rc = ev.type === 'Warning' ? ' class="warning"' : '';
                    return '<tr' + rc + '><td>' + escapeHtml(ev.type) + '</td><td>' + escapeHtml(ev.reason) + '</td><td>' + escapeHtml(ev.message) +
                        '</td><td>' + escapeHtml(ev.relativeTime) + '</td><td>' + escapeHtml(ev.source) + '</td><td>' + String(ev.count) + '</td></tr>';
                }).join('');
            }
            wireCopy();
            wirePods();
        }
        function wireCopy() {
            document.querySelectorAll('.copy-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    var v = btn.getAttribute('data-copy');
                    if (v) vscode.postMessage({ command: 'copyValue', value: v });
                });
            });
        }
        function wirePods() {
            document.querySelectorAll('.pod-link').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var name = btn.getAttribute('data-pod');
                    if (name) vscode.postMessage({ command: 'navigateToPod', podName: name });
                });
            });
        }
        document.getElementById('refresh-btn').addEventListener('click', function() {
            document.getElementById('loading').classList.remove('hidden');
            document.getElementById('content').classList.add('hidden');
            vscode.postMessage({ command: 'refresh' });
        });
        document.getElementById('yaml-btn').addEventListener('click', function() {
            vscode.postMessage({ command: 'viewYaml' });
        });
    })();
    </script>
</body>
</html>`;
    }
}
