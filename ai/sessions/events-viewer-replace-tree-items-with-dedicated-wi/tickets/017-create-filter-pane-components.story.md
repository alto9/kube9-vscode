---
story_id: 017-create-filter-pane-components
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
feature_id:
  - event-viewer-filtering
spec_id:
  - event-viewer-components-spec
---

# Create FilterPane and FilterSection Components

## Objective

Create FilterPane container and FilterSection wrapper components for organizing filter controls.

## Context

FilterPane is the left sidebar containing all filter controls organized in collapsible sections.

## Acceptance Criteria

- [ ] Create `src/webview/event-viewer/components/FilterPane.tsx`
- [ ] Create `src/webview/event-viewer/components/FilterSection.tsx`
- [ ] FilterPane accepts: width, onWidthChange, filters, onFilterChange, events
- [ ] Calculate filter counts from events (useMemo)
- [ ] Render filter header "Filters"
- [ ] Render multiple FilterSection children
- [ ] Include ResizeHandle for width adjustment
- [ ] FilterSection accepts: title, children
- [ ] FilterSection is collapsible (expand/collapse)
- [ ] TypeScript types for all props

## Files Affected

- **Create**: `src/webview/event-viewer/components/FilterPane.tsx`
- **Create**: `src/webview/event-viewer/components/FilterSection.tsx`

## Implementation Notes

**Filter Counts**: Calculate counts for each filter option from events array using useMemo.

**FilterSection**: Simple wrapper with collapsible header and content area.

**Width**: Use inline style to set width based on prop.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/event-viewer-filtering.feature.md`

## Estimated Time

20 minutes

