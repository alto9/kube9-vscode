import * as assert from 'assert';
import type { SyncStatusCode } from '../../../types/argocd';
import {
    buildApplicationRootNodeId,
    computeStructureVersion,
    type ApplicationResourceGraph,
    type ResourceGraphNode
} from '../../../types/applicationResourceGraph';
import {
    applyKindGrouping,
    buildKindGroupNodeId
} from '../../../webview/argocd-application/graph/applyKindGrouping';
import {
    buildGraphFilterLiveRegionSummary,
    collectDistinctKindsFromGraph,
    createEmptyGraphFilterState,
    getManagedResourceSyncStatusForFilter,
    GRAPH_FILTER_ZERO_MATCH_MESSAGE,
    hasActiveGraphFilters,
    managedResourceMatchesFilters,
    shouldShowGraphFilterZeroMatchAffordance,
    toggleGraphFilterKind,
    toggleGraphFilterSyncStatus,
    type GraphFilterState
} from '../../../webview/argocd-application/graph/argocdGraphFilters';
import { mapGraphDtoToFlow } from '../../../webview/argocd-application/graph/mapGraphDtoToFlow';
import {
    createEmptyLayoutCache,
    mergeGraphFlowState
} from '../../../webview/argocd-application/graph/mergeGraphFlowState';
import {
    resolveSelectionAfterFilterChange,
    resolveSelectionAfterPresentationChange
} from '../../../webview/argocd-application/graph/graphSelection';

const APPLICATION_KEY = { context: 'minikube', namespace: 'argocd', name: 'guestbook' };

function managedNode(
    kind: string,
    name: string,
    syncStatus: ResourceGraphNode['status']['syncStatus'] = 'Synced'
): ResourceGraphNode {
    return {
        id: `res:guestbook/${kind}/${name}`,
        role: 'managed_resource',
        resourceKey: { namespace: 'guestbook', kind, name },
        status: { syncStatus, healthStatus: 'Healthy' },
        label: name,
        kindLabel: kind
    };
}

