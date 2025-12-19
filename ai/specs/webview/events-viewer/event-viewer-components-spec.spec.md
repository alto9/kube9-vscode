---
spec_id: event-viewer-components-spec
name: Event Viewer Components Specification
description: Technical specification for React components that make up the Events Viewer UI
feature_id:
  - event-viewer-ui
  - event-viewer-filtering
  - event-viewer-actions
diagram_id:
  - event-viewer-ui-layout
---

# Event Viewer Components Specification

## Overview

The Events Viewer webview is built with React and consists of multiple components organized in a hierarchical structure. The components handle the three-pane layout, virtual scrolling, filtering, and user interactions.

## Technology Stack

- **React** (18+): UI framework
- **TypeScript**: Type safety
- **react-window** or **react-virtual**: Virtual scrolling for table
- **VS Code Webview API**: Communication with extension
- **CSS Variables**: Theme integration

## Component Hierarchy

```
EventViewerApp (root)
├── Toolbar
│   ├── RefreshButton
│   ├── AutoRefreshToggle
│   ├── ExportButton
│   ├── ClearFiltersButton
│   └── SearchBox
├── ThreePaneLayout
│   ├── FilterPane (left, resizable)
│   │   ├── FilterSection
│   │   │   ├── TypeFilter
│   │   │   ├── TimeRangeFilter
│   │   │   ├── NamespaceFilter
│   │   │   └── ResourceTypeFilter
│   ├── EventTable (main, center)
│   │   ├── TableHeader
│   │   ├── VirtualList (react-window)
│   │   │   └── EventRow[]
│   │   └── EmptyState | ErrorState | LoadingState
│   └── EventDetails (bottom, resizable)
│       ├── EventDetailsHeader
│       ├── EventDetailsContent
│       └── ActionButtons
└── StatusBar
    └── StatusItems
```

## Root Component

### EventViewerApp

**File**: `src/webview/event-viewer/EventViewerApp.tsx`

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { KubernetesEvent, EventFilters } from '../../types/Events';
import { Toolbar } from './components/Toolbar';
import { ThreePaneLayout } from './components/ThreePaneLayout';
import { StatusBar } from './components/StatusBar';

interface EventViewerState {
    events: KubernetesEvent[];
    filteredEvents: KubernetesEvent[];
    filters: EventFilters;
    selectedEvent: KubernetesEvent | null;
    loading: boolean;
    error: string | null;
    autoRefreshEnabled: boolean;
    clusterContext: string;
}

