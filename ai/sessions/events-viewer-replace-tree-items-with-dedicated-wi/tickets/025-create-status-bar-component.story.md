---
story_id: 025-create-status-bar-component
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
feature_id:
  - event-viewer-ui
spec_id:
  - event-viewer-components-spec
---

# Create StatusBar Component

## Objective

Create StatusBar component that displays event count, filter status, and auto-refresh state at bottom of interface.

## Context

Status bar provides at-a-glance information about current view state.

## Acceptance Criteria

- [ ] Create `src/webview/event-viewer/components/StatusBar.tsx`
- [ ] Accept props: eventCount, totalCount, filters, autoRefreshEnabled
- [ ] Display: "{eventCount} events" or "{eventCount} of {totalCount} events" when filtered
- [ ] Display: "{n} filters active" when filters applied
- [ ] Display: "Auto-refresh: On (30s)" or "Auto-refresh: Off"
- [ ] Display: "Updated: {relative time} ago" (optional, future enhancement)
- [ ] Layout items horizontally with appropriate spacing
- [ ] Use subtle styling consistent with VS Code status bars
- [ ] TypeScript types for props

## Files Affected

- **Create**: `src/webview/event-viewer/components/StatusBar.tsx`

## Implementation Notes

**Filter Count**: Count non-default filter values in filters object.

**Event Count**: Show filtered count vs total count when filtering is active.

**Auto-refresh Status**: Include interval time in display.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/event-viewer-ui.feature.md`

## Estimated Time

15 minutes

