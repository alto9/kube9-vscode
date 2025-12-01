---
story_id: 005-implement-tree-view-refresh
session_id: add-restartrollout-restart-for-deployments-and-sta
feature_id: [workload-restart]
spec_id: [workload-restart-spec]
diagram_id: [workload-restart-flow]
status: pending
priority: medium
estimated_minutes: 20
---

# Implement Tree View Refresh After Restart

## Objective
Automatically refresh the tree view and any open namespace webviews after a successful restart to show new pod states.

## Context
After restarting a workload, users should see the updated state in the tree view, including new pods being created and old pods terminating. If a namespace webview is open, it should also refresh to reflect the restart.

## Implementation Steps

1. After successful restart (annotation applied + optional watch):
   - Call `treeProvider.refresh()` to update tree view
   - Find any open namespace webviews displaying this workload
   - Send refresh message to those webviews
2. Show success notification:
   - Use `vscode.window.showInformationMessage()`
   - Message: `Restarted ${resourceName} successfully`
3. Tree view should show:
   - Updated pod creation timestamps
   - Old pods in Terminating state (if rollout in progress)
   - New pods in ContainerCreating → Running states
4. If rollout watch was used, refresh happens after completion
5. If rollout watch was skipped, refresh happens immediately after annotation

## Files Affected
- `src/commands/restartWorkload.ts` - Add refresh logic and success notification
- `src/tree/treeProvider.ts` - Ensure refresh method exists
- `src/webview/namespaceWebview.ts` - Add refresh message handling (if needed)

## Acceptance Criteria
- [ ] Tree view refreshes automatically after successful restart
- [ ] Success notification appears with correct resource name
- [ ] Open namespace webviews receive refresh message
- [ ] New pod states are visible in tree view
- [ ] Old pods show Terminating status
- [ ] New pods show creation progress
- [ ] Refresh timing is correct (after watch completes or immediately if skipped)

## Dependencies
- 003-implement-restart-annotation-logic (needs successful restart to trigger refresh)
- 004-implement-rollout-watch (refresh timing depends on watch completion)

