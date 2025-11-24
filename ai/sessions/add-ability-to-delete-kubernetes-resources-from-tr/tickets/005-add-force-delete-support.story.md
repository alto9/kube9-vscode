---
story_id: add-force-delete-support
session_id: add-ability-to-delete-kubernetes-resources-from-tr
feature_id: [tree-view-navigation]
spec_id: [tree-view-spec]
diagram_id: []
status: completed
priority: medium
estimated_minutes: 15
---

## Objective

Add support for force deletion with `--grace-period=0 --force` flags when the force delete checkbox is enabled.

## Context

Resources stuck in "Terminating" state due to finalizers need force deletion to be removed. When users check the "Force delete" option, we add the necessary flags to skip graceful deletion and remove finalizers.

## Implementation Steps

1. Update `executeKubectlDelete()` in `src/commands/deleteResource.ts` to accept `forceDelete` parameter
2. When `forceDelete` is true, add `--grace-period=0 --force` flags to kubectl command
3. Update progress message to show "Force deleting {resourceType} {resourceName}..." when force is enabled
4. Update success notification to show "Successfully force deleted..." for force deletions
5. Pass forceDelete value from confirmation dialog to execution function
6. Add tooltip to force delete checkbox: "Use this for resources stuck in terminating state. This skips graceful deletion and removes finalizers."

## Files Affected

- `src/commands/deleteResource.ts` - Add force delete flags and messaging

## Acceptance Criteria

- [x] Force delete checkbox has helpful tooltip
- [x] When force delete is checked, kubectl command includes --grace-period=0 --force
- [x] Progress message shows "Force deleting..." for force deletions
- [x] Success notification indicates force deletion was used
- [x] Standard deletions still work without force flags
- [x] Force deletions bypass finalizers as expected

## Dependencies

- 004-implement-kubectl-delete-execution

