---
story_id: 023-create-event-details-component
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
feature_id:
  - event-viewer-ui
spec_id:
  - event-viewer-components-spec
---

# Create EventDetails Component

## Objective

Create EventDetails component that displays full details of selected event in bottom pane.

## Context

Bottom pane shows detailed event information when user selects event from table.

## Acceptance Criteria

- [ ] Create `src/webview/event-viewer/components/EventDetails.tsx`
- [ ] Accept props: event, height, onHeightChange, collapsed, onToggleCollapse, sendMessage
- [ ] Render ResizeHandle for height adjustment
- [ ] Render details header with "Event Details" title and collapse button
- [ ] Show empty message when no event selected
- [ ] Display event fields when event selected: Reason, Type, Message, Namespace, Resource, Count, First/Last Occurrence
- [ ] Use DetailRow component for each field (label/value pairs)
- [ ] Handle collapse/expand via chevron button
- [ ] Adjust height via inline style
- [ ] TypeScript types for all props

## Files Affected

- **Create**: `src/webview/event-viewer/components/EventDetails.tsx`
- **Create**: `src/webview/event-viewer/components/DetailRow.tsx`

## Implementation Notes

**Collapsed State**: When collapsed, only show header with expand button, height should be minimal (~30px).

**DetailRow**: Simple component with label and value, formatted consistently.

**Scrolling**: If details are long, content area should scroll.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/event-viewer-ui.feature.md`

## Estimated Time

20 minutes

