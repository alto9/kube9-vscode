import * as assert from 'assert';
import {
    buildApplicationRootNodeId,
    buildGraphEdgeId,
    buildManagedResourceNodeId,
    computeStructureVersion,
    managedResourceKeysEqual,
    topologyModeFromSource,
    type ResourceGraphEdge,
    type ResourceGraphNode
} from '../../../types/applicationResourceGraph';

suite('applicationResourceGraph', () => {
    test('buildApplicationRootNodeId uses app namespace/name prefix', () => {
        assert.strictEqual(buildApplicationRootNodeId('argocd', 'guestbook'), 'app:argocd/guestbook');
    });

    test('buildManagedResourceNodeId omits apiGroup suffix when unset', () => {
        assert.strictEqual(
            buildManagedResourceNodeId({ namespace: 'prod', kind: 'Deployment', name: 'api' }),
            'res:prod/Deployment/api'
        );
    });

    test('buildManagedResourceNodeId appends apiGroup when set', () => {
        assert.strictEqual(
            buildManagedResourceNodeId({
                namespace: 'prod',
                kind: 'Ingress',
                name: 'api',
                apiGroup: 'networking.k8s.io'
            }),
            'res:prod/Ingress/api/networking.k8s.io'
        );
    });

    test('buildGraphEdgeId encodes source target and relationship', () => {
        assert.strictEqual(
            buildGraphEdgeId('app:argocd/guestbook', 'res:prod/Deployment/api', 'manages'),
            'app:argocd/guestbook->res:prod/Deployment/api:manages'
        );
    });

    suite('managedResourceKeysEqual', () => {
        test('matches namespace kind and name', () => {
            assert.strictEqual(
                managedResourceKeysEqual(
                    { namespace: 'prod', kind: 'Service', name: 'api' },
                    { namespace: 'prod', kind: 'Service', name: 'api' }
                ),
                true
            );
        });

        test('requires matching apiGroup when both sides provide it', () => {
            assert.strictEqual(
                managedResourceKeysEqual(
                    { namespace: 'prod', kind: 'Ingress', name: 'api', apiGroup: 'networking.k8s.io' },
                    { namespace: 'prod', kind: 'Ingress', name: 'api', apiGroup: 'extensions' }
                ),
                false
            );
        });

        test('matches when only one side provides apiGroup', () => {
            assert.strictEqual(
                managedResourceKeysEqual(
                    { namespace: 'prod', kind: 'Deployment', name: 'api', apiGroup: 'apps' },
                    { namespace: 'prod', kind: 'Deployment', name: 'api' }
                ),
                true
            );
        });

        test('rejects mismatched core identity fields', () => {
            assert.strictEqual(
                managedResourceKeysEqual(
                    { namespace: 'prod', kind: 'Deployment', name: 'api' },
                    { namespace: 'staging', kind: 'Deployment', name: 'api' }
                ),
                false
            );
        });
    });

    suite('topologyModeFromSource', () => {
        test('maps argocd_resource_tree to full', () => {
            assert.strictEqual(topologyModeFromSource('argocd_resource_tree'), 'full');
        });

        test('maps crd_flat to limited', () => {
            assert.strictEqual(topologyModeFromSource('crd_flat'), 'limited');
        });

        test('maps kubernetes_owner_ref and operator_snapshot to limited', () => {
            assert.strictEqual(topologyModeFromSource('kubernetes_owner_ref'), 'limited');
            assert.strictEqual(topologyModeFromSource('operator_snapshot'), 'limited');
        });
    });

    suite('computeStructureVersion', () => {
        const rootId = buildApplicationRootNodeId('argocd', 'guestbook');
        const deploymentId = buildManagedResourceNodeId({
            namespace: 'prod',
            kind: 'Deployment',
            name: 'api'
        });

        const baseNodes: ResourceGraphNode[] = [
            {
                id: rootId,
                role: 'application',
                resourceKey: null,
                status: { syncStatus: 'Synced', healthStatus: 'Healthy' },
                label: 'guestbook',
                kindLabel: 'Application'
            },
            {
                id: deploymentId,
                role: 'managed_resource',
                resourceKey: { namespace: 'prod', kind: 'Deployment', name: 'api' },
                status: { syncStatus: 'Synced', healthStatus: 'Healthy' },
                label: 'api',
                kindLabel: 'Deployment'
            }
        ];

        const baseEdges: ResourceGraphEdge[] = [
            {
                id: buildGraphEdgeId(rootId, deploymentId, 'manages'),
                source: rootId,
                target: deploymentId,
                relationship: 'manages'
            }
        ];

        test('is deterministic for the same topology', () => {
            const first = computeStructureVersion({ nodes: baseNodes, edges: baseEdges });
            const second = computeStructureVersion({ nodes: baseNodes, edges: baseEdges });
            assert.strictEqual(first, second);
        });

        test('is unchanged when only node status changes', () => {
            const statusOnlyChange: ResourceGraphNode[] = baseNodes.map((node) =>
                node.role === 'managed_resource'
                    ? {
                          ...node,
                          status: { syncStatus: 'OutOfSync', healthStatus: 'Degraded', message: 'drift' },
                          label: 'api-renamed'
                      }
                    : node
            );

            assert.strictEqual(
                computeStructureVersion({ nodes: statusOnlyChange, edges: baseEdges }),
                computeStructureVersion({ nodes: baseNodes, edges: baseEdges })
            );
        });

        test('changes when a node id is added', () => {
            const withExtraNode: ResourceGraphNode[] = [
                ...baseNodes,
                {
                    id: buildManagedResourceNodeId({ namespace: 'prod', kind: 'Service', name: 'api' }),
                    role: 'managed_resource',
                    resourceKey: { namespace: 'prod', kind: 'Service', name: 'api' },
                    status: { syncStatus: 'Synced', healthStatus: 'Healthy' },
                    label: 'api',
                    kindLabel: 'Service'
                }
            ];

            assert.notStrictEqual(
                computeStructureVersion({ nodes: withExtraNode, edges: baseEdges }),
                computeStructureVersion({ nodes: baseNodes, edges: baseEdges })
            );
        });

        test('changes when an edge endpoint pair changes', () => {
            const serviceId = buildManagedResourceNodeId({ namespace: 'prod', kind: 'Service', name: 'api' });
            const extraEdge: ResourceGraphEdge[] = [
                ...baseEdges,
                {
                    id: buildGraphEdgeId(deploymentId, serviceId, 'depends_on'),
                    source: deploymentId,
                    target: serviceId,
                    relationship: 'depends_on'
                }
            ];

            assert.notStrictEqual(
                computeStructureVersion({ nodes: baseNodes, edges: extraEdge }),
                computeStructureVersion({ nodes: baseNodes, edges: baseEdges })
            );
        });

        test('ignores edge relationship when endpoints are unchanged', () => {
            const relationshipOnlyChange: ResourceGraphEdge[] = baseEdges.map((edge) => ({
                ...edge,
                relationship: 'owns',
                id: buildGraphEdgeId(edge.source, edge.target, 'owns')
            }));

            assert.strictEqual(
                computeStructureVersion({ nodes: baseNodes, edges: relationshipOnlyChange }),
                computeStructureVersion({ nodes: baseNodes, edges: baseEdges })
            );
        });
    });
});
