---
diagram_id: port-forwarding-architecture
name: Port Forwarding Architecture
description: System architecture for managing Kubernetes pod port forwards in VS Code
type: components
spec_id:
  - port-forwarding-manager-spec
  - port-forwarding-tree-spec
feature_id:
  - pod-port-forwarding
---

# Port Forwarding Architecture

This diagram shows the component architecture for the port forwarding feature, including the PortForwardManager singleton, tree view integration, and kubectl process management.

```json
{
  "nodes": [
    {
      "id": "vscode-extension",
      "type": "default",
      "position": { "x": 100, "y": 50 },
      "data": {
        "label": "VS Code Extension Host",
        "description": "Extension activation and lifecycle"
      },
      "style": {
        "background": "#f0f0f0",
        "border": "2px solid #666",
        "width": 200
      }
    },
    {
      "id": "tree-provider",
      "type": "default",
      "position": { "x": 100, "y": 200 },
      "data": {
        "label": "ClusterTreeProvider",
        "description": "Main tree data provider"
      },
      "style": {
        "background": "#e3f2fd",
        "border": "2px solid #2196f3"
      }
    },
    {
      "id": "networking-category",
      "type": "default",
      "position": { "x": 100, "y": 350 },
      "data": {
        "label": "NetworkingCategory",
        "description": "Parent category handler"
      },
      "style": {
        "background": "#e8f5e9",
        "border": "2px solid #4caf50"
      }
    },
    {
      "id": "port-forward-subcategory",
      "type": "default",
      "position": { "x": 100, "y": 500 },
      "data": {
        "label": "PortForwardingSubcategory",
        "description": "Displays active forwards"
      },
      "style": {
        "background": "#fff3e0",
        "border": "2px solid #ff9800"
      }
    },
    {
      "id": "port-forward-manager",
      "type": "default",
      "position": { "x": 450, "y": 200 },
      "data": {
        "label": "PortForwardManager",
        "description": "Singleton managing all forwards"
      },
      "style": {
        "background": "#fce4ec",
        "border": "3px solid #e91e63",
        "width": 220
      }
    },
    {
      "id": "forward-state",
      "type": "default",
      "position": { "x": 450, "y": 350 },
      "data": {
        "label": "Port Forward State",
        "description": "In-memory forward tracking"
      },
      "style": {
        "background": "#f3e5f5",
        "border": "2px solid #9c27b0"
      }
    },
    {
      "id": "kubectl-processes",
      "type": "default",
      "position": { "x": 450, "y": 500 },
      "data": {
        "label": "kubectl port-forward\nProcesses",
        "description": "Child processes for each forward"
      },
      "style": {
        "background": "#ffe0b2",
        "border": "2px solid #ff6f00"
      }
    },
    {
      "id": "pod-context-menu",
      "type": "default",
      "position": { "x": 800, "y": 200 },
      "data": {
        "label": "Pod Context Menu",
        "description": "'Port Forward' action"
      },
      "style": {
        "background": "#e0f2f1",
        "border": "2px solid #009688"
      }
    },
    {
      "id": "port-dialog",
      "type": "default",
      "position": { "x": 800, "y": 350 },
      "data": {
        "label": "Port Selection Dialog",
        "description": "Choose remote and local ports"
      },
      "style": {
        "background": "#e1f5fe",
        "border": "2px solid #03a9f4"
      }
    },
    {
      "id": "status-bar",
      "type": "default",
      "position": { "x": 800, "y": 500 },
      "data": {
        "label": "Status Bar Item",
        "description": "Show active forward count"
      },
      "style": {
        "background": "#f1f8e9",
        "border": "2px solid #8bc34a"
      }
    },
    {
      "id": "kubernetes-api",
      "type": "default",
      "position": { "x": 450, "y": 650 },
      "data": {
        "label": "Kubernetes API Server",
        "description": "Target cluster"
      },
      "style": {
        "background": "#326ce5",
        "color": "#fff",
        "width": 220
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "vscode-extension",
      "target": "tree-provider",
      "label": "registers",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "tree-provider",
      "target": "networking-category",
      "label": "provides categories",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "networking-category",
      "target": "port-forward-subcategory",
      "label": "contains",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "port-forward-subcategory",
      "target": "port-forward-manager",
      "label": "queries state",
      "type": "smoothstep",
      "style": {
        "stroke": "#e91e63",
        "strokeWidth": 2
      }
    },
    {
      "id": "e5",
      "source": "port-forward-manager",
      "target": "forward-state",
      "label": "maintains",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "port-forward-manager",
      "target": "kubectl-processes",
      "label": "spawns/monitors",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "kubectl-processes",
      "target": "kubernetes-api",
      "label": "forwards ports",
      "type": "smoothstep",
      "animated": true
    },
    {
      "id": "e8",
      "source": "pod-context-menu",
      "target": "port-dialog",
      "label": "shows",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "port-dialog",
      "target": "port-forward-manager",
      "label": "starts forward",
      "type": "smoothstep",
      "style": {
        "stroke": "#4caf50",
        "strokeWidth": 2
      }
    },
    {
      "id": "e10",
      "source": "port-forward-manager",
      "target": "tree-provider",
      "label": "refresh event",
      "type": "smoothstep",
      "style": {
        "stroke": "#9c27b0",
        "strokeWidth": 2,
        "strokeDasharray": "5,5"
      }
    },
    {
      "id": "e11",
      "source": "port-forward-manager",
      "target": "status-bar",
      "label": "updates count",
      "type": "smoothstep",
      "style": {
        "stroke": "#8bc34a",
        "strokeWidth": 2
      }
    }
  ]
}
```

