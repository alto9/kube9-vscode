import * as assert from 'assert';
import * as vscode from 'vscode';
import type { ArgoCDApplication } from '../../../types/argocd';
import { buildApplicationResourceGraph } from '../../../services/ApplicationResourceGraphBuilder';
import { INVALID_RESOURCE_ROW_WARNING } from '../../../services/ApplicationResourceGraphAssembler';
import type { ArgoCDService } from '../../../services/ArgoCDService';
import { OperatorStatusMode } from '../../../kubernetes/OperatorStatusTypes';
import type { OperatorStatusClient } from '../../../services/OperatorStatusClient';
import {
    OperatorResourceTreeClient,
    setOperatorExecFnForTesting
} from '../../../services/OperatorResourceTreeClient';

const originalGetConfiguration = vscode.workspace.getConfiguration;

function sampleApplication(): ArgoCDApplication {
    return {
        name: 'guestbook',
        namespace: 'argocd',
        project: 'default',
        createdAt: '2026-05-27T00:00:00.000Z',
        syncStatus: {
            status: 'Synced',
            revision: 'abc123',
            comparedTo: { source: { repoURL: 'https://example.com/repo', path: '.', targetRevision: 'HEAD' } }
        },
        healthStatus: { status: 'Healthy' },
        source: { repoURL: 'https://example.com/repo', path: '.', targetRevision: 'HEAD' },
        destination: { server: 'https://kubernetes.default.svc', namespace: 'guestbook' },
        resources: [
            {
                kind: 'Deployment',
                name: 'guestbook-ui',
                namespace: 'guestbook',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            }
        ]
    };
}

function mockArgoCDService(): ArgoCDService {
    return {
        getKubeconfigPath: () => '/mock/kubeconfig'
    } as ArgoCDService;
}

function mockOperatorStatusClient(input: {
    mode: OperatorStatusMode;
    argocd?: {
        detected: boolean;
        resourceTreeCapable?: boolean;
    };
}): OperatorStatusClient {
    return {
        getStatus: async () => ({
            status:
                input.argocd === undefined
                    ? null
                    : {
                          mode: 'operated',
                          version: '1.0.0',
                          health: 'healthy',
                          lastUpdate: new Date().toISOString(),
                          error: null,
                          collectionStats: {
                              totalSuccessCount: 0,
                              totalFailureCount: 0,
                              collectionsStoredCount: 0,
                              lastSuccessTime: null
                          },
                          argocd: {
                              detected: input.argocd.detected,
                              namespace: 'argocd',
                              version: 'v2.8.0',
                              lastChecked: new Date().toISOString(),
                              resourceTreeCapable: input.argocd.resourceTreeCapable
                          }
                      },
            timestamp: Date.now(),
            mode: input.mode
        })
    } as unknown as OperatorStatusClient;
}

