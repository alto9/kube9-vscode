---
diagram_id: event-viewer-ui-layout
name: Event Viewer UI Layout
description: Three-pane layout structure and component hierarchy for Events Viewer UI
type: components
spec_id:
  - event-viewer-components-spec
feature_id:
  - event-viewer-ui
---

# Event Viewer UI Layout

This diagram shows the three-pane layout structure and how UI components are organized within the Events Viewer webview.

```json
{
  "nodes": [
    {
      "id": "root",
      "type": "default",
      "position": { "x": 400, "y": 50 },
      "data": {
        "label": "EventViewerApp",
        "description": "Root container"
      }
    },
    {
      "id": "toolbar",
      "type": "default",
      "position": { "x": 400, "y": 150 },
      "data": {
        "label": "Toolbar",
        "description": "Top action bar"
      }
    },
    {
      "id": "layout",
      "type": "default",
      "position": { "x": 400, "y": 250 },
      "data": {
        "label": "ThreePaneLayout",
        "description": "Main content area"
      }
    },
    {
      "id": "status-bar",
      "type": "default",
      "position": { "x": 400, "y": 650 },
      "data": {
        "label": "StatusBar",
        "description": "Bottom status info"
      }
    },
    {
      "id": "filter-pane",
      "type": "default",
      "position": { "x": 100, "y": 400 },
      "data": {
        "label": "FilterPane",
        "description": "Left sidebar (250px, resizable)"
      }
    },
    {
      "id": "main-column",
      "type": "default",
      "position": { "x": 400, "y": 400 },
      "data": {
        "label": "Main Column",
        "description": "Center + bottom panes"
      }
    },
    {
      "id": "event-table",
      "type": "default",
      "position": { "x": 400, "y": 500 },
      "data": {
        "label": "EventTable",
        "description": "Center pane (main)"
      }
    },
    {
      "id": "event-details",
      "type": "default",
      "position": { "x": 400, "y": 600 },
      "data": {
        "label": "EventDetails",
        "description": "Bottom pane (200px, resizable)"
      }
    },
    {
      "id": "refresh-btn",
      "type": "default",
      "position": { "x": 150, "y": 100 },
      "data": {
        "label": "RefreshButton",
        "description": "Manual refresh"
      }
    },
    {
      "id": "autorefresh-toggle",
      "type": "default",
      "position": { "x": 300, "y": 100 },
      "data": {
        "label": "AutoRefreshToggle",
        "description": "On/Off toggle"
      }
    },
    {
      "id": "export-btn",
      "type": "default",
      "position": { "x": 450, "y": 100 },
      "data": {
        "label": "ExportButton",
        "description": "Export JSON/CSV"
      }
    },
    {
      "id": "clear-filters-btn",
      "type": "default",
      "position": { "x": 600, "y": 100 },
      "data": {
        "label": "ClearFiltersButton",
        "description": "Reset filters"
      }
    },
    {
      "id": "search-box",
      "type": "default",
      "position": { "x": 750, "y": 100 },
      "data": {
        "label": "SearchBox",
        "description": "Text search"
      }
    },
    {
      "id": "type-filter",
      "type": "default",
      "position": { "x": 50, "y": 350 },
      "data": {
        "label": "TypeFilter",
        "description": "Normal/Warning/Error"
      }
    },
    {
      "id": "time-filter",
      "type": "default",
      "position": { "x": 150, "y": 350 },
      "data": {
        "label": "TimeRangeFilter",
        "description": "1h/24h/7d/All"
      }
    },
    {
      "id": "namespace-filter",
      "type": "default",
      "position": { "x": 50, "y": 450 },
      "data": {
        "label": "NamespaceFilter",
        "description": "Namespace dropdown"
      }
    },
    {
      "id": "resource-filter",
      "type": "default",
      "position": { "x": 150, "y": 450 },
      "data": {
        "label": "ResourceTypeFilter",
        "description": "Pod/Deployment/etc"
      }
    },
    {
      "id": "table-header",
      "type": "default",
      "position": { "x": 300, "y": 450 },
      "data": {
        "label": "TableHeader",
        "description": "Sortable columns"
      }
    },
    {
      "id": "virtual-list",
      "type": "default",
      "position": { "x": 450, "y": 450 },
      "data": {
        "label": "VirtualList",
        "description": "react-window"
      }
    },
    {
      "id": "event-row",
      "type": "default",
      "position": { "x": 600, "y": 450 },
      "data": {
        "label": "EventRow",
        "description": "Individual event"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "root",
      "target": "toolbar",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "root",
      "target": "layout",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "root",
      "target": "status-bar",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "layout",
      "target": "filter-pane",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "layout",
      "target": "main-column",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "main-column",
      "target": "event-table",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "main-column",
      "target": "event-details",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "toolbar",
      "target": "refresh-btn",
      "label": "contains",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "toolbar",
      "target": "autorefresh-toggle",
      "label": "contains",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "toolbar",
      "target": "export-btn",
      "label": "contains",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "toolbar",
      "target": "clear-filters-btn",
      "label": "contains",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "toolbar",
      "target": "search-box",
      "label": "contains",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "filter-pane",
      "target": "type-filter",
      "label": "contains",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "filter-pane",
      "target": "time-filter",
      "label": "contains",
      "type": "smoothstep"
    },
    {
      "id": "e15",
      "source": "filter-pane",
      "target": "namespace-filter",
      "label": "contains",
      "type": "smoothstep"
    },
    {
      "id": "e16",
      "source": "filter-pane",
      "target": "resource-filter",
      "label": "contains",
      "type": "smoothstep"
    },
    {
      "id": "e17",
      "source": "event-table",
      "target": "table-header",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e18",
      "source": "event-table",
      "target": "virtual-list",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e19",
      "source": "virtual-list",
      "target": "event-row",
      "label": "renders (virtualized)",
      "type": "smoothstep"
    }
  ]
}
```

