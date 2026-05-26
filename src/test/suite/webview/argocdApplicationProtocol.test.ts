import * as assert from 'assert';
import type { ArgoCDApplication } from '../../../types/argocd';
import type { ApplicationResourceGraph } from '../../../types/applicationResourceGraph';
import {
    buildResourceGraphMessage,
    isExtensionMessage,
    isGraphRefreshMessage,
    isResourceActionMessage,
    isResourceGraphMessage,
    isWebviewMessage,
    type ResourceActionWebviewMessage,
    type ResourceGraphExtensionMessage
} from '../../../types/argocdWebviewProtocol';

function sampleGraph(overrides: Partial<ApplicationResourceGraph> = {}): ApplicationResourceGraph {
    return {
        applicationKey: { context: 'ctx-1', namespace: 'argocd', name: 'guestbook' },
        nodes: [],
        edges: [],
        topologySource: 'crd_flat',
        topologyMode: 'limited',
        structureVersion: 'abc123',
        observedAt: '2026-05-26T12:00:00.000Z',
        ...overrides
    };
}

suite('argocdApplicationProtocol', () => {
    suite('webview → extension validation', () => {
        test('accepts lifecycle messages without extra fields', () => {
            assert.strictEqual(isWebviewMessage({ type: 'ready' }), true);
            assert.strictEqual(isWebviewMessage({ type: 'sync' }), true);
            assert.strictEqual(isWebviewMessage({ type: 'refresh' }), true);
            assert.strictEqual(isWebviewMessage({ type: 'hardRefresh' }), true);
            assert.strictEqual(isWebviewMessage({ type: 'viewInTree' }), true);
        });

        test('accepts navigateToResource with required fields', () => {
            assert.strictEqual(
                isWebviewMessage({
                    type: 'navigateToResource',
                    kind: 'Deployment',
                    name: 'api',
                    namespace: 'prod'
                }),
                true
            );
        });

        test('rejects navigateToResource with missing fields', () => {
            assert.strictEqual(
                isWebviewMessage({
                    type: 'navigateToResource',
                    kind: 'Deployment',
                    name: 'api'
                }),
                false
            );
        });

        test('accepts graphRefresh with optional bypassCache', () => {
            assert.strictEqual(isWebviewMessage({ type: 'graphRefresh' }), true);
            assert.strictEqual(isWebviewMessage({ type: 'graphRefresh', bypassCache: true }), true);
            assert.strictEqual(isGraphRefreshMessage({ type: 'graphRefresh', bypassCache: false }), true);
        });

        test('rejects graphRefresh with invalid bypassCache', () => {
            assert.strictEqual(isWebviewMessage({ type: 'graphRefresh', bypassCache: 'yes' }), false);
        });

        test('accepts resourceAction with required and optional API fields', () => {
            const message: ResourceActionWebviewMessage = {
                type: 'resourceAction',
                actionId: 'deployment.restartRollout',
                kind: 'Deployment',
                name: 'api',
                namespace: 'prod',
                group: 'apps',
                version: 'v1'
            };
            assert.strictEqual(isWebviewMessage(message), true);
            assert.strictEqual(isResourceActionMessage(message), true);
        });

        test('rejects resourceAction with missing actionId', () => {
            assert.strictEqual(
                isResourceActionMessage({
                    type: 'resourceAction',
                    kind: 'Deployment',
                    name: 'api',
                    namespace: 'prod'
                }),
                false
            );
        });

        test('rejects unknown webview type', () => {
            assert.strictEqual(isWebviewMessage({ type: 'graphData' }), false);
            assert.strictEqual(isWebviewMessage({ type: 'graphPatch' }), false);
            assert.strictEqual(isWebviewMessage({ type: 'graphAction' }), false);
        });
    });

    suite('extension → webview validation', () => {
        test('accepts applicationData with object payload', () => {
            assert.strictEqual(
                isExtensionMessage({
                    type: 'applicationData',
                    data: { name: 'guestbook' } as ArgoCDApplication
                }),
                true
            );
        });

        test('accepts updateStatus with optional fields', () => {
            assert.strictEqual(isExtensionMessage({ type: 'updateStatus' }), true);
        });

        test('accepts operationProgress', () => {
            assert.strictEqual(
                isExtensionMessage({
                    type: 'operationProgress',
                    phase: 'Running',
                    message: 'Syncing application...'
                }),
                true
            );
        });

        test('accepts resourceGraph with graph metadata', () => {
            const message = buildResourceGraphMessage({
                graph: sampleGraph({ truncated: true }),
                topologySource: 'crd_flat',
                refreshedAt: '2026-05-26T12:00:00.000Z',
                truncated: true,
                totalManagedCount: 42
            });
            assert.strictEqual(isExtensionMessage(message), true);
            assert.strictEqual(isResourceGraphMessage(message), true);
        });

        test('rejects resourceGraph with invalid topologySource', () => {
            assert.strictEqual(
                isResourceGraphMessage({
                    type: 'resourceGraph',
                    graph: sampleGraph(),
                    topologySource: 'legacy_flat',
                    refreshedAt: '2026-05-26T12:00:00.000Z'
                }),
                false
            );
        });

        test('accepts resourceActionProgress and resourceActionResult', () => {
            assert.strictEqual(
                isExtensionMessage({
                    type: 'resourceActionProgress',
                    actionId: 'deployment.restartRollout',
                    phase: 'Running',
                    nodeRef: { kind: 'Deployment', name: 'api', namespace: 'prod' }
                }),
                true
            );
            assert.strictEqual(
                isExtensionMessage({
                    type: 'resourceActionResult',
                    actionId: 'deployment.restartRollout',
                    success: false,
                    message: 'Not implemented'
                }),
                true
            );
        });

        test('accepts error message', () => {
            assert.strictEqual(
                isExtensionMessage({ type: 'error', message: 'Application not found' }),
                true
            );
        });

        test('rejects unknown extension type', () => {
            assert.strictEqual(isExtensionMessage({ type: 'graphPatch' }), false);
        });
    });

    suite('resourceGraph round-trip', () => {
        test('JSON round-trip preserves resourceGraph shape', () => {
            const original: ResourceGraphExtensionMessage = buildResourceGraphMessage({
                graph: sampleGraph({
                    nodes: [
                        {
                            id: 'app:argocd/guestbook',
                            role: 'application',
                            resourceKey: null,
                            status: { syncStatus: 'Synced', healthStatus: 'Healthy' },
                            label: 'guestbook',
                            kindLabel: 'Application'
                        }
                    ],
                    edges: [],
                    truncated: false
                }),
                topologySource: 'crd_flat',
                refreshedAt: '2026-05-26T12:00:00.000Z',
                totalManagedCount: 1
            });

            const roundTripped = JSON.parse(JSON.stringify(original)) as unknown;
            assert.strictEqual(isResourceGraphMessage(roundTripped), true);
            if (isResourceGraphMessage(roundTripped)) {
                assert.strictEqual(roundTripped.graph.applicationKey.name, 'guestbook');
                assert.strictEqual(roundTripped.topologySource, 'crd_flat');
                assert.strictEqual(roundTripped.refreshedAt, '2026-05-26T12:00:00.000Z');
                assert.strictEqual(roundTripped.totalManagedCount, 1);
            }
        });
    });
});
