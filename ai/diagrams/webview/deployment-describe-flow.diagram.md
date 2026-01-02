---
diagram_id: deployment-describe-flow
name: Deployment Describe Webview Flow
description: Architecture and data flow for the Deployment Describe Webview showing how deployment information is fetched, transformed, and displayed
type: flows
spec_id:
  - deployment-describe-webview-spec
feature_id:
  - deployment-describe-webview
---

# Deployment Describe Webview Flow

This diagram shows the complete flow of data from user interaction to webview display for the Deployment Describe feature.

```json
{
  "nodes": [
    {
      "id": "user",
      "type": "default",
      "position": { "x": 50, "y": 100 },
      "data": {
        "label": "User",
        "description": "User interacts with deployment in tree view"
      }
    },
    {
      "id": "tree-view",
      "type": "default",
      "position": { "x": 250, "y": 100 },
      "data": {
        "label": "Tree View",
        "description": "Displays deployments category with deployment items"
      }
    },
    {
      "id": "deployment-describe-webview",
      "type": "default",
      "position": { "x": 500, "y": 100 },
      "data": {
        "label": "DeploymentDescribeWebview",
        "description": "Manages webview panel and message passing"
      }
    },
    {
      "id": "deployment-commands",
      "type": "default",
      "position": { "x": 800, "y": 50 },
      "data": {
        "label": "DeploymentCommands",
        "description": "Fetches deployment details via kubectl"
      }
    },
    {
      "id": "replicaset-commands",
      "type": "default",
      "position": { "x": 800, "y": 150 },
      "data": {
        "label": "ReplicaSetCommands",
        "description": "Fetches related ReplicaSets"
      }
    },
    {
      "id": "event-commands",
      "type": "default",
      "position": { "x": 800, "y": 250 },
      "data": {
        "label": "EventCommands",
        "description": "Fetches deployment events"
      }
    },
    {
      "id": "kubectl",
      "type": "default",
      "position": { "x": 1050, "y": 150 },
      "data": {
        "label": "kubectl",
        "description": "Kubernetes CLI"
      }
    },
    {
      "id": "data-transformer",
      "type": "default",
      "position": { "x": 500, "y": 350 },
      "data": {
        "label": "Data Transformer",
        "description": "Transforms V1Deployment, V1ReplicaSet[], and Events to DeploymentDescribeData"
      }
    },
    {
      "id": "webview-ui",
      "type": "default",
      "position": { "x": 250, "y": 350 },
      "data": {
        "label": "Webview UI",
        "description": "Renders deployment information in HTML"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "user",
      "target": "tree-view",
      "label": "Left-click deployment",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "tree-view",
      "target": "deployment-describe-webview",
      "label": "show(deploymentName, namespace)",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "deployment-describe-webview",
      "target": "deployment-commands",
      "label": "getDeploymentDetails()",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "deployment-describe-webview",
      "target": "replicaset-commands",
      "label": "getRelatedReplicaSets()",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "deployment-describe-webview",
      "target": "event-commands",
      "label": "getDeploymentEvents()",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "deployment-commands",
      "target": "kubectl",
      "label": "kubectl get deployment <name> -n <ns> -o json",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "replicaset-commands",
      "target": "kubectl",
      "label": "kubectl get replicasets -n <ns> -o json",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "event-commands",
      "target": "kubectl",
      "label": "kubectl get events --field-selector",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "kubectl",
      "target": "deployment-commands",
      "label": "V1Deployment JSON",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "kubectl",
      "target": "replicaset-commands",
      "label": "V1ReplicaSetList JSON",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "kubectl",
      "target": "event-commands",
      "label": "V1EventList JSON",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "deployment-commands",
      "target": "data-transformer",
      "label": "DeploymentDetailsResult",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "replicaset-commands",
      "target": "data-transformer",
      "label": "ReplicaSetsResult",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "event-commands",
      "target": "data-transformer",
      "label": "EventsResult",
      "type": "smoothstep"
    },
    {
      "id": "e15",
      "source": "data-transformer",
      "target": "deployment-describe-webview",
      "label": "DeploymentDescribeData",
      "type": "smoothstep"
    },
    {
      "id": "e16",
      "source": "deployment-describe-webview",
      "target": "webview-ui",
      "label": "postMessage(updateDeploymentData)",
      "type": "smoothstep"
    },
    {
      "id": "e17",
      "source": "webview-ui",
      "target": "user",
      "label": "Display deployment information",
      "type": "smoothstep"
    },
    {
      "id": "e18",
      "source": "webview-ui",
      "target": "deployment-describe-webview",
      "label": "postMessage(refresh)",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e19",
      "source": "webview-ui",
      "target": "deployment-describe-webview",
      "label": "postMessage(navigateToReplicaSet)",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e20",
      "source": "webview-ui",
      "target": "deployment-describe-webview",
      "label": "postMessage(copyValue)",
      "type": "smoothstep",
      "animated": true
    }
  ]
}
```

