import * as assert from 'assert';
import * as vscode from 'vscode';
import * as k8s from '@kubernetes/client-node';
import { getResourceCache } from '../../../kubernetes/cache';
import { KubectlError, KubectlErrorType } from '../../../kubernetes/KubectlError';
import { WorkloadCommands } from '../../../kubectl/WorkloadCommands';
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

function stsPanel(): vscode.WebviewPanel | undefined {
    return (
        StatefulSetDescribeWebview as unknown as {
            currentPanel?: vscode.WebviewPanel;
        }
    ).currentPanel;
}

const MIN_STS_TEMPLATE: () => k8s.V1StatefulSet = () => ({
    metadata: {
        name: 'web',
        namespace: 'ns1',
        creationTimestamp: new Date('2020-01-01T00:00:00.000Z'),
        generation: 1,
        labels: { app: 'web' }
    },
    spec: {
        replicas: 1,
        serviceName: 'web',
        selector: { matchLabels: { app: 'web' } },
        template: {
            spec: {
                containers: [{ name: 'nginx', image: 'nginx' }]
            }
        },
        updateStrategy: { type: 'RollingUpdate' },
        podManagementPolicy: 'OrderedReady'
    },
    status: {
        replicas: 1,
        readyReplicas: 0,
        currentReplicas: 1,
        updatedReplicas: 1,
        observedGeneration: 1
    }
});

