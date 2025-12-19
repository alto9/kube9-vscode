---
story_id: 014-create-search-box-component
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: completed
feature_id:
  - event-viewer-filtering
spec_id:
  - event-viewer-components-spec
---

# Create SearchBox Component

## Objective

Create SearchBox component for real-time text search in event toolbar.

## Context

Search box provides quick filtering by text across event fields.

## Acceptance Criteria

- [x] Create `src/webview/event-viewer/components/SearchBox.tsx`
- [x] Accept `value` and `onChange` props
- [x] Render input with placeholder "Search events..."
- [x] Debounce onChange calls by ~300ms to avoid excessive updates
- [x] Clear button appears when text is entered
- [x] Handle Escape key to clear search
- [x] Include search icon (codicon-search)
- [x] Add proper aria-label for accessibility
- [x] TypeScript types for all props

## Files Affected

- **Create**: `src/webview/event-viewer/components/SearchBox.tsx`

## Implementation Notes

**Debouncing**: Use setTimeout/clearTimeout or custom hook to debounce onChange.

**Clear Button**: Show 'X' icon when value is non-empty, clicking clears search.

**Keyboard Shortcuts**: Escape clears, Ctrl+F focuses (handled in parent).

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/event-viewer-filtering.feature.md`

## Estimated Time

15 minutes

