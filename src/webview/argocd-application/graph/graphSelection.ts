import type { Node } from '@xyflow/react';
import type { FlowNodeData } from './types';

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
