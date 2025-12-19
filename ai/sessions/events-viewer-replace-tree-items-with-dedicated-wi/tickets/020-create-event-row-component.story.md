---
story_id: 020-create-event-row-component
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: completed
feature_id:
  - event-viewer-ui
spec_id:
  - event-viewer-components-spec
---

# Create EventRow Component with Color Coding

## Objective

Create EventRow component that displays individual event in table with type-based color coding.

## Context

Each row displays event details in columns with color-coded background based on event type.

## Acceptance Criteria

- [x] Create `src/webview/event-viewer/components/EventRow.tsx`
- [x] Accept props: event, selected, onClick, style (for virtual scrolling)
- [x] Display columns: Level, Date/Time, Source, Event ID, Category
- [x] Level column: icon + type text
- [x] Date/Time column: relative time (e.g., "2 minutes ago")
- [x] Source column: namespace/kind/name format
- [x] Event ID column: reason with count badge if count > 1
- [x] Category column: count value
- [x] Apply color-coding class based on event.type (normal, warning, error)
- [x] Apply 'selected' class when selected
- [x] Handle onClick for row selection
- [x] Support keyboard navigation (tabIndex, role="row", aria-selected)
- [x] TypeScript types for props

## Files Affected

- **Create**: `src/webview/event-viewer/components/EventRow.tsx`
- **Create**: `src/webview/event-viewer/components/EventTypeIcon.tsx`
- **Create**: `src/webview/event-viewer/utils/formatTime.ts`

## Implementation Notes

**Color Coding**: CSS classes `.normal`, `.warning`, `.error` for background colors.

**Relative Time**: "2 minutes ago", "1 hour ago", "3 days ago" - implement formatRelativeTime utility.

**Count Badge**: Small circle with number when event.count > 1.

**EventTypeIcon**: Return appropriate codicon based on type (checkmark, warning, error).

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/event-viewer-ui.feature.md`

## Estimated Time

25 minutes

