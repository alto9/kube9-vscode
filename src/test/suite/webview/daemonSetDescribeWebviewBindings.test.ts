import * as assert from 'assert';
import * as vscode from 'vscode';
import * as k8s from '@kubernetes/client-node';
import { getResourceCache } from '../../../kubernetes/cache';
import { KubectlError, KubectlErrorType } from '../../../kubernetes/KubectlError';
import { WorkloadCommands } from '../../../kubectl/WorkloadCommands';
import { DaemonSetDescribeWebview } from '../../../webview/DaemonSetDescribeWebview';
import { DeploymentDescribeWebview } from '../../../webview/DeploymentDescribeWebview';
import { DescribeWebview } from '../../../webview/DescribeWebview';
import { StatefulSetDescribeWebview } from '../../../webview/StatefulSetDescribeWebview';

type MockWebviewWithFire = vscode.Webview & { _fireMessage(message: unknown): void };

async function flushAsyncWork(): Promise<void> {
    await new Promise<void>(resolve => setImmediate(resolve));
}

async function flushUntil(predicate: () => boolean, maxTicks = 80): Promise<void> {
    for (let i = 0; i < maxTicks; i++) {
        if (predicate()) {
            return;
        }
        await flushAsyncWork();
    }
}

function dsPanel(): vscode.WebviewPanel | undefined {
    return (DaemonSetDescribeWebview as unknown as { currentPanel?: vscode.WebviewPanel }).currentPanel;
}

const MIN_DS_TEMPLATE: () => k8s.V1DaemonSet = () => ({
    metadata: {
        name: 'fluentd',
        namespace: 'ns1',
        creationTimestamp: new Date('2020-01-01T00:00:00.000Z'),
        generation: 1,
        labels: { app: 'fluentd' }
    },
    spec: {
        selector: { matchLabels: { app: 'fluentd' } },
        template: {
            spec: {
                containers: [{ name: 'fluentd', image: 'fluentd:latest' }]
            }
        },
        updateStrategy: { type: 'RollingUpdate' }
    },
    status: {
        desiredNumberScheduled: 1,
        currentNumberScheduled: 1,
        numberReady: 1,
        numberAvailable: 1,
        numberUnavailable: 0,
        numberMisscheduled: 0,
        updatedNumberScheduled: 1
    }
});

