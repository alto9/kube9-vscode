---
story_id: implement-tree-refresh-after-deletion
session_id: add-ability-to-delete-kubernetes-resources-from-tr
feature_id: [tree-view-navigation]
spec_id: [tree-view-spec]
diagram_id: []
status: completed
priority: high
estimated_minutes: 20
---

## Objective

Automatically refresh the tree view after successful deletion to remove the deleted resource from the display.

## Context

After deleting a resource, users expect it to disappear from the tree view immediately. This story implements selective tree refresh that updates only the affected resource category while preserving the tree expansion state where possible.

## Implementation Steps

1. Get reference to the tree data provider (ClusterTreeProvider) in delete command
2. After successful deletion, call tree provider's refresh method
3. If possible, refresh only the specific resource category (e.g., just Deployments)
4. Preserve tree expansion state where possible
5. For "not found" errors, also trigger refresh to sync current state
6. Do NOT refresh on permission errors or network errors (resource still exists)
7. Add logic to collapse category if the deleted resource was the last item

## Files Affected

- `src/commands/deleteResource.ts` - Add tree refresh after deletion
- `src/tree/ClusterTreeProvider.ts` - May need to expose selective refresh method

## Acceptance Criteria

- [ ] Tree view refreshes automatically after successful deletion
- [ ] Deleted resource no longer appears in tree view
- [ ] Other resources remain visible and unchanged
- [ ] Tree expansion state is preserved where possible
- [ ] Refresh happens for "not found" errors to sync state
- [ ] No refresh on permission denied or network errors
- [ ] Category collapses if last resource was deleted
- [ ] Refresh is selective (only affected category, not entire tree)

## Dependencies

- 004-implement-kubectl-delete-execution
- 006-implement-error-handlers

