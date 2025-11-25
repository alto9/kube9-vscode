---
story_id: implement-error-handlers
session_id: add-ability-to-delete-kubernetes-resources-from-tr
feature_id: [tree-view-navigation]
spec_id: [tree-view-spec]
diagram_id: []
status: completed
priority: high
estimated_minutes: 30
---

## Objective

Implement comprehensive error handling for RBAC permission denied, resource not found, finalizer blocking, and network errors.

## Context

kubectl delete can fail for many reasons. Users need clear, actionable error messages for each scenario. This story adds error detection and user-friendly messaging for all failure cases identified in the feature scenarios.

## Implementation Steps

1. Create `handleDeleteError()` function in `src/commands/deleteResource.ts`
2. Parse kubectl stderr output to detect error types
3. For RBAC errors (contains "Forbidden" or "User cannot delete"):
   - Show error: "Permission denied: You don't have permission to delete this {resourceType}. Check your RBAC permissions."
4. For not found errors (contains "NotFound" or "not found"):
   - Show info: "Resource not found: {resourceType} {resourceName} may have been deleted already."
   - Return indication to refresh tree
5. For timeout errors (30 second timeout exceeded):
   - Show error: "Deletion timed out. Resource may be stuck due to finalizers. Try force delete option."
   - Offer "Force Delete" action button in notification
6. For network/cluster errors (connection failures):
   - Show error: "Deletion failed: Unable to connect to cluster. Check your connection and try again."
   - Offer "Retry" action button in notification
7. For generic errors:
   - Show error with kubectl stderr message
8. Update `executeKubectlDelete()` to use error handler for all failures

## Files Affected

- `src/commands/deleteResource.ts` - Add error handling logic

## Acceptance Criteria

- [x] RBAC permission denied shows clear permission error
- [x] Resource not found shows info message (not error)
- [x] Timeout suggests force delete option
- [x] Network errors show connection failure message
- [x] Error messages are user-friendly and actionable
- [x] Action buttons (Force Delete, Retry) work as expected
- [x] Generic errors display kubectl output for debugging

## Dependencies

- 004-implement-kubectl-delete-execution

