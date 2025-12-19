---
story_id: 016-create-resize-handle-component
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
feature_id:
  - event-viewer-ui
spec_id:
  - event-viewer-components-spec
---

# Create ResizeHandle Component

## Objective

Create ResizeHandle component for dragging pane dividers to resize FilterPane and EventDetails.

## Context

Resizable panes allow users to adjust layout to their preference.

## Acceptance Criteria

- [ ] Create `src/webview/event-viewer/components/ResizeHandle.tsx`
- [ ] Accept props: orientation ('horizontal' | 'vertical'), onResize callback
- [ ] Change cursor on hover (resize cursor)
- [ ] Handle mousedown to start drag
- [ ] Handle mousemove to resize (call onResize with delta)
- [ ] Handle mouseup to end drag
- [ ] Clean up event listeners properly
- [ ] Visual feedback during drag (optional)
- [ ] TypeScript types for props

## Files Affected

- **Create**: `src/webview/event-viewer/components/ResizeHandle.tsx`

## Implementation Notes

**Drag Logic**:
1. mousedown: capture start position, set dragging state
2. mousemove: calculate delta, call onResize(delta)
3. mouseup: clear dragging state, remove listeners

**Event Listeners**: Attach to `document` during drag, remove on mouseup.

**Cursor**: `cursor: 'ew-resize'` for vertical, `'ns-resize'` for horizontal.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`

## Estimated Time

20 minutes

