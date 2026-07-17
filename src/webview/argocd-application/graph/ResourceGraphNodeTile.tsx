import React from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from './types';
import { getKindIconClass } from './kindIcons';
import { SyncHealthBadges } from './syncHealthBadges';
import { getOverflowActions, nodeBusyKeyFromNode, type GraphOverflowAction } from './graphNodeCapabilities';
import { useGraphInteraction } from './GraphInteractionContext';
import { buildGraphTileAccessibleName } from './buildAccessibleName';
import { nextOverflowMenuIndex } from '../../components/overflowMenuKeyboard';

export interface GraphOverflowMenuHandle {
    open: () => void;
}

const GraphOverflowMenu = React.forwardRef(function GraphOverflowMenu(
    {
        actions,
        disabled,
        busyMessage,
        onSelect,
        onOpenChange,
        tileRef
    }: {
        actions: GraphOverflowAction[];
        disabled: boolean;
        busyMessage?: string;
        onSelect: (action: GraphOverflowAction) => void;
        onOpenChange: (open: boolean) => void;
        tileRef: React.RefObject<HTMLDivElement>;
    },
    ref: React.Ref<GraphOverflowMenuHandle>
): React.JSX.Element | null {
    const [open, setOpen] = React.useState(false);
    const [focusedItemIndex, setFocusedItemIndex] = React.useState(0);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const menuItemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

    const closeMenu = React.useCallback((returnFocusToTile: boolean) => {
        setOpen(false);
        onOpenChange(false);
        if (returnFocusToTile) {
            tileRef.current?.focus();
        }
    }, [onOpenChange, tileRef]);

    React.useImperativeHandle(ref, () => ({
        open: () => {
            if (!disabled && actions.length > 0) {
                setFocusedItemIndex(0);
                setOpen(true);
                onOpenChange(true);
            }
        }
    }), [actions.length, disabled, onOpenChange]);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        menuItemRefs.current[focusedItemIndex]?.focus();
    }, [focusedItemIndex, open]);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        const handlePointerDown = (event: MouseEvent): void => {
            if (menuRef.current && !menuRef.current.contains(event.target as Element)) {
                closeMenu(false);
            }
        };
        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [closeMenu, open]);

    const handleMenuKeyDown = (event: React.KeyboardEvent): void => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            closeMenu(true);
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setFocusedItemIndex((current) => nextOverflowMenuIndex(current, 'down', actions.length));
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setFocusedItemIndex((current) => nextOverflowMenuIndex(current, 'up', actions.length));
        }
    };

    if (actions.length === 0) {
        return null;
    }

    return (
        <div className="argocd-graph-node__overflow" ref={menuRef} onKeyDown={handleMenuKeyDown}>
            <button
                ref={buttonRef}
                type="button"
                className="argocd-graph-node__overflow-trigger"
                aria-label="Resource actions"
                aria-haspopup="menu"
                aria-expanded={open}
                tabIndex={-1}
                disabled={disabled}
                onClick={(event) => {
                    event.stopPropagation();
                    if (open) {
                        closeMenu(true);
                        return;
                    }
                    setFocusedItemIndex(0);
                    setOpen(true);
                    onOpenChange(true);
                }}
            >
                <span className="codicon codicon-kebab-vertical" aria-hidden="true" />
            </button>
            {open && (
                <div className="argocd-graph-node__overflow-menu" role="menu">
                    {busyMessage && (
                        <div className="argocd-graph-node__overflow-busy" role="status" aria-live="polite">
                            {busyMessage}
                        </div>
                    )}
                    {actions.map((action, index) => (
                        <button
                            key={action.actionId}
                            ref={(element) => {
                                menuItemRefs.current[index] = element;
                            }}
                            type="button"
                            role="menuitem"
                            className="argocd-graph-node__overflow-item"
                            disabled={disabled}
                            tabIndex={-1}
                            onClick={(event) => {
                                event.stopPropagation();
                                closeMenu(true);
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
});

export function ResourceGraphNodeTile({ data, selected }: NodeProps<Node<GraphNodeData>>): React.JSX.Element {
    const { dto } = data;
    const interaction = useGraphInteraction();
    const isRoot = dto.role === 'application';
    const kind = dto.resourceKey?.kind ?? dto.kindLabel;
    const overflowActions = getOverflowActions(dto.role, kind);
    const busyKey = nodeBusyKeyFromNode(dto);
    const nodeBusy = busyKey !== null && interaction.busyNodeKeys.has(busyKey);
    const menusDisabled = interaction.menusDisabled || nodeBusy;
    const accessibleName = buildGraphTileAccessibleName(
        dto.kindLabel,
        dto.label,
        dto.status.syncStatus,
        dto.status.healthStatus
    );

    const tileRef = React.useRef<HTMLDivElement>(null);
    const overflowMenuRef = React.useRef<GraphOverflowMenuHandle>(null);
    const [overflowOpen, setOverflowOpen] = React.useState(false);

    const handleTileKeyDown = (event: React.KeyboardEvent): void => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.currentTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return;
        }
        if (
            overflowActions.length > 0 &&
            !menusDisabled &&
            (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))
        ) {
            event.preventDefault();
            overflowMenuRef.current?.open();
        }
    };

    const handleOverflowSelect = (action: GraphOverflowAction): void => {
        if (!dto.resourceKey) {
            return;
        }
        interaction.postResourceAction(action.actionId, dto.resourceKey);
    };

    return (
        <div
            ref={tileRef}
            className={[
                'argocd-graph-node',
                isRoot ? 'argocd-graph-node--root' : '',
                selected ? 'argocd-graph-node--selected' : '',
                overflowOpen ? 'argocd-graph-node--overflow-open' : ''
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
                <span className="argocd-graph-node__kind" aria-hidden="true">
                    {dto.kindLabel}
                </span>
                {overflowActions.length > 0 && (
                    <GraphOverflowMenu
                        ref={overflowMenuRef}
                        actions={overflowActions}
                        disabled={menusDisabled}
                        busyMessage={nodeBusy ? 'Action in progress…' : undefined}
                        onSelect={handleOverflowSelect}
                        onOpenChange={setOverflowOpen}
                        tileRef={tileRef}
                    />
                )}
            </div>
            <div className="argocd-graph-node__label" title={dto.label} aria-hidden="true">
                {dto.label}
            </div>
            <SyncHealthBadges
                status={dto.status}
                className="argocd-graph-node__badges"
                decorative
            />
            <Handle type="source" position={Position.Right} className="argocd-graph-node__handle" />
        </div>
    );
}
