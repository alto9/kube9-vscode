import * as assert from 'assert';
import { buildCrdFlatApplicationResourceGraph } from '../../../services/ApplicationResourceGraphAssembler';
import {
    buildApplicationRootNodeId,
    buildManagedResourceNodeId,
    computeStructureVersion,
    type ApplicationKey
} from '../../../types/applicationResourceGraph';
import type { ArgoCDApplication, ArgoCDResource } from '../../../types/argocd';

const APPLICATION_KEY: ApplicationKey = {
    context: 'minikube',
    namespace: 'argocd',
    name: 'guestbook'
};

function baseApplication(overrides: Partial<ArgoCDApplication> = {}): ArgoCDApplication {
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
        resources: [],
        ...overrides
    };
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

function serviceRow(overrides: Partial<ArgoCDResource> = {}): ArgoCDResource {
    return {
        kind: 'Service',
        name: 'guestbook-ui',
        namespace: 'guestbook',
        syncStatus: 'Synced',
        healthStatus: 'Healthy',
        ...overrides
    };
}

suite('ApplicationResourceGraphAssembler', () => {
    test('builds root, managed nodes, and manages edges for multi-resource app', () => {
        const application = baseApplication({
            resources: [deploymentRow(), serviceRow()]
        });

        const { graph } = buildCrdFlatApplicationResourceGraph({
            application,
            applicationKey: APPLICATION_KEY,
            observedAt: '2024-06-01T12:00:00.000Z'
        });

        const rootId = buildApplicationRootNodeId('argocd', 'guestbook');
        assert.strictEqual(graph.nodes.length, 3);
        assert.strictEqual(graph.edges.length, 2);
        assert.strictEqual(graph.topologySource, 'crd_flat');
        assert.strictEqual(graph.topologyMode, 'limited');
        assert.strictEqual(graph.applicationKey, APPLICATION_KEY);
        assert.strictEqual(graph.observedAt, '2024-06-01T12:00:00.000Z');

        const root = graph.nodes.find((node) => node.role === 'application');
        assert.ok(root);
        assert.strictEqual(root.id, rootId);
        assert.strictEqual(root.resourceKey, null);
        assert.strictEqual(root.kindLabel, 'Application');

        const managed = graph.nodes.filter((node) => node.role === 'managed_resource');
        assert.strictEqual(managed.length, 2);
        assert.strictEqual(
            managed[0].id,
            buildManagedResourceNodeId({ namespace: 'guestbook', kind: 'Deployment', name: 'guestbook-ui' })
        );
        assert.strictEqual(
            managed[1].id,
            buildManagedResourceNodeId({ namespace: 'guestbook', kind: 'Service', name: 'guestbook-ui' })
        );

        for (const edge of graph.edges) {
            assert.strictEqual(edge.source, rootId);
            assert.strictEqual(edge.relationship, 'manages');
            assert.strictEqual(edge.id, `${rootId}->${edge.target}:manages`);
        }
    });

    test('propagates application and managed resource status fields', () => {
        const application = baseApplication({
            syncStatus: {
                status: 'OutOfSync',
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
                status: 'Degraded',
                message: 'Application is degraded'
            },
            resources: [
                deploymentRow({
                    syncStatus: 'OutOfSync',
                    healthStatus: 'Degraded',
                    message: 'Deployment drift detected'
                })
            ]
        });

        const { graph } = buildCrdFlatApplicationResourceGraph({
            application,
            applicationKey: APPLICATION_KEY
        });

        const root = graph.nodes.find((node) => node.role === 'application');
        assert.ok(root);
        assert.strictEqual(root.status.syncStatus, 'OutOfSync');
        assert.strictEqual(root.status.healthStatus, 'Degraded');
        assert.strictEqual(root.status.message, 'Application is degraded');

        const managed = graph.nodes.find((node) => node.role === 'managed_resource');
        assert.ok(managed);
        assert.strictEqual(managed.status.syncStatus, 'OutOfSync');
        assert.strictEqual(managed.status.healthStatus, 'Degraded');
        assert.strictEqual(managed.status.message, 'Deployment drift detected');
    });

    test('returns root-only graph when resources is empty', () => {
        const { graph, assemblyWarnings } = buildCrdFlatApplicationResourceGraph({
            application: baseApplication({ resources: [] }),
            applicationKey: APPLICATION_KEY
        });

        assert.deepStrictEqual(assemblyWarnings, []);
        assert.strictEqual(graph.nodes.length, 1);
        assert.strictEqual(graph.edges.length, 0);
        assert.strictEqual(graph.topologySource, 'crd_flat');
        assert.strictEqual(
            graph.structureVersion,
            computeStructureVersion({ nodes: graph.nodes, edges: graph.edges })
        );
    });

    test('omits invalid rows missing kind or name and records warnings', () => {
        const application = baseApplication({
            resources: [
                deploymentRow(),
                { kind: '', name: 'missing-kind', namespace: 'guestbook', syncStatus: 'Synced' },
                { kind: 'Service', name: '   ', namespace: 'guestbook', syncStatus: 'Synced' }
            ]
        });

        const { graph, assemblyWarnings } = buildCrdFlatApplicationResourceGraph({
            application,
            applicationKey: APPLICATION_KEY
        });

        assert.strictEqual(graph.nodes.filter((node) => node.role === 'managed_resource').length, 1);
        assert.strictEqual(graph.edges.length, 1);
        assert.strictEqual(
            assemblyWarnings.filter((warning) => warning === 'Skipped resource row: missing kind or name').length,
            2
        );
    });

    test('keeps first duplicate managed resource key and warns deterministically', () => {
        const application = baseApplication({
            resources: [
                deploymentRow({ syncStatus: 'Synced', healthStatus: 'Healthy' }),
                deploymentRow({ syncStatus: 'OutOfSync', healthStatus: 'Degraded', message: 'duplicate' })
            ]
        });

        const { graph, assemblyWarnings } = buildCrdFlatApplicationResourceGraph({
            application,
            applicationKey: APPLICATION_KEY
        });

        assert.strictEqual(graph.nodes.filter((node) => node.role === 'managed_resource').length, 1);
        const managed = graph.nodes.find((node) => node.role === 'managed_resource');
        assert.ok(managed);
        assert.strictEqual(managed.status.syncStatus, 'Synced');
        assert.strictEqual(managed.status.healthStatus, 'Healthy');
        assert.deepStrictEqual(assemblyWarnings, [
            'Skipped duplicate managed resource: guestbook/Deployment/guestbook-ui'
        ]);
    });

    test('structureVersion changes only for structural graph changes', () => {
        const baseResources = [deploymentRow(), serviceRow()];
        const baseResult = buildCrdFlatApplicationResourceGraph({
            application: baseApplication({ resources: baseResources }),
            applicationKey: APPLICATION_KEY
        });

        const statusOnlyResult = buildCrdFlatApplicationResourceGraph({
            application: baseApplication({
                resources: baseResources.map((row) => ({
                    ...row,
                    syncStatus: 'OutOfSync',
                    healthStatus: 'Degraded'
                }))
            }),
            applicationKey: APPLICATION_KEY
        });

        const structuralResult = buildCrdFlatApplicationResourceGraph({
            application: baseApplication({
                resources: [...baseResources, deploymentRow({ name: 'guestbook-api' })]
            }),
            applicationKey: APPLICATION_KEY
        });

        assert.strictEqual(
            statusOnlyResult.graph.structureVersion,
            baseResult.graph.structureVersion
        );
        assert.notStrictEqual(
            structuralResult.graph.structureVersion,
            baseResult.graph.structureVersion
        );
    });

    test('managed node status matches corresponding ArgoCDResource row', () => {
        const resources = [
            deploymentRow({ syncStatus: 'OutOfSync', healthStatus: 'Progressing' }),
            serviceRow({ syncStatus: 'Synced', healthStatus: 'Healthy', message: 'ok' })
        ];
        const { graph } = buildCrdFlatApplicationResourceGraph({
            application: baseApplication({ resources }),
            applicationKey: APPLICATION_KEY
        });

        for (const row of resources) {
            const node = graph.nodes.find(
                (candidate) =>
                    candidate.role === 'managed_resource' &&
                    candidate.resourceKey?.kind === row.kind &&
                    candidate.resourceKey?.name === row.name &&
                    candidate.resourceKey?.namespace === row.namespace
            );
            assert.ok(node, `expected node for ${row.kind}/${row.name}`);
            assert.strictEqual(node.status.syncStatus, row.syncStatus);
            assert.strictEqual(node.status.healthStatus, row.healthStatus ?? 'Unknown');
            if (row.message) {
                assert.strictEqual(node.status.message, row.message);
            }
        }
    });
});
