import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { getKindIconClass } from './kindIcons';
import type { KindGroupNodeData } from './types';
import { useKindGroupActions } from './KindGroupActionsContext';

export function KindGroupNodeTile({ id, data, selected }: NodeProps): React.JSX.Element {
    const groupData = data as KindGroupNodeData;
    const { onToggleKindGroup } = useKindGroupActions();
    const tileRef = React.useRef<HTMLDivElement>(null);
    const expanded = groupData.expanded;
    const toggleLabel = expanded
        ? `Collapse ${groupData.kind} group`
        : `Expand ${groupData.kind} group (${groupData.memberCount} resources)`;

    const handleToggle = (): void => {
        onToggleKindGroup(groupData.kind);
    };

    const handleKeyDown = (event: React.KeyboardEvent): void => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleToggle();
        }
    };

    return (
        <div
            ref={tileRef}
            className={[
                'argocd-graph-node',
                'argocd-graph-node--kind-group',
                selected ? 'argocd-graph-node--selected' : ''
            ]
                .filter(Boolean)
                .join(' ')}
            data-testid={`kind-group-tile-${groupData.kind}`}
            tabIndex={0}
            role="button"
            aria-label={toggleLabel}
            aria-expanded={expanded}
            onKeyDown={handleKeyDown}
            onClick={handleToggle}
        >
            <Handle type="target" position={Position.Left} className="argocd-graph-node__handle" />
            <div className="argocd-graph-node__header">
                <span
                    className={getKindIconClass(groupData.kind)}
                    aria-hidden="true"
                />
                <span className="argocd-graph-node__kind">{groupData.kind}</span>
                <button
                    type="button"
                    className="argocd-graph-node__kind-group-toggle"
                    aria-label={toggleLabel}
                    onClick={(event) => {
                        event.stopPropagation();
                        handleToggle();
                    }}
                >
                    <span
                        className={`codicon ${expanded ? 'codicon-chevron-down' : 'codicon-chevron-right'}`}
                        aria-hidden="true"
                    />
                </button>
            </div>
            <div className="argocd-graph-node__label">
                {groupData.memberCount} {groupData.memberCount === 1 ? 'resource' : 'resources'}
            </div>
            <Handle type="source" position={Position.Right} className="argocd-graph-node__handle" />
        </div>
    );
}
