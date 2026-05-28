import { Position, type Edge, type Node } from '@xyflow/react';
import {
    GRAPH_NODE_HEIGHT,
    GRAPH_NODE_WIDTH,
    GRAPH_NODE_SEP,
    GRAPH_RANK_SEP
} from './constants';
import type { GraphNodeData } from './types';

function buildRankMap(
    nodes: Node<GraphNodeData>[],
    edges: Edge[]
): Map<string, number> {
    const ranks = new Map<string, number>();
    const rootIds = nodes
        .filter((node) => node.data.dto.role === 'application')
        .map((node) => node.id);
    const startIds = rootIds.length > 0 ? rootIds : [nodes[0]?.id].filter(Boolean) as string[];

    for (const rootId of startIds) {
        ranks.set(rootId, 0);
    }

    let changed = true;
    let iterations = 0;
    const maxIterations = nodes.length + edges.length;

    while (changed && iterations < maxIterations) {
        changed = false;
        iterations += 1;
        for (const edge of edges) {
            const sourceRank = ranks.get(edge.source);
            if (sourceRank === undefined) {
                continue;
            }
            const nextRank = sourceRank + 1;
            const current = ranks.get(edge.target);
            if (current === undefined || nextRank > current) {
                ranks.set(edge.target, nextRank);
                changed = true;
            }
        }
    }

    for (const node of nodes) {
        if (!ranks.has(node.id)) {
            ranks.set(node.id, 0);
        }
    }

    return ranks;
}

export function applyTierFallbackLayout(
    nodes: Node<GraphNodeData>[],
    edges: Edge[]
): Node<GraphNodeData>[] {
    const ranks = buildRankMap(nodes, edges);
    const columns = new Map<number, Node<GraphNodeData>[]>();

    for (const node of nodes) {
        const rank = ranks.get(node.id) ?? 0;
        const column = columns.get(rank) ?? [];
        column.push(node);
        columns.set(rank, column);
    }

    const positioned = new Map<string, { x: number; y: number }>();
    for (const [rank, columnNodes] of columns.entries()) {
        columnNodes.forEach((node, index) => {
            positioned.set(node.id, {
                x: rank * (GRAPH_NODE_WIDTH + GRAPH_RANK_SEP),
                y: index * (GRAPH_NODE_HEIGHT + GRAPH_NODE_SEP)
            });
        });
    }

    return nodes.map((node) => ({
        ...node,
        position: positioned.get(node.id) ?? { x: 0, y: 0 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left
    }));
}
