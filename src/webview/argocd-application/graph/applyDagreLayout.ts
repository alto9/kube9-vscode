import dagre from '@dagrejs/dagre';
import { Position, type Edge, type Node } from '@xyflow/react';
import {
    GRAPH_NODE_HEIGHT,
    GRAPH_NODE_WIDTH,
    GRAPH_NODE_SEP,
    GRAPH_RANK_SEP
} from './constants';
import { graphHasCycle } from './detectCycle';
import { applyTierFallbackLayout } from './applyTierFallbackLayout';
import type { GraphNodeData } from './types';

function applyDagreLayoutInternal(
    nodes: Node<GraphNodeData>[],
    edges: Edge[],
    rankdir: 'LR' | 'RL' | 'TB' | 'BT'
): Node<GraphNodeData>[] {
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({
        rankdir,
        ranksep: GRAPH_RANK_SEP,
        nodesep: GRAPH_NODE_SEP
    });

    for (const node of nodes) {
        graph.setNode(node.id, { width: GRAPH_NODE_WIDTH, height: GRAPH_NODE_HEIGHT });
    }

    for (const edge of edges) {
        graph.setEdge(edge.source, edge.target);
    }

    dagre.layout(graph);

    return nodes.map((node) => {
        const layoutNode = graph.node(node.id);
        return {
            ...node,
            position: {
                x: layoutNode.x - GRAPH_NODE_WIDTH / 2,
                y: layoutNode.y - GRAPH_NODE_HEIGHT / 2
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left
        };
    });
}

export function applyGraphLayout(
    nodes: Node<GraphNodeData>[],
    edges: Edge[]
): Node<GraphNodeData>[] {
    if (nodes.length === 0) {
        return nodes;
    }

    const nodeIds = nodes.map((node) => node.id);
    const edgePairs = edges.map((edge) => ({ source: edge.source, target: edge.target }));

    if (graphHasCycle(nodeIds, edgePairs)) {
        return applyTierFallbackLayout(nodes, edges);
    }

    try {
        return applyDagreLayoutInternal(nodes, edges, 'LR');
    } catch {
        return applyTierFallbackLayout(nodes, edges);
    }
}
