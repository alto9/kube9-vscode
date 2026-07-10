import * as assert from 'assert';
import {
    buildApplicationRootNodeId,
    computeStructureVersion,
    type ApplicationResourceGraph,
    type ResourceGraphNode
} from '../../../types/applicationResourceGraph';
import { applyGraphLayout } from '../../../webview/argocd-application/graph/applyDagreLayout';
import {
    GRAPH_NODE_HEIGHT,
    GRAPH_NODE_SEP,
    GRAPH_NODE_WIDTH,
    GRAPH_RANK_SEP
} from '../../../webview/argocd-application/graph/constants';
import { applyNodeSelection, resolveSelectionAfterMerge } from '../../../webview/argocd-application/graph/graphSelection';
import {
    collectMappedDtoNodeIds,
    createEmptyLayoutCache,
    mergeGraphFlowState
} from '../../../webview/argocd-application/graph/mergeGraphFlowState';
import { buildKindGroupNodeId } from '../../../webview/argocd-application/graph/applyKindGrouping';
import {
    applicationKeyChanged,
    shouldPreserveViewport,
    type GraphViewport
} from '../../../webview/argocd-application/graph/viewportCache';

const APPLICATION_KEY = { context: 'minikube', namespace: 'argocd', name: 'guestbook' };

function rootNode(overrides: Partial<ResourceGraphNode> = {}): ResourceGraphNode {
    return {
        id: buildApplicationRootNodeId('argocd', 'guestbook'),
        role: 'application',
        resourceKey: null,
        status: { syncStatus: 'Synced', healthStatus: 'Healthy' },
        label: 'guestbook',
        kindLabel: 'Application',
        ...overrides
    };
}

function managedNode(id = 'res:guestbook/Deployment/ui'): ResourceGraphNode {
    return {
        id,
        role: 'managed_resource',
        resourceKey: { namespace: 'guestbook', kind: 'Deployment', name: 'ui' },
        status: { syncStatus: 'Synced', healthStatus: 'Healthy' },
        label: 'ui',
        kindLabel: 'Deployment'
    };
}

function sampleGraph(overrides: Partial<ApplicationResourceGraph> = {}): ApplicationResourceGraph {
    const root = rootNode();
    const managed = managedNode();
    const nodes = [root, managed];
    const edges = [
        {
            id: `${root.id}->${managed.id}:manages`,
            source: root.id,
            target: managed.id,
            relationship: 'manages' as const
        }
    ];

    return {
        applicationKey: APPLICATION_KEY,
        nodes,
        edges,
        topologySource: 'crd_flat',
        topologyMode: 'limited',
        structureVersion: computeStructureVersion({ nodes, edges }),
        observedAt: '2026-05-28T00:00:00.000Z',
        ...overrides
    };
}

function largeSampleGraph(): ApplicationResourceGraph {
    const root = rootNode({ label: 'large-app' });
    const managed = Array.from({ length: 45 }, (_, index) =>
        managedNode(`res:guestbook/Deployment/app-${index}`)
    );
    const nodes = [root, ...managed];
    const edges = managed.map((node) => ({
        id: `${root.id}->${node.id}:manages`,
        source: root.id,
        target: node.id,
        relationship: 'manages' as const
    }));

    return sampleGraph({
        nodes,
        edges,
        structureVersion: computeStructureVersion({ nodes, edges })
    });
}

