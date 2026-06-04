import * as vscode from 'vscode';
import { getYAMLEditorManager } from '../extension';
import { WorkloadCommands } from '../kubectl/WorkloadCommands';
import { transformDaemonSetData, DaemonSetDescribeData } from './daemonSetDataTransformer';
import { getResourceCache, CACHE_TTL } from '../kubernetes/cache';
import { DescribeWebview } from './DescribeWebview';
import { releaseExclusiveDescribePanelBindings } from './describeSharedPanelBindings';
import {
    buildLegacyDescribeDocumentShell,
    buildLegacyHeaderActionScript,
    buildLegacyHeaderFragment,
    getLegacyDescribeWebviewPanelOptions,
    setupLegacyDescribeHelpHandler
} from './legacyDescribeHeaderShell';
import { notifyMajorWebviewOpened } from '../telemetry/webviewTelemetryOpen';

interface WebviewMessage {
    command: 'refresh' | 'copyValue' | 'viewYaml' | 'navigateToPod';
    name?: string;
    namespace?: string;
    value?: string;
    content?: string;
}

/**
 * Structured describe panel for namespaced DaemonSet resources.
 */
export class DaemonSetDescribeWebview {
    private static extensionUri: vscode.Uri | undefined;
    private static currentPanel: vscode.WebviewPanel | undefined;
    private static currentDaemonSetName: string | undefined;
    private static currentNamespace: string | undefined;
    private static kubeconfigPath: string | undefined;
    private static contextName: string | undefined;
    /** Owned subscription for DaemonSet messages; swapped whenever HTML/handlers refresh on a reused panel. */
    private static messageSubscription: vscode.Disposable | undefined;
    /** Clears DaemonSet bindings when this panel closes (including shared Describe reuse). */
    private static panelDisposeSubscription: vscode.Disposable | undefined;

