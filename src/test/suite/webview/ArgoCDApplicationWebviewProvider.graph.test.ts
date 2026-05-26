import * as assert from 'assert';
import * as vscode from 'vscode';
import { ArgoCDService } from '../../../services/ArgoCDService';
import { ClusterTreeProvider } from '../../../tree/ClusterTreeProvider';
import { ArgoCDApplicationWebviewProvider } from '../../../webview/ArgoCDApplicationWebviewProvider';
import {
    isExtensionMessage,
    isResourceGraphMessage,
    type ExtensionToWebviewMessage
} from '../../../types/argocdWebviewProtocol';
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

suite('ArgoCDApplicationWebviewProvider resource graph', () => {
    const contextName = 'minikube';
    const namespace = 'argocd';
    const applicationName = 'guestbook';

    let mockExtensionContext: vscode.ExtensionContext;
    let mockArgoCDService: ArgoCDService;
    let mockTreeProvider: ClusterTreeProvider;
    let getApplicationCalls = 0;
    let currentApplication: ArgoCDApplication;

    setup(() => {
        getApplicationCalls = 0;
        currentApplication = sampleApplication();

        mockExtensionContext = {
            subscriptions: [],
            extensionUri: vscode.Uri.file('/mock/extension/path'),
            extensionPath: '/mock/extension/path'
        } as unknown as vscode.ExtensionContext;

        mockArgoCDService = {
            getApplication: async () => {
                getApplicationCalls += 1;
                return currentApplication;
            },
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

    test('open posts applicationData then resourceGraph', async () => {
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

        assert.strictEqual(messages.length, 2);
        assert.strictEqual(messages[0].type, 'applicationData');
        assert.strictEqual(messages[1].type, 'resourceGraph');
        assert.ok(isResourceGraphMessage(messages[1]));
        assert.strictEqual(messages[1].topologySource, 'crd_flat');
        assert.strictEqual(messages[1].graph.applicationKey.context, contextName);
        assert.strictEqual(messages[1].graph.applicationKey.namespace, namespace);
        assert.strictEqual(messages[1].graph.applicationKey.name, applicationName);
        assert.strictEqual(getApplicationCalls, 1);
    });

    test('refresh handler posts applicationData then resourceGraph in order', async () => {
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
        getApplicationCalls = 0;

        const webview = panel.webview as unknown as MockWebviewWithFire;
        webview._fireMessage({ type: 'refresh' });

        await flushUntil(() => messages.length >= 2);

        assert.strictEqual(messages[0].type, 'applicationData');
        assert.strictEqual(messages[1].type, 'resourceGraph');
        assert.strictEqual(getApplicationCalls, 1);
    });

    test('second load with same topology merges graph snapshots', async () => {
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

        const firstGraph = messages[1];
        assert.ok(isResourceGraphMessage(firstGraph));
        const firstStructureVersion = firstGraph.graph.structureVersion;

        currentApplication = sampleApplication({
            healthStatus: { status: 'Degraded', message: 'deployment unhealthy' },
            resources: [
                deploymentRow({
                    healthStatus: 'Degraded'
                })
            ]
        });
        messages.length = 0;

        const revealPending = ArgoCDApplicationWebviewProvider.showApplication(
            mockExtensionContext,
            mockArgoCDService,
            mockTreeProvider,
            applicationName,
            namespace,
            contextName
        );
        await revealPending;

        await flushUntil(() => messages.length >= 2);

        const secondGraph = messages[1];
        assert.ok(isResourceGraphMessage(secondGraph));
        assert.strictEqual(secondGraph.graph.structureVersion, firstStructureVersion);
        assert.strictEqual(secondGraph.graph.nodes.find((node) => node.role === 'application')?.status.healthStatus, 'Degraded');
    });

    test('failed application load does not post resourceGraph', async () => {
        mockArgoCDService.getApplication = async () => {
            throw new Error('cluster unreachable');
        };

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

        assert.strictEqual(messages.some((message) => message.type === 'resourceGraph'), false);
        assert.strictEqual(messages.some((message) => message.type === 'error'), true);
    });
});
