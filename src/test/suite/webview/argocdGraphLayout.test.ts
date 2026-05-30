import * as assert from 'assert';
import {
    buildApplicationRootNodeId,
    buildGraphEdgeId,
    buildManagedResourceNodeId,
    computeStructureVersion,
    type ApplicationResourceGraph,
    type ResourceGraphEdge,
    type ResourceGraphNode
} from '../../../types/applicationResourceGraph';
import { applyGraphLayout } from '../../../webview/argocd-application/graph/applyDagreLayout';
import { applyTierFallbackLayout } from '../../../webview/argocd-application/graph/applyTierFallbackLayout';
import { mapGraphDtoToFlow } from '../../../webview/argocd-application/graph/mapGraphDtoToFlow';
import {
    createEmptyLayoutCache,
    mergeGraphFlowState
} from '../../../webview/argocd-application/graph/mergeGraphFlowState';
import { applyNodeSelection, resolveSelectionAfterMerge } from '../../../webview/argocd-application/graph/graphSelection';
import {
    applicationKeyChanged,
    shouldPreserveViewport
} from '../../../webview/argocd-application/graph/viewportCache';

function rootNode(): ResourceGraphNode {
    return {
        id: buildApplicationRootNodeId('argocd', 'guestbook'),
        role: 'application',
        resourceKey: null,
        status: { syncStatus: 'Synced', healthStatus: 'Healthy' },
        label: 'guestbook',
        kindLabel: 'Application'
    };
}

function managedNode(name: string): ResourceGraphNode {
    const resourceKey = { namespace: 'guestbook', kind: 'Deployment', name };
    return {
        id: buildManagedResourceNodeId(resourceKey),
        role: 'managed_resource',
        resourceKey,
        status: { syncStatus: 'Synced', healthStatus: 'Healthy' },
        label: name,
        kindLabel: 'Deployment'
    };
}

function starGraph(): ApplicationResourceGraph {
    const nodes = [rootNode(), managedNode('ui'), managedNode('redis')];
    const edges: ResourceGraphEdge[] = nodes
        .filter((node) => node.role === 'managed_resource')
        .map((node) => ({
            id: buildGraphEdgeId(nodes[0].id, node.id, 'manages'),
            source: nodes[0].id,
            target: node.id,
            relationship: 'manages'
        }));

    return {
        applicationKey: { context: 'minikube', namespace: 'argocd', name: 'guestbook' },
        nodes,
        edges,
        topologySource: 'crd_flat',
        topologyMode: 'limited',
        structureVersion: computeStructureVersion({ nodes, edges }),
        observedAt: '2026-05-27T00:00:00.000Z'
    };
}

