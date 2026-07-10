import * as assert from 'assert';
import * as vscode from 'vscode';
import type { ArgoCDApplication } from '../../../types/argocd';
import { buildApplicationResourceGraph } from '../../../services/ApplicationResourceGraphBuilder';
import { INVALID_RESOURCE_ROW_WARNING } from '../../../services/ApplicationResourceGraphAssembler';
import type { ArgoCDService } from '../../../services/ArgoCDService';

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

suite('ApplicationResourceGraphBuilder', () => {
    teardown(() => {
        vscode.workspace.getConfiguration = originalGetConfiguration;
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
        const result = await buildApplicationResourceGraph({
            application: sampleApplication(),
            applicationKey: { context: 'minikube', namespace: 'argocd', name: 'guestbook' },
            argoCDService: {} as ArgoCDService,
            extensionContext: { secrets: { get: async () => undefined } } as unknown as vscode.ExtensionContext
        });

        assert.strictEqual(result.topologySource, 'crd_flat');
        assert.strictEqual(result.graph.topologyMode, 'limited');
        assert.strictEqual(result.graph.nodes.length, 2);
    });

    test('logs crd_flat assembly warnings and flags skipped invalid rows', async () => {
        const outputChannel = vscode.window.createOutputChannel('kube9 ArgoCD Service') as unknown as {
            _getContent(): string;
        };

        const result = await buildApplicationResourceGraph({
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
            argoCDService: {} as ArgoCDService,
            extensionContext: { secrets: { get: async () => undefined } } as unknown as vscode.ExtensionContext
        });

        assert.strictEqual(result.skippedInvalidResourceRows, true);
        assert.strictEqual(
            result.assemblyWarnings.filter((warning) => warning === INVALID_RESOURCE_ROW_WARNING).length,
            1
        );
        assert.match(outputChannel._getContent(), /\[WARNING\] crd_flat graph assembly:/);
        assert.match(outputChannel._getContent(), /missing kind or name/);
    });
});
