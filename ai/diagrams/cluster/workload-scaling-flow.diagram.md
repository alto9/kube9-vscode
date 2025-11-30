---
diagram_id: workload-scaling-flow
feature_id: [workload-scaling]
spec_id: [workload-scaling-spec]
---

# Workload Scaling Flow Diagram

This diagram illustrates the user interaction flow for scaling Kubernetes workloads from the tree view.

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
        "label": "Show Context Menu\n(Scale option visible)"
      },
      "position": { "x": 250, "y": 100 }
    },
    {
      "id": "check-workload-type",
      "type": "decision",
      "data": {
        "label": "Is Deployment,\nStatefulSet, or\nReplicaSet?"
      },
      "position": { "x": 250, "y": 200 }
    },
    {
      "id": "hide-scale",
      "type": "default",
      "data": {
        "label": "Hide Scale Option"
      },
      "position": { "x": 450, "y": 200 }
    },
    {
      "id": "get-current-replicas",
      "type": "default",
      "data": {
        "label": "Get Current\nReplica Count"
      },
      "position": { "x": 250, "y": 300 }
    },
    {
      "id": "show-input-dialog",
      "type": "default",
      "data": {
        "label": "Show Input Dialog\n(with current count)"
      },
      "position": { "x": 250, "y": 400 }
    },
    {
      "id": "user-input",
      "type": "input",
      "data": {
        "label": "User Enters\nReplica Count"
      },
      "position": { "x": 250, "y": 500 }
    },
    {
      "id": "validate-input",
      "type": "decision",
      "data": {
        "label": "Valid Input?\n(0-1000, numeric)"
      },
      "position": { "x": 250, "y": 600 }
    },
    {
      "id": "show-validation-error",
      "type": "default",
      "data": {
        "label": "Show Validation\nError Message"
      },
      "position": { "x": 450, "y": 600 }
    },
    {
      "id": "user-confirmed",
      "type": "decision",
      "data": {
        "label": "User Confirms?"
      },
      "position": { "x": 250, "y": 700 }
    },
    {
      "id": "cancelled",
      "type": "default",
      "data": {
        "label": "Operation Cancelled"
      },
      "position": { "x": 450, "y": 700 }
    },
    {
      "id": "show-progress",
      "type": "default",
      "data": {
        "label": "Show Progress\nNotification\n'Scaling...'"
      },
      "position": { "x": 250, "y": 800 }
    },
    {
      "id": "call-k8s-api",
      "type": "default",
      "data": {
        "label": "Call Kubernetes API\nPATCH /scale subresource"
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
      "position": { "x": 450, "y": 1000 }
    },
    {
      "id": "show-success",
      "type": "default",
      "data": {
        "label": "Show Success\nNotification"
      },
      "position": { "x": 250, "y": 1100 }
    },
    {
      "id": "refresh-tree",
      "type": "default",
      "data": {
        "label": "Refresh Tree View"
      },
      "position": { "x": 250, "y": 1200 }
    },
    {
      "id": "refresh-webview",
      "type": "default",
      "data": {
        "label": "Refresh Namespace\nWebview (if open)"
      },
      "position": { "x": 250, "y": 1300 }
    },
    {
      "id": "complete",
      "type": "output",
      "data": {
        "label": "Complete"
      },
      "position": { "x": 250, "y": 1400 }
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
      "target": "get-current-replicas",
      "label": "Yes",
      "type": "default"
    },
    {
      "id": "e4",
      "source": "check-workload-type",
      "target": "hide-scale",
      "label": "No\n(DaemonSet, CronJob, Pod)",
      "type": "default"
    },
    {
      "id": "e5",
      "source": "get-current-replicas",
      "target": "show-input-dialog",
      "type": "default"
    },
    {
      "id": "e6",
      "source": "show-input-dialog",
      "target": "user-input",
      "type": "default"
    },
    {
      "id": "e7",
      "source": "user-input",
      "target": "validate-input",
      "type": "default"
    },
    {
      "id": "e8",
      "source": "validate-input",
      "target": "user-confirmed",
      "label": "Valid",
      "type": "default"
    },
    {
      "id": "e9",
      "source": "validate-input",
      "target": "show-validation-error",
      "label": "Invalid",
      "type": "default"
    },
    {
      "id": "e10",
      "source": "show-validation-error",
      "target": "user-input",
      "type": "default"
    },
    {
      "id": "e11",
      "source": "user-confirmed",
      "target": "show-progress",
      "label": "Yes (Enter/OK)",
      "type": "default"
    },
    {
      "id": "e12",
      "source": "user-confirmed",
      "target": "cancelled",
      "label": "No (Escape/Cancel)",
      "type": "default"
    },
    {
      "id": "e13",
      "source": "show-progress",
      "target": "call-k8s-api",
      "type": "default"
    },
    {
      "id": "e14",
      "source": "call-k8s-api",
      "target": "api-success",
      "type": "default"
    },
    {
      "id": "e15",
      "source": "api-success",
      "target": "show-success",
      "label": "Success",
      "type": "default"
    },
    {
      "id": "e16",
      "source": "api-success",
      "target": "show-error",
      "label": "Error",
      "type": "default"
    },
    {
      "id": "e17",
      "source": "show-error",
      "target": "refresh-tree",
      "label": "Refresh to show\nactual state",
      "type": "default"
    },
    {
      "id": "e18",
      "source": "show-success",
      "target": "refresh-tree",
      "type": "default"
    },
    {
      "id": "e19",
      "source": "refresh-tree",
      "target": "refresh-webview",
      "type": "default"
    },
    {
      "id": "e20",
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
3. **Workload Type Check**: System verifies if the workload type supports scaling (Deployment, StatefulSet, ReplicaSet only)
4. **Get Current State**: System fetches the current replica count from the cluster
5. **Input Dialog**: User sees a dialog with current replica count as placeholder
6. **User Input**: User enters desired replica count
7. **Validation**: System validates the input (numeric, 0-1000 range)
8. **Confirmation**: User presses Enter/OK or Cancel/Escape
9. **Progress Notification**: System shows "Scaling..." notification
10. **API Call**: System calls Kubernetes API to scale the workload via PATCH /scale
11. **Result Handling**: System shows success or error notification
12. **Refresh**: System updates tree view and any open namespace webviews

## Key Decision Points

- **Workload Type**: Only Deployments, StatefulSets, and ReplicaSets show the Scale option
- **Input Validation**: Must be numeric, 0-1000 range
- **User Confirmation**: User can cancel at any time before the API call
- **Error Handling**: On API error, still refresh tree to show actual state

