import React from 'react';
import { KubernetesEvent } from '../../../types/Events';
import { ResizeHandle } from './ResizeHandle';
import { DetailRow } from './DetailRow';
import { formatRelativeTime } from '../utils/formatTime';

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
 * EventDetails component.
 * Bottom pane displaying detailed event information.
 * Shows full event details when an event is selected, or empty state when none selected.
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
                    borderBottom: '1px solid var(--vscode-panel-border)',
                    flexShrink: 0
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
                <div 
                    className="details-content" 
                    style={{ 
                        flex: 1, 
                        overflow: 'auto',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {event ? (
                        <>
                            <DetailRow label="Reason" value={event.reason} />
                            <DetailRow label="Type" value={event.type} />
                            <DetailRow label="Message" value={event.message} />
                            <DetailRow label="Namespace" value={event.involvedObject.namespace} />
                            <DetailRow 
                                label="Resource" 
                                value={`${event.involvedObject.kind}/${event.involvedObject.name}`} 
                            />
                            <DetailRow label="Count" value={event.count.toString()} />
                            <DetailRow 
                                label="First Occurrence" 
                                value={formatRelativeTime(event.firstTimestamp)} 
                            />
                            <DetailRow 
                                label="Last Occurrence" 
                                value={formatRelativeTime(event.lastTimestamp)} 
                            />
                        </>
                    ) : (
                        <div 
                            style={{
                                padding: '24px',
                                textAlign: 'center',
                                color: 'var(--vscode-descriptionForeground)',
                                fontFamily: 'var(--vscode-font-family)',
                                fontSize: '13px'
                            }}
                        >
                            Select an event to view details
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

