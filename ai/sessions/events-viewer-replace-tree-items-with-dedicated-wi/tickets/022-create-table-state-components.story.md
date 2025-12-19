---
story_id: 022-create-table-state-components
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
feature_id:
  - event-viewer-ui
spec_id:
  - event-viewer-components-spec
---

# Create LoadingState, EmptyState, ErrorState Components

## Objective

Create state display components for table loading, empty, and error conditions.

## Context

Table needs to display appropriate UI for different states instead of just events.

## Acceptance Criteria

- [ ] Create `src/webview/event-viewer/components/LoadingState.tsx`
- [ ] Create `src/webview/event-viewer/components/EmptyState.tsx`
- [ ] Create `src/webview/event-viewer/components/ErrorState.tsx`
- [ ] LoadingState: spinning indicator with "Loading events..." message
- [ ] EmptyState: icon/illustration with "No events found" and filter suggestions
- [ ] ErrorState: error icon with error message and "Retry" button
- [ ] All states centered in table area
- [ ] Use VS Code theme colors
- [ ] TypeScript types for props (ErrorState accepts error string)

## Files Affected

- **Create**: `src/webview/event-viewer/components/LoadingState.tsx`
- **Create**: `src/webview/event-viewer/components/EmptyState.tsx`
- **Create**: `src/webview/event-viewer/components/ErrorState.tsx`

## Implementation Notes

**LoadingState**: Use codicon spinner animation.

**EmptyState**: Suggest "Try adjusting filters" or show current filter info.

**ErrorState**: Provide helpful troubleshooting hints in message.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/event-viewer-ui.feature.md`

## Estimated Time

20 minutes

