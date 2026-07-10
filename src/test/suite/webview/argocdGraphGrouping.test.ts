import * as assert from 'assert';
import {
    buildApplicationRootNodeId,
    computeStructureVersion,
    type ApplicationResourceGraph,
    type ResourceGraphNode
} from '../../../types/applicationResourceGraph';
import {
    applyKindGrouping,
    buildKindGroupNodeId,
    isKindGroupingActive
} from '../../../webview/argocd-application/graph/applyKindGrouping';
import { LARGE_APP_KIND_GROUP_THRESHOLD } from '../../../webview/argocd-application/graph/constants';
import { mapGraphDtoToFlow } from '../../../webview/argocd-application/graph/mapGraphDtoToFlow';
import {
    collectMappedDtoNodeIds,
    createEmptyLayoutCache,
    mergeGraphFlowState
} from '../../../webview/argocd-application/graph/mergeGraphFlowState';
import {
    applyNodeSelection,
    resolveSelectionAfterMerge
} from '../../../webview/argocd-application/graph/graphSelection';
import {
    countManagedResourceNodes,
    shouldShowLargeAppGroupingAffordance
} from '../../../webview/argocd-application/graph/graphTopologyAffordanceRules';

const APPLICATION_KEY = { context: 'minikube', namespace: 'argocd', name: 'large-app' };

function managedNode(kind: string, name: string): ResourceGraphNode {
    return {
        id: `res:guestbook/${kind}/${name}`,
        role: 'managed_resource',
        resourceKey: { namespace: 'guestbook', kind, name },
        status: { syncStatus: 'Synced', healthStatus: 'Healthy' },
        label: name,
        kindLabel: kind
    };
}

function largeGroupedGraph(managedCount: number): ApplicationResourceGraph {
    const root: ResourceGraphNode = {
        id: buildApplicationRootNodeId('argocd', 'large-app'),
        role: 'application',
        resourceKey: null,
        status: { syncStatus: 'Synced', healthStatus: 'Healthy' },
        label: 'large-app',
        kindLabel: 'Application'
    };

    const managed: ResourceGraphNode[] = [];
    for (let index = 0; index < managedCount; index += 1) {
        const kind = index % 2 === 0 ? 'Deployment' : 'Service';
        managed.push(managedNode(kind, `resource-${index}`));
    }

    const nodes = [root, ...managed];
    const edges = managed.map((node) => ({
        id: `${root.id}->${node.id}:manages`,
        source: root.id,
        target: node.id,
        relationship: 'manages' as const
    }));

    return {
        applicationKey: APPLICATION_KEY,
        nodes,
        edges,
        topologySource: 'crd_flat',
        topologyMode: 'limited',
        structureVersion: computeStructureVersion({ nodes, edges }),
        observedAt: '2026-05-28T00:00:00.000Z'
    };
}

suite('argocd graph grouping', () => {
    test('kind grouping activates above threshold only', () => {
        assert.strictEqual(LARGE_APP_KIND_GROUP_THRESHOLD, 40);
        assert.strictEqual(isKindGroupingActive(40), false);
        assert.strictEqual(isKindGroupingActive(41), true);
    });

    test('initial grouped render shows collapsed kind groups without leaf tiles', () => {
        const graph = largeGroupedGraph(45);
        const { nodes: mappedNodes, edges } = mapGraphDtoToFlow(graph);
        const grouped = applyKindGrouping(mappedNodes, edges, new Set());

        assert.strictEqual(grouped.isGrouped, true);
        assert.strictEqual(
            grouped.nodes.filter((node) => node.type === 'kindGroup').length,
            2
        );
        assert.strictEqual(
            grouped.nodes.filter((node) => node.type === 'resourceGraph' && node.id.startsWith('res:')).length,
            0
        );
        assert.ok(grouped.nodes.some((node) => node.id === buildKindGroupNodeId('Deployment')));
        assert.ok(grouped.nodes.some((node) => node.id === buildKindGroupNodeId('Service')));
    });

    test('expanding a kind group reveals all member GraphNodeId values', () => {
        const graph = largeGroupedGraph(45);
        const { nodes: mappedNodes, edges } = mapGraphDtoToFlow(graph);
        const deploymentIds = graph.nodes
            .filter((node) => node.role === 'managed_resource' && node.resourceKey?.kind === 'Deployment')
            .map((node) => node.id);

        const grouped = applyKindGrouping(mappedNodes, edges, new Set(['Deployment']));
        const visibleLeafIds = grouped.nodes
            .filter((node) => node.type === 'resourceGraph' && node.id.startsWith('res:'))
            .map((node) => node.id);

        assert.deepStrictEqual(new Set(visibleLeafIds), new Set(deploymentIds));
    });

    test('collapse hides leaves without clearing DTO-backed selection', () => {
        const graph = largeGroupedGraph(45);
        const dtoNodeIds = collectMappedDtoNodeIds(graph);
        const selectedId = graph.nodes.find((node) => node.role === 'managed_resource')!.id;

        const collapsedIds = new Set([
            buildApplicationRootNodeId('argocd', 'large-app'),
            buildKindGroupNodeId('Deployment'),
            buildKindGroupNodeId('Service')
        ]);

        assert.strictEqual(
            resolveSelectionAfterMerge(selectedId, collapsedIds, dtoNodeIds),
            selectedId
        );
        assert.strictEqual(
            applyNodeSelection(
                [
                    {
                        id: buildKindGroupNodeId('Deployment'),
                        position: { x: 0, y: 0 },
                        data: {
                            kind: 'Deployment',
                            memberCount: 23,
                            expanded: false,
                            memberIds: []
                        }
                    }
                ],
                selectedId
            ).every((node) => node.selected === false),
            true
        );
    });

    test('countManagedResourceNodes is unchanged by grouping transform', () => {
        const graph = largeGroupedGraph(45);
        const { nodes: mappedNodes, edges } = mapGraphDtoToFlow(graph);
        const grouped = applyKindGrouping(mappedNodes, edges, new Set(['Deployment']));

        assert.strictEqual(countManagedResourceNodes(graph), 45);
        assert.strictEqual(grouped.isGrouped, true);
    });

    test('mergeGraphFlowState groups large apps and preserves viewport on expand/collapse', () => {
        const graph = largeGroupedGraph(45);
        const initial = mergeGraphFlowState({
            graph,
            cache: createEmptyLayoutCache()
        });

        assert.strictEqual(initial.isGrouped, true);
        assert.strictEqual(initial.shouldAutoFit, true);
        assert.ok(initial.nodes.some((node) => node.type === 'kindGroup'));

        const expanded = mergeGraphFlowState({
            graph,
            cache: initial.cache,
            expandedKinds: new Set(['Deployment']),
            groupPresentationChanged: true
        });

        assert.strictEqual(expanded.relayouted, true);
        assert.strictEqual(expanded.shouldAutoFit, false);
        assert.ok(
            expanded.nodes.some(
                (node) => node.type === 'resourceGraph' && node.id.startsWith('res:guestbook/Deployment/')
            )
        );
    });

    test('shows large-app grouping affordance when grouped mode is active', () => {
        const graph = largeGroupedGraph(45);
        assert.strictEqual(shouldShowLargeAppGroupingAffordance(graph), true);
        assert.strictEqual(shouldShowLargeAppGroupingAffordance(largeGroupedGraph(10)), false);
    });
});
