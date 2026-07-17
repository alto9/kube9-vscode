/* eslint-disable @typescript-eslint/no-var-requires */
import * as assert from 'assert';
import * as Module from 'module';
import * as vscode from 'vscode';
import { KubectlError, KubectlErrorType } from '../../../kubernetes/KubectlError';
import { ClusterTreeProvider } from '../../../tree/ClusterTreeProvider';
import {
    ACTION_DEPLOYMENT_RESTART_ROLLOUT,
    ACTION_RESOURCE_NAVIGATE_TREE,
    resolveResourceActionHandler,
    type ResourceActionContext
} from '../../../services/KindCapabilityRegistry';
import type { ResourceActionWebviewMessage } from '../../../types/argocdWebviewProtocol';
import { isExtensionMessage, type ExtensionToWebviewMessage } from '../../../types/argocdWebviewProtocol';

const originalRequire = Module.prototype.require;

function resourceActionMessage(
    overrides: Partial<ResourceActionWebviewMessage> = {}
): ResourceActionWebviewMessage {
    return {
        type: 'resourceAction',
        actionId: ACTION_DEPLOYMENT_RESTART_ROLLOUT,
        kind: 'Deployment',
        name: 'guestbook-ui',
        namespace: 'guestbook',
        ...overrides
    };
}

function capturePostMessages(panel: vscode.WebviewPanel): ExtensionToWebviewMessage[] {
    const messages: ExtensionToWebviewMessage[] = [];
    const webview = panel.webview;
    const originalPostMessage = webview.postMessage.bind(webview);
    webview.postMessage = (message: unknown) => {
        if (isExtensionMessage(message)) {
            messages.push(message);
        }
        return originalPostMessage(message);
    };
    return messages;
}

function lastResult(messages: ExtensionToWebviewMessage[]) {
    return messages.filter((m) => m.type === 'resourceActionResult').at(-1);
}

