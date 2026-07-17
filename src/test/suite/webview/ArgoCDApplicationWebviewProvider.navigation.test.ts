import * as assert from 'assert';
import * as vscode from 'vscode';
import { ArgoCDService } from '../../../services/ArgoCDService';
import { ClusterTreeProvider } from '../../../tree/ClusterTreeProvider';
import { ArgoCDApplicationWebviewProvider } from '../../../webview/ArgoCDApplicationWebviewProvider';
import type { ArgoCDApplication, ArgoCDResource } from '../../../types/argocd';

type MockWebviewWithFire = vscode.Webview & { _fireMessage(message: unknown): void };

async function flushAsyncWork(): Promise<void> {
    await new Promise<void>((resolve) => setImmediate(resolve));
}

async function flushUntil(predicate: () => boolean, maxTicks = 80): Promise<void> {
    for (let i = 0; i < maxTicks; i++) {
        if (predicate()) {
            return;
        }
        await flushAsyncWork();
    }
}

function deploymentRow(): ArgoCDResource {
    return {
        kind: 'Deployment',
        name: 'guestbook-ui',
        namespace: 'guestbook',
        syncStatus: 'Synced',
        healthStatus: 'Healthy'
    };
}

function sampleApplication(): ArgoCDApplication {
    return {
        name: 'guestbook',
        namespace: 'argocd',
        project: 'default',
        createdAt: '2024-01-01T00:00:00.000Z',
        syncStatus: {
            status: 'Synced',
            revision: 'abc123',
            comparedTo: {
                source: {
                    repoURL: 'https://github.com/example/guestbook',
                    path: '.',
                    targetRevision: 'main'
                }
            }
        },
        healthStatus: { status: 'Healthy' },
        source: {
            repoURL: 'https://github.com/example/guestbook',
            path: '.',
            targetRevision: 'main'
        },
        destination: {
            server: 'https://kubernetes.default.svc',
            namespace: 'guestbook'
        },
        resources: [deploymentRow()]
    };
}

function apisocialApplication(): ArgoCDApplication {
    return {
        ...sampleApplication(),
        name: 'apisocial-app',
        namespace: 'argocd',
        destination: {
            server: 'https://kubernetes.default.svc',
            namespace: 'apisocial-ns'
        },
        resources: [
            {
                kind: 'Deployment',
                name: 'apisocial',
                namespace: 'apisocial-ns',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            }
        ]
    };
}

function getWebviewPanels(): vscode.WebviewPanel[] {
    return (vscode.window as unknown as { _getWebviewPanels(): vscode.WebviewPanel[] })._getWebviewPanels();
}

function disposeAllPanels(): void {
    for (const panel of getWebviewPanels()) {
        panel.dispose();
    }
}

function getWarningMessages(): string[] {
    return (vscode.window as unknown as { _getWarningMessages(): string[] })._getWarningMessages();
}

function getErrorMessages(): string[] {
    return (vscode.window as unknown as { _getErrorMessages(): string[] })._getErrorMessages();
}

