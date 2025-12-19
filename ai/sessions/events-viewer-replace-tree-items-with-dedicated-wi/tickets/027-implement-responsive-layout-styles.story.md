---
story_id: 027-implement-responsive-layout-styles
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
feature_id:
  - event-viewer-ui
spec_id:
  - event-viewer-components-spec
---

# Implement Responsive Layout Styles

## Objective

Add CSS media queries and responsive behavior for narrow window sizes.

## Context

Layout should adapt gracefully to different window sizes, with filter pane collapsing on narrow windows.

## Acceptance Criteria

- [ ] Add media queries to `index.css` for:
  - Wide screens (>1200px): All panes visible, comfortable sizing
  - Medium screens (768px-1200px): FilterPane narrower or collapsible
  - Narrow screens (<768px): FilterPane as overlay, table full width
- [ ] Filter pane auto-collapses on narrow screens
- [ ] Table columns may be hidden based on priority on narrow screens
- [ ] Details pane may default to collapsed on narrow screens
- [ ] Horizontal scrolling available when needed
- [ ] Layout remains usable at minimum window size
- [ ] No content cut off or inaccessible

## Files Affected

- **Modify**: `src/webview/event-viewer/index.css`

## Implementation Notes

**Media Query Examples**:
```css
@media (max-width: 768px) {
  .filter-pane {
    position: absolute;
    left: -250px;
    transition: left 0.3s;
  }
  
  .filter-pane.open {
    left: 0;
  }
}
```

**Column Priority**: Keep Level, Date/Time, Source visible; hide Category on narrow screens.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-components-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/event-viewer-ui.feature.md`

## Estimated Time

20 minutes