suite('argocd graph layout', () => {
    suite('mergeGraphFlowState', () => {
        test('initial load relayouts and requests auto-fit', () => {
            const result = mergeGraphFlowState({
                graph: sampleGraph(),
                cache: createEmptyLayoutCache()
            });

            assert.strictEqual(result.relayouted, true);
            assert.strictEqual(result.shouldAutoFit, true);
            assert.ok(result.nodes.length >= 2);
        });

        test('retains positions on attribute-only ticks with matching structureVersion', () => {
            const initial = mergeGraphFlowState({
                graph: sampleGraph(),
                cache: createEmptyLayoutCache()
            });

            const statusTick = sampleGraph({
                observedAt: '2026-05-28T00:00:01.000Z',
                nodes: [
                    rootNode({
                        status: { syncStatus: 'OutOfSync', healthStatus: 'Degraded', message: 'app drift' }
                    }),
                    managedNode('res:guestbook/Deployment/ui')
                ]
            });

            const merged = mergeGraphFlowState({
                graph: statusTick,
                cache: initial.cache
            });

            assert.strictEqual(merged.relayouted, false);
            assert.strictEqual(merged.shouldAutoFit, false);

            for (const node of merged.nodes) {
                const prior = initial.nodes.find((candidate) => candidate.id === node.id);
                assert.ok(prior);
                assert.deepStrictEqual(node.position, prior.position);
            }
        });

        test('relayouts on structural change without auto-fit', () => {
            const initial = mergeGraphFlowState({
                graph: sampleGraph(),
                cache: createEmptyLayoutCache()
            });

            const root = rootNode();
            const deployment = managedNode('res:guestbook/Deployment/ui');
            const service = managedNode('res:guestbook/Service/ui');
            const nodes = [root, deployment, service];
            const edges = [
                {
                    id: `${root.id}->${deployment.id}:manages`,
                    source: root.id,
                    target: deployment.id,
                    relationship: 'manages' as const
                },
                {
                    id: `${root.id}->${service.id}:manages`,
                    source: root.id,
                    target: service.id,
                    relationship: 'manages' as const
                }
            ];

            const structural = sampleGraph({
                nodes,
                edges,
                structureVersion: computeStructureVersion({ nodes, edges })
            });

            const merged = mergeGraphFlowState({
                graph: structural,
                cache: initial.cache
            });

            assert.strictEqual(merged.relayouted, true);
            assert.strictEqual(merged.shouldAutoFit, false);
        });

        test('relayouts when topologySource changes even if structureVersion matches', () => {
            const initial = mergeGraphFlowState({
                graph: sampleGraph(),
                cache: createEmptyLayoutCache()
            });

            const topologyUpgrade = sampleGraph({
                topologySource: 'argocd_resource_tree',
                topologyMode: 'full',
                structureVersion: initial.cache.structureVersion!
            });

            const merged = mergeGraphFlowState({
                graph: topologyUpgrade,
                cache: initial.cache
            });

            assert.strictEqual(merged.relayouted, true);
            assert.strictEqual(merged.shouldAutoFit, false);
        });

        test('explicit fit-view relayouts and requests auto-fit', () => {
            const initial = mergeGraphFlowState({
                graph: sampleGraph(),
                cache: createEmptyLayoutCache()
            });

            const merged = mergeGraphFlowState({
                graph: sampleGraph({ observedAt: '2026-05-28T00:00:02.000Z' }),
                cache: initial.cache,
                explicitFitView: true
            });

            assert.strictEqual(merged.relayouted, true);
            assert.strictEqual(merged.shouldAutoFit, true);
        });

        test('group expand/collapse relayouts without auto-fit', () => {
            const graph = largeSampleGraph();
            const initial = mergeGraphFlowState({
                graph,
                cache: createEmptyLayoutCache()
            });

            const expanded = mergeGraphFlowState({
                graph,
                cache: initial.cache,
                expandedKinds: new Set(['Deployment']),
                groupPresentationChanged: true
            });

            assert.strictEqual(expanded.relayouted, true);
            assert.strictEqual(expanded.shouldAutoFit, false);
        });
    });

    suite('layout constants', () => {
        test('dagre layout constants match 220x72 tile box with ranksep 96 and nodesep 48', () => {
            assert.strictEqual(GRAPH_NODE_WIDTH, 220);
            assert.strictEqual(GRAPH_NODE_HEIGHT, 72);
            assert.strictEqual(GRAPH_RANK_SEP, 96);
            assert.strictEqual(GRAPH_NODE_SEP, 48);
        });

        test('star graph ranks managed nodes to the right of application root', () => {
            const root = rootNode();
            const deployment = managedNode('res:guestbook/Deployment/ui');
            const service = managedNode('res:guestbook/Service/ui');
            const nodes = [
                {
                    id: root.id,
                    type: 'resourceGraph' as const,
                    position: { x: 0, y: 0 },
                    data: { dto: root },
                    draggable: false,
                    selectable: true
                },
                {
                    id: deployment.id,
                    type: 'resourceGraph' as const,
                    position: { x: 0, y: 0 },
                    data: { dto: deployment },
                    draggable: false,
                    selectable: true
                },
                {
                    id: service.id,
                    type: 'resourceGraph' as const,
                    position: { x: 0, y: 0 },
                    data: { dto: service },
                    draggable: false,
                    selectable: true
                }
            ];
            const edges = [
                {
                    id: `${root.id}->${deployment.id}:manages`,
                    source: root.id,
                    target: deployment.id
                },
                {
                    id: `${root.id}->${service.id}:manages`,
                    source: root.id,
                    target: service.id
                }
            ];

            const laidOut = applyGraphLayout(nodes, edges);
            const rootPosition = laidOut.find((node) => node.id === root.id)!.position;
            const managedPositions = laidOut
                .filter((node) => node.id !== root.id)
                .map((node) => node.position.x);

            for (const managedX of managedPositions) {
                assert.ok(managedX > rootPosition.x);
            }
        });
    });

    suite('graphSelection', () => {
        test('preserves selection when node id survives merge', () => {
            const nodeIds = new Set(['app:argocd/guestbook', 'res:guestbook/Deployment/ui']);
            assert.strictEqual(
                resolveSelectionAfterMerge('res:guestbook/Deployment/ui', nodeIds),
                'res:guestbook/Deployment/ui'
            );
        });

        test('clears selection when previously selected node id is absent from DTO', () => {
            const nodeIds = new Set(['app:argocd/guestbook']);
            assert.strictEqual(resolveSelectionAfterMerge('res:guestbook/Deployment/ui', nodeIds), null);
        });

        test('preserves selection when node is hidden in collapsed kind group but still in DTO', () => {
            const graph = largeSampleGraph();
            const dtoNodeIds = collectMappedDtoNodeIds(graph);
            const selectedId = 'res:guestbook/Deployment/app-0';
            const collapsedVisibleIds = new Set([
                buildApplicationRootNodeId('argocd', 'guestbook'),
                buildKindGroupNodeId('Deployment')
            ]);

            assert.strictEqual(
                resolveSelectionAfterMerge(selectedId, collapsedVisibleIds, dtoNodeIds),
                selectedId
            );
        });

        test('applyNodeSelection marks only the selected node', () => {
            const nodes = [
                { id: 'a', position: { x: 0, y: 0 }, data: {} },
                { id: 'b', position: { x: 1, y: 1 }, data: {} }
            ] as Parameters<typeof applyNodeSelection>[0];

            const selected = applyNodeSelection(nodes, 'b');
            assert.strictEqual(selected.find((node) => node.id === 'a')?.selected, false);
            assert.strictEqual(selected.find((node) => node.id === 'b')?.selected, true);
        });
    });

    suite('viewportCache', () => {
        const cachedViewport: GraphViewport = { x: 120, y: 40, zoom: 1.25 };

        test('preserves viewport on attribute-only refresh when cache exists', () => {
            assert.strictEqual(
                shouldPreserveViewport({
                    applicationKeyChanged: false,
                    shouldAutoFit: false,
                    explicitFitView: false,
                    cachedViewport
                }),
                true
            );
        });

        test('does not preserve viewport on application key change', () => {
            assert.strictEqual(
                shouldPreserveViewport({
                    applicationKeyChanged: true,
                    shouldAutoFit: false,
                    explicitFitView: false,
                    cachedViewport
                }),
                false
            );
        });

        test('does not preserve viewport after explicit fit-view', () => {
            assert.strictEqual(
                shouldPreserveViewport({
                    applicationKeyChanged: false,
                    shouldAutoFit: false,
                    explicitFitView: true,
                    cachedViewport
                }),
                false
            );
        });

        test('does not preserve viewport on initial auto-fit', () => {
            assert.strictEqual(
                shouldPreserveViewport({
                    applicationKeyChanged: false,
                    shouldAutoFit: true,
                    explicitFitView: false,
                    cachedViewport
                }),
                false
            );
        });

        test('applicationKeyChanged detects panel key transitions', () => {
            assert.strictEqual(applicationKeyChanged(null, APPLICATION_KEY), false);
            assert.strictEqual(applicationKeyChanged('minikube:argocd:guestbook', APPLICATION_KEY), false);
            assert.strictEqual(
                applicationKeyChanged('minikube:argocd:other-app', APPLICATION_KEY),
                true
            );
        });
    });
});
