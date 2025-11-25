---
story_id: implement-kubectl-delete-execution
session_id: add-ability-to-delete-kubernetes-resources-from-tr
feature_id: [tree-view-navigation]
spec_id: [tree-view-spec]
diagram_id: []
status: completed
priority: high
estimated_minutes: 25
---

## Objective

Implement kubectl delete command execution with progress indication for standard (non-force) deletions.

## Context

Once users confirm deletion, we need to execute `kubectl delete <resource-type> <name> -n <namespace>` and show progress. This story handles the basic deletion flow without force flags or error handling. Uses existing kubectl utilities for consistency.

## Implementation Steps

1. Create `executeKubectlDelete()` function in `src/commands/deleteResource.ts`
2. Build kubectl command: `kubectl delete <resourceType> <resourceName> -n <namespace> --output=json`
3. For cluster-scoped resources (if namespace is empty), omit `-n` flag
4. Use existing kubectl wrapper from `src/kubectl/` to execute command
5. Wrap execution in `vscode.window.withProgress()` with notification location
6. Show progress message: "Deleting {resourceType} {resourceName}..."
7. Set 30-second timeout for the operation
8. Return success/failure result
9. Update command handler to call executeKubectlDelete after confirmation
10. Show success notification: "Successfully deleted {resourceType} {resourceName}"

## Files Affected

- `src/commands/deleteResource.ts` - Add kubectl delete execution
- `src/extension.ts` - Update command handler to execute deletion

## Acceptance Criteria

- [x] Confirmed deletions trigger kubectl delete command
- [x] Progress indicator shows "Deleting..." message
- [x] kubectl command includes correct resource type, name, and namespace
- [x] Cluster-scoped resources omit namespace flag
- [x] Success notification appears after successful deletion
- [x] Operation times out after 30 seconds
- [x] Uses existing kubectl utilities for consistency

## Dependencies

- 002-create-delete-confirmation-dialog

