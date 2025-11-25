---
session_id: add-ability-to-delete-kubernetes-resources-from-tr
start_time: '2025-11-21T15:32:12.275Z'
end_time: '2025-11-21T15:40:20.611Z'
status: development
problem_statement: Add ability to delete Kubernetes resources from tree view
changed_files:
  - path: ai/features/navigation/tree-view-navigation.feature.md
    change_type: modified
    scenarios_added:
      - Delete resource from context menu
      - Confirmation dialog shows resource details
      - Confirmation dialog shows warning for managed pods
      - Force delete checkbox for stuck resources
      - Successfully deleting a resource
      - Force deleting a stuck resource
      - Canceling resource deletion
      - Handling RBAC permission denied
      - Handling resource not found
      - Handling finalizer blocking deletion
      - Handling kubectl command failure
      - Deleting different resource types
      - Delete option available for all resource types
      - Tree view refresh after deletion shows updated state
start_commit: 15f1e10c590d09b5b61873426cfef6fa423b7b5b
---
## Problem Statement

Add ability to delete Kubernetes resources from tree view

## Goals

- Enable users to delete Kubernetes resources directly from the tree view without switching to terminal
- Provide clear confirmation dialogs with resource details and consequences
- Support force deletion for resources stuck with finalizers
- Handle all error scenarios gracefully (RBAC, not found, finalizers, network issues)
- Automatically refresh tree view after successful deletion
- Maintain consistency with kubectl delete behavior

## Approach

1. **Context Menu Integration**: Add "Delete Resource" option to right-click context menu for all resource types
2. **Confirmation Dialog**: Display modal dialog with:
   - Resource type, name, and namespace
   - Warning about consequences (e.g., pods recreated by deployments)
   - Optional "Force Delete" checkbox for stuck resources
3. **kubectl Execution**: Execute `kubectl delete <resource-type> <name> -n <namespace>` with optional `--grace-period=0 --force` flags
4. **Progress & Feedback**: Show progress indicator during deletion, then success/failure notification
5. **Tree Refresh**: Automatically refresh tree view after successful deletion to reflect changes
6. **Error Handling**: Detect and display user-friendly messages for RBAC errors, not found errors, and finalizer blocking

## Key Decisions

- **Use kubectl directly**: Leverage existing kubectl integration rather than Kubernetes API client for consistency
- **Force delete as opt-in**: Require explicit checkbox selection to prevent accidental force deletions
- **Context-aware warnings**: Generate specific warning messages based on resource type (e.g., warn about StatefulSet consequences)
- **No confirmation bypass**: Always show confirmation dialog, even for single deletions (safety first)
- **RBAC-aware**: Handle permission errors gracefully with clear guidance for users
- **Non-blocking UI**: Run kubectl delete asynchronously with progress indicator

## Notes

- Consider adding bulk delete in future iterations
- May need to handle CRDs differently than built-in resource types
- Force delete should clearly warn about potential data loss and orphaned resources
- Tree refresh should be selective (only affected resource category) for performance
