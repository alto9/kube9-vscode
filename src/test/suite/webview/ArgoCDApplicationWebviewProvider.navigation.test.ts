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
    let revealTreeApplicationCalls = 0;
    let revealTreeResourceCalls = 0;
    let focusCommandCalls = 0;

    setup(() => {
        revealTreeApplicationCalls = 0;
        revealTreeResourceCalls = 0;
        focusCommandCalls = 0;

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
            isCurrentContext: async () => true,
            getKubeconfigPath: () => '/mock/kubeconfig',
            revealTreeApplication: async () => {
                revealTreeApplicationCalls += 1;
                return true;
            },
            revealTreeResource: async () => {
                revealTreeResourceCalls += 1;
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

    test('viewInTree calls revealTreeApplication with panel namespace', async () => {
        const panel = await openPanel();
        const webview = panel.webview as unknown as MockWebviewWithFire;

        webview._fireMessage({ type: 'viewInTree' });
        await flushUntil(() => revealTreeApplicationCalls === 1);

        assert.strictEqual(revealTreeApplicationCalls, 1);
        assert.strictEqual(focusCommandCalls, 1);
        assert.strictEqual(getWarningMessages().length, 0);
        assert.strictEqual(getErrorMessages().length, 0);
    });

    test('viewInTree shows warning on context mismatch', async () => {
        mockTreeProvider = {
            refresh: () => {
                /**/
            },
            isCurrentContext: async () => false,
            getKubeconfigPath: () => '/mock/kubeconfig',
            revealTreeApplication: async () => {
                revealTreeApplicationCalls += 1;
                return true;
            },
            revealTreeResource: async () => true
        } as unknown as ClusterTreeProvider;

        const panel = await openPanel();
        const webview = panel.webview as unknown as MockWebviewWithFire;

        webview._fireMessage({ type: 'viewInTree' });
        await flushUntil(() => getWarningMessages().length > 0);

        assert.strictEqual(revealTreeApplicationCalls, 0);
        assert.strictEqual(focusCommandCalls, 0);
        const warning = getWarningMessages().at(-1);
        assert.ok(warning);
        assert.match(warning, /context does not match/i);
    });

    test('viewInTree shows warning when application is not found', async () => {
        mockTreeProvider = {
            refresh: () => {
                /**/
            },
            isCurrentContext: async () => true,
            getKubeconfigPath: () => '/mock/kubeconfig',
            revealTreeApplication: async () => false,
            revealTreeResource: async () => true
        } as unknown as ClusterTreeProvider;

        const panel = await openPanel();
        const webview = panel.webview as unknown as MockWebviewWithFire;

        webview._fireMessage({ type: 'viewInTree' });
        await flushUntil(() => getWarningMessages().length > 0);

        const warning = getWarningMessages().at(-1);
        assert.ok(warning);
        assert.match(warning, /guestbook/);
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
        assert.strictEqual(getWarningMessages().length, 0);
        assert.strictEqual(getErrorMessages().length, 0);
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
