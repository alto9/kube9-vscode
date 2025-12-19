import React, { useState } from 'react';
import { KubernetesEvent, EventFilters } from '../../../types/Events';
import { FilterPane } from './FilterPane';
import { EventTable } from './EventTable';
import { EventDetails } from './EventDetails';

/**
 * Props for ThreePaneLayout component.
 */
interface ThreePaneLayoutProps {
    events: KubernetesEvent[];
    selectedEvent: KubernetesEvent | null;
    onEventSelect: (event: KubernetesEvent) => void;
    filters: EventFilters;
    onFilterChange: (filters: EventFilters) => void;
    loading: boolean;
    error: string | null;
    sendMessage: (message: any) => void;
    onRetry?: () => void;
}

/**
 * ThreePaneLayout component.
 * Manages the three-pane structure (filters, table, details) with resizable panes.
 */
export const ThreePaneLayout: React.FC<ThreePaneLayoutProps> = ({
    events,
    selectedEvent,
    onEventSelect,
    filters,
    onFilterChange,
    loading,
    error,
    sendMessage,
    onRetry
}) => {
    const [filterPaneWidth, setFilterPaneWidth] = useState(250);
    const [detailsPaneHeight, setDetailsPaneHeight] = useState(200);
    const [detailsCollapsed, setDetailsCollapsed] = useState(false);

    // Calculate EventTable height dynamically based on details collapsed state
    const eventTableHeight = detailsCollapsed 
        ? '100%' 
        : `calc(100% - ${detailsPaneHeight}px)`;

    const layoutStyle: React.CSSProperties = {
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        height: '100%'
    };

    const mainAndDetailsStyle: React.CSSProperties = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0
    };

    return (
        <div className="three-pane-layout" style={layoutStyle}>
            <FilterPane
                width={filterPaneWidth}
                onWidthChange={setFilterPaneWidth}
                filters={filters}
                onFilterChange={onFilterChange}
                events={events}
            />
            <div className="main-and-details" style={mainAndDetailsStyle}>
                <EventTable
                    events={events}
                    selectedEvent={selectedEvent}
                    onEventSelect={onEventSelect}
                    loading={loading}
                    error={error}
                    height={eventTableHeight}
                    onRetry={onRetry}
                />
                <EventDetails
                    event={selectedEvent}
                    height={detailsCollapsed ? 30 : detailsPaneHeight}
                    onHeightChange={setDetailsPaneHeight}
                    collapsed={detailsCollapsed}
                    onToggleCollapse={() => setDetailsCollapsed(!detailsCollapsed)}
                    sendMessage={sendMessage}
                />
            </div>
        </div>
    );
};

