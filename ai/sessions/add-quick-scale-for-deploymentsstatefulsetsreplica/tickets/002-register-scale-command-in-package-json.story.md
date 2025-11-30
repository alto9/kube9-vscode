---
story_id: register-scale-command-in-package-json
session_id: add-quick-scale-for-deploymentsstatefulsetsreplica
feature_id: [workload-scaling]
spec_id: [workload-scaling-spec]
status: completed
priority: high
estimated_minutes: 10
---

## Objective

Register the `kube9.scaleWorkload` command in package.json with proper menu contribution restricted to scalable workload types.

## Context

The command must appear in the tree view context menu only for Deployments, StatefulSets, and ReplicaSets. DaemonSets, CronJobs, and Pods should NOT show the scale option.

## Implementation Steps

1. Open `package.json`

2. Add command to `contributes.commands` array (after kube9.deleteResource):
```json
{
  "command": "kube9.scaleWorkload",
  "title": "Scale",
  "category": "kube9"
}
```

3. Add menu contribution to `contributes.menus.view/item/context` array:
```json
{
  "command": "kube9.scaleWorkload",
  "when": "view == kube9ClusterView && (viewItem == resource:Deployment || viewItem == resource:StatefulSet || viewItem == resource:ReplicaSet)",
  "group": "kube9@3"
}
```

**Note**: Use `group: "kube9@3"` to place it after View YAML (@1) and Delete Resource (@2)

## Files Affected

- `package.json` - Add command and menu contribution

## Acceptance Criteria

- [ ] Command `kube9.scaleWorkload` appears in commands list
- [ ] Menu item appears for Deployments in tree view
- [ ] Menu item appears for StatefulSets in tree view
- [ ] Menu item appears for ReplicaSets in tree view
- [ ] Menu item does NOT appear for DaemonSets
- [ ] Menu item does NOT appear for CronJobs
- [ ] Menu item does NOT appear for Pods
- [ ] Menu item appears in correct group position (after Delete)

## Dependencies

- None (can be done in parallel with story 001)

## Technical Notes

- The `when` clause uses `viewItem` to filter by resource type
- Tree items must have contextValue set to `resource:<Kind>` (already implemented)
- Group number @3 ensures proper ordering in context menu