suite('ArgoCDApplicationWebviewProvider navigation', () => {
    const contextName = 'minikube';
    const namespace = 'argocd';
    const applicationName = 'guestbook';

    let mockExtensionContext: vscode.ExtensionContext;
    let mockArgoCDService: ArgoCDService;
    let mockTreeProvider: ClusterTreeProvider;
    let revealTreeResourceCalls = 0;
    let focusCommandCalls = 0;
    let invalidateNavigateCacheCalls = 0;
    let lastRevealNamespace = '';

    setup(() => {
        revealTreeResourceCalls = 0;
        focusCommandCalls = 0;
        invalidateNavigateCacheCalls = 0;
        lastRevealNamespace = '';

        (vscode.commands as unknown as { _registerCommand: (id: string, fn: () => Promise<void>) => void })
            ._registerCommand('kube9ClusterView.focus', async () => {
                focusCommandCalls += 1;
            });

        mockExtensionContext = {
            subscriptions: [],
            extensionUri: vscode.Uri.file('/mock/extension/path'),
            extensionPath: '/mock/extension/path',
            secrets: {
                get: async () => undefined
            }
        } as unknown as vscode.ExtensionContext;

        mockArgoCDService = {
            getApplication: async () => sampleApplication(),
            refreshApplication: async () => {
                /**/
            },
            invalidateCache: () => {
                /**/
            }
        } as unknown as ArgoCDService;

        mockTreeProvider = {
            refresh: () => {
                /**/
            },
            invalidateCachesBeforeTreeReveal: () => {
                invalidateNavigateCacheCalls += 1;
            },
            isCurrentContext: async () => true,
            getKubeconfigPath: () => '/mock/kubeconfig',
            revealTreeResource: async (_kind: string, _name: string, namespace: string) => {
                revealTreeResourceCalls += 1;
                lastRevealNamespace = namespace;
                return true;
            }
        } as unknown as ClusterTreeProvider;

        (vscode.window as unknown as { _clearMessages(): void })._clearMessages();
        disposeAllPanels();
    });

    teardown(async () => {
        disposeAllPanels();
        await flushAsyncWork();
    });

    async function openPanel(): Promise<vscode.WebviewPanel> {
        const pending = ArgoCDApplicationWebviewProvider.showApplication(
            mockExtensionContext,
            mockArgoCDService,
            mockTreeProvider,
            applicationName,
            namespace,
            contextName
        );
        const panel = getWebviewPanels().at(-1);
        assert.ok(panel);
        await pending;
        await flushUntil(() => getWebviewPanels().length > 0);
        return panel;
    }

    test('viewInTree message is ignored by the host handler', async () => {
        const panel = await openPanel();
        const webview = panel.webview as unknown as MockWebviewWithFire;

        webview._fireMessage({ type: 'viewInTree' });
        await flushAsyncWork();

        assert.strictEqual(revealTreeResourceCalls, 0);
        assert.strictEqual(focusCommandCalls, 0);
        assert.strictEqual(getWarningMessages().length, 0);
        assert.strictEqual(getErrorMessages().length, 0);
    });

    test('navigateToResource delegates to revealTreeResource for supported kinds', async () => {
        const panel = await openPanel();
        const webview = panel.webview as unknown as MockWebviewWithFire;

        webview._fireMessage({
            type: 'navigateToResource',
            kind: 'Deployment',
            name: 'guestbook-ui',
            namespace: 'guestbook'
        });
        await flushUntil(() => revealTreeResourceCalls === 1);

        assert.strictEqual(revealTreeResourceCalls, 1);
        assert.strictEqual(focusCommandCalls, 1);
        assert.strictEqual(invalidateNavigateCacheCalls, 1);
        assert.strictEqual(lastRevealNamespace, 'guestbook');
        assert.strictEqual(getWarningMessages().length, 0);
        assert.strictEqual(getErrorMessages().length, 0);
    });

    test('navigateToResource reveals apisocial Deployment in resource namespace, not Application CR namespace', async () => {
        mockArgoCDService = {
            getApplication: async () => apisocialApplication(),
            refreshApplication: async () => {
                /**/
            },
            invalidateCache: () => {
                /**/
            }
        } as unknown as ArgoCDService;

        const panel = await openPanel();
        const webview = panel.webview as unknown as MockWebviewWithFire;

        webview._fireMessage({
            type: 'navigateToResource',
            kind: 'Deployment',
            name: 'apisocial',
            namespace: 'apisocial-ns'
        });
        await flushUntil(() => revealTreeResourceCalls === 1);

        assert.strictEqual(revealTreeResourceCalls, 1);
        assert.strictEqual(lastRevealNamespace, 'apisocial-ns');
        assert.notStrictEqual(lastRevealNamespace, 'argocd');
        assert.strictEqual(invalidateNavigateCacheCalls, 1);
    });

    test('navigateToResource falls back to destination namespace when resource namespace is empty', async () => {
        mockArgoCDService = {
            getApplication: async () => apisocialApplication(),
            refreshApplication: async () => {
                /**/
            },
            invalidateCache: () => {
                /**/
            }
        } as unknown as ArgoCDService;

        const panel = await openPanel();
        const webview = panel.webview as unknown as MockWebviewWithFire;

        webview._fireMessage({
            type: 'navigateToResource',
            kind: 'Deployment',
            name: 'apisocial',
            namespace: ''
        });
        await flushUntil(() => revealTreeResourceCalls === 1);

        assert.strictEqual(lastRevealNamespace, 'apisocial-ns');
    });

    test('resource.navigateTree uses the same reveal namespace rules as navigateToResource', async () => {
        mockArgoCDService = {
            getApplication: async () => apisocialApplication(),
            refreshApplication: async () => {
                /**/
            },
            invalidateCache: () => {
                /**/
            }
        } as unknown as ArgoCDService;

        const panel = await openPanel();
        const webview = panel.webview as unknown as MockWebviewWithFire;

        webview._fireMessage({
            type: 'resourceAction',
            actionId: 'resource.navigateTree',
            kind: 'Deployment',
            name: 'apisocial',
            namespace: 'apisocial-ns'
        });
        await flushUntil(() => revealTreeResourceCalls === 1);

        assert.strictEqual(lastRevealNamespace, 'apisocial-ns');
        assert.notStrictEqual(lastRevealNamespace, 'argocd');
        assert.strictEqual(invalidateNavigateCacheCalls, 1);
    });

    test('navigateToResource shows error for unsupported kinds', async () => {
        const panel = await openPanel();
        const webview = panel.webview as unknown as MockWebviewWithFire;

        webview._fireMessage({
            type: 'navigateToResource',
            kind: 'Job',
            name: 'guestbook-job',
            namespace: 'guestbook'
        });
        await flushUntil(() => getErrorMessages().length > 0);

        assert.strictEqual(revealTreeResourceCalls, 0);
        const error = getErrorMessages().at(-1);
        assert.ok(error);
        assert.match(error, /not supported/i);
    });
});
