---
diagram_id: pod-logs-architecture
name: Pod Logs Viewer Architecture
description: Component architecture showing the cluster-specific panel pattern, message protocol, and Kubernetes API integration
type: components
spec_id:
  - pod-logs-panel-spec
  - pod-logs-ui-spec
feature_id:
  - pod-logs-panel
---

# Pod Logs Viewer Architecture

This diagram shows the component architecture of the Pod Logs Viewer, including the cluster-specific panel management, React UI components, and Kubernetes API integration.

```json
{
  "nodes": [
    {
      "id": "extension-host",
      "type": "default",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Extension Host",
        "description": "VS Code extension process"
      }
    },
    {
      "id": "pod-logs-panel-class",
      "type": "default",
      "position": { "x": 100, "y": 200 },
      "data": {
        "label": "PodLogsViewerPanel",
        "description": "Manages cluster-specific panels\nMap<contextName, PanelInfo>"
      }
    },
    {
      "id": "panel-registry",
      "type": "default",
      "position": { "x": 300, "y": 200 },
      "data": {
        "label": "Panel Registry",
        "description": "openPanels: Map<string, PanelInfo>\nKey: cluster context name"
      }
    },
    {
      "id": "panel-info",
      "type": "default",
      "position": { "x": 500, "y": 200 },
      "data": {
        "label": "PanelInfo",
        "description": "panel: WebviewPanel\nlogsProvider: LogsProvider\ncurrentPod: PodInfo\npreferences: PanelPreferences"
      }
    },
    {
      "id": "webview-panel-1",
      "type": "default",
      "position": { "x": 100, "y": 350 },
      "data": {
        "label": "WebviewPanel (Cluster A)",
        "description": "VS Code webview instance\nTitle: Logs: production"
      }
    },
    {
      "id": "webview-panel-2",
      "type": "default",
      "position": { "x": 300, "y": 350 },
      "data": {
        "label": "WebviewPanel (Cluster B)",
        "description": "VS Code webview instance\nTitle: Logs: staging"
      }
    },
    {
      "id": "logs-provider-1",
      "type": "default",
      "position": { "x": 100, "y": 500 },
      "data": {
        "label": "LogsProvider (Cluster A)",
        "description": "Manages Kubernetes API connection\nHandles log streaming"
      }
    },
    {
      "id": "logs-provider-2",
      "type": "default",
      "position": { "x": 300, "y": 500 },
      "data": {
        "label": "LogsProvider (Cluster B)",
        "description": "Manages Kubernetes API connection\nHandles log streaming"
      }
    },
    {
      "id": "k8s-api-1",
      "type": "default",
      "position": { "x": 100, "y": 650 },
      "data": {
        "label": "Kubernetes API (Cluster A)",
        "description": "GET /api/v1/namespaces/{ns}/pods/{pod}/log\nStreaming connection"
      }
    },
    {
      "id": "k8s-api-2",
      "type": "default",
      "position": { "x": 300, "y": 650 },
      "data": {
        "label": "Kubernetes API (Cluster B)",
        "description": "GET /api/v1/namespaces/{ns}/pods/{pod}/log\nStreaming connection"
      }
    },
    {
      "id": "react-app",
      "type": "default",
      "position": { "x": 600, "y": 350 },
      "data": {
        "label": "React App",
        "description": "Webview UI\nRuns in isolated context"
      }
    },
    {
      "id": "toolbar",
      "type": "default",
      "position": { "x": 550, "y": 500 },
      "data": {
        "label": "Toolbar Component",
        "description": "Pod info, controls, actions"
      }
    },
    {
      "id": "log-display",
      "type": "default",
      "position": { "x": 650, "y": 500 },
      "data": {
        "label": "LogDisplay Component",
        "description": "Virtual scrolling\nSyntax highlighting"
      }
    },
    {
      "id": "search-bar",
      "type": "default",
      "position": { "x": 750, "y": 500 },
      "data": {
        "label": "SearchBar Component",
        "description": "Search input, navigation"
      }
    },
    {
      "id": "footer",
      "type": "default",
      "position": { "x": 850, "y": 500 },
      "data": {
        "label": "Footer Component",
        "description": "Line count, stream status"
      }
    },
    {
      "id": "message-protocol",
      "type": "default",
      "position": { "x": 400, "y": 425 },
      "data": {
        "label": "Message Protocol",
        "description": "postMessage API\nExtension ↔ Webview"
      }
    },
    {
      "id": "preferences-manager",
      "type": "default",
      "position": { "x": 100, "y": 800 },
      "data": {
        "label": "PreferencesManager",
        "description": "Persists user preferences per cluster\nglobalState storage"
      }
    },
    {
      "id": "cluster-tree",
      "type": "default",
      "position": { "x": 100, "y": -50 },
      "data": {
        "label": "ClusterTreeProvider",
        "description": "Pod right-click menu\n'View Logs' action"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "cluster-tree",
      "target": "extension-host",
      "label": "Context menu action",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "extension-host",
      "target": "pod-logs-panel-class",
      "label": "PodLogsViewerPanel.show()",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "pod-logs-panel-class",
      "target": "panel-registry",
      "label": "Check/update registry",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "panel-registry",
      "target": "panel-info",
      "label": "Get or create PanelInfo",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "panel-info",
      "target": "webview-panel-1",
      "label": "Manage panel lifecycle",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "panel-info",
      "target": "webview-panel-2",
      "label": "Manage panel lifecycle",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "webview-panel-1",
      "target": "logs-provider-1",
      "label": "Uses",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "webview-panel-2",
      "target": "logs-provider-2",
      "label": "Uses",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "logs-provider-1",
      "target": "k8s-api-1",
      "label": "Stream logs",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "logs-provider-2",
      "target": "k8s-api-2",
      "label": "Stream logs",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "webview-panel-1",
      "target": "message-protocol",
      "label": "Send/receive messages",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "message-protocol",
      "target": "react-app",
      "label": "postMessage",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "react-app",
      "target": "toolbar",
      "label": "Renders",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "react-app",
      "target": "log-display",
      "label": "Renders",
      "type": "smoothstep"
    },
    {
      "id": "e15",
      "source": "react-app",
      "target": "search-bar",
      "label": "Renders",
      "type": "smoothstep"
    },
    {
      "id": "e16",
      "source": "react-app",
      "target": "footer",
      "label": "Renders",
      "type": "smoothstep"
    },
    {
      "id": "e17",
      "source": "pod-logs-panel-class",
      "target": "preferences-manager",
      "label": "Load/save preferences",
      "type": "smoothstep"
    }
  ]
}
```

