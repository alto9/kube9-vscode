---
diagram_id: event-viewer-architecture
name: Event Viewer Architecture
description: Overall architecture showing data flow from operator CLI through extension to webview
type: components
spec_id:
  - event-viewer-panel-spec
  - event-viewer-components-spec
  - event-viewer-protocol-spec
feature_id:
  - event-viewer-panel
---

# Event Viewer Architecture

This diagram shows the complete architecture of the Events Viewer, including extension host components, webview components, and data flow.

```json
{
  "nodes": [
    {
      "id": "tree-category",
      "type": "default",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "EventsCategory",
        "description": "Tree node that launches webview"
      }
    },
    {
      "id": "panel",
      "type": "default",
      "position": { "x": 300, "y": 100 },
      "data": {
        "label": "EventViewerPanel",
        "description": "Webview panel manager"
      }
    },
    {
      "id": "events-provider",
      "type": "default",
      "position": { "x": 300, "y": 250 },
      "data": {
        "label": "EventsProvider",
        "description": "Fetches events from operator"
      }
    },
    {
      "id": "namespace-resolver",
      "type": "default",
      "position": { "x": 500, "y": 250 },
      "data": {
        "label": "OperatorNamespaceResolver",
        "description": "Resolves operator namespace dynamically"
      }
    },
    {
      "id": "k8s-api",
      "type": "default",
      "position": { "x": 700, "y": 250 },
      "data": {
        "label": "Kubernetes API",
        "description": "Exec API for operator CLI"
      }
    },
    {
      "id": "operator-pod",
      "type": "default",
      "position": { "x": 900, "y": 250 },
      "data": {
        "label": "kube9-operator Pod",
        "description": "Executes events query"
      }
    },
    {
      "id": "webview",
      "type": "default",
      "position": { "x": 300, "y": 400 },
      "data": {
        "label": "EventViewerApp",
        "description": "React webview app"
      }
    },
    {
      "id": "toolbar",
      "type": "default",
      "position": { "x": 150, "y": 550 },
      "data": {
        "label": "Toolbar",
        "description": "Actions (refresh, export, etc.)"
      }
    },
    {
      "id": "filter-pane",
      "type": "default",
      "position": { "x": 300, "y": 550 },
      "data": {
        "label": "FilterPane",
        "description": "Type, time, namespace filters"
      }
    },
    {
      "id": "event-table",
      "type": "default",
      "position": { "x": 450, "y": 550 },
      "data": {
        "label": "EventTable",
        "description": "Virtual scrolling table"
      }
    },
    {
      "id": "event-details",
      "type": "default",
      "position": { "x": 600, "y": 550 },
      "data": {
        "label": "EventDetails",
        "description": "Selected event details pane"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "tree-category",
      "target": "panel",
      "label": "click → openViewer",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "panel",
      "target": "events-provider",
      "label": "getEvents()",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "events-provider",
      "target": "namespace-resolver",
      "label": "resolveNamespace()",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "events-provider",
      "target": "k8s-api",
      "label": "exec(namespace, pod, cmd)",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "k8s-api",
      "target": "operator-pod",
      "label": "WebSocket exec",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "operator-pod",
      "target": "k8s-api",
      "label": "events JSON",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e7",
      "source": "k8s-api",
      "target": "events-provider",
      "label": "stdout",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e8",
      "source": "events-provider",
      "target": "panel",
      "label": "KubernetesEvent[]",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e9",
      "source": "panel",
      "target": "webview",
      "label": "postMessage(events)",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e10",
      "source": "webview",
      "target": "panel",
      "label": "postMessage(actions)",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "webview",
      "target": "toolbar",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "webview",
      "target": "filter-pane",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "webview",
      "target": "event-table",
      "label": "renders",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "webview",
      "target": "event-details",
      "label": "renders",
      "type": "smoothstep"
    }
  ]
}
```

## Architecture Overview

### Extension Host Layer

**EventsCategory**: Tree node in cluster view that, when clicked, opens the Events Viewer webview.

**EventViewerPanel**: Manages webview lifecycle, message protocol, and integration with EventsProvider. One panel per cluster context.

**EventsProvider**: Handles event retrieval from kube9-operator CLI via Kubernetes Exec API. Caches results, manages filters, and controls auto-refresh.

**OperatorNamespaceResolver**: Dynamically discovers the namespace where kube9-operator is installed, eliminating hardcoded 'kube9-system' references.

### Kubernetes Layer

**Kubernetes API**: Provides Exec API for executing commands in pods via WebSocket connections.

**kube9-operator Pod**: Executes `kube9-operator query events` command and returns JSON-formatted events.

### Webview Layer

**EventViewerApp**: Root React component that manages state and coordinates child components.

**Toolbar**: Provides actions like refresh, export, auto-refresh toggle, and search.

**FilterPane**: Left sidebar with type, time range, namespace, and resource type filters.

**EventTable**: Main center pane with virtual scrolling table displaying events.

**EventDetails**: Bottom pane showing detailed information about selected event.

## Data Flow

### Loading Events

1. User clicks EventsCategory in tree
2. EventViewerPanel.show() creates or reveals panel
3. Panel requests events from EventsProvider
4. EventsProvider resolves operator namespace
5. EventsProvider executes CLI command via Kubernetes Exec API
6. Operator pod returns JSON events
7. EventsProvider parses and filters events
8. Panel sends events to webview via postMessage
9. Webview renders events in table

### User Actions

1. User interacts with webview (filters, refresh, etc.)
2. Webview sends message to panel
3. Panel handles message (update filters, refresh events, export, etc.)
4. Panel may request new events from EventsProvider
5. Results sent back to webview via postMessage
6. Webview updates UI

## Component Responsibilities

### EventViewerPanel

- Create and manage webview
- Set up message protocol
- Handle messages from webview
- Coordinate with EventsProvider
- Execute VS Code commands (export, navigation)
- Clean up resources on disposal

### EventsProvider

- Execute operator CLI via Kubernetes Exec API
- Cache events per cluster
- Manage filter state per cluster
- Control auto-refresh timers
- Parse and validate event data

### OperatorNamespaceResolver

- Discover operator namespace from ConfigMap
- Fall back to settings or default
- Cache resolved namespaces
- Invalidate cache on configuration changes

### EventViewerApp (Webview)

- Manage React state
- Render UI components
- Handle user interactions
- Send messages to extension
- Receive and process messages from extension

## Singleton Pattern

- **EventViewerPanel**: One instance per cluster context
- **EventsProvider**: Shared singleton across all panels
- **OperatorNamespaceResolver**: Shared singleton for namespace resolution

## Security

- Webview uses Content Security Policy
- All operations validated in extension host
- User confirmation required for file operations
- No arbitrary code execution

## Performance

- Virtual scrolling for large event lists
- Cached events (30-second TTL)
- Cached namespace resolution
- Debounced search input
- Efficient message passing

