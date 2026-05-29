import * as assert from 'assert';
import type { ArgoCDApplication } from '../../../types/argocd';
import {
    buildApplicationRootNodeId,
    buildGraphEdgeId,
    buildManagedResourceNodeId,
    type ApplicationKey
} from '../../../types/applicationResourceGraph';
import { buildResourceTreeApplicationResourceGraph } from '../../../services/ApplicationResourceGraphAssembler';

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
            },
            {
                kind: 'Service',
                name: 'guestbook-ui',
                namespace: 'guestbook',
                syncStatus: 'Synced',
                healthStatus: 'Healthy'
            }
        ]
    };
}

function applicationKey(): ApplicationKey {
    return { context: 'minikube', namespace: 'argocd', name: 'guestbook' };
}

suite('ApplicationResourceGraphAssembler resource-tree', () => {
    test('maps parentRefs into owns edges and sets full topology metadata', () => {
        const application = sampleApplication();
        const rootId = buildApplicationRootNodeId(application.namespace, application.name);
        const deploymentKey = { namespace: 'guestbook', kind: 'Deployment', name: 'guestbook-ui', apiGroup: 'apps' };
        const deploymentId = buildManagedResourceNodeId(deploymentKey);
        const serviceId = buildManagedResourceNodeId({ namespace: 'guestbook', kind: 'Service', name: 'guestbook-ui' });

        const { graph } = buildResourceTreeApplicationResourceGraph({
            application,
            applicationKey: applicationKey(),
            resourceTree: {
                nodes: [
                    {
                        group: 'apps',
                        kind: 'Deployment',
                        namespace: 'guestbook',
                        name: 'guestbook-ui',
                        parentRefs: [
                            {
                                group: 'argoproj.io',
                                kind: 'Application',
                                name: 'guestbook',
                                namespace: 'argocd'
                            }
                        ],
                        health: { status: 'Healthy' }
                    },
                    {
                        group: '',
                        kind: 'Service',
                        namespace: 'guestbook',
                        name: 'guestbook-ui',
                        parentRefs: [
                            {
                                group: 'apps',
                                kind: 'Deployment',
                                namespace: 'guestbook',
                                name: 'guestbook-ui'
                            }
                        ],
                        health: { status: 'Healthy' }
                    }
                ]
            }
        });

        assert.strictEqual(graph.topologySource, 'argocd_resource_tree');
        assert.strictEqual(graph.topologyMode, 'full');
        assert.strictEqual(graph.nodes.length, 3);

        const managesEdge = graph.edges.find(
            (edge) => edge.source === rootId && edge.target === deploymentId && edge.relationship === 'manages'
        );
        assert.ok(managesEdge, 'expected Application root manages Deployment');

        const ownsEdge = graph.edges.find(
            (edge) =>
                edge.source === deploymentId &&
                edge.target === serviceId &&
                edge.relationship === 'owns' &&
                edge.id === buildGraphEdgeId(deploymentId, serviceId, 'owns')
        );
        assert.ok(ownsEdge, 'expected Deployment owns Service from parentRefs');
    });

    test('enriches node status from Application CRD resources when available', () => {
        const application = sampleApplication();
        application.resources[0].syncStatus = 'OutOfSync';
        application.resources[0].healthStatus = 'Degraded';
        application.resources[0].message = 'deployment out of sync';

        const { graph } = buildResourceTreeApplicationResourceGraph({
            application,
            applicationKey: applicationKey(),
            resourceTree: {
                nodes: [
                    {
                        group: 'apps',
                        kind: 'Deployment',
                        namespace: 'guestbook',
                        name: 'guestbook-ui',
                        parentRefs: [],
                        health: { status: 'Healthy' }
                    }
                ]
            }
        });

        const deploymentNode = graph.nodes.find((node) => node.resourceKey?.kind === 'Deployment');
        assert.ok(deploymentNode);
        assert.strictEqual(deploymentNode.status.syncStatus, 'OutOfSync');
        assert.strictEqual(deploymentNode.status.healthStatus, 'Degraded');
        assert.strictEqual(deploymentNode.status.message, 'deployment out of sync');
    });

    test('skips duplicate Application node from resource-tree while preserving root identity', () => {
        const application = sampleApplication();
        const rootId = buildApplicationRootNodeId(application.namespace, application.name);

        const { graph } = buildResourceTreeApplicationResourceGraph({
            application,
            applicationKey: applicationKey(),
            resourceTree: {
                nodes: [
                    {
                        group: 'argoproj.io',
                        kind: 'Application',
                        namespace: 'argocd',
                        name: 'guestbook'
                    },
                    {
                        group: 'apps',
                        kind: 'Deployment',
                        namespace: 'guestbook',
                        name: 'guestbook-ui',
                        parentRefs: [
                            {
                                kind: 'Application',
                                name: 'guestbook',
                                namespace: 'argocd',
                                group: 'argoproj.io'
                            }
                        ]
                    }
                ]
            }
        });

        const applicationNodes = graph.nodes.filter((node) => node.role === 'application');
        assert.strictEqual(applicationNodes.length, 1);
        assert.strictEqual(applicationNodes[0].id, rootId);
    });
});
