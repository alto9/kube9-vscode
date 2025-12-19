import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { KubernetesEvent } from '../../../types/Events';
import { TableHeader, SortColumn, SortDirection } from './TableHeader';
import { EventRow } from './EventRow';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';

/**
 * Props for EventTable component.
 */
interface EventTableProps {
    events: KubernetesEvent[];
    selectedEvent: KubernetesEvent | null;
    onEventSelect: (event: KubernetesEvent) => void;
    loading: boolean;
    error: string | null;
    height: string;
    onRetry?: () => void;
}

/**
 * EventTable component.
 * Main center pane displaying events in a virtualized table with sorting.
 */
export const EventTable: React.FC<EventTableProps> = ({
    events,
    selectedEvent,
    onEventSelect,
    loading,
    error,
    height,
    onRetry
}) => {
    const [sortColumn, setSortColumn] = useState<SortColumn>('time');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const containerRef = useRef<HTMLDivElement>(null);
    const [listHeight, setListHeight] = useState(600);

    // Calculate list height from container
    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                const headerHeight = 40; // Approximate header height
                const containerHeight = containerRef.current.clientHeight;
                setListHeight(Math.max(0, containerHeight - headerHeight));
            }
        };

        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, [height]);

    // Sort events
    const sortedEvents = useMemo(() => {
        return [...events].sort((a, b) => {
            let result = 0;
            switch (sortColumn) {
                case 'level':
                    // Normal < Warning < Error
                    const levelOrder: Record<string, number> = {
                        Normal: 0,
                        Warning: 1,
                        Error: 2
                    };
                    result = (levelOrder[a.type] || 0) - (levelOrder[b.type] || 0);
                    break;
                case 'time':
                    result =
                        new Date(a.lastTimestamp).getTime() -
                        new Date(b.lastTimestamp).getTime();
                    break;
                case 'source':
                    const sourceA = `${a.involvedObject.namespace}/${a.involvedObject.kind}/${a.involvedObject.name}`;
                    const sourceB = `${b.involvedObject.namespace}/${b.involvedObject.kind}/${b.involvedObject.name}`;
                    result = sourceA.localeCompare(sourceB);
                    break;
                case 'eventId':
                    result = a.reason.localeCompare(b.reason);
                    break;
                case 'category':
                    result = a.count - b.count;
                    break;
            }
            return sortDirection === 'asc' ? result : -result;
        });
    }, [events, sortColumn, sortDirection]);

    const handleSort = (column: SortColumn) => {
        if (column === sortColumn) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('desc');
        }
    };

    const containerStyle: React.CSSProperties = {
        height,
        backgroundColor: 'var(--vscode-editor-background)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    };

    const listContainerStyle: React.CSSProperties = {
        flex: 1,
        overflow: 'hidden'
    };

    // Show loading state
    if (loading) {
        return (
            <div className="event-table" style={containerStyle} ref={containerRef}>
                <LoadingState />
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="event-table" style={containerStyle} ref={containerRef}>
                <ErrorState error={error} onRetry={onRetry} />
            </div>
        );
    }

    // Show empty state
    if (sortedEvents.length === 0) {
        return (
            <div className="event-table" style={containerStyle} ref={containerRef}>
                <EmptyState />
            </div>
        );
    }

    // Render table with virtual scrolling
    return (
        <div className="event-table" style={containerStyle} ref={containerRef}>
            <TableHeader
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
            />
            <div style={listContainerStyle}>
                <List
                    height={listHeight}
                    itemCount={sortedEvents.length}
                    itemSize={40}
                    width="100%"
                >
                    {({ index, style }) => (
                        <EventRow
                            event={sortedEvents[index]}
                            selected={sortedEvents[index] === selectedEvent}
                            onClick={() => onEventSelect(sortedEvents[index])}
                            style={style}
                        />
                    )}
                </List>
            </div>
        </div>
    );
};

