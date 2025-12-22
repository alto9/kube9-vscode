---
story_id: 019-create-event-table-with-virtual-scrolling
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: completed
feature_id:
  - event-viewer-ui
spec_id:
  - event-viewer-components-spec
---

# Create EventTable Component with Virtual Scrolling

## Objective

Create EventTable component that displays events in a virtualized table for performance with large event lists.

## Context

EventTable is the main center pane displaying events. Uses react-window for virtual scrolling.

## Acceptance Criteria

- [x] Create `src/webview/event-viewer/components/EventTable.tsx`
- [x] Accept props: events, selectedEvent, onEventSelect, loading, error, height
- [x] Implement sorting by column (level, time, source, eventId, category)
- [x] Use `useMemo` for sorted events
- [x] Use `FixedSizeList` from react-window for virtualization
- [x] Render TableHeader for column headers
- [x] Render EventRow for each event (virtualized)
- [x] Show LoadingState when loading
- [x] Show ErrorState when error exists
- [x] Show EmptyState when no events
- [x] Track sortColumn and sortDirection in state
- [x] Handle sort direction toggle (asc ↔ desc)
- [x] TypeScript types for all props and state

## Files Affected

- **Create**: `src/webview/event-viewer/components/EventTable.tsx`
- **Create**: `src/webview/event-viewer/components/TableHeader.tsx`
- **Create**: `src/webview/event-viewer/components/EventRow.tsx`
- **Create**: `src/webview/event-viewer/components/TableStates.tsx`
- **Create**: `src/webview/event-viewer/utils/dateUtils.ts`

## Implementation Notes

**Virtual Scrolling**:
```typescript
<FixedSizeList
  height={600}
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
</FixedSizeList>
```

**Sorting**: Implement compare functions for each column type.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/event-viewer-ui.feature.md`

## Estimated Time

30 minutes

