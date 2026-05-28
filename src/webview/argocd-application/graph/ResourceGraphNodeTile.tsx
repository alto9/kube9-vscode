import React from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from './types';
import { getKindIconClass } from './kindIcons';
import { SyncHealthBadges } from './syncHealthBadges';
import { getOverflowActions, nodeBusyKeyFromNode, type GraphOverflowAction } from './graphNodeCapabilities';
import { useGraphInteraction } from './GraphInteractionContext';

function buildAccessibleName(kindLabel: string, label: string, syncStatus: string, healthStatus: string): string {
    return `${kindLabel} ${label} ${syncStatus} ${healthStatus}`;
}

function GraphOverflowMenu({
    actions,
    disabled,
    busyMessage,
    onSelect
}: {
    actions: GraphOverflowAction[];
    disabled: boolean;
    busyMessage?: string;
    onSelect: (action: GraphOverflowAction) => void;
}): React.JSX.Element | null {
    const [open, setOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        const handlePointerDown = (event: MouseEvent): void => {
            if (menuRef.current && !menuRef.current.contains(event.target as Element)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [open]);

    const handleKeyDown = (event: React.KeyboardEvent): void => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            buttonRef.current?.focus();
        }
    };

    if (actions.length === 0) {
        return null;
    }

    return (
        <div className="argocd-graph-node__overflow" ref={menuRef} onKeyDown={handleKeyDown}>
            <button
                ref={buttonRef}
                type="button"
                className="argocd-graph-node__overflow-trigger"
                aria-label="Resource actions"
                aria-haspopup="menu"
                aria-expanded={open}
                disabled={disabled}
                onClick={(event) => {
                    event.stopPropagation();
                    setOpen((value) => !value);
                }}
            >
                <span className="codicon codicon-kebab-vertical" aria-hidden="true" />
            </button>
            {open && (
                <div className="argocd-graph-node__overflow-menu" role="menu">
                    {busyMessage && (
                        <div className="argocd-graph-node__overflow-busy" role="status">
                            {busyMessage}
                        </div>
                    )}
                    {actions.map((action) => (
                        <button
                            key={action.actionId}
                            type="button"
                            role="menuitem"
                            className="argocd-graph-node__overflow-item"
                            disabled={disabled}
                            onClick={(event) => {
                                event.stopPropagation();
                                setOpen(false);
                                onSelect(action);
                            }}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function ResourceGraphNodeTile({ data, selected }: NodeProps<Node<GraphNodeData>>): React.JSX.Element {
    const { dto } = data;
    const interaction = useGraphInteraction();
    const isRoot = dto.role === 'application';
    const kind = dto.resourceKey?.kind ?? dto.kindLabel;
    const overflowActions = getOverflowActions(dto.role, kind);
    const busyKey = nodeBusyKeyFromNode(dto);
    const nodeBusy = busyKey !== null && interaction.busyNodeKeys.has(busyKey);
    const menusDisabled = interaction.menusDisabled || nodeBusy;
    const accessibleName = buildAccessibleName(
        dto.kindLabel,
        dto.label,
        dto.status.syncStatus,
        dto.status.healthStatus
    );

    const handleTileKeyDown = (event: React.KeyboardEvent): void => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.currentTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
    };

    const handleOverflowSelect = (action: GraphOverflowAction): void => {
        if (action.messageType === 'viewInTree') {
            interaction.postViewInTree();
            return;
        }
        if (!dto.resourceKey) {
            return;
        }
        interaction.postResourceAction(
            action.actionId,
            dto.resourceKey.kind,
            dto.resourceKey.name,
            dto.resourceKey.namespace
        );
    };

    return (
        <div
            className={[
                'argocd-graph-node',
                isRoot ? 'argocd-graph-node--root' : '',
                selected ? 'argocd-graph-node--selected' : ''
            ]
                .filter(Boolean)
                .join(' ')}
            data-testid={`graph-node-${dto.id}`}
            tabIndex={0}
            role="group"
            aria-label={accessibleName}
            onKeyDown={handleTileKeyDown}
        >
            <Handle type="target" position={Position.Left} className="argocd-graph-node__handle" />
            <div className="argocd-graph-node__header">
                <span
                    className={getKindIconClass(dto.kindLabel, dto.resourceKey?.kind)}
                    aria-hidden="true"
                />
                <span className="argocd-graph-node__kind">{dto.kindLabel}</span>
                {overflowActions.length > 0 && (
                    <GraphOverflowMenu
                        actions={overflowActions}
                        disabled={menusDisabled}
                        busyMessage={nodeBusy ? 'Action in progress…' : undefined}
                        onSelect={handleOverflowSelect}
                    />
                )}
            </div>
            <div className="argocd-graph-node__label" title={dto.label}>
                {dto.label}
            </div>
            <SyncHealthBadges status={dto.status} className="argocd-graph-node__badges" />
            <Handle type="source" position={Position.Right} className="argocd-graph-node__handle" />
        </div>
    );
}
