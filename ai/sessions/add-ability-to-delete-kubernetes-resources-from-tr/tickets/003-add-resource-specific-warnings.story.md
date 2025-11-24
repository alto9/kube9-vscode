---
story_id: add-resource-specific-warnings
session_id: add-ability-to-delete-kubernetes-resources-from-tr
feature_id: [tree-view-navigation]
spec_id: [tree-view-spec]
diagram_id: []
status: completed
priority: medium
estimated_minutes: 20
---

## Objective

Generate context-aware warning messages in the confirmation dialog based on the resource type being deleted.

## Context

Different resource types have different consequences when deleted. Users should see specific warnings about what will happen (e.g., Deployments will delete Pods, ConfigMaps may break dependent apps). This improves safety and user understanding.

## Implementation Steps

1. Create `generateWarningMessage()` function in `src/commands/deleteResource.ts`
2. Implement switch/case logic for resource types:
   - Deployment: "Deleting this Deployment will also delete its managed Pods. Pods may be recreated if controlled by a ReplicaSet."
   - StatefulSet: "Deleting this StatefulSet will delete its Pods in reverse order. Associated PersistentVolumeClaims will NOT be deleted."
   - DaemonSet: "Deleting this DaemonSet will remove Pods from all nodes where it is running."
   - Service: "This will remove the network endpoint for this Service. Dependent applications may lose connectivity."
   - ConfigMap: "Pods using this ConfigMap may fail to start or lose configuration data."
   - Secret: "Applications using this Secret will lose access to credentials and sensitive data."
   - PersistentVolumeClaim: "Deleting this PVC may delete the underlying PersistentVolume depending on the reclaim policy."
   - Pod: "This Pod will be permanently deleted. If managed by a controller, it may be recreated."
   - Default: "This resource will be permanently deleted."
3. Update `showDeleteConfirmation()` to include warning message in dialog
4. Add warning icon and styling to make warnings prominent

## Files Affected

- `src/commands/deleteResource.ts` - Add warning message generation

## Acceptance Criteria

- [x] Each resource type shows appropriate warning message
- [x] Deployment deletion shows Pod recreation warning
- [x] Service deletion shows connectivity warning
- [x] ConfigMap/Secret deletions show dependency warnings
- [x] Generic message shown for unsupported resource types
- [x] Warnings are clearly visible in confirmation dialog

## Dependencies

- 002-create-delete-confirmation-dialog

