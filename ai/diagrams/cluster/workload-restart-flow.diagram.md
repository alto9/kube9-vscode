---
diagram_id: workload-restart-flow
feature_id: [workload-restart]
spec_id: []
---

# Workload Restart Flow Diagram

This diagram illustrates the user interaction flow for restarting Kubernetes workloads via rollout restart from the tree view.

```json
{
  "nodes": [
    {
      "id": "user-action",
      "type": "input",
      "data": {
        "label": "User Right-Clicks Workload"
      },
      "position": { "x": 250, "y": 0 }
    },
    {
      "id": "context-menu",
      "type": "default",
      "data": {
        "label": "Show Context Menu\n(Restart option visible)"
      },
      "position": { "x": 250, "y": 100 }
    },
    {
      "id": "check-workload-type",
      "type": "decision",
      "data": {
        "label": "Is Deployment,\nStatefulSet, or\nDaemonSet?"
      },
      "position": { "x": 250, "y": 200 }
    },
    {
      "id": "hide-restart",
      "type": "default",
      "data": {
        "label": "Hide Restart Option"
      },
      "position": { "x": 500, "y": 200 }
    },
    {
      "id": "show-confirmation",
      "type": "default",
      "data": {
        "label": "Show Confirmation Dialog\n- Explain rolling restart\n- Checkbox: Wait for rollout"
      },
      "position": { "x": 250, "y": 300 }
    },
    {
      "id": "user-confirms",
      "type": "decision",
      "data": {
        "label": "User Confirms?"
      },
      "position": { "x": 250, "y": 450 }
    },
    {
      "id": "cancelled",
      "type": "default",
      "data": {
        "label": "Operation Cancelled"
      },
      "position": { "x": 500, "y": 450 }
    },
    {
      "id": "show-progress",
      "type": "default",
      "data": {
        "label": "Show Progress\nNotification\n'Restarting...'"
      },
      "position": { "x": 250, "y": 550 }
    },
    {
      "id": "get-timestamp",
      "type": "default",
      "data": {
        "label": "Generate Current\nISO 8601 Timestamp"
      },
      "position": { "x": 250, "y": 650 }
    },
    {
      "id": "check-annotations",
      "type": "decision",
      "data": {
        "label": "Does annotations\nobject exist?"
      },
      "position": { "x": 250, "y": 750 }
    },
    {
      "id": "create-annotations",
      "type": "default",
      "data": {
        "label": "Create\nspec.template.metadata.annotations\nobject"
      },
      "position": { "x": 500, "y": 750 }
    },
    {
      "id": "apply-annotation",
      "type": "default",
      "data": {
        "label": "PATCH workload\nAdd/update\nkubectl.kubernetes.io/restartedAt"
      },
      "position": { "x": 250, "y": 900 }
    },
    {
      "id": "api-success",
      "type": "decision",
      "data": {
        "label": "API Success?"
      },
      "position": { "x": 250, "y": 1000 }
    },
    {
      "id": "show-error",
      "type": "default",
      "data": {
        "label": "Show Error\nNotification"
      },
      "position": { "x": 500, "y": 1000 }
    },
    {
      "id": "check-wait-option",
      "type": "decision",
      "data": {
        "label": "Wait for\nrollout?"
      },
      "position": { "x": 250, "y": 1100 }
    },
    {
      "id": "skip-watch",
      "type": "default",
      "data": {
        "label": "Skip Rollout Watch"
      },
      "position": { "x": 50, "y": 1200 }
    },
    {
      "id": "watch-rollout",
      "type": "default",
      "data": {
        "label": "Watch Rollout Status\n(Poll every 2 seconds)"
      },
      "position": { "x": 250, "y": 1200 }
    },
    {
      "id": "update-progress",
      "type": "default",
      "data": {
        "label": "Update Progress\nNotification\n'X/Y replicas ready'"
      },
      "position": { "x": 250, "y": 1300 }
    },
    {
      "id": "rollout-complete",
      "type": "decision",
      "data": {
        "label": "All replicas\nready?"
      },
      "position": { "x": 250, "y": 1400 }
    },
    {
      "id": "check-timeout",
      "type": "decision",
      "data": {
        "label": "Timeout\n(5 min)?"
      },
      "position": { "x": 450, "y": 1400 }
    },
    {
      "id": "timeout-error",
      "type": "default",
      "data": {
        "label": "Show Timeout Error"
      },
      "position": { "x": 450, "y": 1500 }
    },
    {
      "id": "show-success",
      "type": "default",
      "data": {
        "label": "Show Success\nNotification\n'Restarted successfully'"
      },
      "position": { "x": 250, "y": 1550 }
    },
    {
      "id": "refresh-tree",
      "type": "default",
      "data": {
        "label": "Refresh Tree View"
      },
      "position": { "x": 250, "y": 1650 }
    },
    {
      "id": "refresh-webview",
      "type": "default",
      "data": {
        "label": "Refresh Namespace\nWebview (if open)"
      },
      "position": { "x": 250, "y": 1750 }
    },
    {
      "id": "complete",
      "type": "output",
      "data": {
        "label": "Complete"
      },
      "position": { "x": 250, "y": 1850 }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "user-action",
      "target": "context-menu",
      "type": "default"
    },
    {
      "id": "e2",
      "source": "context-menu",
      "target": "check-workload-type",
      "type": "default"
    },
    {
      "id": "e3",
      "source": "check-workload-type",
      "target": "show-confirmation",
      "label": "Yes",
      "type": "default"
    },
    {
      "id": "e4",
      "source": "check-workload-type",
      "target": "hide-restart",
      "label": "No\n(ReplicaSet, CronJob, Pod)",
      "type": "default"
    },
    {
      "id": "e5",
      "source": "show-confirmation",
      "target": "user-confirms",
      "type": "default"
    },
    {
      "id": "e6",
      "source": "user-confirms",
      "target": "show-progress",
      "label": "Yes (Restart)",
      "type": "default"
    },
    {
      "id": "e7",
      "source": "user-confirms",
      "target": "cancelled",
      "label": "No (Cancel/Escape)",
      "type": "default"
    },
    {
      "id": "e8",
      "source": "show-progress",
      "target": "get-timestamp",
      "type": "default"
    },
    {
      "id": "e9",
      "source": "get-timestamp",
      "target": "check-annotations",
      "type": "default"
    },
    {
      "id": "e10",
      "source": "check-annotations",
      "target": "apply-annotation",
      "label": "Yes",
      "type": "default"
    },
    {
      "id": "e11",
      "source": "check-annotations",
      "target": "create-annotations",
      "label": "No",
      "type": "default"
    },
    {
      "id": "e12",
      "source": "create-annotations",
      "target": "apply-annotation",
      "type": "default"
    },
    {
      "id": "e13",
      "source": "apply-annotation",
      "target": "api-success",
      "type": "default"
    },
    {
      "id": "e14",
      "source": "api-success",
      "target": "check-wait-option",
      "label": "Success",
      "type": "default"
    },
    {
      "id": "e15",
      "source": "api-success",
      "target": "show-error",
      "label": "Error",
      "type": "default"
    },
    {
      "id": "e16",
      "source": "show-error",
      "target": "refresh-tree",
      "label": "Refresh to show\nactual state",
      "type": "default"
    },
    {
      "id": "e17",
      "source": "check-wait-option",
      "target": "watch-rollout",
      "label": "Yes",
      "type": "default"
    },
    {
      "id": "e18",
      "source": "check-wait-option",
      "target": "skip-watch",
      "label": "No",
      "type": "default"
    },
    {
      "id": "e19",
      "source": "skip-watch",
      "target": "show-success",
      "type": "default"
    },
    {
      "id": "e20",
      "source": "watch-rollout",
      "target": "update-progress",
      "type": "default"
    },
    {
      "id": "e21",
      "source": "update-progress",
      "target": "rollout-complete",
      "type": "default"
    },
    {
      "id": "e22",
      "source": "rollout-complete",
      "target": "show-success",
      "label": "Yes",
      "type": "default"
    },
    {
      "id": "e23",
      "source": "rollout-complete",
      "target": "check-timeout",
      "label": "No",
      "type": "default"
    },
    {
      "id": "e24",
      "source": "check-timeout",
      "target": "timeout-error",
      "label": "Yes",
      "type": "default"
    },
    {
      "id": "e25",
      "source": "check-timeout",
      "target": "watch-rollout",
      "label": "No\n(Keep watching)",
      "type": "default"
    },
    {
      "id": "e26",
      "source": "timeout-error",
      "target": "refresh-tree",
      "type": "default"
    },
    {
      "id": "e27",
      "source": "show-success",
      "target": "refresh-tree",
      "type": "default"
    },
    {
      "id": "e28",
      "source": "refresh-tree",
      "target": "refresh-webview",
      "type": "default"
    },
    {
      "id": "e29",
      "source": "refresh-webview",
      "target": "complete",
      "type": "default"
    }
  ]
}
```