suite('argocd graph layout', () => {
    test('dagre assigns left-to-right ranks for acyclic star graph', () => {
        const graph = starGraph();
        const { nodes, edges } = mapGraphDtoToFlow(graph);
        const layouted = applyGraphLayout(nodes, edges);
        const root = layouted.find((node) => node.data.dto.role === 'application');
        const managed = layouted.filter((node) => node.data.dto.role === 'managed_resource');

        assert.ok(root);
        assert.strictEqual(managed.length, 2);
        for (const node of managed) {
            assert.ok(node.position.x > root!.position.x, `${node.id} should be right of root`);
        }
    });

    test('structureVersion unchanged merge retains node ids and positions', () => {
        const graph = starGraph();
        const first = mergeGraphFlowState({
            graph,
            cache: createEmptyLayoutCache()
        });
        const movedPositions = new Map(first.cache.positions);
        for (const [id, position] of movedPositions.entries()) {
            movedPositions.set(id, { x: position.x + 100, y: position.y + 50 });
        }

        const updatedGraph: ApplicationResourceGraph = {
            ...graph,
            observedAt: '2026-05-27T00:00:01.000Z',
            nodes: graph.nodes.map((node) => ({
                ...node,
                status: {
                    ...node.status,
                    syncStatus: node.role === 'managed_resource' ? 'OutOfSync' : node.status.syncStatus
                }
            }))
        };

        const second = mergeGraphFlowState({
            graph: updatedGraph,
            cache: {
                ...first.cache,
                positions: movedPositions
            }
        });

        assert.strictEqual(second.relayouted, false);
        assert.deepStrictEqual(
            second.nodes.map((node) => node.id).sort(),
            first.nodes.map((node) => node.id).sort()
        );
        for (const node of second.nodes) {
            const expected = movedPositions.get(node.id);
            assert.ok(expected);
            assert.deepStrictEqual(node.position, expected);
            if (node.data.dto.role === 'managed_resource') {
                assert.strictEqual(node.data.dto.status.syncStatus, 'OutOfSync');
            }
        }
    });

    test('structureVersion change does not auto-fit without explicit fit', () => {
        const graph = starGraph();
        const first = mergeGraphFlowState({
            graph,
            cache: createEmptyLayoutCache()
        });
        assert.strictEqual(first.shouldAutoFit, true);

        const extraNode = managedNode('api');
        const expandedNodes = [...graph.nodes, extraNode];
        const expandedEdges = [
            ...graph.edges,
            {
                id: buildGraphEdgeId(graph.nodes[0].id, extraNode.id, 'manages'),
                source: graph.nodes[0].id,
                target: extraNode.id,
                relationship: 'manages' as const
            }
        ];
        const structuralGraph: ApplicationResourceGraph = {
            ...graph,
            nodes: expandedNodes,
            edges: expandedEdges,
            structureVersion: computeStructureVersion({ nodes: expandedNodes, edges: expandedEdges })
        };

        const second = mergeGraphFlowState({
            graph: structuralGraph,
            cache: first.cache
        });

        assert.strictEqual(second.relayouted, true);
        assert.strictEqual(second.shouldAutoFit, false);
    });

    test('resolveSelectionAfterMerge keeps id when present and clears when removed', () => {
        const ids = new Set(['a', 'b']);
        assert.strictEqual(resolveSelectionAfterMerge('b', ids), 'b');
        assert.strictEqual(resolveSelectionAfterMerge('c', ids), null);
        assert.strictEqual(resolveSelectionAfterMerge(null, ids), null);
    });

    test('applyNodeSelection marks only the selected tile', () => {
        const graph = starGraph();
        const { nodes } = mapGraphDtoToFlow(graph);
        const managedId = nodes.find((node) => node.data.dto.role === 'managed_resource')!.id;
        const selected = applyNodeSelection(nodes, managedId);
        assert.strictEqual(selected.filter((node) => node.selected).length, 1);
        assert.strictEqual(selected.find((node) => node.selected)?.id, managedId);
    });

    test('shouldPreserveViewport follows attribute-only merge rules', () => {
        const viewport = { x: 10, y: 20, zoom: 1.5 };
        assert.strictEqual(
            shouldPreserveViewport({
                applicationKeyChanged: false,
                shouldAutoFit: false,
                explicitFitView: false,
                cachedViewport: viewport
            }),
            true
        );
        assert.strictEqual(
            shouldPreserveViewport({
                applicationKeyChanged: false,
                shouldAutoFit: true,
                explicitFitView: false,
                cachedViewport: viewport
            }),
            false
        );
        assert.strictEqual(
            shouldPreserveViewport({
                applicationKeyChanged: true,
                shouldAutoFit: false,
                explicitFitView: false,
                cachedViewport: viewport
            }),
            false
        );
    });

    test('applicationKeyChanged detects context switch', () => {
        const graph = starGraph();
        const key = graph.applicationKey;
        assert.strictEqual(applicationKeyChanged(null, key), false);
        assert.strictEqual(applicationKeyChanged('minikube:argocd:guestbook', key), false);
        assert.strictEqual(
            applicationKeyChanged('minikube:argocd:guestbook', {
                ...key,
                name: 'other-app'
            }),
            true
        );
    });

    test('cycle fallback produces finite positions without throwing', () => {
        const nodes = [rootNode(), managedNode('a'), managedNode('b')];
        const edges: ResourceGraphEdge[] = [
            {
                id: buildGraphEdgeId(nodes[0].id, nodes[1].id, 'manages'),
                source: nodes[0].id,
                target: nodes[1].id,
                relationship: 'manages'
            },
            {
                id: buildGraphEdgeId(nodes[1].id, nodes[2].id, 'depends_on'),
                source: nodes[1].id,
                target: nodes[2].id,
                relationship: 'depends_on'
            },
            {
                id: buildGraphEdgeId(nodes[2].id, nodes[1].id, 'depends_on'),
                source: nodes[2].id,
                target: nodes[1].id,
                relationship: 'depends_on'
            }
        ];

        const { nodes: flowNodes, edges: flowEdges } = mapGraphDtoToFlow({
            ...starGraph(),
            nodes,
            edges,
            structureVersion: computeStructureVersion({ nodes, edges })
        });

        const layouted = applyTierFallbackLayout(flowNodes, flowEdges);
        assert.strictEqual(layouted.length, 3);
        for (const node of layouted) {
            assert.ok(Number.isFinite(node.position.x));
            assert.ok(Number.isFinite(node.position.y));
        }
    });
});