suite('DaemonSetDescribeWebview panel bindings', () => {
    let mockContext: vscode.ExtensionContext;

    let origGetDetails: typeof WorkloadCommands.getDaemonSetDetails;
    let origListPods: typeof WorkloadCommands.listPodsForDaemonSetFull;
    let origListNodes: typeof WorkloadCommands.listClusterNodes;
    let origEvents: typeof WorkloadCommands.getDaemonSetEvents;

    setup(() => {
        mockContext = {
            subscriptions: [],
            extensionUri: vscode.Uri.file('/mock/extension/path'),
            extensionPath: '/mock/extension/path'
        } as unknown as vscode.ExtensionContext;

        origGetDetails = WorkloadCommands.getDaemonSetDetails;
        origListPods = WorkloadCommands.listPodsForDaemonSetFull;
        origListNodes = WorkloadCommands.listClusterNodes;
        origEvents = WorkloadCommands.getDaemonSetEvents;

        WorkloadCommands.getDaemonSetDetails = async () =>
            ({
                daemonSet: MIN_DS_TEMPLATE(),
                error: undefined
            }) as Awaited<ReturnType<typeof WorkloadCommands.getDaemonSetDetails>>;

        WorkloadCommands.listPodsForDaemonSetFull = async () => ({ pods: [] });
        WorkloadCommands.listClusterNodes = async () => ({ nodes: [] });
        WorkloadCommands.getDaemonSetEvents = async () => ({ events: [] });

        getResourceCache().clear();
        (vscode.window as unknown as { _clearMessages(): void })._clearMessages();
        DescribeWebview.setSharedPanel(undefined);
    });

    teardown(async () => {
        WorkloadCommands.getDaemonSetDetails = origGetDetails;
        WorkloadCommands.listPodsForDaemonSetFull = origListPods;
        WorkloadCommands.listClusterNodes = origListNodes;
        WorkloadCommands.getDaemonSetEvents = origEvents;

        const panel = dsPanel();
        DescribeWebview.setSharedPanel(undefined);
        panel?.dispose();
        await flushAsyncWork();

        getResourceCache().clear();
        (vscode.commands as unknown as { _unregisterCommand(name: string): void })._unregisterCommand('kube9.revealPod');

        if (mockContext?.subscriptions?.length) {
            for (const sub of mockContext.subscriptions) {
                sub?.dispose?.();
            }
            mockContext.subscriptions.length = 0;
        }
    });

    test('shared Describe panel path wires message handlers (navigateToPod)', async () => {
        const prePanel = vscode.window.createWebviewPanel('kube9Describe', 'stub', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        DescribeWebview.setSharedPanel(prePanel);

        const revealArgs: unknown[] = [];
        (vscode.commands as unknown as { _registerCommand(c: string, h: (...args: unknown[]) => Thenable<unknown>): void })._registerCommand(
            'kube9.revealPod',
            async (...args: unknown[]) => {
                revealArgs.push(args);
            }
        );

        await DaemonSetDescribeWebview.show(mockContext, 'fluentd', 'ns1', '/kc', 'ctx-a');

        const panel = dsPanel();
        assert.ok(panel);
        assert.strictEqual(panel, prePanel);

        const wv = panel!.webview as unknown as MockWebviewWithFire;
        wv._fireMessage({ command: 'navigateToPod', name: 'fluentd-abc' });
        await flushAsyncWork();

        assert.strictEqual(revealArgs.length, 1);
        assert.deepStrictEqual(revealArgs[0], ['fluentd-abc', 'ns1']);
    });

    test('re-show on shared panel replaces handlers so refresh does not stack duplicate API calls', async () => {
        const prePanel = vscode.window.createWebviewPanel('kube9Describe', 'stub', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        DescribeWebview.setSharedPanel(prePanel);

        let detailHits = 0;
        WorkloadCommands.getDaemonSetDetails = async () => {
            detailHits += 1;
            return {
                daemonSet: MIN_DS_TEMPLATE(),
                error: undefined
            } as Awaited<ReturnType<typeof WorkloadCommands.getDaemonSetDetails>>;
        };

        await DaemonSetDescribeWebview.show(mockContext, 'ds-a', 'ns1', '/kc', 'ctx-a');
        assert.strictEqual(detailHits, 1);

        const panel = dsPanel()!;
        const wv = panel.webview as unknown as MockWebviewWithFire;
        wv._fireMessage({ command: 'refresh' });
        await flushAsyncWork();
        assert.strictEqual(detailHits, 2);

        await DaemonSetDescribeWebview.show(mockContext, 'ds-b', 'ns1', '/kc', 'ctx-a');
        assert.strictEqual(detailHits, 3);

        wv._fireMessage({ command: 'refresh' });
        await flushAsyncWork();
        assert.strictEqual(detailHits, 4, 'Duplicate message listeners would issue extra getDaemonSetDetails calls');
    });

    test('shared panel path surfaces API failures via webview error message', async () => {
        const prePanel = vscode.window.createWebviewPanel('kube9Describe', 'stub', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        DescribeWebview.setSharedPanel(prePanel);

        WorkloadCommands.getDaemonSetDetails = async () =>
            ({
                daemonSet: undefined,
                error: new KubectlError(
                    KubectlErrorType.PermissionDenied,
                    'Forbidden',
                    'forbidden',
                    'ctx-a'
                )
            }) as Awaited<ReturnType<typeof WorkloadCommands.getDaemonSetDetails>>;

        const posted: unknown[] = [];
        const bindPm = prePanel.webview.postMessage.bind(prePanel.webview);
        prePanel.webview.postMessage = (msg: unknown) => {
            posted.push(msg);
            return bindPm(msg);
        };

        await DaemonSetDescribeWebview.show(mockContext, 'fluentd', 'ns1', '/kc', 'ctx-a');
        await flushAsyncWork();

        assert.ok(posted.some(m => typeof m === 'object' && m !== null && (m as { command?: string }).command === 'error'));
    });

    test('disposing the panel clears DaemonSet Describe static panel pointer', async () => {
        const prePanel = vscode.window.createWebviewPanel('kube9Describe', 'stub', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        DescribeWebview.setSharedPanel(prePanel);

        await DaemonSetDescribeWebview.show(mockContext, 'fluentd', 'ns1', '/kc', 'ctx-a');
        assert.strictEqual(dsPanel(), prePanel);

        prePanel.dispose();
        await flushAsyncWork();
        assert.strictEqual(dsPanel(), undefined);
    });

    test('reusing panel after StatefulSet describe clears StatefulSet refresh handlers', async () => {
        const prePanel = vscode.window.createWebviewPanel('kube9Describe', 'stub', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        DescribeWebview.setSharedPanel(prePanel);

        const origGetSts = WorkloadCommands.getStatefulSetDetails;
        const origGetPods = WorkloadCommands.getV1PodsForLabelSelector;
        const origPvcs = WorkloadCommands.listNamespacedPersistentVolumeClaims;
        const origStsEvents = WorkloadCommands.getStatefulSetEvents;

        let stsDetailHits = 0;
        WorkloadCommands.getStatefulSetDetails = async () => {
            stsDetailHits += 1;
            return {
                statefulSet: {
                    metadata: { name: 'web', namespace: 'ns1', creationTimestamp: new Date() },
                    spec: {
                        replicas: 1,
                        serviceName: 'web',
                        selector: { matchLabels: { app: 'web' } },
                        template: { spec: { containers: [{ name: 'nginx', image: 'nginx' }] } }
                    },
                    status: {}
                },
                error: undefined
            } as Awaited<ReturnType<typeof WorkloadCommands.getStatefulSetDetails>>;
        };
        WorkloadCommands.getV1PodsForLabelSelector = async () => ({ pods: [] });
        WorkloadCommands.listNamespacedPersistentVolumeClaims = async () => ({ items: [] });
        WorkloadCommands.getStatefulSetEvents = async () => ({ events: [] });

        try {
            await StatefulSetDescribeWebview.show(mockContext, 'web', 'ns1', '/kc', 'ctx-a');
            assert.strictEqual(stsDetailHits, 1);

            await DaemonSetDescribeWebview.show(mockContext, 'fluentd', 'ns1', '/kc', 'ctx-a');

            const stsDw = StatefulSetDescribeWebview as unknown as {
                messageSubscription?: vscode.Disposable;
            };
            assert.strictEqual(
                stsDw.messageSubscription,
                undefined,
                'StatefulSet subscription must be released when DaemonSet takes the shared panel'
            );

            let dsDetailHits = 0;
            WorkloadCommands.getDaemonSetDetails = async () => {
                dsDetailHits += 1;
                return {
                    daemonSet: MIN_DS_TEMPLATE(),
                    error: undefined
                } as Awaited<ReturnType<typeof WorkloadCommands.getDaemonSetDetails>>;
            };

            const wv = prePanel.webview as unknown as MockWebviewWithFire;
            const stsHitsBeforeRefresh = stsDetailHits;
            const dsHitsBeforeRefresh = dsDetailHits;
            wv._fireMessage({ command: 'refresh' });
            await flushUntil(() => dsDetailHits > dsHitsBeforeRefresh);

            assert.strictEqual(
                stsDetailHits,
                stsHitsBeforeRefresh,
                'Leaked StatefulSet refresh must not fetch StatefulSet data after DaemonSet takeover'
            );
            assert.ok(dsDetailHits > dsHitsBeforeRefresh, 'Refresh should reload DaemonSet data');
        } finally {
            WorkloadCommands.getStatefulSetDetails = origGetSts;
            WorkloadCommands.getV1PodsForLabelSelector = origGetPods;
            WorkloadCommands.listNamespacedPersistentVolumeClaims = origPvcs;
            WorkloadCommands.getStatefulSetEvents = origStsEvents;
        }
    });

    test('reusing panel after Deployment describe clears Deployment refresh handlers', async () => {
        const prePanel = vscode.window.createWebviewPanel('kube9Describe', 'stub', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        DescribeWebview.setSharedPanel(prePanel);

        let deploymentDetailHits = 0;
        const origGetDeployment = WorkloadCommands.getDeploymentDetails;
        const origGetRs = WorkloadCommands.getRelatedReplicaSets;
        const origGetEvents = WorkloadCommands.getDeploymentEvents;

        WorkloadCommands.getDeploymentDetails = async () => {
            deploymentDetailHits += 1;
            return {
                deployment: {
                    metadata: { name: 'nginx', namespace: 'ns1', uid: 'dep-uid' },
                    spec: {
                        replicas: 1,
                        selector: { matchLabels: { app: 'nginx' } },
                        template: { spec: { containers: [{ name: 'nginx', image: 'nginx' }] } }
                    },
                    status: {}
                },
                error: undefined
            } as Awaited<ReturnType<typeof WorkloadCommands.getDeploymentDetails>>;
        };
        WorkloadCommands.getRelatedReplicaSets = async () => ({ replicaSets: [] });
        WorkloadCommands.getDeploymentEvents = async () => ({ events: [] });

        try {
            await DeploymentDescribeWebview.show(mockContext, 'nginx', 'ns1', '/kc', 'ctx-a');
            assert.strictEqual(deploymentDetailHits, 1);

            await DaemonSetDescribeWebview.show(mockContext, 'fluentd', 'ns1', '/kc', 'ctx-a');

            const dw = DeploymentDescribeWebview as unknown as {
                messageSubscription?: vscode.Disposable;
            };
            assert.strictEqual(
                dw.messageSubscription,
                undefined,
                'Deployment subscription must be released when DaemonSet takes the shared panel'
            );

            let dsDetailHits = 0;
            WorkloadCommands.getDaemonSetDetails = async () => {
                dsDetailHits += 1;
                return {
                    daemonSet: MIN_DS_TEMPLATE(),
                    error: undefined
                } as Awaited<ReturnType<typeof WorkloadCommands.getDaemonSetDetails>>;
            };

            const wv = prePanel.webview as unknown as MockWebviewWithFire;
            const deploymentHitsBeforeRefresh = deploymentDetailHits;
            const dsHitsBeforeRefresh = dsDetailHits;
            wv._fireMessage({ command: 'refresh' });
            await flushUntil(() => dsDetailHits > dsHitsBeforeRefresh);

            assert.strictEqual(
                deploymentDetailHits,
                deploymentHitsBeforeRefresh,
                'Leaked Deployment refresh must not fetch deployment data after DaemonSet takeover'
            );
            assert.ok(dsDetailHits > dsHitsBeforeRefresh, 'Refresh should reload DaemonSet data');
        } finally {
            WorkloadCommands.getDeploymentDetails = origGetDeployment;
            WorkloadCommands.getRelatedReplicaSets = origGetRs;
            WorkloadCommands.getDeploymentEvents = origGetEvents;
        }
    });
});
