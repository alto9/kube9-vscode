---
story_id: 019-create-event-table-with-virtual-scrolling
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
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

- [ ] Create `src/webview/event-viewer/components/EventTable.tsx`
- [ ] Accept props: events, selectedEvent, onEventSelect, loading, error, height
- [ ] Implement sorting by column (level, time, source, eventId, category)
- [ ] Use `useMemo` for sorted events
- [ ] Use `FixedSizeList` from react-window for virtualization
- [ ] Render TableHeader for column headers
- [ ] Render EventRow for each event (virtualized)
- [ ] Show LoadingState when loading
- [ ] Show ErrorState when error exists
- [ ] Show EmptyState when no events
- [ ] Track sortColumn and sortDirection in state
- [ ] Handle sort direction toggle (asc ↔ desc)
- [ ] TypeScript types for all props and state

## Files Affected

- **Create**: `src/webview/event-viewer/components/EventTable.tsx`

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

