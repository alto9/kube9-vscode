---
diagram_id: events-architecture
name: Events Architecture
description: Visual representation of the Events tree category architecture and data flow from kube9-operator
type: components
spec_id:
  - events-tree-spec
  - operator-status-api-spec
feature_id:
  - cluster-events-tree
---

# Events Architecture Diagram

This diagram shows how the Events category integrates into the tree view and retrieves event data from the kube9-operator CLI utility.

```json
{
  "nodes": [
    {
      "id": "cluster-tree-provider",
      "type": "component",
      "position": { "x": 50, "y": 50 },
      "data": {
        "label": "ClusterTreeProvider",
        "description": "Main tree data provider",
        "spec_id": "tree-view-spec"
      }
    },
    {
      "id": "operator-status-client",
      "type": "component",
      "position": { "x": 50, "y": 150 },
      "data": {
        "label": "OperatorStatusClient",
        "description": "Queries operator status to determine if Events should be shown",
        "spec_id": "operator-status-api-spec"
      }
    },
    {
      "id": "events-category",
      "type": "component",
      "position": { "x": 50, "y": 250 },
      "data": {
        "label": "Events Category",
        "description": "Conditional tree category for cluster events",
        "spec_id": "events-tree-spec"
      }
    },
    {
      "id": "events-provider",
      "type": "component",
      "position": { "x": 300, "y": 250 },
      "data": {
        "label": "EventsProvider",
        "description": "Retrieves and manages event data from operator CLI",
        "spec_id": "events-tree-spec"
      }
    },
    {
      "id": "events-filter",
      "type": "component",
      "position": { "x": 300, "y": 350 },
      "data": {
        "label": "EventsFilter",
        "description": "Manages filtering state (namespace, type, time range, resource type)",
        "spec_id": "events-tree-spec"
      }
    },
    {
      "id": "k8s-exec-api",
      "type": "component",
      "position": { "x": 550, "y": 250 },
      "data": {
        "label": "Kubernetes Exec API",
        "description": "Executes operator CLI commands using @kubernetes/client-node"
      }
    },
    {
      "id": "operator-cli",
      "type": "external",
      "position": { "x": 750, "y": 250 },
      "data": {
        "label": "kube9-operator CLI",
        "description": "Operator CLI tool that provides event data",
        "spec_id": "events-tree-spec"
      }
    },
    {
      "id": "event-tree-item",
      "type": "component",
      "position": { "x": 50, "y": 350 },
      "data": {
        "label": "EventTreeItem",
        "description": "Individual event displayed in tree with color coding",
        "spec_id": "events-tree-spec"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "cluster-tree-provider",
      "target": "operator-status-client",
      "label": "queries status",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "cluster-tree-provider",
      "target": "events-category",
      "label": "conditionally creates (if operated)",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "events-category",
      "target": "events-provider",
      "label": "requests events",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "events-provider",
      "target": "events-filter",
      "label": "applies filters",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "events-provider",
      "target": "k8s-exec-api",
      "label": "exec.exec() with command args",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "k8s-exec-api",
      "target": "operator-cli",
      "label": "executes in operator pod",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "events-provider",
      "target": "event-tree-item",
      "label": "creates tree items",
      "type": "smoothstep"
    }
  ]
}
```

## Component Responsibilities

### ClusterTreeProvider
- Checks operator status for each cluster
- Conditionally includes Events category when operator is installed (operated/enabled/degraded modes)
- Excludes Events category when operator status is "basic"

### OperatorStatusClient
- Determines if operator is installed and functioning
- Returns status: basic, operated, enabled, or degraded
- Caches status for 5 minutes to minimize API calls

### Events Category
- Top-level tree category appearing after Reports (when operator present)
- Provides toolbar actions for filtering (namespace, type, time range, resource type)
- Manages auto-refresh toggle (default: enabled, 30 second interval)

### EventsProvider
- Executes operator CLI using Kubernetes client Exec API
- Uses `@kubernetes/client-node` Exec API instead of kubectl process spawning
- Discovers operator pod from kube9-system namespace
- Command: `kube9-operator query events --format=json` with filter args
- Parses JSON event data from operator CLI
- Applies filters based on EventsFilter state
- Limits results to recent 100-500 events for performance
- Handles CLI errors gracefully

### EventsFilter
- Manages filter state per cluster
- Filter types:
  - Namespace (all, or specific namespace)
  - Event type (Normal, Warning, Error, or all)
  - Time range (1h, 6h, 24h, all)
  - Resource type (Pod, Deployment, Service, etc., or all)
- Persists filter preferences per session

### EventTreeItem
- Displays individual events in tree
- Color coded by severity (Normal: default, Warning: yellow/orange, Error: red)
- Shows event reason as label
- Shows resource involved (namespace/kind/name) as description
- Shows message in tooltip
- Shows count and age in context
- Click to show full details in Output Panel

## Data Flow

### Initial Load
```
1. User expands cluster in tree
2. ClusterTreeProvider checks operator status
3. If operator present (operated/enabled/degraded):
   a. Include Events category in category list
   b. Events category appears after Reports
4. User expands Events category
5. EventsProvider discovers operator pod name
6. EventsProvider uses Kubernetes Exec API to execute operator CLI
7. Operator CLI returns JSON event data
8. EventsProvider applies current filters
9. EventsProvider limits to 100-500 events
10. EventsProvider creates EventTreeItem for each event
11. Tree displays events with color coding
```

### Filter Change
```
1. User clicks filter toolbar button
2. VS Code shows QuickPick with filter options
3. User selects filter value
4. EventsFilter updates state
5. EventsProvider re-queries operator CLI with new filters
6. Tree refreshes with filtered events
```

### Auto-Refresh
```
Every 30 seconds (if enabled):
1. EventsProvider re-executes operator CLI via Kubernetes Exec API
2. Applies current filters
3. Updates tree with new events
4. Maintains scroll position if possible
```

## Operator CLI Integration

### Execution Method
Uses Kubernetes client Exec API (from `@kubernetes/client-node`) instead of kubectl process:

```typescript
const exec = new k8s.Exec(kubeConfig);
exec.exec(
  'kube9-system',
  operatorPodName, // discovered from deployment
  'kube9-operator',
  ['kube9-operator', 'query', 'events', '--format=json', ...filterArgs],
  ...
);
```

### Command Arguments
```
kube9-operator query events
  --namespace=<namespace>
  --type=<Normal|Warning|Error>
  --since=<duration>
  --resource-type=<kind>
  --limit=500
  --format=json
```

### Response Format
```json
{
  "events": [
    {
      "reason": "Created",
      "type": "Normal",
      "message": "Created container main",
      "involvedObject": {
        "kind": "Pod",
        "namespace": "default",
        "name": "api-server-abc123"
      },
      "count": 1,
      "firstTimestamp": "2024-12-17T10:00:00Z",
      "lastTimestamp": "2024-12-17T10:00:00Z"
    }
  ]
}
```

## Performance Considerations

- Limit results to 100-500 events by default
- Cache filtered results for 30 seconds
- Use Kubernetes Exec API (no kubectl process spawning)
- Reuse Kubernetes client connections (singleton pattern)
- Parse JSON efficiently
- Update only changed items in tree
- Throttle auto-refresh if tree not visible