## Flow Description

1. **User Initiates**: User right-clicks on a workload in the tree view
2. **Context Menu**: System shows context menu with available actions
3. **Workload Type Check**: System verifies if the workload type supports restart (Deployment, StatefulSet, DaemonSet only)
4. **Confirmation Dialog**: User sees a dialog explaining the rolling restart with "Wait for rollout" checkbox
5. **User Confirms**: User clicks "Restart" or "Cancel"
6. **Progress Notification**: System shows "Restarting..." notification
7. **Generate Timestamp**: System generates current ISO 8601 timestamp
8. **Check Annotations**: System checks if `spec.template.metadata.annotations` exists
9. **Create Annotations** (if needed): System creates the annotations object if it doesn't exist
10. **Apply Annotation**: System PATCHes the workload to add/update `kubectl.kubernetes.io/restartedAt` annotation
11. **API Success Check**: System validates API response
12. **Wait Option Check**: System checks if user selected "Wait for rollout to complete"
13. **Watch Rollout** (if selected): System polls rollout status every 2 seconds, updating progress
14. **Rollout Complete Check**: System verifies all replicas are ready
15. **Timeout Check**: If not complete, check if 5 minutes have elapsed
16. **Success Notification**: System shows success message
17. **Refresh**: System updates tree view and any open namespace webviews

## Key Decision Points

- **Workload Type**: Only Deployments, StatefulSets, and DaemonSets show the Restart option
- **User Confirmation**: User must explicitly confirm the restart operation
- **Wait for Rollout**: Optional - user can choose to wait for completion or proceed without waiting
- **Annotations Existence**: System must create annotations object if it doesn't exist
- **Timeout Handling**: If rollout doesn't complete within 5 minutes, show timeout error

## Technical Details

### Restart Annotation

The annotation that triggers the restart:
```
kubectl.kubernetes.io/restartedAt: 2024-12-01T15:30:00Z
```

This is added to `spec.template.metadata.annotations`, causing the Kubernetes controller to detect a pod template change and trigger a rolling update.

### Rollout Watch Logic

When "Wait for rollout" is selected:
- Poll workload status every 2 seconds
- Compare ready replicas vs desired replicas
- Update progress notification with current status
- Exit when all replicas are ready
- Timeout after 5 minutes if rollout doesn't complete