function sampleGraph(managed: ResourceGraphNode[]): ApplicationResourceGraph {
    const root: ResourceGraphNode = {
        id: buildApplicationRootNodeId('argocd', 'guestbook'),
        role: 'application',
        resourceKey: null,
        status: { syncStatus: 'Synced', healthStatus: 'Healthy' },
        label: 'guestbook',
        kindLabel: 'Application'
    };
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

suite('argocdGraphFilters', () => {
    test('managedResourceMatchesFilters applies AND semantics across name, kind, and sync', () => {
        const graph = sampleGraph([
            managedNode('Deployment', 'frontend', 'Synced'),
            managedNode('Service', 'frontend-api', 'OutOfSync')
        ]);
        const frontend = graph.nodes[1]!;
        const service = graph.nodes[2]!;

        const nameOnly = { ...createEmptyGraphFilterState(), nameQuery: 'frontend' };
        assert.strictEqual(managedResourceMatchesFilters(frontend, nameOnly), true);
        assert.strictEqual(managedResourceMatchesFilters(service, nameOnly), true);

        const kindOnly: GraphFilterState = {
            ...createEmptyGraphFilterState(),
            selectedKinds: new Set(['Service'])
        };
        assert.strictEqual(managedResourceMatchesFilters(service, kindOnly), true);
        assert.strictEqual(managedResourceMatchesFilters(frontend, kindOnly), false);

        const syncOnly: GraphFilterState = {
            ...createEmptyGraphFilterState(),
            selectedSyncStatuses: new Set<SyncStatusCode>(['OutOfSync'])
        };
        assert.strictEqual(managedResourceMatchesFilters(service, syncOnly), true);
        assert.strictEqual(managedResourceMatchesFilters(frontend, syncOnly), false);

        const combined: GraphFilterState = {
            nameQuery: 'frontend',
            selectedKinds: new Set(['Service']),
            selectedSyncStatuses: new Set<SyncStatusCode>(['OutOfSync'])
        };
        assert.strictEqual(managedResourceMatchesFilters(service, combined), true);
        assert.strictEqual(managedResourceMatchesFilters(frontend, combined), false);
    });

    test('topology-only nodes without CRD sync use Unknown for sync filtering', () => {
        const topologyOnly = managedNode('Pod', 'orphan-pod', 'Unknown');
        assert.strictEqual(getManagedResourceSyncStatusForFilter(topologyOnly), 'Unknown');

        const filters: GraphFilterState = {
            ...createEmptyGraphFilterState(),
            selectedSyncStatuses: new Set<SyncStatusCode>(['Unknown'])
        };
        assert.strictEqual(managedResourceMatchesFilters(topologyOnly, filters), true);
    });

    test('mergeGraphFlowState keeps full DTO while hiding non-matching tiles', () => {
        const graph = sampleGraph([
            managedNode('Deployment', 'frontend', 'Synced'),
            managedNode('Service', 'frontend-svc', 'OutOfSync')
        ]);
        const filters: GraphFilterState = {
            nameQuery: '',
            selectedKinds: new Set(['Deployment']),
            selectedSyncStatuses: new Set<SyncStatusCode>()
        };

        const merged = mergeGraphFlowState({
            graph,
            cache: createEmptyLayoutCache(),
            filters
        });

        assert.strictEqual(graph.nodes.length, 3);
        assert.strictEqual(graph.structureVersion.length > 0, true);
        assert.strictEqual(
            merged.nodes.some((node) => node.id.startsWith('res:guestbook/Service/')),
            false
        );
        assert.ok(merged.nodes.some((node) => node.id.startsWith('res:guestbook/Deployment/')));
    });

    test('filters do not change structureVersion on refresh merge', () => {
        const graph = sampleGraph([managedNode('Deployment', 'frontend', 'Synced')]);
        const initial = mergeGraphFlowState({
            graph,
            cache: createEmptyLayoutCache()
        });
        const filtered = mergeGraphFlowState({
            graph,
            cache: initial.cache,
            filters: {
                nameQuery: 'front',
                selectedKinds: new Set(),
                selectedSyncStatuses: new Set()
            },
            filterPresentationChanged: true
        });

        assert.strictEqual(filtered.cache.structureVersion, graph.structureVersion);
    });

    test('kind grouping keeps summary tiles only for kinds with matching members', () => {
        const managed: ResourceGraphNode[] = [];
        for (let index = 0; index < 41; index += 1) {
            const kind = index % 2 === 0 ? 'Deployment' : 'Service';
            const syncStatus = index === 0 ? 'OutOfSync' : 'Synced';
            managed.push(managedNode(kind, `resource-${index}`, syncStatus));
        }
        const graph = sampleGraph(managed);
        const { nodes, edges } = mapGraphDtoToFlow(graph);
        const filters: GraphFilterState = {
            nameQuery: '',
            selectedKinds: new Set<string>(),
            selectedSyncStatuses: new Set<SyncStatusCode>(['OutOfSync'])
        };
        const memberMatchesFilter = (node: (typeof nodes)[number]): boolean =>
            managedResourceMatchesFilters(node.data.dto, filters);

        const grouped = applyKindGrouping(nodes, edges, new Set(), memberMatchesFilter);

        assert.strictEqual(grouped.isGrouped, true);
        assert.ok(grouped.nodes.some((node) => node.id === buildKindGroupNodeId('Deployment')));
        assert.strictEqual(
            grouped.nodes.some((node) => node.id === buildKindGroupNodeId('Service')),
            false
        );
    });

    test('expanded grouped view shows only matching members', () => {
        const managed: ResourceGraphNode[] = [];
        for (let index = 0; index < 41; index += 1) {
            managed.push(
                managedNode(
                    'Deployment',
                    `resource-${index}`,
                    index === 0 ? 'OutOfSync' : 'Synced'
                )
            );
        }
        const graph = sampleGraph(managed);
        const { nodes, edges } = mapGraphDtoToFlow(graph);
        const filters: GraphFilterState = {
            nameQuery: '',
            selectedKinds: new Set<string>(),
            selectedSyncStatuses: new Set<SyncStatusCode>(['OutOfSync'])
        };
        const memberMatchesFilter = (node: (typeof nodes)[number]): boolean =>
            managedResourceMatchesFilters(node.data.dto, filters);

        const grouped = applyKindGrouping(
            nodes,
            edges,
            new Set(['Deployment']),
            memberMatchesFilter
        );
        const visibleLeaves = grouped.nodes
            .filter((node) => node.type === 'resourceGraph' && node.id.startsWith('res:'))
            .map((node) => node.id);

        assert.deepStrictEqual(visibleLeaves, ['res:guestbook/Deployment/resource-0']);
    });

    test('zero-match affordance predicate and copy', () => {
        const graph = sampleGraph([managedNode('Deployment', 'frontend', 'Synced')]);
        const filters: GraphFilterState = {
            nameQuery: 'missing',
            selectedKinds: new Set<string>(),
            selectedSyncStatuses: new Set<SyncStatusCode>()
        };

        assert.strictEqual(hasActiveGraphFilters(filters), true);
        assert.strictEqual(shouldShowGraphFilterZeroMatchAffordance(graph, filters), true);
        assert.strictEqual(
            buildGraphFilterLiveRegionSummary(graph, filters),
            'No resources match filters'
        );
        assert.match(GRAPH_FILTER_ZERO_MATCH_MESSAGE, /Clear filters/);
    });

    test('selection clears when filtered out but survives collapsed grouping', () => {
        const graph = sampleGraph([managedNode('Deployment', 'frontend', 'Synced')]);
        const dtoNodeIds = new Set(graph.nodes.map((node) => node.id));
        const selectedId = graph.nodes[1]!.id;
        const visibleIds = new Set([graph.nodes[0]!.id]);
        const filters: GraphFilterState = {
            nameQuery: 'missing',
            selectedKinds: new Set<string>(),
            selectedSyncStatuses: new Set<SyncStatusCode>()
        };

        assert.strictEqual(
            resolveSelectionAfterFilterChange(selectedId, visibleIds),
            null
        );
        assert.strictEqual(
            resolveSelectionAfterPresentationChange(selectedId, visibleIds, dtoNodeIds, graph, filters),
            null
        );

        const collapsedVisibleIds = new Set([
            graph.nodes[0]!.id,
            buildKindGroupNodeId('Deployment')
        ]);
        const emptyFilters = createEmptyGraphFilterState();
        assert.strictEqual(
            resolveSelectionAfterPresentationChange(
                selectedId,
                collapsedVisibleIds,
                dtoNodeIds,
                graph,
                emptyFilters
            ),
            selectedId
        );
    });

    test('collectDistinctKindsFromGraph returns sorted kinds', () => {
        const graph = sampleGraph([
            managedNode('Service', 'svc-a'),
            managedNode('Deployment', 'dep-a'),
            managedNode('ConfigMap', 'cfg-a')
        ]);
        assert.deepStrictEqual(collectDistinctKindsFromGraph(graph), [
            'ConfigMap',
            'Deployment',
            'Service'
        ]);
    });

    test('toggle helpers update chip selections immutably', () => {
        const base = createEmptyGraphFilterState();
        const withKind = toggleGraphFilterKind(base, 'Deployment');
        assert.ok(withKind.selectedKinds.has('Deployment'));
        const withSync = toggleGraphFilterSyncStatus(withKind, 'OutOfSync');
        assert.ok(withSync.selectedSyncStatuses.has('OutOfSync'));
    });
});
