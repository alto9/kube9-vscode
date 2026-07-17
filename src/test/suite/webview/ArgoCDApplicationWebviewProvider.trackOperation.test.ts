import * as assert from 'assert';
import * as vscode from 'vscode';
import { ArgoCDService } from '../../../services/ArgoCDService';
import { ClusterTreeProvider } from '../../../tree/ClusterTreeProvider';
import { ArgoCDApplicationWebviewProvider } from '../../../webview/ArgoCDApplicationWebviewProvider';
import {
    isExtensionMessage,
    type ExtensionToWebviewMessage,
    type OperationPhase
} from '../../../types/argocdWebviewProtocol';
import type { ArgoCDApplication, ArgoCDResource } from '../../../types/argocd';
import { OPERATION_TIMEOUT } from '../../../types/argocd';

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

function deploymentRow(overrides: Partial<ArgoCDResource> = {}): ArgoCDResource {
    return {
        kind: 'Deployment',
        name: 'guestbook-ui',
        namespace: 'guestbook',
        syncStatus: 'Synced',
        healthStatus: 'Healthy',
        ...overrides
    };
}

function sampleApplication(overrides: Partial<ArgoCDApplication> = {}): ArgoCDApplication {
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
        healthStatus: {
            status: 'Healthy'
        },
        source: {
            repoURL: 'https://github.com/example/guestbook',
            path: '.',
            targetRevision: 'main'
        },
        destination: {
            server: 'https://kubernetes.default.svc',
            namespace: 'guestbook'
        },
        resources: [deploymentRow()],
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

function getWebviewPanels(): vscode.WebviewPanel[] {
    return (vscode.window as unknown as { _getWebviewPanels(): vscode.WebviewPanel[] })._getWebviewPanels();
}

function disposeAllPanels(): void {
    for (const panel of getWebviewPanels()) {
        panel.dispose();
    }
}

function operationProgressMessages(
    messages: ExtensionToWebviewMessage[]
): Array<{ phase: OperationPhase; message?: string }> {
    return messages
        .filter((message) => message.type === 'operationProgress')
        .map((message) => ({
            phase: message.phase,
            ...(message.message !== undefined ? { message: message.message } : {})
        }));
}

suite('ArgoCDApplicationWebviewProvider trackOperation', () => {
    const contextName = 'minikube';
    const namespace = 'argocd';
    const applicationName = 'guestbook';

    let mockExtensionContext: vscode.ExtensionContext;
    let mockArgoCDService: ArgoCDService;
    let mockTreeProvider: ClusterTreeProvider;
    let currentApplication: ArgoCDApplication;
    let syncApplicationCalls = 0;
    let trackOperationCalls = 0;
    let invalidateCacheCalls = 0;
    let lastInvalidateCacheContext: string | undefined;
    let getApplicationCallOrder: string[] = [];
    let lastTrackOperationArgs:
        | {
              name: string;
              namespace: string;
              context: string;
              timeoutSeconds: number;
              onPhaseUpdate?: (phase: OperationPhase, message?: string) => void;
              cancellationToken?: vscode.CancellationToken;
          }
        | undefined;

    setup(() => {
        syncApplicationCalls = 0;
        trackOperationCalls = 0;
        invalidateCacheCalls = 0;
        lastInvalidateCacheContext = undefined;
        getApplicationCallOrder = [];
        lastTrackOperationArgs = undefined;
        currentApplication = sampleApplication();

        mockExtensionContext = {
            subscriptions: [],
            extensionUri: vscode.Uri.file('/mock/extension/path'),
            extensionPath: '/mock/extension/path'
        } as unknown as vscode.ExtensionContext;

        mockArgoCDService = {
            getKubeconfigPath: () => '/mock/kubeconfig',
            getApplication: async () => {
                getApplicationCallOrder.push('getApplication');
                return currentApplication;
            },
            syncApplication: async () => {
                syncApplicationCalls += 1;
            },
            refreshApplication: async () => {
                /**/
            },
            invalidateCache: (context: string) => {
                invalidateCacheCalls += 1;
                lastInvalidateCacheContext = context;
            },
            trackOperation: async (
                name: string,
                appNamespace: string,
                context: string,
                timeoutSeconds: number,
                onPhaseUpdate?: (phase: OperationPhase, message?: string) => void,
                cancellationToken?: vscode.CancellationToken
            ) => {
                trackOperationCalls += 1;
                lastTrackOperationArgs = {
                    name,
                    namespace: appNamespace,
                    context,
                    timeoutSeconds,
                    onPhaseUpdate,
                    cancellationToken
                };
                onPhaseUpdate?.('Succeeded', 'Sync completed');
                return { success: true, message: 'Sync completed' };
            }
        } as unknown as ArgoCDService;

        mockTreeProvider = {
            refresh: () => {
                /**/
            }
        } as unknown as ClusterTreeProvider;

        (vscode.window as unknown as { _clearMessages(): void })._clearMessages();
        disposeAllPanels();
    });

    teardown(async () => {
        disposeAllPanels();
        await flushAsyncWork();

        if (mockExtensionContext?.subscriptions?.length) {
            for (const sub of mockExtensionContext.subscriptions) {
                sub?.dispose?.();
            }
            mockExtensionContext.subscriptions.length = 0;
        }
    });

    async function openPanel(): Promise<{
        panel: vscode.WebviewPanel;
        messages: ExtensionToWebviewMessage[];
    }> {
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
        const messages = capturePostMessages(panel);
        await pending;
        await flushUntil(() => messages.length >= 2);
        messages.length = 0;
        return { panel, messages };
    }

    test('sync success posts operationProgress sequence and calls trackOperation', async () => {
        mockArgoCDService.trackOperation = async (
            name: string,
            appNamespace: string,
            context: string,
            timeoutSeconds: number,
            onPhaseUpdate?: (phase: OperationPhase, message?: string) => void
        ) => {
            trackOperationCalls += 1;
            lastTrackOperationArgs = {
                name,
                namespace: appNamespace,
                context,
                timeoutSeconds,
                onPhaseUpdate
            };
            onPhaseUpdate?.('Running', 'Applying manifests');
            onPhaseUpdate?.('Succeeded', 'Sync completed');
            return { success: true, message: 'Sync completed' };
        };

        const { panel, messages } = await openPanel();
        const webview = panel.webview as unknown as MockWebviewWithFire;
        webview._fireMessage({ type: 'sync' });

        await flushUntil(() => trackOperationCalls === 1);

        assert.strictEqual(syncApplicationCalls, 1);
        assert.strictEqual(trackOperationCalls, 1);
        assert.ok(lastTrackOperationArgs);
        assert.strictEqual(lastTrackOperationArgs?.timeoutSeconds, OPERATION_TIMEOUT);

        const progress = operationProgressMessages(messages);
        assert.deepStrictEqual(progress, [
            { phase: 'Running', message: 'Syncing application...' },
            { phase: 'Running', message: 'Applying manifests' },
            { phase: 'Succeeded', message: 'Sync completed' }
        ]);
        assert.strictEqual(messages.some((message) => message.type === 'applicationData'), true);
        assert.strictEqual(messages.some((message) => message.type === 'resourceGraph'), true);

        const infoMessages = (vscode.window as unknown as { _getInfoMessages(): string[] })._getInfoMessages();
        assert.ok(infoMessages.some((message) => message.includes('Successfully synced')));
    });

    test('terminal sync success invalidates cache before posting fresh snapshots', async () => {
        const { panel, messages } = await openPanel();
        getApplicationCallOrder = [];
        invalidateCacheCalls = 0;

        const webview = panel.webview as unknown as MockWebviewWithFire;
        webview._fireMessage({ type: 'sync' });

        await flushUntil(() => trackOperationCalls === 1);
        await flushUntil(() => messages.some((message) => message.type === 'resourceGraph'));

        assert.strictEqual(invalidateCacheCalls, 1);
        assert.strictEqual(lastInvalidateCacheContext, contextName);
        assert.strictEqual(getApplicationCallOrder.length, 1);
        assert.strictEqual(messages.some((message) => message.type === 'applicationData'), true);
        assert.strictEqual(messages.some((message) => message.type === 'resourceGraph'), true);
    });

    test('sync failure from service posts error without success toast', async () => {
        mockArgoCDService.syncApplication = async () => {
            syncApplicationCalls += 1;
            throw new Error('patch rejected');
        };

        const { panel, messages } = await openPanel();
        const webview = panel.webview as unknown as MockWebviewWithFire;
        webview._fireMessage({ type: 'sync' });

        await flushUntil(() => messages.some((message) => message.type === 'error'));

        assert.strictEqual(trackOperationCalls, 0);
        assert.strictEqual(
            messages.some((message) => message.type === 'error' && message.message.includes('patch rejected')),
            true
        );
        assert.strictEqual(
            operationProgressMessages(messages).some((message) => message.phase === 'Error'),
            true
        );

        const infoMessages = (vscode.window as unknown as { _getInfoMessages(): string[] })._getInfoMessages();
        assert.strictEqual(infoMessages.some((message) => message.includes('Successfully synced')), false);
    });

    test('trackOperation timeout surfaces error progress', async () => {
        mockArgoCDService.trackOperation = async () => {
            trackOperationCalls += 1;
            throw new Error('Operation tracking timed out after 300 seconds for application guestbook');
        };

        const { panel, messages } = await openPanel();
        const webview = panel.webview as unknown as MockWebviewWithFire;
        webview._fireMessage({ type: 'sync' });

        await flushUntil(() => messages.some((message) => message.type === 'error'));

        assert.strictEqual(trackOperationCalls, 1);
        assert.strictEqual(
            operationProgressMessages(messages).some((message) => message.phase === 'Error'),
            true
        );

        const infoMessages = (vscode.window as unknown as { _getInfoMessages(): string[] })._getInfoMessages();
        assert.strictEqual(infoMessages.some((message) => message.includes('Successfully synced')), false);
    });

    test('trackOperation forwards intermediate phases from callback', async () => {
        mockArgoCDService.trackOperation = async (_name, _namespace, _context, _timeout, onPhaseUpdate) => {
            trackOperationCalls += 1;
            onPhaseUpdate?.('Running', 'Waiting for hooks');
            onPhaseUpdate?.('Running', 'Applying resources');
            onPhaseUpdate?.('Succeeded', 'Done');
            return { success: true, message: 'Done' };
        };

        const { panel, messages } = await openPanel();
        const webview = panel.webview as unknown as MockWebviewWithFire;
        webview._fireMessage({ type: 'sync' });

        await flushUntil(() => trackOperationCalls === 1);

        const progress = operationProgressMessages(messages);
        assert.ok(progress.some((message) => message.message === 'Waiting for hooks'));
        assert.ok(progress.some((message) => message.message === 'Applying resources'));
        assert.ok(progress.some((message) => message.phase === 'Succeeded'));
    });

    test('panel dispose cancels tracking without success toast', async () => {
        mockArgoCDService.trackOperation = async (
            _name,
            _namespace,
            _context,
            _timeout,
            _onPhaseUpdate,
            cancellationToken
        ) => {
            trackOperationCalls += 1;
            await flushUntil(() => cancellationToken?.isCancellationRequested === true, 120);
            throw new vscode.CancellationError();
        };

        const { panel } = await openPanel();
        const webview = panel.webview as unknown as MockWebviewWithFire;
        webview._fireMessage({ type: 'sync' });

        await flushUntil(() => trackOperationCalls === 1);
        panel.dispose();
        await flushUntil(() => getWebviewPanels().length === 0);

        const infoMessages = (vscode.window as unknown as { _getInfoMessages(): string[] })._getInfoMessages();
        assert.strictEqual(infoMessages.some((message) => message.includes('Successfully synced')), false);
    });

    test('duplicate sync while running posts informational error', async () => {
        let resolveTrack: (() => void) | undefined;
        const trackGate = new Promise<void>((resolve) => {
            resolveTrack = resolve;
        });

        mockArgoCDService.trackOperation = async () => {
            trackOperationCalls += 1;
            await trackGate;
            return { success: true, message: 'Sync completed' };
        };

        const { panel, messages } = await openPanel();
        const webview = panel.webview as unknown as MockWebviewWithFire;
        webview._fireMessage({ type: 'sync' });

        await flushUntil(() => trackOperationCalls === 1);

        webview._fireMessage({ type: 'sync' });
        await flushUntil(() =>
            messages.some(
                (message) =>
                    message.type === 'error' && message.message.includes('sync operation is already in progress')
            )
        );

        resolveTrack?.();
        await flushAsyncWork();
    });
});
