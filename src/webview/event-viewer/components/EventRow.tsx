import React from 'react';
import { KubernetesEvent } from '../../../types/Events';
import { formatRelativeTime } from '../utils/dateUtils';

/**
 * Props for EventRow component.
 */
interface EventRowProps {
    event: KubernetesEvent;
    selected: boolean;
    onClick: () => void;
    style: React.CSSProperties;
}

/**
 * EventRow component.
 * Displays a single event row in the table with event data.
 */
export const EventRow: React.FC<EventRowProps> = ({
    event,
    selected,
    onClick,
    style
}) => {
    const eventTypeClass = event.type.toLowerCase();
    const source = `${event.involvedObject.namespace}/${event.involvedObject.kind}/${event.involvedObject.name}`;

    const getEventTypeIcon = (type: string): string => {
        switch (type) {
            case 'Normal':
                return 'codicon-check';
            case 'Warning':
                return 'codicon-warning';
            case 'Error':
                return 'codicon-error';
            default:
                return 'codicon-circle-filled';
        }
    };

    const getEventTypeColor = (type: string): string => {
        switch (type) {
            case 'Normal':
                return 'var(--vscode-testing-iconPassed)';
            case 'Warning':
                return 'var(--vscode-testing-iconQueued)';
            case 'Error':
                return 'var(--vscode-testing-iconFailed)';
            default:
                return 'var(--vscode-foreground)';
        }
    };

    const rowStyle: React.CSSProperties = {
        ...style,
        display: 'grid',
        gridTemplateColumns: '120px 150px 1fr 200px 100px',
        gap: '8px',
        padding: '8px 12px',
        borderBottom: '1px solid var(--vscode-panel-border)',
        backgroundColor: selected
            ? 'var(--vscode-list-activeSelectionBackground)'
            : eventTypeClass === 'warning'
            ? 'var(--vscode-inputValidation-warningBackground)'
            : eventTypeClass === 'error'
            ? 'var(--vscode-inputValidation-errorBackground)'
            : 'var(--vscode-editor-background)',
        color: selected
            ? 'var(--vscode-list-activeSelectionForeground)'
            : 'var(--vscode-foreground)',
        fontFamily: 'var(--vscode-font-family)',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease'
    };

    const cellStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    };

    const iconStyle: React.CSSProperties = {
        fontSize: '14px',
        color: getEventTypeColor(event.type)
    };

    const countBadgeStyle: React.CSSProperties = {
        padding: '2px 6px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: 500,
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)',
        marginLeft: '6px'
    };

    return (
        <div
            className={`event-row ${eventTypeClass} ${selected ? 'selected' : ''}`}
            onClick={onClick}
            style={rowStyle}
            role="row"
            aria-selected={selected}
            tabIndex={0}
            onMouseEnter={(e) => {
                if (!selected) {
                    e.currentTarget.style.backgroundColor =
                        'var(--vscode-list-hoverBackground)';
                }
            }}
            onMouseLeave={(e) => {
                if (!selected) {
                    e.currentTarget.style.backgroundColor =
                        eventTypeClass === 'warning'
                            ? 'var(--vscode-inputValidation-warningBackground)'
                            : eventTypeClass === 'error'
                            ? 'var(--vscode-inputValidation-errorBackground)'
                            : 'var(--vscode-editor-background)';
                }
            }}
        >
            <div className="event-cell level" style={cellStyle}>
                <span className={getEventTypeIcon(event.type)} style={iconStyle}></span>
                <span>{event.type}</span>
            </div>
            <div className="event-cell time" style={cellStyle} title={event.lastTimestamp}>
                {formatRelativeTime(event.lastTimestamp)}
            </div>
            <div className="event-cell source" style={cellStyle} title={source}>
                {source}
            </div>
            <div className="event-cell event-id" style={cellStyle}>
                <span>{event.reason}</span>
                {event.count > 1 && (
                    <span style={countBadgeStyle}>{event.count}</span>
                )}
            </div>
            <div className="event-cell category" style={cellStyle}>
                {event.count}
            </div>
        </div>
    );
};