suite('ApplicationResourceGraphBuilder', () => {
    teardown(() => {
        vscode.workspace.getConfiguration = originalGetConfiguration;
        setOperatorExecFnForTesting(undefined);
    });

    setup(() => {
        vscode.workspace.getConfiguration = ((section?: string) => ({
            get: <T>(key: string, defaultValue?: T): T | undefined => {
                if (section !== 'kube9') {
                    return defaultValue;
                }
                if (key === 'argocd.restEnabled') {
                    return false as T;
                }
                return defaultValue;
            }
        })) as typeof vscode.workspace.getConfiguration;
    });

    test('falls back to crd_flat when REST enrichment is disabled', async () => {
        const result = await buildApplicationResourceGraph(
            {
                application: sampleApplication(),
                applicationKey: { context: 'minikube', namespace: 'argocd', name: 'guestbook' },
                argoCDService: mockArgoCDService(),
                extensionContext: { secrets: { get: async () => undefined } } as unknown as vscode.ExtensionContext
            },
            {
                operatorStatusClient: mockOperatorStatusClient({
                    mode: OperatorStatusMode.Basic
                })
            }
        );

        assert.strictEqual(result.topologySource, 'crd_flat');
        assert.strictEqual(result.graph.topologyMode, 'limited');
        assert.strictEqual(result.graph.limitedTopologyReason, 'rest_unavailable');
        assert.strictEqual(result.graph.nodes.length, 2);
    });

    test('uses operator resource-tree when capable and REST is disabled', async () => {
        setOperatorExecFnForTesting(async () => ({
            stdout: JSON.stringify({
                nodes: [
                    {
                        kind: 'Application',
                        name: 'guestbook',
                        namespace: 'argocd',
                        group: 'argoproj.io'
                    },
                    {
                        kind: 'Deployment',
                        name: 'guestbook-ui',
                        namespace: 'guestbook',
                        parentRefs: [{ kind: 'Application', name: 'guestbook', namespace: 'argocd' }]
                    }
                ]
            }),
            stderr: ''
        }));

        const result = await buildApplicationResourceGraph(
            {
                application: sampleApplication(),
                applicationKey: { context: 'minikube', namespace: 'argocd', name: 'guestbook' },
                argoCDService: mockArgoCDService(),
                extensionContext: { secrets: { get: async () => undefined } } as unknown as vscode.ExtensionContext
            },
            {
                operatorStatusClient: mockOperatorStatusClient({
                    mode: OperatorStatusMode.Operated,
                    argocd: { detected: true, resourceTreeCapable: true }
                }),
                operatorResourceTreeClient: new OperatorResourceTreeClient()
            }
        );

        assert.strictEqual(result.topologySource, 'argocd_resource_tree');
        assert.strictEqual(result.graph.topologyMode, 'full');
        assert.strictEqual(result.graph.limitedTopologyReason, undefined);
    });

    test('skips operator exec when resourceTreeCapable is false', async () => {
        let execCalled = false;
        setOperatorExecFnForTesting(async () => {
            execCalled = true;
            return { stdout: '{}', stderr: '' };
        });

        const result = await buildApplicationResourceGraph(
            {
                application: sampleApplication(),
                applicationKey: { context: 'minikube', namespace: 'argocd', name: 'guestbook' },
                argoCDService: mockArgoCDService(),
                extensionContext: { secrets: { get: async () => undefined } } as unknown as vscode.ExtensionContext
            },
            {
                operatorStatusClient: mockOperatorStatusClient({
                    mode: OperatorStatusMode.Operated,
                    argocd: { detected: true, resourceTreeCapable: false }
                })
            }
        );

        assert.strictEqual(execCalled, false);
        assert.strictEqual(result.topologySource, 'crd_flat');
        assert.strictEqual(result.graph.limitedTopologyReason, 'operator_not_capable');
    });

    test('falls back with enrichment_failed when operator CLI fails after capability true', async () => {
        setOperatorExecFnForTesting(async () => ({
            stdout: '',
            stderr: JSON.stringify({
                ok: false,
                code: 'APPLICATION_NOT_FOUND',
                message: 'missing app'
            })
        }));

        const result = await buildApplicationResourceGraph(
            {
                application: sampleApplication(),
                applicationKey: { context: 'minikube', namespace: 'argocd', name: 'guestbook' },
                argoCDService: mockArgoCDService(),
                extensionContext: { secrets: { get: async () => undefined } } as unknown as vscode.ExtensionContext
            },
            {
                operatorStatusClient: mockOperatorStatusClient({
                    mode: OperatorStatusMode.Operated,
                    argocd: { detected: true, resourceTreeCapable: true }
                }),
                operatorResourceTreeClient: new OperatorResourceTreeClient()
            }
        );

        assert.strictEqual(result.topologySource, 'crd_flat');
        assert.strictEqual(result.graph.limitedTopologyReason, 'enrichment_failed');
    });

    test('logs crd_flat assembly warnings and flags skipped invalid rows', async () => {
        const outputChannel = vscode.window.createOutputChannel('kube9 ArgoCD Service') as unknown as {
            _getContent(): string;
        };

        const result = await buildApplicationResourceGraph(
            {
                application: {
                    ...sampleApplication(),
                    resources: [
                        {
                            kind: 'Deployment',
                            name: 'guestbook-ui',
                            namespace: 'guestbook',
                            syncStatus: 'Synced',
                            healthStatus: 'Healthy'
                        },
                        {
                            kind: '',
                            name: 'missing-kind',
                            namespace: 'guestbook',
                            syncStatus: 'Synced'
                        }
                    ]
                },
                applicationKey: { context: 'minikube', namespace: 'argocd', name: 'guestbook' },
                argoCDService: mockArgoCDService(),
                extensionContext: { secrets: { get: async () => undefined } } as unknown as vscode.ExtensionContext
            },
            {
                operatorStatusClient: mockOperatorStatusClient({
                    mode: OperatorStatusMode.Basic
                })
            }
        );

        assert.strictEqual(result.skippedInvalidResourceRows, true);
        assert.strictEqual(
            result.assemblyWarnings.filter((warning) => warning === INVALID_RESOURCE_ROW_WARNING).length,
            1
        );
        assert.match(outputChannel._getContent(), /\[WARNING\] crd_flat graph assembly:/);
        assert.match(outputChannel._getContent(), /missing kind or name/);
    });
});
