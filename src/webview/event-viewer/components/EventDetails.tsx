import React from 'react';
import { KubernetesEvent } from '../../../types/Events';
import { ResizeHandle } from './ResizeHandle';

/**
 * Props for EventDetails component.
 */
interface EventDetailsProps {
    event: KubernetesEvent | null;
    height: number;
    onHeightChange: (height: number) => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
    sendMessage: (message: any) => void;
}

/**
 * EventDetails component stub.
 * Bottom pane displaying detailed event information.
 * Will be fully implemented in story 023.
 */
export const EventDetails: React.FC<EventDetailsProps> = ({
    event,
    height,
    onHeightChange,
    collapsed,
    onToggleCollapse,
    sendMessage
}) => {
    return (
        <div
            className="event-details"
            style={{
                height: `${height}px`,
                flexShrink: 0,
                backgroundColor: 'var(--vscode-editor-background)',
                borderTop: '1px solid var(--vscode-panel-border)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
            }}
        >
            <ResizeHandle
                orientation="horizontal"
                onResize={(delta) => onHeightChange(height - delta)}
            />
            <div
                className="details-header"
                style={{
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--vscode-panel-border)'
                }}
            >
                <span>Event Details</span>
                <button
                    onClick={onToggleCollapse}
                    className="collapse-button"
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--vscode-foreground)',
                        cursor: 'pointer',
                        padding: '4px'
                    }}
                    aria-label={collapsed ? 'Expand details' : 'Collapse details'}
                >
                    <span className={`codicon codicon-chevron-${collapsed ? 'up' : 'down'}`}></span>
                </button>
            </div>
            {!collapsed && (
                <div className="details-content" style={{ padding: '12px', flex: 1, overflow: 'auto' }}>
                    {event ? (
                        <div>
                            <div>EventDetails (placeholder)</div>
                            <div>Reason: {event.reason}</div>
                            <div>Type: {event.type}</div>
                            <div>Message: {event.message}</div>
                        </div>
                    ) : (
                        <div>Select an event to view details</div>
                    )}
                </div>
            )}
        </div>
    );
};