## Diagram Notes

### Key Architectural Patterns

1. **Cluster-Specific Panel Registry**
   - `Map<contextName, PanelInfo>` maintains one panel per cluster
   - When user clicks pod in same cluster → reuse existing panel
   - When user clicks pod in different cluster → create new panel
   - Key is the Kubernetes context name (unique per cluster)

2. **Panel Lifecycle Management**
   - `PodLogsViewerPanel` static class manages all panels
   - `PanelInfo` holds panel instance, logs provider, current pod, preferences
   - Each panel has its own `LogsProvider` for independent streaming
   - Cleanup on panel disposal removes entry from registry

3. **Message Protocol**
   - Bidirectional communication via VS Code `postMessage` API
   - Extension → Webview: log data, status updates, errors
   - Webview → Extension: user actions (refresh, toggle, search, etc.)
   - Messages are typed for type safety

4. **React Component Hierarchy**
   - Main `App` component manages state and message handling
   - `Toolbar`: Pod info, container selector, line limit, toggles, action buttons
   - `LogDisplay`: Virtual scrolling with `react-window`, syntax highlighting
   - `SearchBar`: Search input, match navigation, close button
   - `Footer`: Line count, streaming status indicator

5. **Kubernetes API Integration**
   - Each `LogsProvider` instance manages one cluster connection
   - Uses `@kubernetes/client-node` library
   - Streams logs from `/api/v1/namespaces/{ns}/pods/{pod}/log`
   - Handles connection lifecycle, errors, reconnection

6. **Preferences Persistence**
   - User preferences stored per cluster in VS Code global state
   - Preferences: follow mode, timestamps, line limit, previous logs
   - Loaded when panel opens, saved when preferences change
   - Each cluster maintains independent preferences

### Data Flow

1. User right-clicks pod → ClusterTreeProvider
2. Context menu action → Extension Host
3. Extension calls `PodLogsViewerPanel.show(contextName, ...)`
4. Panel registry checked for existing panel
5. If exists: reveal and update; if not: create new
6. LogsProvider starts streaming from Kubernetes API
7. Log data chunks sent to webview via message protocol
8. React App receives messages, updates state
9. Virtual scrolling renders visible log lines efficiently
10. User actions sent back to extension for processing

