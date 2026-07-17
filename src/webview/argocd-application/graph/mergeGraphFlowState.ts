import type { Edge, Node } from '@xyflow/react';
import type { ApplicationResourceGraph } from '../../../types/applicationResourceGraph';
import { applyKindGrouping } from './applyKindGrouping';
import { applyGraphLayout } from './applyDagreLayout';
import { managedResourceMatchesFilters, type GraphFilterState } from './argocdGraphFilters';
import { mapGraphDtoToFlow } from './mapGraphDtoToFlow';
import { shouldRelayout } from './shouldRelayout';
import { sortNodesForFocusOrder } from './focusOrder';
import type { FlowNodeData, GraphLayoutCache, GraphNodeData, LayoutPosition } from './types';

export interface MergeGraphFlowStateInput {
    graph: ApplicationResourceGraph;
    cache: GraphLayoutCache;
    explicitFitView?: boolean;
    expandedKinds?: ReadonlySet<string>;
    groupPresentationChanged?: boolean;
    filters?: GraphFilterState;
    filterPresentationChanged?: boolean;
}

export interface MergeGraphFlowStateResult {
    nodes: Node<FlowNodeData>[];
    edges: Edge[];
    cache: GraphLayoutCache;
    relayouted: boolean;
    shouldAutoFit: boolean;
    isGrouped: boolean;
}

function retainPositions(
    nodes: Node<FlowNodeData>[],
    positions: Map<string, LayoutPosition>
): Node<FlowNodeData>[] {
    return nodes.map((node) => {
        const cached = positions.get(node.id);
        if (!cached) {
            return node;
        }
        return {
            ...node,
            position: cached
        };
    });
}

export function mergeGraphFlowState(input: MergeGraphFlowStateInput): MergeGraphFlowStateResult {
    const {
        graph,
        explicitFitView = false,
        expandedKinds = new Set<string>(),
        groupPresentationChanged = false,
        filters = { nameQuery: '', selectedKinds: new Set(), selectedSyncStatuses: new Set() },
        filterPresentationChanged = false
    } = input;
    const { nodes: mappedNodes, edges: mappedEdges } = mapGraphDtoToFlow(graph);
    const memberMatchesFilter = (node: Node<GraphNodeData>): boolean =>
        managedResourceMatchesFilters(node.data.dto, filters);
    const grouped = applyKindGrouping(mappedNodes, mappedEdges, expandedKinds, memberMatchesFilter);
    const previousStructureVersion = input.cache.structureVersion;
    const structureVersionChanged =
        previousStructureVersion !== null && previousStructureVersion !== graph.structureVersion;
    const topologySourceChanged =
        input.cache.topologySource !== null && input.cache.topologySource !== graph.topologySource;
    const isInitial = previousStructureVersion === null;
    const relayout = shouldRelayout({
        isInitial,
        structureVersionChanged,
        topologySourceChanged,
        previousNodeCount: input.cache.nodeCount,
        nextNodeCount: graph.nodes.length,
        explicitFitView,
        groupPresentationChanged,
        filterPresentationChanged
    });

    let nodes = grouped.nodes;
    if (relayout) {
        nodes = applyGraphLayout(grouped.nodes, grouped.edges);
    } else {
        nodes = retainPositions(grouped.nodes, input.cache.positions);
    }

    const positions = new Map<string, LayoutPosition>();
    for (const node of nodes) {
        positions.set(node.id, node.position);
    }

    return {
        nodes: sortNodesForFocusOrder(nodes),
        edges: grouped.edges,
        relayouted: relayout,
        shouldAutoFit: (isInitial || explicitFitView) && !groupPresentationChanged && !filterPresentationChanged,
        isGrouped: grouped.isGrouped,
        cache: {
            positions,
            structureVersion: graph.structureVersion,
            topologySource: graph.topologySource,
            nodeCount: graph.nodes.length
        }
    };
}

export function createEmptyLayoutCache(): GraphLayoutCache {
    return {
        positions: new Map(),
        structureVersion: null,
        topologySource: null,
        nodeCount: 0
    };
}

export function collectMappedDtoNodeIds(graph: ApplicationResourceGraph): Set<string> {
    const { nodes } = mapGraphDtoToFlow(graph);
    return new Set(nodes.map((node) => node.id));
}