export const EventViewerApp: React.FC = () => {
    const [state, setState] = useState<EventViewerState>({
        events: [],
        filteredEvents: [],
        filters: {},
        selectedEvent: null,
        loading: true,
        error: null,
        autoRefreshEnabled: false,
        clusterContext: ''
    });

    // VS Code API for sending messages to extension
    const vscode = acquireVsCodeApi();

    // Send message to extension
    const sendMessage = useCallback((message: any) => {
        vscode.postMessage(message);
    }, [vscode]);

    // Handle messages from extension
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            
            switch (message.type) {
                case 'initialState':
                    setState(prev => ({
                        ...prev,
                        clusterContext: message.clusterContext,
                        filters: message.filters,
                        autoRefreshEnabled: message.autoRefreshEnabled
                    }));
                    break;
                
                case 'events':
                    setState(prev => ({
                        ...prev,
                        events: message.events,
                        filteredEvents: message.events,
                        loading: false,
                        error: null
                    }));
                    break;
                
                case 'loading':
                    setState(prev => ({
                        ...prev,
                        loading: message.loading
                    }));
                    break;
                
                case 'error':
                    setState(prev => ({
                        ...prev,
                        error: message.error,
                        loading: false
                    }));
                    break;
                
                case 'autoRefreshState':
                    setState(prev => ({
                        ...prev,
                        autoRefreshEnabled: message.enabled
                    }));
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        
        // Notify extension that webview is ready
        sendMessage({ type: 'ready' });

        return () => window.removeEventListener('message', handleMessage);
    }, [sendMessage]);

    // Handle refresh action
    const handleRefresh = useCallback(() => {
        sendMessage({ type: 'refresh' });
    }, [sendMessage]);

    // Handle filter change
    const handleFilterChange = useCallback((filters: EventFilters) => {
        setState(prev => ({ ...prev, filters }));
        sendMessage({ type: 'filter', filters });
    }, [sendMessage]);

    // Handle export action
    const handleExport = useCallback((format: 'json' | 'csv') => {
        sendMessage({ 
            type: 'export', 
            format,
            events: state.filteredEvents 
        });
    }, [sendMessage, state.filteredEvents]);

    // Handle toggle auto-refresh
    const handleToggleAutoRefresh = useCallback(() => {
        const newState = !state.autoRefreshEnabled;
        sendMessage({ 
            type: 'toggleAutoRefresh', 
            enabled: newState 
        });
    }, [sendMessage, state.autoRefreshEnabled]);

    // Handle event selection
    const handleEventSelect = useCallback((event: KubernetesEvent) => {
        setState(prev => ({ ...prev, selectedEvent: event }));
    }, []);

    return (
        <div className="event-viewer-app">
            <Toolbar
                onRefresh={handleRefresh}
                onExport={handleExport}
                onToggleAutoRefresh={handleToggleAutoRefresh}
                autoRefreshEnabled={state.autoRefreshEnabled}
                onFilterChange={handleFilterChange}
                filters={state.filters}
            />
            <ThreePaneLayout
                events={state.filteredEvents}
                selectedEvent={state.selectedEvent}
                onEventSelect={handleEventSelect}
                filters={state.filters}
                onFilterChange={handleFilterChange}
                loading={state.loading}
                error={state.error}
                sendMessage={sendMessage}
            />
            <StatusBar
                eventCount={state.filteredEvents.length}
                totalCount={state.events.length}
                filters={state.filters}
                autoRefreshEnabled={state.autoRefreshEnabled}
            />
        </div>
    );
};
```

## Toolbar Components

### Toolbar

**File**: `src/webview/event-viewer/components/Toolbar.tsx`

```typescript
import React from 'react';
import { RefreshButton } from './RefreshButton';
import { AutoRefreshToggle } from './AutoRefreshToggle';
import { ExportButton } from './ExportButton';
import { ClearFiltersButton } from './ClearFiltersButton';
import { SearchBox } from './SearchBox';
import { EventFilters } from '../../../types/Events';

interface ToolbarProps {
    onRefresh: () => void;
    onExport: (format: 'json' | 'csv') => void;
    onToggleAutoRefresh: () => void;
    autoRefreshEnabled: boolean;
    onFilterChange: (filters: EventFilters) => void;
    filters: EventFilters;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    onRefresh,
    onExport,
    onToggleAutoRefresh,
    autoRefreshEnabled,
    onFilterChange,
    filters
}) => {
    return (
        <div className="toolbar">
            <div className="toolbar-left">
                <RefreshButton onClick={onRefresh} />
                <AutoRefreshToggle 
                    enabled={autoRefreshEnabled}
                    onClick={onToggleAutoRefresh}
                />
                <ExportButton onExport={onExport} />
                <ClearFiltersButton 
                    onClick={() => onFilterChange({})}
                    disabled={Object.keys(filters).length === 0}
                />
            </div>
            <div className="toolbar-right">
                <SearchBox 
                    value={filters.searchText || ''}
                    onChange={(text) => onFilterChange({ ...filters, searchText: text })}
                />
            </div>
        </div>
    );
};
```

### RefreshButton

```typescript
interface RefreshButtonProps {
    onClick: () => void;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({ onClick }) => {
    return (
        <button 
            className="toolbar-button"
            onClick={onClick}
            title="Refresh events"
            aria-label="Refresh events"
        >
            <span className="codicon codicon-refresh"></span>
            Refresh
        </button>
    );
};
```

### AutoRefreshToggle

```typescript
interface AutoRefreshToggleProps {
    enabled: boolean;
    onClick: () => void;
}

export const AutoRefreshToggle: React.FC<AutoRefreshToggleProps> = ({ enabled, onClick }) => {
    return (
        <button
            className={`toolbar-button ${enabled ? 'active' : ''}`}
            onClick={onClick}
            title={`Auto-refresh: ${enabled ? 'On' : 'Off'}`}
            aria-label={`Auto-refresh: ${enabled ? 'On' : 'Off'}`}
            aria-pressed={enabled}
        >
            <span className={`codicon codicon-${enabled ? 'debug-pause' : 'debug-start'}`}></span>
            Auto-refresh: {enabled ? 'On' : 'Off'}
        </button>
    );
};
```

### ExportButton

```typescript
interface ExportButtonProps {
    onExport: (format: 'json' | 'csv') => void;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ onExport }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="export-button-container">
            <button
                className="toolbar-button"
                onClick={() => setMenuOpen(!menuOpen)}
                title="Export events"
                aria-label="Export events"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
            >
                <span className="codicon codicon-export"></span>
                Export
            </button>
            {menuOpen && (
                <div className="dropdown-menu">
                    <button onClick={() => { onExport('json'); setMenuOpen(false); }}>
                        Export as JSON
                    </button>
                    <button onClick={() => { onExport('csv'); setMenuOpen(false); }}>
                        Export as CSV
                    </button>
                </div>
            )}
        </div>
    );
};
```

## Layout Components

### ThreePaneLayout

**File**: `src/webview/event-viewer/components/ThreePaneLayout.tsx`

```typescript
import React, { useState } from 'react';
import { FilterPane } from './FilterPane';
import { EventTable } from './EventTable';
import { EventDetails } from './EventDetails';
import { KubernetesEvent, EventFilters } from '../../../types/Events';