suite('KindCapabilityRegistry', () => {
    const contextName = 'minikube';
    let mockRestartBehavior: {
        confirmation?: { confirmed: boolean; waitForRollout: boolean } | undefined;
        applyError?: unknown;
        watchError?: unknown;
    };
    let applyCalls = 0;
    let watchCalls = 0;

    setup(() => {
        mockRestartBehavior = {};
        applyCalls = 0;
        watchCalls = 0;

        delete require.cache[require.resolve('../../../services/treeRevealHelper')];
        delete require.cache[require.resolve('../../../services/KindCapabilityRegistry')];

        (vscode.commands as unknown as { _registerCommand: (id: string, fn: () => Promise<void>) => void })
            ._registerCommand('kube9.treeView.focus', async () => {
                /**/
            });
        (vscode.commands as unknown as { _registerCommand: (id: string, fn: () => Promise<void>) => void })
            ._registerCommand('kube9ClusterView.focus', async () => {
                /**/
            });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Module.prototype.require = function (this: unknown, ...args: any[]): any {
            const id = args[0] as string;
            if (typeof id === 'string' && id.includes('restartWorkload')) {
                return {
                    showRestartConfirmationDialog: async () => mockRestartBehavior.confirmation,
                    applyRestartAnnotation: async () => {
                        applyCalls += 1;
                        if (mockRestartBehavior.applyError) {
                            throw mockRestartBehavior.applyError;
                        }
                    },
                    watchRolloutStatus: async () => {
                        watchCalls += 1;
                        if (mockRestartBehavior.watchError) {
                            throw mockRestartBehavior.watchError;
                        }
                    }
                };
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (originalRequire as any).apply(this, args);
        };

        delete require.cache[require.resolve('../../../services/KindCapabilityRegistry')];
    });

    teardown(() => {
        Module.prototype.require = originalRequire;
        delete require.cache[require.resolve('../../../services/treeRevealHelper')];
        delete require.cache[require.resolve('../../../services/KindCapabilityRegistry')];
        (vscode.window as unknown as { _clearMessages(): void })._clearMessages();
    });

    function buildContext(panel: vscode.WebviewPanel): ResourceActionContext {
        const treeProvider = {
            getKubeconfigPath: () => '/mock/kubeconfig',
            refresh: () => {
                /**/
            },
            invalidateCachesBeforeTreeReveal: () => {
                /**/
            },
            isCurrentContext: async () => true,
            revealTreeResource: async () => true
        } as unknown as ClusterTreeProvider;

        return {
            panel,
            treeProvider,
            context: contextName,
            kubeconfigPath: '/mock/kubeconfig'
        };
    }

    function loadDispatch() {
        delete require.cache[require.resolve('../../../services/treeRevealHelper')];
        delete require.cache[require.resolve('../../../services/KindCapabilityRegistry')];
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('../../../services/KindCapabilityRegistry')
            .dispatchResourceAction as typeof import('../../../services/KindCapabilityRegistry').dispatchResourceAction;
    }

    test('resolveResourceActionHandler returns undefined for unknown actionId', () => {
        assert.strictEqual(resolveResourceActionHandler('unknown.action', 'Deployment'), undefined);
    });

    test('resolveResourceActionHandler returns unsupported_kind for wrong kind', () => {
        assert.strictEqual(
            resolveResourceActionHandler(ACTION_DEPLOYMENT_RESTART_ROLLOUT, 'Service'),
            'unsupported_kind'
        );
    });

    test('dispatch posts failure for unknown actionId', async () => {
        const dispatch = loadDispatch();
        const panel = vscode.window.createWebviewPanel(
            'kube9.argocdApplication',
            'test',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        const messages = capturePostMessages(panel);

        await dispatch(
            buildContext(panel),
            resourceActionMessage({ actionId: 'unknown.action' })
        );

        const result = lastResult(messages);
        assert.ok(result);
        assert.strictEqual(result.success, false);
        assert.match(result.message, /Unknown action/);
        panel.dispose();
    });

    test('dispatch posts failure for unsupported kind', async () => {
        const dispatch = loadDispatch();
        const panel = vscode.window.createWebviewPanel(
            'kube9.argocdApplication',
            'test',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        const messages = capturePostMessages(panel);

        await dispatch(
            buildContext(panel),
            resourceActionMessage({ kind: 'Service' })
        );

        const result = lastResult(messages);
        assert.ok(result);
        assert.strictEqual(result.success, false);
        assert.match(result.message, /not supported for kind Service/);
        panel.dispose();
    });

    test('deployment.restartRollout cancelled posts Cancelled result', async () => {
        mockRestartBehavior.confirmation = undefined;
        const dispatch = loadDispatch();
        const panel = vscode.window.createWebviewPanel(
            'kube9.argocdApplication',
            'test',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        const messages = capturePostMessages(panel);

        await dispatch(buildContext(panel), resourceActionMessage());

        const result = lastResult(messages);
        assert.ok(result);
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.message, 'Cancelled');
        assert.strictEqual(applyCalls, 0);
        panel.dispose();
    });

    test('deployment.restartRollout success emits progress and result', async () => {
        mockRestartBehavior.confirmation = { confirmed: true, waitForRollout: false };
        const dispatch = loadDispatch();
        const panel = vscode.window.createWebviewPanel(
            'kube9.argocdApplication',
            'test',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        const messages = capturePostMessages(panel);

        await dispatch(
            buildContext(panel),
            resourceActionMessage({ group: 'apps', version: 'v1' })
        );

        assert.strictEqual(applyCalls, 1);
        assert.strictEqual(watchCalls, 0);
        const progress = messages.filter((m) => m.type === 'resourceActionProgress');
        assert.ok(progress.some((m) => m.phase === 'Running'));
        assert.ok(progress.some((m) => m.phase === 'Succeeded'));
        const running = progress.find((m) => m.phase === 'Running');
        assert.deepStrictEqual(running?.nodeRef, {
            kind: 'Deployment',
            name: 'guestbook-ui',
            namespace: 'guestbook',
            group: 'apps',
            version: 'v1'
        });
        const result = lastResult(messages);
        assert.ok(result);
        assert.strictEqual(result.success, true);
        assert.deepStrictEqual(result.nodeRef, {
            kind: 'Deployment',
            name: 'guestbook-ui',
            namespace: 'guestbook',
            group: 'apps',
            version: 'v1'
        });
        panel.dispose();
    });

    test('deployment.restartRollout maps permission errors to action result', async () => {
        mockRestartBehavior.confirmation = { confirmed: true, waitForRollout: false };
        mockRestartBehavior.applyError = new KubectlError(
            KubectlErrorType.PermissionDenied,
            'Permission denied',
            'forbidden',
            contextName
        );
        const dispatch = loadDispatch();
        const panel = vscode.window.createWebviewPanel(
            'kube9.argocdApplication',
            'test',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        const messages = capturePostMessages(panel);

        await dispatch(buildContext(panel), resourceActionMessage());

        const result = lastResult(messages);
        assert.ok(result);
        assert.strictEqual(result.success, false);
        assert.match(result.message, /insufficient permissions/);
        assert.ok(result.message.includes(ACTION_DEPLOYMENT_RESTART_ROLLOUT));
        panel.dispose();
    });

    test('resource.navigateTree posts success when tree reveal succeeds', async () => {
        const dispatch = loadDispatch();
        const panel = vscode.window.createWebviewPanel(
            'kube9.argocdApplication',
            'test',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        const messages = capturePostMessages(panel);
        const ctx = buildContext(panel);
        (ctx.treeProvider as unknown as { revealTreeResource: () => Promise<boolean> }).revealTreeResource =
            async () => true;

        await dispatch(
            ctx,
            resourceActionMessage({
                actionId: ACTION_RESOURCE_NAVIGATE_TREE,
                kind: 'Deployment'
            })
        );

        const result = lastResult(messages);
        assert.ok(result);
        assert.strictEqual(result.success, true);
        panel.dispose();
    });

    test('resource.navigateTree posts failure when resource not found', async () => {
        const dispatch = loadDispatch();
        const panel = vscode.window.createWebviewPanel(
            'kube9.argocdApplication',
            'test',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        const messages = capturePostMessages(panel);
        const ctx = buildContext(panel);
        (ctx.treeProvider as unknown as { revealTreeResource: () => Promise<boolean> }).revealTreeResource =
            async () => false;

        await dispatch(
            ctx,
            resourceActionMessage({
                actionId: ACTION_RESOURCE_NAVIGATE_TREE,
                kind: 'Deployment'
            })
        );

        const result = lastResult(messages);
        assert.ok(result);
        assert.strictEqual(result.success, false);
        assert.match(result.message, /not found in cluster tree/);
        panel.dispose();
    });

    test('resource.navigateTree posts failure on context mismatch', async () => {
        const dispatch = loadDispatch();
        const panel = vscode.window.createWebviewPanel(
            'kube9.argocdApplication',
            'test',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        const messages = capturePostMessages(panel);
        const ctx = buildContext(panel);
        (ctx.treeProvider as unknown as { isCurrentContext: () => Promise<boolean> }).isCurrentContext =
            async () => false;

        await dispatch(
            ctx,
            resourceActionMessage({
                actionId: ACTION_RESOURCE_NAVIGATE_TREE,
                kind: 'Deployment'
            })
        );

        const result = lastResult(messages);
        assert.ok(result);
        assert.strictEqual(result.success, false);
        assert.match(result.message, /context does not match/i);
        panel.dispose();
    });

    test('resource.navigateTree posts failure when tree is unavailable', async () => {
        const dispatch = loadDispatch();
        const panel = vscode.window.createWebviewPanel(
            'kube9.argocdApplication',
            'test',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        const messages = capturePostMessages(panel);
        const ctx = buildContext(panel);
        (ctx.treeProvider as unknown as { getKubeconfigPath: () => string }).getKubeconfigPath = () => '';

        await dispatch(
            ctx,
            resourceActionMessage({
                actionId: ACTION_RESOURCE_NAVIGATE_TREE,
                kind: 'Deployment'
            })
        );

        const result = lastResult(messages);
        assert.ok(result);
        assert.strictEqual(result.success, false);
        assert.match(result.message, /tree view is unavailable/i);
        panel.dispose();
    });
});