    public static async show(
        context: vscode.ExtensionContext,
        daemonSetName: string,
        namespace: string,
        kubeconfigPath: string,
        contextName: string
    ): Promise<void> {
        releaseExclusiveDescribePanelBindings();
        DaemonSetDescribeWebview.extensionUri = context.extensionUri;
        DaemonSetDescribeWebview.currentDaemonSetName = daemonSetName;
        DaemonSetDescribeWebview.currentNamespace = namespace;
        DaemonSetDescribeWebview.kubeconfigPath = kubeconfigPath;
        DaemonSetDescribeWebview.contextName = contextName;

        const sharedPanel = DescribeWebview.getSharedPanel();

        if (sharedPanel) {
            DaemonSetDescribeWebview.currentPanel = sharedPanel;
            DaemonSetDescribeWebview.currentPanel.title = `DaemonSet / ${daemonSetName}`;
            DaemonSetDescribeWebview.currentDaemonSetName = daemonSetName;
            DaemonSetDescribeWebview.currentNamespace = namespace;
            DaemonSetDescribeWebview.kubeconfigPath = kubeconfigPath;
            DaemonSetDescribeWebview.contextName = contextName;
            DaemonSetDescribeWebview.currentPanel.webview.html =
                DaemonSetDescribeWebview.getWebviewContent(DaemonSetDescribeWebview.currentPanel.webview);
            DaemonSetDescribeWebview.attachPanelBindings(DaemonSetDescribeWebview.currentPanel);
            await DaemonSetDescribeWebview.refreshDaemonSetData();
            DaemonSetDescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        if (DaemonSetDescribeWebview.currentPanel) {
            DaemonSetDescribeWebview.currentPanel.title = `DaemonSet / ${daemonSetName}`;
            DaemonSetDescribeWebview.currentDaemonSetName = daemonSetName;
            DaemonSetDescribeWebview.currentNamespace = namespace;
            DaemonSetDescribeWebview.kubeconfigPath = kubeconfigPath;
            DaemonSetDescribeWebview.contextName = contextName;
            DaemonSetDescribeWebview.currentPanel.webview.html = DaemonSetDescribeWebview.getWebviewContent(
                DaemonSetDescribeWebview.currentPanel.webview
            );
            DaemonSetDescribeWebview.attachPanelBindings(DaemonSetDescribeWebview.currentPanel);
            await DaemonSetDescribeWebview.refreshDaemonSetData();
            DaemonSetDescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            DescribeWebview.setSharedPanel(DaemonSetDescribeWebview.currentPanel);
            return;
        }

        notifyMajorWebviewOpened('resource_describe');
        const panel = vscode.window.createWebviewPanel(
            'kube9Describe',
            `DaemonSet / ${daemonSetName}`,
            vscode.ViewColumn.One,
            getLegacyDescribeWebviewPanelOptions(context.extensionUri)
        );

        DaemonSetDescribeWebview.currentPanel = panel;
        DescribeWebview.setSharedPanel(panel);

        panel.webview.html = DaemonSetDescribeWebview.getWebviewContent(panel.webview);
        DaemonSetDescribeWebview.attachPanelBindings(panel);
        await DaemonSetDescribeWebview.refreshDaemonSetData();

        panel.onDidDispose(
            () => {
                if (DaemonSetDescribeWebview.currentPanel === panel) {
                    DaemonSetDescribeWebview.currentPanel = undefined;
                    DaemonSetDescribeWebview.currentDaemonSetName = undefined;
                    DaemonSetDescribeWebview.currentNamespace = undefined;
                    DaemonSetDescribeWebview.kubeconfigPath = undefined;
                    DaemonSetDescribeWebview.contextName = undefined;
                    if (DescribeWebview.getSharedPanel() === panel) {
                        DescribeWebview.setSharedPanel(undefined);
                    }
                }
            },
            null,
            context.subscriptions
        );
    }

    private static attachPanelBindings(panel: vscode.WebviewPanel): void {
        DaemonSetDescribeWebview.detachPanelSubscriptions();
        DaemonSetDescribeWebview.setupMessageHandlers(panel);
        setupLegacyDescribeHelpHandler(panel.webview);

        DaemonSetDescribeWebview.panelDisposeSubscription = panel.onDidDispose(() => {
            if (DaemonSetDescribeWebview.currentPanel === panel) {
                DaemonSetDescribeWebview.currentPanel = undefined;
                DaemonSetDescribeWebview.currentDaemonSetName = undefined;
                DaemonSetDescribeWebview.currentNamespace = undefined;
                DaemonSetDescribeWebview.kubeconfigPath = undefined;
                DaemonSetDescribeWebview.contextName = undefined;
                if (DescribeWebview.getSharedPanel() === panel) {
                    DescribeWebview.setSharedPanel(undefined);
                }
            }
            DaemonSetDescribeWebview.messageSubscription?.dispose();
            DaemonSetDescribeWebview.messageSubscription = undefined;
        });
    }

    /** Drops DaemonSet message handlers when another describe view takes the shared panel. */
    public static releaseMessageBindings(): void {
        DaemonSetDescribeWebview.detachPanelSubscriptions();
    }

    private static detachPanelSubscriptions(): void {
        DaemonSetDescribeWebview.messageSubscription?.dispose();
        DaemonSetDescribeWebview.messageSubscription = undefined;
        DaemonSetDescribeWebview.panelDisposeSubscription?.dispose();
        DaemonSetDescribeWebview.panelDisposeSubscription = undefined;
    }

    private static clearDaemonSetCache(contextName: string, namespace: string, daemonSetName: string): void {
        const cache = getResourceCache();
        cache.invalidate(`daemonset-describe:${contextName}:${namespace}:${daemonSetName}`);
    }

    private static async refreshDaemonSetData(): Promise<void> {
        if (!DaemonSetDescribeWebview.currentPanel) {
            return;
        }
        const panel = DaemonSetDescribeWebview.currentPanel;
        const daemonSetName = DaemonSetDescribeWebview.currentDaemonSetName;
        const namespace = DaemonSetDescribeWebview.currentNamespace;
        const kubeconfigPath = DaemonSetDescribeWebview.kubeconfigPath;
        const contextName = DaemonSetDescribeWebview.contextName;

        if (!daemonSetName || !namespace || !kubeconfigPath || !contextName) {
            panel.webview.postMessage({
                command: 'error',
                message: 'Missing required parameters for DaemonSet describe'
            });
            return;
        }

        const cache = getResourceCache();
        const cacheKey = `daemonset-describe:${contextName}:${namespace}:${daemonSetName}`;
        const cached = cache.get<DaemonSetDescribeData>(cacheKey);
        if (cached) {
            panel.webview.postMessage({ command: 'updateDaemonSetData', data: cached });
            return;
        }

        try {
            const dsResult = await WorkloadCommands.getDaemonSetDetails(
                daemonSetName,
                namespace,
                kubeconfigPath,
                contextName
            );
            if (dsResult.error) {
                panel.webview.postMessage({
                    command: 'error',
                    message: `Failed to load DaemonSet: ${dsResult.error.getDetails()}`
                });
                return;
            }
            if (!dsResult.daemonSet) {
                panel.webview.postMessage({ command: 'error', message: 'DaemonSet not found or unavailable' });
                return;
            }
            const ds = dsResult.daemonSet;
            const matchLabels = ds.spec?.selector?.matchLabels || {};
            const labelSelector = Object.entries(matchLabels)
                .map(([k, v]) => `${k}=${v}`)
                .join(',');

            const [podsResult, nodesResult] = await Promise.all([
                WorkloadCommands.listPodsForDaemonSetFull(
                    kubeconfigPath,
                    contextName,
                    daemonSetName,
                    namespace,
                    labelSelector
                ),
                WorkloadCommands.listClusterNodes(kubeconfigPath, contextName)
            ]);

            const pods = podsResult.pods || [];
            const podNames = pods.map(p => p.metadata?.name).filter((n): n is string => Boolean(n));
            const eventsResult = await WorkloadCommands.getDaemonSetEvents(
                daemonSetName,
                namespace,
                kubeconfigPath,
                contextName,
                podNames
            );

            const nodes = nodesResult.error ? undefined : nodesResult.nodes;
            const nodesErr = nodesResult.error?.getDetails();
            const podsErr = podsResult.error?.getDetails();
            const eventsErr = eventsResult.error?.getDetails();

            const transformed = transformDaemonSetData(
                ds,
                pods,
                nodes,
                nodesErr,
                eventsResult.events || [],
                podsErr,
                eventsErr
            );

            cache.set(cacheKey, transformed, CACHE_TTL.DEPLOYMENTS);
            panel.webview.postMessage({ command: 'updateDaemonSetData', data: transformed });
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            panel.webview.postMessage({ command: 'error', message: `Failed to refresh DaemonSet: ${msg}` });
        }
    }

    private static setupMessageHandlers(panel: vscode.WebviewPanel): void {
        DaemonSetDescribeWebview.messageSubscription = panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
                switch (message.command) {
                    case 'refresh': {
                        const ctx = DaemonSetDescribeWebview.contextName;
                        const ns = DaemonSetDescribeWebview.currentNamespace;
                        const name = DaemonSetDescribeWebview.currentDaemonSetName;
                        if (ctx && ns && name) {
                            DaemonSetDescribeWebview.clearDaemonSetCache(ctx, ns, name);
                        }
                        await DaemonSetDescribeWebview.refreshDaemonSetData();
                        break;
                    }
                    case 'viewYaml': {
                        const ns = DaemonSetDescribeWebview.currentNamespace;
                        const name = DaemonSetDescribeWebview.currentDaemonSetName;
                        const cluster = DaemonSetDescribeWebview.contextName;
                        if (!ns || !name || !cluster) {
                            vscode.window.showErrorMessage('DaemonSet context is not available');
                            break;
                        }
                        try {
                            const yamlEditorManager = getYAMLEditorManager();
                            await yamlEditorManager.openYAMLEditor({
                                kind: 'DaemonSet',
                                name,
                                namespace: ns,
                                apiVersion: 'apps/v1',
                                cluster
                            });
                        } catch (err) {
                            const errorMessage = err instanceof Error ? err.message : String(err);
                            vscode.window.showErrorMessage(`Failed to open YAML editor: ${errorMessage}`);
                        }
                        break;
                    }
                    case 'navigateToPod': {
                        const podName = message.name;
                        const ns = message.namespace || DaemonSetDescribeWebview.currentNamespace;
                        if (!podName || !ns) {
                            vscode.window.showErrorMessage('Pod name and namespace are required');
                            break;
                        }
                        try {
                            await vscode.commands.executeCommand('kube9.revealPod', podName, ns);
                        } catch (err) {
                            const errorMessage = err instanceof Error ? err.message : String(err);
                            vscode.window.showErrorMessage(`Failed to reveal pod: ${errorMessage}`);
                        }
                        break;
                    }
                    case 'copyValue': {
                        const value = message.value || message.content;
                        if (value) {
                            try {
                                await vscode.env.clipboard.writeText(value);
                                vscode.window.showInformationMessage('Copied to clipboard');
                            } catch (err) {
                                const errorMessage = err instanceof Error ? err.message : String(err);
                                vscode.window.showErrorMessage(`Failed to copy: ${errorMessage}`);
                            }
                        }
                        break;
                    }
                    default:
                        break;
                }
        });
    }

    private static getWebviewContent(webview: vscode.Webview): string {
        const extensionUri = DaemonSetDescribeWebview.extensionUri;
        if (!extensionUri) {
            throw new Error('DaemonSet describe requires extension context');
        }

        const headerFragment = buildLegacyHeaderFragment({
            titleInnerHtml: 'DaemonSet / <span id="ds-name">…</span>'
        });

        const panelCss = `    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    .section { margin-bottom: 28px; }
    .section h2 { margin: 0 0 10px; font-size: 17px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 6px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
    .info-label { font-size: 11px; color: var(--vscode-descriptionForeground); text-transform: uppercase; letter-spacing: 0.4px; }
    .info-value { word-break: break-word; }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap: 10px; }
    .stat { padding: 10px; border: 1px solid var(--vscode-panel-border); border-radius: 4px; }
    .stat .lbl { font-size: 11px; color: var(--vscode-descriptionForeground); }
    .stat .num { font-size: 20px; font-weight: 600; }
    .banner { padding: 10px 12px; border-radius: 4px; background: rgba(255,170,0,.12); border: 1px solid #ffaa00; margin-bottom: 12px; font-size: 13px; }
    .banner.err { background: rgba(255,0,0,.08); border-color: var(--vscode-errorForeground); }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--vscode-panel-border); font-size: 13px; }
    th { font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.4px; }
    tr:hover { background: var(--vscode-list-hoverBackground); }
    .pod-link { color: var(--vscode-textLink-foreground); cursor: pointer; text-decoration: none; }
    .pod-link:hover { text-decoration: underline; }
    .label-list, .selector-list { list-style: none; padding: 0; margin: 0; }
    .label-item, .selector-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--vscode-panel-border); }
    .copy-btn { background: none; border: none; color: var(--vscode-textLink-foreground); cursor: pointer; padding: 4px; }
    .empty-state { padding: 16px; text-align: center; color: var(--vscode-descriptionForeground); font-style: italic; }
    .loading { text-align: center; padding: 32px; color: var(--vscode-descriptionForeground); }
    .error-message { display: none; padding: 14px; border-radius: 4px; background: rgba(255,0,0,.1); border: 1px solid var(--vscode-errorForeground); color: var(--vscode-errorForeground); margin-bottom: 12px; }
    .error-message.visible { display: block; }
    .hidden { display: none !important; }
    .status-ok { color: #00c800; }
    .status-warn { color: #ffaa00; }
    .status-bad { color: var(--vscode-errorForeground); }
    .annotation-item { padding: 10px 0; border-bottom: 1px solid var(--vscode-panel-border); }
    .annotation-key { font-weight: 600; margin-bottom: 4px; }
    .annotation-val { font-family: var(--vscode-editor-font-family); white-space: pre-wrap; word-break: break-all; }`;

        const bodyHtml = `  <div class="container">
    ${headerFragment}
    <div id="loading" class="loading">Loading DaemonSet…</div>
    <div id="err" class="error-message"></div>
    <div id="main" class="hidden">
      <div class="section" id="sec-overview"><h2>Overview</h2><div class="info-grid" id="overview-grid"></div></div>
      <div class="section" id="sec-sched"><h2>Scheduling status</h2><div class="stat-grid" id="sched-grid"></div></div>
      <div class="section" id="sec-strategy"><h2>Update strategy</h2><div class="info-grid" id="strategy-grid"></div></div>
      <div class="section" id="sec-nodes"><h2>Node coverage</h2><div id="node-banner"></div><table><thead><tr><th>Node</th><th>State</th><th>Pod</th><th>Detail</th></tr></thead><tbody id="node-body"></tbody></table></div>
      <div class="section" id="sec-pods"><h2>Pods</h2><div id="pod-banner"></div><table><thead><tr><th>Name</th><th>Node</th><th>Phase</th><th>Ready</th><th>Restarts</th><th>Age</th></tr></thead><tbody id="pod-body"></tbody></table></div>
      <div class="section" id="sec-template"><h2>Pod template</h2><div id="template-body"></div></div>
      <div class="section" id="sec-cond"><h2>Conditions</h2><table><thead><tr><th>Type</th><th>Status</th><th>Reason</th><th>Message</th><th>Age</th></tr></thead><tbody id="cond-body"></tbody></table></div>
      <div class="section" id="sec-labels"><h2>Selectors &amp; labels</h2><div id="labels-body"></div></div>
      <div class="section" id="sec-events"><h2>Events</h2><div id="events-banner"></div><table><thead><tr><th>Type</th><th>Reason</th><th>Message</th><th>Age</th><th>From</th><th>Count</th></tr></thead><tbody id="events-body"></tbody></table></div>
      <div class="section" id="sec-annotations"><h2>Annotations</h2><div id="ann-body"></div></div>
    </div>
  </div>`;

        const script = `    const $ = id => document.getElementById(id);
    function esc(s){ if(s==null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    window.addEventListener('message', ev => {
      const m = ev.data;
      if (m.command === 'updateDaemonSetData') { render(m.data); hideLoading(); hideErr(); $('main').classList.remove('hidden'); }
      if (m.command === 'error') { showErr(m.message); hideLoading(); }
    });
    function hideLoading(){ $('loading').classList.add('hidden'); }
    function showErr(msg){ const e=$('err'); e.textContent = msg; e.classList.add('visible'); $('main').classList.add('hidden'); }
    function hideErr(){ $('err').classList.remove('visible'); }
    function render(d){
      $('ds-name').textContent = d.name || '';
      // overview
      const og = $('overview-grid');
      const ov = d.overview || {};
      og.innerHTML = [
        ['Namespace', ov.namespace],
        ['Status', ov.statusSummary],
        ['Detail', ov.statusDetail || '—'],
        ['Age', ov.age],
        ['Created', ov.creationTimestamp],
        ['Generation', String(ov.generation||0)]
      ].map(([k,v])=>'<div class="info-item"><div class="info-label">'+esc(k)+'</div><div class="info-value">'+esc(v)+'</div></div>').join('');
      // scheduling
      const rc = d.replicaCounts || {};
      const sg = $('sched-grid');
      const stats = [
        ['Desired (nodes)', rc.desiredScheduled],
        ['Current scheduled', rc.currentScheduled],
        ['Ready', rc.ready],
        ['Available', rc.available],
        ['Unavailable', rc.unavailable],
        ['Misscheduled', rc.misscheduled],
        ['Updated scheduled', rc.updatedScheduled]
      ];
      sg.innerHTML = stats.map(([lbl,val])=>{
        var cls = 'num';
        if (lbl.indexOf('Misscheduled') !== -1 && val > 0) cls += ' status-bad';
        if (lbl.indexOf('Unavailable') !== -1 && val > 0) cls += ' status-warn';
        return '<div class="stat"><div class="lbl">'+esc(lbl)+'</div><div class="'+cls+'">'+esc(String(val))+'</div></div>';
      }).join('');
      // strategy
      const us = d.updateStrategy || {};
      $('strategy-grid').innerHTML = ['Type','Max unavailable','Max surge'].map((k,i)=>{
        const val = i===0?us.type:(i===1?us.maxUnavailable:us.maxSurge);
        return '<div class="info-item"><div class="info-label">'+k+'</div><div class="info-value">'+esc(val)+'</div></div>';
      }).join('');
      // node coverage
      const nb = $('node-banner');
      nb.innerHTML = '';
      if (d.nodeCoverageLimitedMessage) {
        nb.innerHTML = '<div class="banner">'+esc(d.nodeCoverageLimitedMessage)+'</div>';
      }
      const nbody = $('node-body');
      const nrows = d.nodeCoverage || [];
      if (nrows.length === 0 && !d.nodeCoverageLimitedMessage) {
        nbody.innerHTML = '<tr><td colspan="4" class="empty-state">No node rows (list nodes to derive expected placement, or rely on pod table below).</td></tr>';
      } else if (nrows.length === 0) {
        nbody.innerHTML = '<tr><td colspan="4" class="empty-state">See banner above — per-node table needs node list permissions.</td></tr>';
      } else {
        nbody.innerHTML = nrows.map(r => '<tr><td>'+esc(r.nodeName)+'</td><td>'+esc(r.state)+'</td><td>'+esc(r.podName)+'</td><td>'+esc(r.detail)+'</td></tr>').join('');
      }
      // pods
      const pb = $('pod-banner');
      pb.innerHTML = d.podsFetchError ? '<div class="banner err">Pods: '+esc(d.podsFetchError)+'</div>' : '';
      const podb = $('pod-body');
      const pods = d.pods || [];
      if (!pods.length && d.podsFetchError) {
        podb.innerHTML = '<tr><td colspan="6" class="empty-state">Could not list pods.</td></tr>';
      } else if (!pods.length) {
        podb.innerHTML = '<tr><td colspan="6" class="empty-state">No DaemonSet pods matched the selector.</td></tr>';
      } else {
        podb.innerHTML = pods.map(p => {
          const link = '<a href="#" class="pod-link" data-pod="'+esc(p.name)+'">'+esc(p.name)+'</a>';
          return '<tr><td>'+link+'</td><td>'+esc(p.node)+'</td><td>'+esc(p.phase)+'</td><td>'+esc(p.ready)+'</td><td>'+esc(String(p.restartCount))+'</td><td>'+esc(p.age)+'</td></tr>';
        }).join('');
        podb.querySelectorAll('.pod-link').forEach(a => {
          a.addEventListener('click', e => { e.preventDefault(); vscode.postMessage({ command:'navigateToPod', name:a.getAttribute('data-pod'), namespace: d.namespace }); });
        });
      }
      // template
      const tb = $('template-body');
      const pt = d.podTemplate;
      if (!pt || (!pt.containers || !pt.containers.length)) {
        tb.innerHTML = '<div class="empty-state">No container template</div>';
      } else {
        tb.innerHTML = '<div class="info-grid">'+pt.containers.map(c =>
          '<div class="info-item"><div class="info-label">'+esc(c.name)+'</div><div class="info-value">'+esc(c.image)+'</div></div>'
        ).join('')+'</div>';
      }
      // conditions
      const cb = $('cond-body');
      const conds = d.conditions || [];
      cb.innerHTML = conds.length ? conds.map(c=>'<tr><td>'+esc(c.type)+'</td><td>'+esc(c.status)+'</td><td>'+esc(c.reason)+'</td><td>'+esc(c.message)+'</td><td>'+esc(c.relativeTime)+'</td></tr>').join('')
        : '<tr><td colspan="5" class="empty-state">No conditions</td></tr>';
      // labels
      const lb = $('labels-body');
      let lh = '';
      const sel = d.selectors || {};
      const lab = d.labels || {};
      if (Object.keys(sel).length) {
        lh += '<h3 style="margin:0 0 8px;font-size:13px;">Selectors</h3><ul class="selector-list">';
        lh += Object.entries(sel).map(([k,v])=>'<li class="selector-item"><span>'+esc(k)+'='+esc(v)+'</span><button class="copy-btn" data-copy="'+esc(k+'='+v)+'">copy</button></li>').join('');
        lh += '</ul>';
      }
      if (Object.keys(lab).length) {
        lh += '<h3 style="margin:12px 0 8px;font-size:13px;">Labels</h3><ul class="label-list">';
        lh += Object.entries(lab).map(([k,v])=>'<li class="label-item"><span>'+esc(k)+'='+esc(v)+'</span><button class="copy-btn" data-copy="'+esc(k+'='+v)+'">copy</button></li>').join('');
        lh += '</ul>';
      }
      lb.innerHTML = lh || '<div class="empty-state">None</div>';
      lb.querySelectorAll('.copy-btn').forEach(b => b.addEventListener('click', () => vscode.postMessage({ command:'copyValue', value: b.getAttribute('data-copy') })));
      // events
      const evb = $('events-banner');
      evb.innerHTML = d.eventsFetchError ? '<div class="banner err">Events: '+esc(d.eventsFetchError)+'</div>' : '';
      const eb = $('events-body');
      const evs = d.events || [];
      eb.innerHTML = evs.length ? evs.map(ev=>'<tr><td>'+esc(ev.type)+'</td><td>'+esc(ev.reason)+'</td><td>'+esc(ev.message)+'</td><td>'+esc(ev.relativeTime)+'</td><td>'+esc(ev.source)+'</td><td>'+esc(String(ev.count))+'</td></tr>').join('')
        : '<tr><td colspan="6" class="empty-state">'+(d.eventsFetchError?'Could not load events.':'No recent events')+'</td></tr>';
      // annotations
      const ab = $('ann-body');
      const anns = d.annotations || {};
      const ak = Object.keys(anns);
      ab.innerHTML = ak.length ? ak.map(k=>'<div class="annotation-item"><div class="annotation-key">'+esc(k)+'</div><div class="annotation-val">'+esc(anns[k])+'</div><button class="copy-btn" data-copy="'+esc(anns[k])+'">copy</button></div>').join('')
        : '<div class="empty-state">No annotations</div>';
      ab.querySelectorAll('.copy-btn').forEach(b => b.addEventListener('click', () => vscode.postMessage({ command:'copyValue', value: b.getAttribute('data-copy') })));
    }
    $('refresh-btn').addEventListener('click', () => { $('loading').classList.remove('hidden'); vscode.postMessage({ command:'refresh' }); });
${buildLegacyHeaderActionScript({ showRefresh: false })}`;

        return buildLegacyDescribeDocumentShell({
            webview,
            extensionUri,
            pageTitle: 'DaemonSet Describe',
            bodyHtml,
            panelCss,
            script
        });
    }
}
