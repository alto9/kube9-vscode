import type { Node } from '@xyflow/react';
import type { GraphNodeData } from './types';

const ROW_TOLERANCE_PX = 8;

/**
 * Stable focus sequence: left-to-right, then top-to-bottom (`.ai/interface/accessibility.md`).
 */
export function sortNodesForFocusOrder(nodes: Node<GraphNodeData>[]): Node<GraphNodeData>[] {
    return [...nodes].sort((left, right) => {
        const rowDelta = left.position.y - right.position.y;
        if (Math.abs(rowDelta) > ROW_TOLERANCE_PX) {
            return rowDelta;
        }
        return left.position.x - right.position.x;
    });
}