interface ThreePaneLayoutProps {
    events: KubernetesEvent[];
    selectedEvent: KubernetesEvent | null;
    onEventSelect: (event: KubernetesEvent) => void;
    filters: EventFilters;
    onFilterChange: (filters: EventFilters) => void;
    loading: boolean;
    error: string | null;
    sendMessage: (message: any) => void;
}

export const ThreePaneLayout: React.FC<ThreePaneLayoutProps> = ({
    events,
    selectedEvent,
    onEventSelect,
    filters,
    onFilterChange,
    loading,
    error,
    sendMessage
}) => {
    const [filterPaneWidth, setFilterPaneWidth] = useState(250);
    const [detailsPaneHeight, setDetailsPaneHeight] = useState(200);
    const [detailsCollapsed, setDetailsCollapsed] = useState(false);

    return (
        <div className="three-pane-layout">
            <FilterPane
                width={filterPaneWidth}
                onWidthChange={setFilterPaneWidth}
                filters={filters}
                onFilterChange={onFilterChange}
                events={events}
            />
            <div className="main-and-details">
                <EventTable
                    events={events}
                    selectedEvent={selectedEvent}
                    onEventSelect={onEventSelect}
                    loading={loading}
                    error={error}
                    height={detailsCollapsed ? '100%' : `calc(100% - ${detailsPaneHeight}px)`}
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
```

### FilterPane

```typescript
interface FilterPaneProps {
    width: number;
    onWidthChange: (width: number) => void;
    filters: EventFilters;
    onFilterChange: (filters: EventFilters) => void;
    events: KubernetesEvent[];
}

export const FilterPane: React.FC<FilterPaneProps> = ({
    width,
    onWidthChange,
    filters,
    onFilterChange,
    events
}) => {
    // Calculate filter counts from events
    const typeCounts = useMemo(() => {
        return {
            Normal: events.filter(e => e.type === 'Normal').length,
            Warning: events.filter(e => e.type === 'Warning').length,
            Error: events.filter(e => e.type === 'Error').length
        };
    }, [events]);

    return (
        <div className="filter-pane" style={{ width: `${width}px` }}>
            <div className="filter-pane-header">Filters</div>
            <div className="filter-sections">
                <FilterSection title="Type">
                    <TypeFilter 
                        selected={filters.type}
                        onChange={(type) => onFilterChange({ ...filters, type })}
                        counts={typeCounts}
                    />
                </FilterSection>
                <FilterSection title="Time Range">
                    <TimeRangeFilter
                        selected={filters.since}
                        onChange={(since) => onFilterChange({ ...filters, since })}
                    />
                </FilterSection>
                <FilterSection title="Namespace">
                    <NamespaceFilter
                        selected={filters.namespace}
                        onChange={(namespace) => onFilterChange({ ...filters, namespace })}
                        events={events}
                    />
                </FilterSection>
                <FilterSection title="Resource Type">
                    <ResourceTypeFilter
                        selected={filters.resourceType}
                        onChange={(resourceType) => onFilterChange({ ...filters, resourceType })}
                        events={events}
                    />
                </FilterSection>
            </div>
            <ResizeHandle 
                orientation="vertical"
                onResize={(delta) => onWidthChange(width + delta)}
            />
        </div>
    );
};
```

## Table Components

### EventTable

**File**: `src/webview/event-viewer/components/EventTable.tsx`

```typescript
import React, { useMemo, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { KubernetesEvent } from '../../../types/Events';
import { EventRow } from './EventRow';
import { TableHeader } from './TableHeader';
import { LoadingState, ErrorState, EmptyState } from './TableStates';

type SortColumn = 'level' | 'time' | 'source' | 'eventId' | 'category';
type SortDirection = 'asc' | 'desc';

interface EventTableProps {
    events: KubernetesEvent[];
    selectedEvent: KubernetesEvent | null;
    onEventSelect: (event: KubernetesEvent) => void;
    loading: boolean;
    error: string | null;
    height: string;
}

export const EventTable: React.FC<EventTableProps> = ({
    events,
    selectedEvent,
    onEventSelect,
    loading,
    error,
    height
}) => {
    const [sortColumn, setSortColumn] = useState<SortColumn>('time');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Sort events
    const sortedEvents = useMemo(() => {
        return [...events].sort((a, b) => {
            let result = 0;
            switch (sortColumn) {
                case 'level':
                    result = a.type.localeCompare(b.type);
                    break;
                case 'time':
                    result = new Date(a.lastTimestamp).getTime() - new Date(b.lastTimestamp).getTime();
                    break;
                case 'source':
                    result = `${a.involvedObject.namespace}/${a.involvedObject.kind}/${a.involvedObject.name}`
                        .localeCompare(`${b.involvedObject.namespace}/${b.involvedObject.kind}/${b.involvedObject.name}`);
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

    if (loading) {
        return <LoadingState />;
    }

    if (error) {
        return <ErrorState error={error} />;
    }

    if (sortedEvents.length === 0) {
        return <EmptyState />;
    }

    return (
        <div className="event-table" style={{ height }}>
            <TableHeader
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
            />
            <List
                height={600} // Will be calculated from container
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
    );
};
```

### EventRow

```typescript
interface EventRowProps {
    event: KubernetesEvent;
    selected: boolean;
    onClick: () => void;
    style: React.CSSProperties;
}

export const EventRow: React.FC<EventRowProps> = ({
    event,
    selected,
    onClick,
    style
}) => {
    const eventTypeClass = event.type.toLowerCase();
    const source = `${event.involvedObject.namespace}/${event.involvedObject.kind}/${event.involvedObject.name}`;

    return (
        <div
            className={`event-row ${eventTypeClass} ${selected ? 'selected' : ''}`}
            onClick={onClick}
            style={style}
            role="row"
            aria-selected={selected}
            tabIndex={0}
        >
            <div className="event-cell level">
                <EventTypeIcon type={event.type} />
                {event.type}
            </div>
            <div className="event-cell time">
                {formatRelativeTime(event.lastTimestamp)}
            </div>
            <div className="event-cell source" title={source}>
                {source}
            </div>
            <div className="event-cell event-id">
                {event.reason}
                {event.count > 1 && <span className="count-badge">{event.count}</span>}
            </div>
            <div className="event-cell category">
                {event.count}
            </div>
        </div>
    );
};
```

## Details Components

### EventDetails

**File**: `src/webview/event-viewer/components/EventDetails.tsx`

```typescript
interface EventDetailsProps {
    event: KubernetesEvent | null;
    height: number;
    onHeightChange: (height: number) => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
    sendMessage: (message: any) => void;
}

export const EventDetails: React.FC<EventDetailsProps> = ({
    event,
    height,
    onHeightChange,
    collapsed,
    onToggleCollapse,
    sendMessage
}) => {
    if (!event) {
        return (
            <div className="event-details" style={{ height: `${height}px` }}>
                <div className="details-header">
                    <span>Event Details</span>
                    <button onClick={onToggleCollapse} className="collapse-button">
                        <span className={`codicon codicon-chevron-${collapsed ? 'up' : 'down'}`}></span>
                    </button>
                </div>
                {!collapsed && (
                    <div className="details-content empty">
                        Select an event to view details
                    </div>
                )}
            </div>
        );
    }

    const handleCopyMessage = () => {
        sendMessage({ type: 'copy', content: event.message });
    };

    const handleGoToResource = () => {
        sendMessage({
            type: 'navigate',
            resource: {
                namespace: event.involvedObject.namespace,
                kind: event.involvedObject.kind,
                name: event.involvedObject.name
            }
        });
    };

    const handleViewYaml = () => {
        sendMessage({
            type: 'viewYaml',
            resource: {
                namespace: event.involvedObject.namespace,
                kind: event.involvedObject.kind,
                name: event.involvedObject.name
            }
        });
    };

    return (
        <div className="event-details" style={{ height: `${height}px` }}>
            <ResizeHandle 
                orientation="horizontal"
                onResize={(delta) => onHeightChange(height - delta)}
            />
            <div className="details-header">
                <span>Event Details</span>
                <button onClick={onToggleCollapse} className="collapse-button">
                    <span className={`codicon codicon-chevron-${collapsed ? 'up' : 'down'}`}></span>
                </button>
            </div>
            {!collapsed && (
                <>
                    <div className="details-content">
                        <DetailRow label="Reason" value={event.reason} />
                        <DetailRow label="Type" value={event.type} />
                        <DetailRow label="Message" value={event.message} />
                        <DetailRow label="Namespace" value={event.involvedObject.namespace} />
                        <DetailRow label="Resource" value={`${event.involvedObject.kind}/${event.involvedObject.name}`} />
                        <DetailRow label="Count" value={event.count.toString()} />
                        <DetailRow label="First Occurrence" value={event.firstTimestamp} />
                        <DetailRow label="Last Occurrence" value={event.lastTimestamp} />
                    </div>
                    <div className="details-actions">
                        <button onClick={handleCopyMessage} className="action-button">
                            <span className="codicon codicon-copy"></span>
                            Copy Message
                        </button>
                        <button onClick={handleGoToResource} className="action-button">
                            <span className="codicon codicon-go-to-file"></span>
                            Go to Resource
                        </button>
                        <button onClick={handleViewYaml} className="action-button">
                            <span className="codicon codicon-file-code"></span>
                            View YAML
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
```

## Utility Components

### ResizeHandle

```typescript
interface ResizeHandleProps {
    orientation: 'horizontal' | 'vertical';
    onResize: (delta: number) => void;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ orientation, onResize }) => {
    const [dragging, setDragging] = useState(false);
    const [startPos, setStartPos] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        setDragging(true);
        setStartPos(orientation === 'horizontal' ? e.clientY : e.clientX);
    };

    useEffect(() => {
        if (!dragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const currentPos = orientation === 'horizontal' ? e.clientY : e.clientX;
            const delta = currentPos - startPos;
            onResize(delta);
            setStartPos(currentPos);
        };

        const handleMouseUp = () => {
            setDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, startPos, orientation, onResize]);

    return (
        <div
            className={`resize-handle ${orientation}`}
            onMouseDown={handleMouseDown}
        />
    );
};
```

## Type Definitions

```typescript
// File: src/types/Events.ts

export interface KubernetesEvent {
    reason: string;
    type: 'Normal' | 'Warning' | 'Error';
    message: string;
    involvedObject: {
        kind: string;
        namespace: string;
        name: string;
    };
    count: number;
    firstTimestamp: string;
    lastTimestamp: string;
}

export interface EventFilters {
    namespace?: string;
    type?: string;
    since?: string;
    resourceType?: string;
    searchText?: string;
}

export interface EventCache {
    events: KubernetesEvent[];
    timestamp: number;
    filters: EventFilters;
}

export const DEFAULT_EVENT_FILTERS: EventFilters = {
    namespace: 'all',
    type: 'all',
    since: '24h',
    resourceType: 'all',
    searchText: ''
};
```

## Styling Approach

Use VS Code CSS variables for theming:

```css
.event-viewer-app {
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-font-family);
}

.event-row.normal {
    background-color: var(--vscode-editor-background);
}

.event-row.warning {
    background-color: var(--vscode-inputValidation-warningBackground);
}

.event-row.error {
    background-color: var(--vscode-inputValidation-errorBackground);
}

.event-row.selected {
    background-color: var(--vscode-list-activeSelectionBackground);
    color: var(--vscode-list-activeSelectionForeground);
}
```

## Performance Considerations

- **Virtual Scrolling**: Use react-window for rendering only visible rows
- **Memoization**: Use React.useMemo for expensive computations (sorting, filtering)
- **Callbacks**: Use React.useCallback to prevent unnecessary re-renders
- **Debouncing**: Debounce search input to avoid excessive filtering

## Accessibility

- **Keyboard Navigation**: Tab order, arrow keys for table navigation
- **ARIA Labels**: All interactive elements have labels
- **Screen Reader Support**: Proper semantic HTML and ARIA attributes
- **Focus Management**: Visible focus indicators and logical focus order