## Diagram Notes

### Component Responsibilities

**VS Code Extension Host**:
- Activates extension and registers all components
- Manages extension lifecycle
- Handles extension deactivation cleanup

**ClusterTreeProvider**:
- Main tree data provider for VS Code TreeView API
- Manages tree structure and refresh events
- Coordinates between categories and manager

**NetworkingCategory**:
- Parent category for networking resources
- Returns subcategories including Services and Port Forwarding
- Follows existing pattern from other categories

**PortForwardingSubcategory**:
- Queries PortForwardManager for active forwards
- Creates tree items for each active forward
- Shows local:remote port mapping and pod info
- Provides "Stop" action in context menu

**PortForwardManager (Singleton)**:
- **Central hub** for all port forwarding operations
- Maintains in-memory state of all active forwards
- Spawns and monitors kubectl port-forward processes
- Handles process cleanup and error monitoring
- Emits events for tree refresh and status bar updates
- Checks port availability before starting forwards
- Auto-cleanup on extension deactivate or pod deletion

**Port Forward State**:
- In-memory data structure tracking active forwards
- Contains: podName, namespace, localPort, remotePort, processId, status
- Updated by PortForwardManager

**kubectl port-forward Processes**:
- Child processes running kubectl commands
- One process per active forward
- Format: `kubectl port-forward <pod> <localPort>:<remotePort> -n <namespace>`
- Monitored for stdout/stderr and exit codes

**Pod Context Menu**:
- "Port Forward" action appears for Pod tree items
- Triggers port selection dialog
- Only visible for running pods

**Port Selection Dialog**:
- Two-step dialog or single multi-input dialog
- Remote port: Dropdown of container ports from pod spec + custom entry
- Local port: Auto-suggest same as remote, check availability, allow custom
- Shows validation errors for port conflicts

**Status Bar Item**:
- Shows "kube9: N forwards active" when forwards exist
- Hidden when no active forwards
- Clicking focuses tree on Port Forwarding category

### Data Flow Patterns

**Starting a Port Forward**:
1. User right-clicks pod → "Port Forward"
2. Port dialog shows, user selects ports
3. Dialog calls PortForwardManager.startForward()
4. Manager checks port availability
5. Manager spawns kubectl process
6. Manager adds to state and emits event
7. Status bar updates count immediately
8. Tree shows forward when user expands Port Forwarding (on-demand)

**Stopping a Port Forward**:
1. User right-clicks forward item → "Stop Port Forward"
2. Tree item calls PortForwardManager.stopForward()
3. Manager kills kubectl process
4. Manager removes from state and emits event
5. Status bar updates count immediately
6. Tree shows updated state when user views Port Forwarding (on-demand)

**Auto-cleanup on Pod Deletion**:
1. Pod is deleted from cluster
2. kubectl process exits with error
3. Manager detects process termination
4. Manager removes from state and emits refresh event
5. Tree updates automatically

### Singleton Pattern

The PortForwardManager uses singleton pattern to ensure:
- Single source of truth for all forwards
- Consistent state across tree refreshes
- Proper cleanup on extension deactivate
- Event coordination across components

### Process Management

Each kubectl process:
- Runs in background
- Monitored for stdout/stderr
- Process ID stored for cleanup
- Handles SIGTERM gracefully
- Auto-restart not implemented (user must manually restart)

### Integration Points

**With Tree View (On-Demand)**:
- Tree does NOT subscribe to manager events
- When Port Forwarding category is expanded:
  - VS Code calls getChildren()
  - PortForwardingSubcategory queries manager for current state
  - Tree items created fresh with current status/uptime
- User always sees accurate state when they view it
- Zero tree refresh overhead when category is collapsed

**With Status Bar (Real-Time)**:
- Manager updates status bar immediately on forward changes
- Provides user awareness without tree refresh overhead
- Status bar provides quick access to tree (expands Port Forwarding)

**With Pod Context Menu**:
- Command registered for Pod tree items only
- Dialog validates pod is in Running state
- Extracts pod metadata for forward creation

### On-Demand Refresh Strategy

**Benefits**:
- **Zero overhead** when tree is collapsed
- **No periodic timers** or polling
- **No automatic refresh events** to impact performance
- **Always accurate** when user views the category
- **Lightweight status bar** provides awareness

**User Experience**:
- Status bar shows count in real-time
- Tree shows current state when expanded
- Manual refresh available if needed
- No flicker or unnecessary updates

