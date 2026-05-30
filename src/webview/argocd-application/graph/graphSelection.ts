import type { Node } from '@xyflow/react';
import type { GraphNodeData } from './types';

export function resolveSelectionAfterMerge(
    previousSelectedId: string | null,
    nextNodeIds: ReadonlySet<string>
): string | null {
    if (!previousSelectedId) {
        return null;
    }
    return nextNodeIds.has(previousSelectedId) ? previousSelectedId : null;
}

export function applyNodeSelection(
    nodes: Node<GraphNodeData>[],
    selectedNodeId: string | null
): Node<GraphNodeData>[] {
    if (!selectedNodeId) {
        return nodes.map((node) => (node.selected ? { ...node, selected: false } : node));
    }
    return nodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId
    }));
}
