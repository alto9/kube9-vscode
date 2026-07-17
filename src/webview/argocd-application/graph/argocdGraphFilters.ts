import type { ApplicationResourceGraph, ResourceGraphNode } from '../../../types/applicationResourceGraph';
import type { SyncStatusCode } from '../../../types/argocd';

export const GRAPH_FILTER_NAME_DEBOUNCE_MS = 300;

export const GRAPH_FILTER_ZERO_MATCH_MESSAGE =
    'No resources match the current filters. Clear filters or adjust your search.';

export const SYNC_FILTER_OPTIONS: readonly SyncStatusCode[] = ['Synced', 'OutOfSync', 'Unknown'];

export interface GraphFilterState {
    nameQuery: string;
    selectedKinds: ReadonlySet<string>;
    selectedSyncStatuses: ReadonlySet<SyncStatusCode>;
}

export function createEmptyGraphFilterState(): GraphFilterState {
    return {
        nameQuery: '',
        selectedKinds: new Set(),
        selectedSyncStatuses: new Set()
    };
}

export function hasActiveGraphFilters(state: GraphFilterState): boolean {
    return (
        state.nameQuery.trim().length > 0 ||
        state.selectedKinds.size > 0 ||
        state.selectedSyncStatuses.size > 0
    );
}

export function getManagedResourceKind(node: ResourceGraphNode): string {
    return node.resourceKey?.kind ?? node.kindLabel;
}

export function getManagedResourceName(node: ResourceGraphNode): string {
    return node.resourceKey?.name ?? node.label;
}

export function getManagedResourceSyncStatusForFilter(node: ResourceGraphNode): SyncStatusCode {
    return node.status.syncStatus;
}

export function managedResourceMatchesFilters(
    node: ResourceGraphNode,
    filters: GraphFilterState
): boolean {
    if (node.role !== 'managed_resource') {
        return true;
    }

    const trimmedName = filters.nameQuery.trim();
    if (trimmedName.length > 0) {
        const name = getManagedResourceName(node).toLowerCase();
        if (!name.includes(trimmedName.toLowerCase())) {
            return false;
        }
    }

    if (filters.selectedKinds.size > 0) {
        const kind = getManagedResourceKind(node);
        if (!filters.selectedKinds.has(kind)) {
            return false;
        }
    }

    if (filters.selectedSyncStatuses.size > 0) {
        const sync = getManagedResourceSyncStatusForFilter(node);
        if (!filters.selectedSyncStatuses.has(sync)) {
            return false;
        }
    }

    return true;
}

export function collectDistinctKindsFromGraph(graph: ApplicationResourceGraph): string[] {
    const kinds = new Set<string>();
    for (const node of graph.nodes) {
        if (node.role === 'managed_resource') {
            kinds.add(getManagedResourceKind(node));
        }
    }
    return [...kinds].sort((left, right) => left.localeCompare(right));
}

export function countManagedResourcesInGraph(graph: ApplicationResourceGraph): number {
    return graph.nodes.filter((node) => node.role === 'managed_resource').length;
}

export function countMatchingManagedResources(
    graph: ApplicationResourceGraph,
    filters: GraphFilterState
): number {
    return graph.nodes.filter(
        (node) => node.role === 'managed_resource' && managedResourceMatchesFilters(node, filters)
    ).length;
}

export function shouldShowGraphFilterZeroMatchAffordance(
    graph: ApplicationResourceGraph,
    filters: GraphFilterState
): boolean {
    if (!hasActiveGraphFilters(filters)) {
        return false;
    }
    return countMatchingManagedResources(graph, filters) === 0;
}

export function buildGraphFilterLiveRegionSummary(
    graph: ApplicationResourceGraph,
    filters: GraphFilterState
): string {
    if (!hasActiveGraphFilters(filters)) {
        return '';
    }
    const total = countManagedResourcesInGraph(graph);
    const matching = countMatchingManagedResources(graph, filters);
    if (matching === 0) {
        return 'No resources match filters';
    }
    return `Showing ${matching} of ${total} resources`;
}

export function graphFilterChipAriaPressed(selected: boolean): 'true' | 'false' {
    return selected ? 'true' : 'false';
}

export const GRAPH_FILTER_CONTROL_ORDER = [
    'name-search',
    'kind-chips',
    'sync-chips',
    'clear-filters'
] as const;

export function managedResourceIdMatchesFilters(
    graph: ApplicationResourceGraph,
    nodeId: string,
    filters: GraphFilterState
): boolean {
    const node = graph.nodes.find((candidate) => candidate.id === nodeId);
    if (!node || node.role !== 'managed_resource') {
        return false;
    }
    return managedResourceMatchesFilters(node, filters);
}

function toggleSetValue<T>(values: ReadonlySet<T>, value: T): Set<T> {
    const next = new Set(values);
    if (next.has(value)) {
        next.delete(value);
    } else {
        next.add(value);
    }
    return next;
}

export function toggleGraphFilterKind(filters: GraphFilterState, kind: string): GraphFilterState {
    return {
        ...filters,
        selectedKinds: toggleSetValue(filters.selectedKinds, kind)
    };
}

export function toggleGraphFilterSyncStatus(
    filters: GraphFilterState,
    syncStatus: SyncStatusCode
): GraphFilterState {
    return {
        ...filters,
        selectedSyncStatuses: toggleSetValue(filters.selectedSyncStatuses, syncStatus)
    };
}