## Layout Structure

### Overall Layout (EventViewerApp)

```
┌─────────────────────────────────────────────────────┐
│ Toolbar (Refresh | Auto-refresh | Export | Search) │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Filter   │          EventTable                      │
│ Pane     │          (Virtual Scrolling)             │
│          │                                          │
│ (250px)  │                                          │
│          ├──────────────────────────────────────────┤
│          │   EventDetails (Resizable, Collapsible)  │
│          │   (200px)                                │
└──────────┴──────────────────────────────────────────┘
│ StatusBar (247 events │ 2 filters │ Auto: On)      │
└─────────────────────────────────────────────────────┘
```

### Component Dimensions

**Fixed:**
- Toolbar height: ~50px
- StatusBar height: ~30px
- FilterPane initial width: 250px (resizable)
- EventDetails initial height: 200px (resizable, collapsible)

**Fluid:**
- FilterPane: resizable from 150px to 400px
- EventTable: fills remaining space
- EventDetails: resizable from 100px to 50% of available height

### Responsive Behavior

**Wide screens (>1200px):**
- All three panes visible
- FilterPane at comfortable 250px
- EventDetails at 200px

**Medium screens (768px - 1200px):**
- FilterPane may auto-collapse to icon bar
- EventTable takes more space
- EventDetails remains visible

**Narrow screens (<768px):**
- FilterPane as overlay
- EventTable full width
- EventDetails may default to collapsed
- Columns may be hidden based on priority

## Component Interactions

### User Clicks Event Row

```
EventRow → EventTable (onEventSelect)
          → EventViewerApp (setState)
          → EventDetails (receives selectedEvent)
          → displays event details
```

### User Changes Filter

```
TypeFilter → FilterPane (onChange)
            → EventViewerApp (onFilterChange)
            → sends message to extension
            → receives filtered events
            → EventTable re-renders
```

### User Resizes Pane

```
ResizeHandle (drag) → FilterPane/EventDetails (onWidthChange/onHeightChange)
                     → updates state
                     → re-renders with new dimensions
                     → saves to localStorage
```

## CSS Layout Strategy

### Flexbox Structure

```css
.event-viewer-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.toolbar {
  height: 50px;
  flex-shrink: 0;
}

.three-pane-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.filter-pane {
  width: var(--filter-pane-width, 250px);
  flex-shrink: 0;
}

.main-column {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.event-table {
  flex: 1;
  overflow: hidden;
}

.event-details {
  height: var(--details-height, 200px);
  flex-shrink: 0;
}

.status-bar {
  height: 30px;
  flex-shrink: 0;
}
```

## Theme Integration

Uses VS Code CSS variables:

```css
--vscode-editor-background
--vscode-editor-foreground
--vscode-sideBar-background
--vscode-list-activeSelectionBackground
--vscode-inputValidation-warningBackground
--vscode-inputValidation-errorBackground
--vscode-button-background
--vscode-button-foreground
```

## Virtual Scrolling

EventTable uses `react-window` for efficient rendering:

```typescript
<FixedSizeList
  height={600}
  itemCount={events.length}
  itemSize={40}
  width="100%"
>
  {({ index, style }) => (
    <EventRow 
      event={events[index]}
      style={style}
    />
  )}
</FixedSizeList>
```

Only visible rows are rendered in DOM, providing smooth scrolling for 500+ events.

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus management
- Screen reader announcements for state changes

