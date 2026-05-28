import React from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from './types';

export function PlaceholderNode({ data }: NodeProps<Node<GraphNodeData>>): React.JSX.Element {
    const isRoot = data.dto.role === 'application';

    return (
        <div
            className={`argocd-graph-node${isRoot ? ' argocd-graph-node--root' : ''}`}
            data-testid={`graph-node-${data.dto.id}`}
        >
            <Handle type="target" position={Position.Left} className="argocd-graph-node__handle" />
            <div className="argocd-graph-node__kind">{data.dto.kindLabel}</div>
            <div className="argocd-graph-node__label">{data.dto.label}</div>
            <Handle type="source" position={Position.Right} className="argocd-graph-node__handle" />
        </div>
    );
}
