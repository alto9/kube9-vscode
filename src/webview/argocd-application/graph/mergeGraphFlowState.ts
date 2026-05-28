import type { Edge, Node } from '@xyflow/react';
import type { ApplicationResourceGraph } from '../../../types/applicationResourceGraph';
import { applyGraphLayout } from './applyDagreLayout';
import { mapGraphDtoToFlow } from './mapGraphDtoToFlow';
import { shouldRelayout } from './shouldRelayout';
import type { GraphLayoutCache, GraphNodeData, LayoutPosition } from './types';

export interface MergeGraphFlowStateInput {
    graph: ApplicationResourceGraph;
    cache: GraphLayoutCache;
    explicitFitView?: boolean;
}

export interface MergeGraphFlowStateResult {
    nodes: Node<GraphNodeData>[];
    edges: Edge[];
    cache: GraphLayoutCache;
    relayouted: boolean;
    shouldAutoFit: boolean;
}

function retainPositions(
    nodes: Node<GraphNodeData>[],
    positions: Map<string, LayoutPosition>
): Node<GraphNodeData>[] {
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
    const { graph, explicitFitView = false } = input;
    const { nodes: mappedNodes, edges } = mapGraphDtoToFlow(graph);
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
        explicitFitView
    });

    let nodes = mappedNodes;
    if (relayout) {
        nodes = applyGraphLayout(mappedNodes, edges);
    } else {
        nodes = retainPositions(mappedNodes, input.cache.positions);
    }

    const positions = new Map<string, LayoutPosition>();
    for (const node of nodes) {
        positions.set(node.id, node.position);
    }

    return {
        nodes,
        edges,
        relayouted: relayout,
        shouldAutoFit: isInitial || (structureVersionChanged && !explicitFitView),
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
