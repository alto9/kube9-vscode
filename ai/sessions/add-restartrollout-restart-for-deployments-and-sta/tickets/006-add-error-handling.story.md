---
story_id: 006-add-error-handling
session_id: add-restartrollout-restart-for-deployments-and-sta
feature_id: [workload-restart]
spec_id: [workload-restart-spec]
diagram_id: [workload-restart-flow]
status: pending
priority: high
estimated_minutes: 25
---

# Add Comprehensive Error Handling

## Objective
Implement error handling for all failure scenarios including resource not found, permission denied, cluster unavailable, and rollout timeout.

## Context
Restart operations can fail for various reasons. Users should receive clear error messages that explain what went wrong and help them understand the issue. The tree view should refresh even on error to show actual state.

## Implementation Steps

1. Wrap restart logic in try-catch blocks
2. Handle specific error types:
   - **Resource Not Found** (404): "Resource may have been deleted"
   - **Permission Denied** (403): "Insufficient permissions to restart workload"
   - **Cluster Unavailable**: "Cannot connect to cluster"
   - **Annotations Missing**: Automatically create annotations object, don't error
   - **Rollout Timeout**: "Rollout did not complete within 5 minutes"
   - **API Timeout**: "Request timed out"
3. Format error messages:
   ```
   Failed to restart {resourceName}: {errorReason}
   
   Details: {apiErrorMessage}
   ```
4. Show error notification with `vscode.window.showErrorMessage()`
5. Refresh tree view even on error to show actual state
6. Log errors with full details for debugging
7. Ensure partial operations don't leave system in bad state

## Files Affected
- `src/commands/restartWorkload.ts` - Add try-catch and error handling
- `src/kubernetes/client.ts` - Ensure errors include useful details

## Acceptance Criteria
- [ ] All error types have specific handling
- [ ] Error messages are clear and actionable
- [ ] Error notifications include API error details
- [ ] Tree view refreshes even when errors occur
- [ ] Annotations missing scenario is handled gracefully (create it)
- [ ] Timeout errors are caught and reported
- [ ] Connection errors are handled appropriately
- [ ] No unhandled promise rejections
- [ ] Errors are logged for debugging

## Dependencies
- 003-implement-restart-annotation-logic (needs restart logic to add error handling)
- 004-implement-rollout-watch (needs watch logic to handle timeout errors)