## Diagram Notes

### Key Components

1. **User**: Initiates deployment describe action by clicking a deployment in the tree view
2. **Tree View**: Displays deployments and forwards clicks to the webview controller
3. **DeploymentDescribeWebview**: Central controller managing webview lifecycle and data flow
4. **DeploymentCommands**: Executes kubectl commands to fetch deployment details
5. **ReplicaSetCommands**: Executes kubectl commands to fetch related ReplicaSets
6. **EventCommands**: Executes kubectl commands to fetch deployment events
7. **kubectl**: Kubernetes CLI that communicates with cluster API
8. **Data Transformer**: Transforms raw Kubernetes API data into display-ready format
9. **Webview UI**: Renders HTML interface with deployment information

### Data Flow Phases

#### Phase 1: User Interaction
- User left-clicks a deployment in the tree view
- Tree view calls `DeploymentDescribeWebview.show(deploymentName, namespace)`

#### Phase 2: Data Fetching (Parallel)
- DeploymentDescribeWebview calls DeploymentCommands.getDeploymentDetails()
- DeploymentDescribeWebview calls ReplicaSetCommands.getRelatedReplicaSets()
- DeploymentDescribeWebview calls EventCommands.getDeploymentEvents()
- All three commands execute kubectl CLI commands in parallel using Promise.all()
- kubectl returns V1Deployment, V1ReplicaSetList, and V1EventList data

#### Phase 3: Data Transformation
- Raw Kubernetes API data is transformed to DeploymentDescribeData
- Replica status is calculated (desired, current, ready, available, up-to-date)
- Deployment strategy details are extracted (maxSurge, maxUnavailable)
- Pod template information is extracted (containers, resources, probes)
- ReplicaSets are sorted by revision (newest first)
- Current active ReplicaSet is identified
- Conditions are enriched with severity levels and relative timestamps
- Events are filtered to recent events and sorted by time
- Labels, selectors, and annotations are organized

#### Phase 4: Webview Update
- Transformed data is sent to webview via postMessage
- Webview UI receives updateDeploymentData message
- HTML is rendered with all deployment information sections
- Visual indicators show replica health status
- Warning indicators appear if deployment is unhealthy

#### Phase 5: User Interactions (Ongoing)
- User clicks refresh → webview posts 'refresh' message → cycle repeats from Phase 2
- User clicks ReplicaSet name → webview posts 'navigateToReplicaSet' message → tree view highlights ReplicaSet
- User copies value → webview posts 'copyValue' message → value copied to clipboard

### Message Protocol

**Extension → Webview**:
- `updateDeploymentData`: Complete deployment information for display
- `refreshComplete`: Refresh operation completed
- `error`: Error occurred during data fetching

**Webview → Extension**:
- `refresh`: User requested data refresh
- `navigateToReplicaSet`: User clicked ReplicaSet name, navigate to ReplicaSet in tree
- `copyValue`: User clicked copy, copy value to clipboard

### Deployment-Specific Data Points

#### Overview Section
- Status: Available, Progressing, Failed, Unknown
- Replicas: Desired vs Current vs Ready vs Available
- Strategy: RollingUpdate or Recreate
- Max Surge / Max Unavailable
- Age and creation timestamp
- Generation vs Observed Generation

#### Replica Status Section
- Desired (spec.replicas)
- Current (status.replicas)
- Ready (status.readyReplicas)
- Available (status.availableReplicas)
- Up-to-date (status.updatedReplicas)
- Unavailable (calculated: desired - available)
- Visual progress bars for each metric

#### Pod Template Section
- Container images with tags
- Container ports
- Environment variables count
- Volume mounts
- Resource requests and limits
- Liveness, readiness, and startup probes

#### Rollout Strategy Section
- Strategy type (RollingUpdate or Recreate)
- Max Surge (additional pods during rollout)
- Max Unavailable (pods that can be down during rollout)
- Revision history limit
- Progress deadline seconds

#### ReplicaSets Section
- Current and historical ReplicaSets
- Revision numbers
- Replica counts per ReplicaSet
- Active ReplicaSet highlighted
- Clickable to navigate to ReplicaSet

#### Conditions Section
- Available condition
- Progressing condition
- ReplicaFailure condition (if present)
- Status indicators with timestamps

#### Events Section
- Recent deployment events
- Warning events highlighted
- Filtered to last hour by default

### Performance Notes

- Deployment, ReplicaSets, and Events are fetched in parallel using Promise.all()
- Data is cached for 30 seconds to reduce kubectl calls
- Webview reuses single panel, updating content instead of creating new panels
- ReplicaSet filtering uses owner references for accurate relationship identification
- Events are filtered on the server side using field-selector to reduce data transfer

### Error Handling

- Individual fetch failures are isolated and don't block other data
- Missing or unavailable data shows "N/A" or empty state messages
- Network errors display user-friendly messages
- Retry logic for transient failures
- Loading indicators during data fetch

