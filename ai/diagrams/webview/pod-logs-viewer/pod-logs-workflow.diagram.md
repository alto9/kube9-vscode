---
diagram_id: pod-logs-workflow
name: Pod Logs Viewer User Workflows
description: User workflows showing panel creation, reuse, container selection, and streaming control
type: flows
spec_id:
  - pod-logs-panel-spec
feature_id:
  - pod-logs-panel
  - pod-logs-actions
---

# Pod Logs Viewer User Workflows

This diagram shows the key user workflows in the Pod Logs Viewer, including panel creation, cluster-specific reuse, container selection, and streaming control.

```json
{
  "nodes": [
    {
      "id": "start",
      "type": "default",
      "position": { "x": 400, "y": 50 },
      "data": {
        "label": "User Right-Clicks Pod",
        "description": "Pod in ClusterTreeView"
      }
    },
    {
      "id": "select-view-logs",
      "type": "default",
      "position": { "x": 400, "y": 150 },
      "data": {
        "label": "Select 'View Logs'",
        "description": "From context menu"
      }
    },
    {
      "id": "check-panel-exists",
      "type": "default",
      "position": { "x": 400, "y": 250 },
      "data": {
        "label": "Check Panel Exists?",
        "description": "For this cluster context"
      }
    },
    {
      "id": "reveal-existing",
      "type": "default",
      "position": { "x": 200, "y": 350 },
      "data": {
        "label": "Reveal Existing Panel",
        "description": "Bring to focus"
      }
    },
    {
      "id": "create-new",
      "type": "default",
      "position": { "x": 600, "y": 350 },
      "data": {
        "label": "Create New Panel",
        "description": "New webview for cluster"
      }
    },
    {
      "id": "stop-current-stream",
      "type": "default",
      "position": { "x": 200, "y": 450 },
      "data": {
        "label": "Stop Current Stream",
        "description": "If streaming logs"
      }
    },
    {
      "id": "check-containers",
      "type": "default",
      "position": { "x": 400, "y": 550 },
      "data": {
        "label": "Check Container Count",
        "description": "Single or multiple?"
      }
    },
    {
      "id": "single-container",
      "type": "default",
      "position": { "x": 200, "y": 650 },
      "data": {
        "label": "Single Container",
        "description": "Auto-select container"
      }
    },
    {
      "id": "multi-container",
      "type": "default",
      "position": { "x": 600, "y": 650 },
      "data": {
        "label": "Multiple Containers",
        "description": "Show QuickPick"
      }
    },
    {
      "id": "quickpick",
      "type": "default",
      "position": { "x": 600, "y": 750 },
      "data": {
        "label": "Container QuickPick",
        "description": "[nginx, sidecar, init, All Containers]"
      }
    },
    {
      "id": "user-selects",
      "type": "default",
      "position": { "x": 600, "y": 850 },
      "data": {
        "label": "User Selects Container",
        "description": "Choose from list"
      }
    },
    {
      "id": "start-stream",
      "type": "default",
      "position": { "x": 400, "y": 950 },
      "data": {
        "label": "Start Log Stream",
        "description": "Kubernetes API connection"
      }
    },
    {
      "id": "display-logs",
      "type": "default",
      "position": { "x": 400, "y": 1050 },
      "data": {
        "label": "Display Logs",
        "description": "Virtual scrolling, follow mode on"
      }
    },
    {
      "id": "user-actions",
      "type": "default",
      "position": { "x": 400, "y": 1150 },
      "data": {
        "label": "User Interacts",
        "description": "Search, toggle, copy, export, etc."
      }
    },
    {
      "id": "toggle-follow",
      "type": "default",
      "position": { "x": 100, "y": 1250 },
      "data": {
        "label": "Toggle Follow Mode",
        "description": "On/Off streaming"
      }
    },
    {
      "id": "switch-container",
      "type": "default",
      "position": { "x": 250, "y": 1250 },
      "data": {
        "label": "Switch Container",
        "description": "Select different container"
      }
    },
    {
      "id": "search-logs",
      "type": "default",
      "position": { "x": 400, "y": 1250 },
      "data": {
        "label": "Search Logs",
        "description": "Find matches, navigate"
      }
    },
    {
      "id": "copy-logs",
      "type": "default",
      "position": { "x": 550, "y": 1250 },
      "data": {
        "label": "Copy Logs",
        "description": "To clipboard"
      }
    },
    {
      "id": "export-logs",
      "type": "default",
      "position": { "x": 700, "y": 1250 },
      "data": {
        "label": "Export Logs",
        "description": "Save to file"
      }
    },
    {
      "id": "close-panel",
      "type": "default",
      "position": { "x": 400, "y": 1400 },
      "data": {
        "label": "User Closes Panel",
        "description": "Click X or close tab"
      }
    },
    {
      "id": "cleanup",
      "type": "default",
      "position": { "x": 400, "y": 1500 },
      "data": {
        "label": "Cleanup Resources",
        "description": "Stop stream, remove from registry, dispose"
      }
    },
    {
      "id": "end",
      "type": "default",
      "position": { "x": 400, "y": 1600 },
      "data": {
        "label": "End",
        "description": "Panel closed"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "start",
      "target": "select-view-logs",
      "label": "Context menu",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "select-view-logs",
      "target": "check-panel-exists",
      "label": "Check registry",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "check-panel-exists",
      "target": "reveal-existing",
      "label": "Yes - panel exists",
      "type": "smoothstep"
    },
    {
      "id": "e4",
      "source": "check-panel-exists",
      "target": "create-new",
      "label": "No - create new",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "reveal-existing",
      "target": "stop-current-stream",
      "label": "Update to new pod",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "stop-current-stream",
      "target": "check-containers",
      "label": "Fetch pod spec",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "create-new",
      "target": "check-containers",
      "label": "Initialize panel",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "check-containers",
      "target": "single-container",
      "label": "1 container",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "check-containers",
      "target": "multi-container",
      "label": "2+ containers",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "single-container",
      "target": "start-stream",
      "label": "Auto-select",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "multi-container",
      "target": "quickpick",
      "label": "Show picker",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "quickpick",
      "target": "user-selects",
      "label": "User choice",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "user-selects",
      "target": "start-stream",
      "label": "Selected container",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "start-stream",
      "target": "display-logs",
      "label": "Stream connected",
      "type": "smoothstep"
    },
    {
      "id": "e15",
      "source": "display-logs",
      "target": "user-actions",
      "label": "Panel active",
      "type": "smoothstep"
    },
    {
      "id": "e16",
      "source": "user-actions",
      "target": "toggle-follow",
      "label": "Toggle button",
      "type": "smoothstep"
    },
    {
      "id": "e17",
      "source": "user-actions",
      "target": "switch-container",
      "label": "Container dropdown",
      "type": "smoothstep"
    },
    {
      "id": "e18",
      "source": "user-actions",
      "target": "search-logs",
      "label": "Search button",
      "type": "smoothstep"
    },
    {
      "id": "e19",
      "source": "user-actions",
      "target": "copy-logs",
      "label": "Copy button",
      "type": "smoothstep"
    },
    {
      "id": "e20",
      "source": "user-actions",
      "target": "export-logs",
      "label": "Export button",
      "type": "smoothstep"
    },
    {
      "id": "e21",
      "source": "toggle-follow",
      "target": "display-logs",
      "label": "Continue viewing",
      "type": "smoothstep"
    },
    {
      "id": "e22",
      "source": "switch-container",
      "target": "stop-current-stream",
      "label": "Change container",
      "type": "smoothstep"
    },
    {
      "id": "e23",
      "source": "search-logs",
      "target": "display-logs",
      "label": "Highlight matches",
      "type": "smoothstep"
    },
    {
      "id": "e24",
      "source": "copy-logs",
      "target": "user-actions",
      "label": "Continue",
      "type": "smoothstep"
    },
    {
      "id": "e25",
      "source": "export-logs",
      "target": "user-actions",
      "label": "Continue",
      "type": "smoothstep"
    },
    {
      "id": "e26",
      "source": "user-actions",
      "target": "close-panel",
      "label": "Close tab",
      "type": "smoothstep"
    },
    {
      "id": "e27",
      "source": "close-panel",
      "target": "cleanup",
      "label": "Dispose event",
      "type": "smoothstep"
    },
    {
      "id": "e28",
      "source": "cleanup",
      "target": "end",
      "label": "Complete",
      "type": "smoothstep"
    }
  ]
}
```

