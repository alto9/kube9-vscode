import * as assert from 'assert';
import type { ArgoCDApplication } from '../../../types/argocd';
import {
    buildApplicationRootNodeId,
    buildGraphEdgeId,
    buildManagedResourceNodeId,
    type ApplicationKey
} from '../../../types/applicationResourceGraph';
import { buildOwnerRefApplicationResourceGraph } from '../../../services/ApplicationResourceGraphAssembler';

function sampleApplication(resources: ArgoCDApplication['resources']): ArgoCDApplication {
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
        resources
    };
}

function applicationKey(): ApplicationKey {
    return { context: 'minikube', namespace: 'argocd', name: 'guestbook' };
}

suite('ApplicationResourceGraphAssembler owner-reference', () => {
    test('infers owns edges among managed nodes and manages orphans', () => {
        const application = sampleApplication([
            {
                kind: 'Deployment',
                name: 'guestbook-ui',
                namespace: 'guestbook',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            },
            {
                kind: 'ReplicaSet',
                name: 'guestbook-ui-abc',
                namespace: 'guestbook',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            },
            {
                kind: 'Pod',
                name: 'guestbook-ui-abc-xyz',
                namespace: 'guestbook',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            }
        ]);

        const deploymentId = buildManagedResourceNodeId({
            namespace: 'guestbook',
            kind: 'Deployment',
            name: 'guestbook-ui'
        });
        const replicaSetId = buildManagedResourceNodeId({
            namespace: 'guestbook',
            kind: 'ReplicaSet',
            name: 'guestbook-ui-abc'
        });
        const podId = buildManagedResourceNodeId({
            namespace: 'guestbook',
            kind: 'Pod',
            name: 'guestbook-ui-abc-xyz'
        });
        const rootId = buildApplicationRootNodeId(application.namespace, application.name);

        const result = buildOwnerRefApplicationResourceGraph({
            application,
            applicationKey: applicationKey(),
            ownerRefsByResource: [
                {
                    resourceKey: { namespace: 'guestbook', kind: 'Deployment', name: 'guestbook-ui' },
                    ownerReferences: []
                },
                {
                    resourceKey: { namespace: 'guestbook', kind: 'ReplicaSet', name: 'guestbook-ui-abc' },
                    ownerReferences: [
                        {
                            apiVersion: 'apps/v1',
                            kind: 'Deployment',
                            name: 'guestbook-ui',
                            controller: true
                        }
                    ]
                },
                {
                    resourceKey: { namespace: 'guestbook', kind: 'Pod', name: 'guestbook-ui-abc-xyz' },
                    ownerReferences: [
                        {
                            apiVersion: 'apps/v1',
                            kind: 'ReplicaSet',
                            name: 'guestbook-ui-abc',
                            controller: true
                        }
                    ]
                }
            ]
        });

        assert.ok(result);
        const { graph } = result!;
        assert.strictEqual(graph.topologySource, 'kubernetes_owner_ref');
        assert.strictEqual(graph.topologyMode, 'limited');
        assert.strictEqual(graph.nodes.length, 4);

        assert.ok(
            graph.edges.some(
                (edge) =>
                    edge.source === deploymentId &&
                    edge.target === replicaSetId &&
                    edge.relationship === 'owns'
            )
        );
        assert.ok(
            graph.edges.some(
                (edge) =>
                    edge.source === replicaSetId &&
                    edge.target === podId &&
                    edge.relationship === 'owns'
            )
        );
        assert.ok(
            graph.edges.some(
                (edge) =>
                    edge.source === rootId &&
                    edge.target === deploymentId &&
                    edge.relationship === 'manages'
            )
        );
        assert.strictEqual(
            graph.edges.filter((edge) => edge.relationship === 'owns').length,
            2
        );
    });

    test('falls back to null when owner is outside the managed set and no owns edges exist', () => {
        const application = sampleApplication([
            {
                kind: 'Service',
                name: 'guestbook-ui',
                namespace: 'guestbook',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            }
        ]);

        const result = buildOwnerRefApplicationResourceGraph({
            application,
            applicationKey: applicationKey(),
            ownerRefsByResource: [
                {
                    resourceKey: { namespace: 'guestbook', kind: 'Service', name: 'guestbook-ui' },
                    ownerReferences: [
                        {
                            apiVersion: 'apps/v1',
                            kind: 'Deployment',
                            name: 'missing-deployment',
                            controller: true
                        }
                    ]
                }
            ]
        });

        assert.strictEqual(result, null);
    });

    test('uses manages fallback for orphans when other owns edges exist', () => {
        const application = sampleApplication([
            {
                kind: 'Deployment',
                name: 'guestbook-ui',
                namespace: 'guestbook',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            },
            {
                kind: 'Service',
                name: 'guestbook-ui',
                namespace: 'guestbook',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            }
        ]);

        const deploymentId = buildManagedResourceNodeId({
            namespace: 'guestbook',
            kind: 'Deployment',
            name: 'guestbook-ui'
        });
        const serviceId = buildManagedResourceNodeId({
            namespace: 'guestbook',
            kind: 'Service',
            name: 'guestbook-ui'
        });
        const rootId = buildApplicationRootNodeId(application.namespace, application.name);

        const result = buildOwnerRefApplicationResourceGraph({
            application,
            applicationKey: applicationKey(),
            ownerRefsByResource: [
                {
                    resourceKey: { namespace: 'guestbook', kind: 'Deployment', name: 'guestbook-ui' },
                    ownerReferences: []
                },
                {
                    resourceKey: { namespace: 'guestbook', kind: 'Service', name: 'guestbook-ui' },
                    ownerReferences: [
                        {
                            apiVersion: 'apps/v1',
                            kind: 'Deployment',
                            name: 'guestbook-ui',
                            controller: true
                        }
                    ]
                }
            ]
        });

        assert.ok(result);
        const { graph } = result!;
        assert.ok(
            graph.edges.some(
                (edge) =>
                    edge.source === deploymentId &&
                    edge.target === serviceId &&
                    edge.relationship === 'owns'
            )
        );
        assert.ok(
            graph.edges.some(
                (edge) =>
                    edge.source === rootId &&
                    edge.target === deploymentId &&
                    edge.relationship === 'manages'
            )
        );
    });

    test('suppresses duplicate owns edges', () => {
        const application = sampleApplication([
            {
                kind: 'Deployment',
                name: 'guestbook-ui',
                namespace: 'guestbook',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            },
            {
                kind: 'ReplicaSet',
                name: 'guestbook-ui-abc',
                namespace: 'guestbook',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            }
        ]);

        const deploymentId = buildManagedResourceNodeId({
            namespace: 'guestbook',
            kind: 'Deployment',
            name: 'guestbook-ui'
        });
        const replicaSetId = buildManagedResourceNodeId({
            namespace: 'guestbook',
            kind: 'ReplicaSet',
            name: 'guestbook-ui-abc'
        });

        const result = buildOwnerRefApplicationResourceGraph({
            application,
            applicationKey: applicationKey(),
            ownerRefsByResource: [
                {
                    resourceKey: { namespace: 'guestbook', kind: 'Deployment', name: 'guestbook-ui' },
                    ownerReferences: []
                },
                {
                    resourceKey: { namespace: 'guestbook', kind: 'ReplicaSet', name: 'guestbook-ui-abc' },
                    ownerReferences: [
                        {
                            apiVersion: 'apps/v1',
                            kind: 'Deployment',
                            name: 'guestbook-ui',
                            controller: true
                        },
                        {
                            apiVersion: 'apps/v1',
                            kind: 'Deployment',
                            name: 'guestbook-ui',
                            controller: false
                        }
                    ]
                }
            ]
        });

        assert.ok(result);
        const duplicateOwns = result!.graph.edges.filter(
            (edge) =>
                edge.source === deploymentId &&
                edge.target === replicaSetId &&
                edge.relationship === 'owns'
        );
        assert.strictEqual(duplicateOwns.length, 1);
        assert.strictEqual(
            duplicateOwns[0].id,
            buildGraphEdgeId(deploymentId, replicaSetId, 'owns')
        );
    });

    test('returns null when all reads are empty and no owns edges can be inferred', () => {
        const application = sampleApplication([
            {
                kind: 'ConfigMap',
                name: 'guestbook-config',
                namespace: 'guestbook',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            }
        ]);

        const result = buildOwnerRefApplicationResourceGraph({
            application,
            applicationKey: applicationKey(),
            ownerRefsByResource: []
        });

        assert.strictEqual(result, null);
    });

    test('preserves baseline node ids from crd_flat assembly', () => {
        const application = sampleApplication([
            {
                kind: 'Deployment',
                name: 'guestbook-ui',
                namespace: 'guestbook',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            },
            {
                kind: 'ReplicaSet',
                name: 'guestbook-ui-abc',
                namespace: 'guestbook',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            }
        ]);

        const deploymentId = buildManagedResourceNodeId({
            namespace: 'guestbook',
            kind: 'Deployment',
            name: 'guestbook-ui'
        });
        const replicaSetId = buildManagedResourceNodeId({
            namespace: 'guestbook',
            kind: 'ReplicaSet',
            name: 'guestbook-ui-abc'
        });

        const result = buildOwnerRefApplicationResourceGraph({
            application,
            applicationKey: applicationKey(),
            ownerRefsByResource: [
                {
                    resourceKey: { namespace: 'guestbook', kind: 'ReplicaSet', name: 'guestbook-ui-abc' },
                    ownerReferences: [
                        {
                            apiVersion: 'apps/v1',
                            kind: 'Deployment',
                            name: 'guestbook-ui',
                            controller: true
                        }
                    ]
                }
            ]
        });

        assert.ok(result);
        const nodeIds = result!.graph.nodes.map((node) => node.id);
        assert.ok(nodeIds.includes(deploymentId));
        assert.ok(nodeIds.includes(replicaSetId));
    });

    test('assembles partial owner-ref topology when some reads are missing', () => {
        const application = sampleApplication([
            {
                kind: 'Deployment',
                name: 'guestbook-ui',
                namespace: 'guestbook',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            },
            {
                kind: 'ReplicaSet',
                name: 'guestbook-ui-abc',
                namespace: 'guestbook',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            },
            {
                kind: 'Pod',
                name: 'guestbook-ui-abc-xyz',
                namespace: 'guestbook',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            }
        ]);

        const deploymentId = buildManagedResourceNodeId({
            namespace: 'guestbook',
            kind: 'Deployment',
            name: 'guestbook-ui'
        });
        const replicaSetId = buildManagedResourceNodeId({
            namespace: 'guestbook',
            kind: 'ReplicaSet',
            name: 'guestbook-ui-abc'
        });
        const podId = buildManagedResourceNodeId({
            namespace: 'guestbook',
            kind: 'Pod',
            name: 'guestbook-ui-abc-xyz'
        });
        const rootId = buildApplicationRootNodeId(application.namespace, application.name);

        const result = buildOwnerRefApplicationResourceGraph({
            application,
            applicationKey: applicationKey(),
            ownerRefsByResource: [
                {
                    resourceKey: { namespace: 'guestbook', kind: 'ReplicaSet', name: 'guestbook-ui-abc' },
                    ownerReferences: [
                        {
                            apiVersion: 'apps/v1',
                            kind: 'Deployment',
                            name: 'guestbook-ui',
                            controller: true
                        }
                    ]
                }
            ]
        });

        assert.ok(result);
        assert.strictEqual(result!.graph.topologySource, 'kubernetes_owner_ref');
        assert.ok(
            result!.graph.edges.some(
                (edge) => edge.source === rootId && edge.target === podId && edge.relationship === 'manages'
            )
        );
        assert.ok(
            result!.graph.edges.some(
                (edge) =>
                    edge.source === deploymentId &&
                    edge.target === replicaSetId &&
                    edge.relationship === 'owns'
            )
        );
    });
});
