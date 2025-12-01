---
story_id: 001-register-restart-command
session_id: add-restartrollout-restart-for-deployments-and-sta
feature_id: [workload-restart]
spec_id: [workload-restart-spec]
diagram_id: [workload-restart-flow]
status: pending
priority: high
estimated_minutes: 20
---

# Register Restart Workload Command

## Objective
Register the `kube9.restartWorkload` command in package.json and add it to the tree view context menu for Deployments, StatefulSets, and DaemonSets.

## Context
This is the foundational step for the workload restart feature. The command must only appear in the context menu for specific workload types that support rolling restarts (Deployments, StatefulSets, DaemonSets), and NOT for ReplicaSets, CronJobs, or Pods.

## Implementation Steps

1. Open `package.json` in the extension root
2. Add command definition to `contributes.commands`:
   ```json
   {
     "command": "kube9.restartWorkload",
     "title": "Restart",
     "category": "Kube9"
   }
   ```
3. Add menu contribution to `contributes.menus.view/item/context`:
   ```json
   {
     "command": "kube9.restartWorkload",
     "when": "view == kube9TreeView && (viewItem == resource:Deployment || viewItem == resource:StatefulSet || viewItem == resource:DaemonSet)",
     "group": "kube9@3"
   }
   ```
4. Register the command handler in the extension activation code (stub implementation for now)
5. Verify the "Restart" option appears in context menu for correct workload types

## Files Affected
- `package.json` - Add command and menu contributions
- `src/extension.ts` - Register command handler (stub)

## Acceptance Criteria
- [ ] Command `kube9.restartWorkload` is defined in package.json
- [ ] Menu contribution added with correct `when` clause
- [ ] Command appears for Deployments, StatefulSets, and DaemonSets
- [ ] Command does NOT appear for ReplicaSets, CronJobs, or Pods
- [ ] Extension activates without errors
- [ ] Clicking "Restart" triggers command handler (even if it's just a stub)

## Dependencies
None - This is the first story in the sequence

