---
story_id: 028-remove-event-tree-item
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
feature_id:
  - event-viewer-panel
spec_id: []
---

# Remove EventTreeItem (Old Tree-Based Display)

## Objective

Remove the old `EventTreeItem` class that displayed events as tree children, now replaced by webview.

## Context

EventsCategory no longer expands to show tree children. EventTreeItem is obsolete.

## Acceptance Criteria

- [ ] Delete `src/tree/items/EventTreeItem.ts` file
- [ ] Remove any imports of EventTreeItem from other files
- [ ] Remove EventTreeItem from tree provider's getChildren logic for EventsCategory
- [ ] Verify EventsCategory no longer returns children
- [ ] Test that clicking Events category opens webview (not tree expansion)
- [ ] No broken imports or references remain

## Files Affected

- **Delete**: `src/tree/items/EventTreeItem.ts`
- **Modify**: Any files importing EventTreeItem
- **Modify**: ClusterTreeProvider getChildren method (if applicable)

## Implementation Notes

**Search for References**: Use IDE find-all-references to locate all EventTreeItem usage.

**Tree Provider**: Ensure EventsCategory case returns empty array or doesn't expand.

**Testing**: Click Events category in tree to confirm webview opens instead of expansion.

## Linked Resources

- Feature: `ai/features/webview/events-viewer/event-viewer-panel.feature.md`

## Estimated Time

15 minutes