suite('StatefulSetDescribeWebview panel bindings', () => {
    let mockContext: vscode.ExtensionContext;

    let origGetDetails: typeof WorkloadCommands.getStatefulSetDetails;
    let origGetPods: typeof WorkloadCommands.getV1PodsForLabelSelector;
    let origPvcs: typeof WorkloadCommands.listNamespacedPersistentVolumeClaims;
    let origEvents: typeof WorkloadCommands.getStatefulSetEvents;

    setup(() => {
        mockContext = {
            subscriptions: [],
            extensionUri: vscode.Uri.file('/mock/extension/path'),
            extensionPath: '/mock/extension/path'
        } as unknown as vscode.ExtensionContext;

        origGetDetails = WorkloadCommands.getStatefulSetDetails;
        origGetPods = WorkloadCommands.getV1PodsForLabelSelector;
        origPvcs = WorkloadCommands.listNamespacedPersistentVolumeClaims;
        origEvents = WorkloadCommands.getStatefulSetEvents;

        WorkloadCommands.getStatefulSetDetails = async () =>
            ({
                statefulSet: MIN_STS_TEMPLATE(),
                error: undefined
            }) as Awaited<ReturnType<typeof WorkloadCommands.getStatefulSetDetails>>;

        WorkloadCommands.getV1PodsForLabelSelector = async () => ({ pods: [] });

        WorkloadCommands.listNamespacedPersistentVolumeClaims = async () =>
            ({
                items: []
            }) as Awaited<ReturnType<typeof WorkloadCommands.listNamespacedPersistentVolumeClaims>>;

        WorkloadCommands.getStatefulSetEvents = async () => ({ events: [] });

        getResourceCache().clear();
        (vscode.window as unknown as { _clearMessages(): void })._clearMessages();
        DescribeWebview.setSharedPanel(undefined);
    });

    teardown(async () => {
        WorkloadCommands.getStatefulSetDetails = origGetDetails;
        WorkloadCommands.getV1PodsForLabelSelector = origGetPods;
        WorkloadCommands.listNamespacedPersistentVolumeClaims = origPvcs;
        WorkloadCommands.getStatefulSetEvents = origEvents;

        const panel = stsPanel();
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

        await StatefulSetDescribeWebview.show(mockContext, 'web', 'ns1', '/kc', 'ctx-a');

        const panel = stsPanel();
        assert.ok(panel);
        assert.strictEqual(panel, prePanel);

        const wv = panel!.webview as unknown as MockWebviewWithFire;
        wv._fireMessage({ command: 'navigateToPod', podName: 'web-0' });
        await flushAsyncWork();

        assert.strictEqual(revealArgs.length, 1);
        assert.deepStrictEqual(revealArgs[0], ['web-0', 'ns1']);
    });

    test('re-show on shared panel replaces handlers so refresh does not stack duplicate API calls', async () => {
        const prePanel = vscode.window.createWebviewPanel('kube9Describe', 'stub', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        DescribeWebview.setSharedPanel(prePanel);

        let detailHits = 0;
        WorkloadCommands.getStatefulSetDetails = async () => {
            detailHits += 1;
            return {
                statefulSet: MIN_STS_TEMPLATE(),
                error: undefined
            } as Awaited<ReturnType<typeof WorkloadCommands.getStatefulSetDetails>>;
        };

        await StatefulSetDescribeWebview.show(mockContext, 'sts-a', 'ns1', '/kc', 'ctx-a');
        assert.strictEqual(detailHits, 1);

        const panel = stsPanel()!;
        const wv = panel.webview as unknown as MockWebviewWithFire;
        wv._fireMessage({ command: 'refresh' });
        await flushAsyncWork();
        assert.strictEqual(detailHits, 2);

        await StatefulSetDescribeWebview.show(mockContext, 'sts-b', 'ns1', '/kc', 'ctx-a');
        assert.strictEqual(detailHits, 3);

        wv._fireMessage({ command: 'refresh' });
        await flushAsyncWork();
        assert.strictEqual(detailHits, 4, 'Duplicate message listeners would issue extra getStatefulSetDetails calls');
    });

    test('shared panel path surfaces API failures via webview error message', async () => {
        const prePanel = vscode.window.createWebviewPanel('kube9Describe', 'stub', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        DescribeWebview.setSharedPanel(prePanel);

        WorkloadCommands.getStatefulSetDetails = async () =>
            ({
                statefulSet: undefined,
                error: new KubectlError(
                    KubectlErrorType.PermissionDenied,
                    'Forbidden',
                    'forbidden',
                    'ctx-a'
                )
            }) as Awaited<ReturnType<typeof WorkloadCommands.getStatefulSetDetails>>;

        const posted: unknown[] = [];
        const bindPm = prePanel.webview.postMessage.bind(prePanel.webview);
        prePanel.webview.postMessage = (msg: unknown) => {
            posted.push(msg);
            return bindPm(msg);
        };

        await StatefulSetDescribeWebview.show(mockContext, 'web', 'ns1', '/kc', 'ctx-a');
        await flushAsyncWork();

        assert.ok(posted.some(m => typeof m === 'object' && m !== null && (m as { command?: string }).command === 'error'));
    });

    test('disposing the panel clears StatefulSet Describe static panel pointer', async () => {
        const prePanel = vscode.window.createWebviewPanel('kube9Describe', 'stub', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        DescribeWebview.setSharedPanel(prePanel);

        await StatefulSetDescribeWebview.show(mockContext, 'web', 'ns1', '/kc', 'ctx-a');
        assert.strictEqual(stsPanel(), prePanel);

        prePanel.dispose();
        await flushAsyncWork();
        assert.strictEqual(stsPanel(), undefined);
    });

    test('reusing a real Describe panel clears Describe bindings before StatefulSet handlers run', async () => {
        const prePanel = vscode.window.createWebviewPanel('kube9Describe', 'stub', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        DescribeWebview.setSharedPanel(prePanel);

        const dw = DescribeWebview as unknown as {
            setupMessageHandling(p: vscode.WebviewPanel, c: vscode.ExtensionContext): void;
            currentPodConfig?: { name: string; namespace: string; context: string };
            describeMessageSubscription?: vscode.Disposable;
        };
        dw.currentPodConfig = { name: 'nginx-fake', namespace: 'ns1', context: 'ctx-a' };
        dw.setupMessageHandling(prePanel, mockContext);
        assert.ok(dw.describeMessageSubscription, 'Describe should register a message subscription');

        let podRefreshHits = 0;
        const origLoadPod = DescribeWebview as unknown as {
            loadPodData(
                podConfig: { name: string; namespace: string; context: string },
                panel: vscode.WebviewPanel
            ): Promise<void>;
        };
        const realLoadPod = origLoadPod.loadPodData.bind(DescribeWebview);
        origLoadPod.loadPodData = async (podConfig, panel) => {
            podRefreshHits += 1;
            return realLoadPod(podConfig, panel);
        };

        let stsDetailHits = 0;
        WorkloadCommands.getStatefulSetDetails = async () => {
            stsDetailHits += 1;
            return {
                statefulSet: MIN_STS_TEMPLATE(),
                error: undefined
            } as Awaited<ReturnType<typeof WorkloadCommands.getStatefulSetDetails>>;
        };

        try {
            await StatefulSetDescribeWebview.show(mockContext, 'web', 'ns1', '/kc', 'ctx-a');

            assert.strictEqual(
                dw.describeMessageSubscription,
                undefined,
                'Describe subscription must be released when StatefulSet takes the shared panel'
            );
            assert.strictEqual(
                dw.currentPodConfig,
                undefined,
                'Stale Describe resource config must be cleared for StatefulSet'
            );

            const wv = prePanel.webview as unknown as MockWebviewWithFire;
            const stsLoadsBeforeRefresh = stsDetailHits;
            wv._fireMessage({ command: 'refresh' });
            await flushUntil(() => stsDetailHits > stsLoadsBeforeRefresh);

            assert.strictEqual(podRefreshHits, 0, 'Leaked Describe refresh must not load Pod data');
            assert.ok(stsDetailHits > stsLoadsBeforeRefresh, 'Refresh should reload StatefulSet data');
        } finally {
            origLoadPod.loadPodData = realLoadPod;
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

            await StatefulSetDescribeWebview.show(mockContext, 'web', 'ns1', '/kc', 'ctx-a');

            const dw = DeploymentDescribeWebview as unknown as {
                messageSubscription?: vscode.Disposable;
            };
            assert.strictEqual(
                dw.messageSubscription,
                undefined,
                'Deployment subscription must be released when StatefulSet takes the shared panel'
            );

            let stsDetailHits = 0;
            WorkloadCommands.getStatefulSetDetails = async () => {
                stsDetailHits += 1;
                return {
                    statefulSet: MIN_STS_TEMPLATE(),
                    error: undefined
                } as Awaited<ReturnType<typeof WorkloadCommands.getStatefulSetDetails>>;
            };

            const wv = prePanel.webview as unknown as MockWebviewWithFire;
            const deploymentHitsBeforeRefresh = deploymentDetailHits;
            const stsHitsBeforeRefresh = stsDetailHits;
            wv._fireMessage({ command: 'refresh' });
            await flushUntil(() => stsDetailHits > stsHitsBeforeRefresh);

            assert.strictEqual(
                deploymentDetailHits,
                deploymentHitsBeforeRefresh,
                'Leaked Deployment refresh must not fetch deployment data after StatefulSet takeover'
            );
            assert.ok(stsDetailHits > stsHitsBeforeRefresh, 'Refresh should reload StatefulSet data');
        } finally {
            WorkloadCommands.getDeploymentDetails = origGetDeployment;
            WorkloadCommands.getRelatedReplicaSets = origGetRs;
            WorkloadCommands.getDeploymentEvents = origGetEvents;
        }
    });
});