## Workflow Notes

### Workflow 1: Opening Logs (First Time for Cluster)

1. User right-clicks pod in tree view
2. Selects "View Logs" from context menu
3. System checks if panel exists for this cluster → No
4. Creates new webview panel with title "Logs: {cluster-name}"
5. Checks pod container count:
   - If 1 container: Auto-select and start streaming
   - If 2+ containers: Show QuickPick for user to select
6. Starts log stream from Kubernetes API
7. Displays logs with follow mode on by default

### Workflow 2: Opening Logs (Reusing Existing Panel)

1. User right-clicks different pod in same cluster
2. Selects "View Logs"
3. System checks if panel exists for this cluster → Yes
4. Reveals existing panel and brings to focus
5. Stops current log stream
6. Updates panel to show new pod's logs
7. Checks container count and follows same logic as Workflow 1
8. Starts new log stream for the new pod

### Workflow 3: Switching Containers

1. User has multi-container pod logs open
2. Clicks container selector dropdown
3. Selects different container from list
4. System stops current stream
5. Starts new stream for selected container
6. Updates display with new container's logs
7. Maintains all other preferences (follow mode, timestamps, etc.)

### Workflow 4: User Actions (Search, Copy, Export)

1. User is viewing logs in active panel
2. Performs various actions:
   - **Search**: Opens search bar, highlights matches, navigates
   - **Toggle Follow**: Turns on/off auto-scrolling
   - **Copy**: Copies visible logs to clipboard
   - **Export**: Opens save dialog, writes logs to file
   - **Toggle Timestamps**: Shows/hides timestamps
   - **Refresh**: Re-fetches logs from API
3. Actions send messages to extension host
4. Extension processes and responds
5. Webview updates UI based on response

### Workflow 5: Panel Cleanup

1. User closes the panel (clicks X or closes tab)
2. Panel's `onDidDispose` event fires
3. Extension host cleanup sequence:
   - Stop active log stream
   - Destroy Kubernetes API connection
   - Remove panel from registry (Map)
   - Clean up event listeners
   - Release memory resources
4. Panel instance destroyed

### Key Decision Points

- **Panel Exists Check**: Determines reuse vs. create new
- **Container Count**: Auto-select vs. show picker
- **Follow Mode**: Auto-scroll vs. manual scroll
- **Stream Status**: Connected, disconnected, or error state

### Error Handling Paths

- **Pod Not Found**: Display error, disable streaming, keep panel open
- **API Connection Failure**: Show error, retry button, auto-reconnect attempts
- **Stream Interruption**: Detect, notify, attempt reconnection
- **Permission Denied**: Display error with RBAC guidance

### Performance Considerations

- Virtual scrolling for large log volumes
- Batched message updates (every 100ms)
- Buffer limits to prevent memory issues
- Efficient cleanup on panel disposal

