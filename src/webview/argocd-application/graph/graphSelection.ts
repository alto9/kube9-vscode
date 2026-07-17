import type { ApplicationResourceGraph } from '../../../types/applicationResourceGraph';
import type { Node } from '@xyflow/react';
import {
    hasActiveGraphFilters,
    managedResourceIdMatchesFilters,
    type GraphFilterState
} from './argocdGraphFilters';
import type { FlowNodeData } from './types';

export function resolveSelectionAfterFilterChange(
    previousSelectedId: string | null,
    nextVisibleNodeIds: ReadonlySet<string>
): string | null {
    if (!previousSelectedId) {
        return null;
    }
    return nextVisibleNodeIds.has(previousSelectedId) ? previousSelectedId : null;
}

export function resolveSelectionAfterPresentationChange(
    previousSelectedId: string | null,
    nextVisibleNodeIds: ReadonlySet<string>,
    dtoNodeIds: ReadonlySet<string>,
    graph: ApplicationResourceGraph,
    filters: GraphFilterState
): string | null {
    if (!previousSelectedId) {
        return null;
    }
    if (nextVisibleNodeIds.has(previousSelectedId)) {
        return previousSelectedId;
    }
    if (!dtoNodeIds.has(previousSelectedId)) {
        return null;
    }
    if (
        hasActiveGraphFilters(filters) &&
        !managedResourceIdMatchesFilters(graph, previousSelectedId, filters)
    ) {
        return null;
    }
    return previousSelectedId;
}

export function resolveSelectionAfterMerge(
    previousSelectedId: string | null,
    nextVisibleNodeIds: ReadonlySet<string>,
    dtoNodeIds?: ReadonlySet<string>
): string | null {
    if (!previousSelectedId) {
        return null;
    }
    if (nextVisibleNodeIds.has(previousSelectedId)) {
        return previousSelectedId;
    }
    if (dtoNodeIds?.has(previousSelectedId)) {
        return previousSelectedId;
    }
    return null;
}

export function applyNodeSelection(
    nodes: Node<FlowNodeData>[],
    selectedNodeId: string | null
): Node<FlowNodeData>[] {
    if (!selectedNodeId) {
        return nodes.map((node) => (node.selected ? { ...node, selected: false } : node));
    }
    return nodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId
    }));
}
