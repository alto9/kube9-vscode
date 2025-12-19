import React from 'react';
import { KubernetesEvent } from '../../../types/Events';

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
}

/**
 * EventTable component stub.
 * Main center pane displaying events in a virtualized table.
 * Will be fully implemented in story 019.
 */
export const EventTable: React.FC<EventTableProps> = ({
    events,
    selectedEvent,
    onEventSelect,
    loading,
    error,
    height
}) => {
    return (
        <div
            className="event-table"
            style={{
                height,
                backgroundColor: 'var(--vscode-editor-background)',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <div style={{ padding: '12px' }}>
                <div>EventTable (placeholder)</div>
                <div>Events: {events.length}</div>
                <div>Selected: {selectedEvent ? selectedEvent.reason : 'None'}</div>
                {loading && <div>Loading...</div>}
                {error && <div style={{ color: 'var(--vscode-errorForeground)' }}>Error: {error}</div>}
            </div>
        </div>
    );
};

