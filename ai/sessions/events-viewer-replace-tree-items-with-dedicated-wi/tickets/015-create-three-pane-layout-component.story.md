---
story_id: 015-create-three-pane-layout-component
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
feature_id:
  - event-viewer-ui
spec_id:
  - event-viewer-components-spec
---

# Create ThreePaneLayout Component

## Objective

Create ThreePaneLayout component that manages the three-pane structure (filters, table, details).

## Context

Three-pane layout is the main content area with resizable panes.

## Acceptance Criteria

- [ ] Create `src/webview/event-viewer/components/ThreePaneLayout.tsx`
- [ ] Accept props: events, selectedEvent, onEventSelect, filters, onFilterChange, loading, error, sendMessage
- [ ] Manage state for: filterPaneWidth, detailsPaneHeight, detailsCollapsed
- [ ] Render FilterPane (left, resizable)
- [ ] Render main-and-details column with EventTable and EventDetails
- [ ] Pass appropriate props to child components
- [ ] Support pane resizing via ResizeHandle
- [ ] Calculate heights dynamically based on details collapsed state
- [ ] TypeScript types for all props and state

## Files Affected

- **Create**: `src/webview/event-viewer/components/ThreePaneLayout.tsx`

## Implementation Notes

**Layout Structure**:
```
<div className="three-pane-layout">
  <FilterPane width={filterPaneWidth} onWidthChange={setFilterPaneWidth} />
  <div className="main-and-details">
    <EventTable height={calculatedHeight} />
    <EventDetails height={detailsPaneHeight} onHeightChange={setDetailsPaneHeight} />
  </div>
</div>
```

**Dynamic Heights**: EventTable height adjusts when EventDetails is collapsed.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`
- Diagram: `ai/diagrams/webview/events-viewer/event-viewer-ui-layout.diagram.md`

## Estimated Time

20 minutes

