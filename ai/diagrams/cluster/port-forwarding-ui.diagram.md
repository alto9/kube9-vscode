---
diagram_id: port-forwarding-ui
name: Port Forwarding UI Components
description: User interface components for port forwarding feature
type: components
spec_id:
  - port-forwarding-tree-spec
feature_id:
  - pod-port-forwarding
---

# Port Forwarding UI Components

This diagram shows all user-facing components of the port forwarding feature including tree items, dialogs, status bar, and context menus.

```json
{
  "nodes": [
    {
      "id": "tree-view",
      "type": "default",
      "position": { "x": 100, "y": 50 },
      "data": {
        "label": "VS Code Tree View",
        "description": "Main navigation panel"
      },
      "style": {
        "background": "#f0f0f0",
        "border": "2px solid #666",
        "width": 200
      }
    },
    {
      "id": "networking-category",
      "type": "default",
      "position": { "x": 100, "y": 200 },
      "data": {
        "label": "📡 Networking",
        "description": "Parent category (expandable)"
      },
      "style": {
        "background": "#e8f5e9",
        "border": "2px solid #4caf50"
      }
    },
    {
      "id": "services-subcategory",
      "type": "default",
      "position": { "x": 50, "y": 350 },
      "data": {
        "label": "Services",
        "description": "Existing subcategory"
      },
      "style": {
        "background": "#e3f2fd",
        "border": "1px solid #2196f3",
        "width": 150
      }
    },
    {
      "id": "port-forwarding-subcategory",
      "type": "default",
      "position": { "x": 250, "y": 350 },
      "data": {
        "label": "⚡ Port Forwarding",
        "description": "New subcategory (expandable)"
      },
      "style": {
        "background": "#fff3e0",
        "border": "2px solid #ff9800",
        "width": 200
      }
    },
    {
      "id": "forward-item-1",
      "type": "default",
      "position": { "x": 250, "y": 500 },
      "data": {
        "label": "localhost:8080 → default/nginx:80",
        "description": "Active forward item"
      },
      "style": {
        "background": "#e8f5e9",
        "border": "1px solid #4caf50",
        "fontSize": 11,
        "width": 250
      }
    },
    {
      "id": "forward-item-2",
      "type": "default",
      "position": { "x": 250, "y": 580 },
      "data": {
        "label": "localhost:3000 → prod/api:3000",
        "description": "Active forward item"
      },
      "style": {
        "background": "#e8f5e9",
        "border": "1px solid #4caf50",
        "fontSize": 11,
        "width": 250
      }
    },
    {
      "id": "workloads-category",
      "type": "default",
      "position": { "x": 600, "y": 200 },
      "data": {
        "label": "⚙️ Workloads",
        "description": "Category containing pods"
      },
      "style": {
        "background": "#f3e5f5",
        "border": "2px solid #9c27b0"
      }
    },
    {
      "id": "pods-subcategory",
      "type": "default",
      "position": { "x": 600, "y": 350 },
      "data": {
        "label": "Pods",
        "description": "Pods subcategory"
      },
      "style": {
        "background": "#e1f5fe",
        "border": "1px solid #03a9f4"
      }
    },
    {
      "id": "pod-item",
      "type": "default",
      "position": { "x": 600, "y": 500 },
      "data": {
        "label": "nginx-pod ⚡",
        "description": "Pod with active forward badge"
      },
      "style": {
        "background": "#fff9c4",
        "border": "2px solid #fbc02d",
        "width": 180
      }
    },
    {
      "id": "pod-context-menu",
      "type": "default",
      "position": { "x": 850, "y": 450 },
      "data": {
        "label": "Pod Context Menu",
        "description": "Right-click actions"
      },
      "style": {
        "background": "#e0f2f1",
        "border": "2px solid #009688",
        "width": 200
      }
    },
    {
      "id": "menu-items",
      "type": "default",
      "position": { "x": 850, "y": 580 },
      "data": {
        "label": "• Port Forward\n• Open Terminal\n• View YAML\n• Delete\n• ...",
        "description": "Menu options"
      },
      "style": {
        "background": "#fff",
        "border": "1px solid #009688",
        "fontSize": 11,
        "width": 200
      }
    },
    {
      "id": "forward-context-menu",
      "type": "default",
      "position": { "x": 250, "y": 700 },
      "data": {
        "label": "Forward Context Menu",
        "description": "Right-click active forward"
      },
      "style": {
        "background": "#fce4ec",
        "border": "2px solid #e91e63",
        "width": 200
      }
    },
    {
      "id": "forward-menu-items",
      "type": "default",
      "position": { "x": 250, "y": 830 },
      "data": {
        "label": "• Stop Port Forward\n• Copy Local URL\n• View Pod",
        "description": "Forward actions"
      },
      "style": {
        "background": "#fff",
        "border": "1px solid #e91e63",
        "fontSize": 11,
        "width": 200
      }
    },
    {
      "id": "status-bar",
      "type": "default",
      "position": { "x": 100, "y": 1000 },
      "data": {
        "label": "Status Bar",
        "description": "Bottom of VS Code window"
      },
      "style": {
        "background": "#007acc",
        "color": "#fff",
        "width": 450
      }
    },
    {
      "id": "status-item",
      "type": "default",
      "position": { "x": 200, "y": 1100 },
      "data": {
        "label": "kube9: 2 forwards active",
        "description": "Clickable status item"
      },
      "style": {
        "background": "#4caf50",
        "color": "#fff",
        "fontSize": 11,
        "width": 250
      }
    },
    {
      "id": "port-dialog",
      "type": "default",
      "position": { "x": 600, "y": 1000 },
      "data": {
        "label": "Port Selection Dialog",
        "description": "Modal dialog"
      },
      "style": {
        "background": "#e3f2fd",
        "border": "3px solid #2196f3",
        "width": 250
      }
    },
    {
      "id": "dialog-content",
      "type": "default",
      "position": { "x": 600, "y": 1150 },
      "data": {
        "label": "Remote Port: [Dropdown]\nLocal Port: [8080]\n\n[Cancel] [Start Forward]",
        "description": "Dialog inputs and buttons"
      },
      "style": {
        "background": "#fff",
        "border": "1px solid #2196f3",
        "fontSize": 11,
        "width": 250
      }
    },
    {
      "id": "notifications",
      "type": "default",
      "position": { "x": 100, "y": 1300 },
      "data": {
        "label": "Notifications",
        "description": "Toast messages"
      },
      "style": {
        "background": "#f1f8e9",
        "border": "2px solid #8bc34a",
        "width": 200
      }
    },
    {
      "id": "success-notification",
      "type": "default",
      "position": { "x": 100, "y": 1450 },
      "data": {
        "label": "✅ Port forward established:\nlocalhost:8080 → nginx:80",
        "description": "Success message"
      },
      "style": {
        "background": "#e8f5e9",
        "border": "1px solid #4caf50",
        "fontSize": 10,
        "width": 200
      }
    },
    {
      "id": "error-notification",
      "type": "default",
      "position": { "x": 350, "y": 1450 },
      "data": {
        "label": "❌ Port 8080 is already in use.\nTry port 8081?",
        "description": "Error message"
      },
      "style": {
        "background": "#ffebee",
        "border": "1px solid #f44336",
        "fontSize": 10,
        "width": 200
      }
    },
    {
      "id": "tooltip",
      "type": "default",
      "position": { "x": 600, "y": 1300 },
      "data": {
        "label": "Tooltip",
        "description": "Hover information"
      },
      "style": {
        "background": "#fff9c4",
        "border": "2px solid #fbc02d",
        "width": 200
      }
    },
    {
      "id": "tooltip-content",
      "type": "default",
      "position": { "x": 600, "y": 1450 },
      "data": {
        "label": "Port Forward\nPod: default/nginx-pod\nLocal: localhost:8080\nRemote: 80\nStatus: Connected\nUptime: 5m 32s",
        "description": "Detailed info on hover"
      },
      "style": {
        "background": "#fff",
        "border": "1px solid #fbc02d",
        "fontSize": 10,
        "width": 200
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "tree-view",
      "target": "networking-category",
      "label": "contains",
      "type": "smoothstep"
    },
    {
      "id": "e2",
      "source": "networking-category",
      "target": "services-subcategory",
      "label": "child",
      "type": "smoothstep"
    },
    {
      "id": "e3",
      "source": "networking-category",
      "target": "port-forwarding-subcategory",
      "label": "child (NEW)",
      "type": "smoothstep",
      "style": {
        "stroke": "#ff9800",
        "strokeWidth": 2
      }
    },
    {
      "id": "e4",
      "source": "port-forwarding-subcategory",
      "target": "forward-item-1",
      "label": "shows",
      "type": "smoothstep"
    },
    {
      "id": "e5",
      "source": "port-forwarding-subcategory",
      "target": "forward-item-2",
      "label": "shows",
      "type": "smoothstep"
    },
    {
      "id": "e6",
      "source": "forward-item-1",
      "target": "forward-context-menu",
      "label": "right-click",
      "type": "smoothstep",
      "style": {
        "strokeDasharray": "5,5"
      }
    },
    {
      "id": "e7",
      "source": "forward-context-menu",
      "target": "forward-menu-items",
      "label": "shows",
      "type": "smoothstep"
    },
    {
      "id": "e8",
      "source": "tree-view",
      "target": "workloads-category",
      "label": "contains",
      "type": "smoothstep"
    },
    {
      "id": "e9",
      "source": "workloads-category",
      "target": "pods-subcategory",
      "label": "child",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "pods-subcategory",
      "target": "pod-item",
      "label": "shows",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "pod-item",
      "target": "pod-context-menu",
      "label": "right-click",
      "type": "smoothstep",
      "style": {
        "strokeDasharray": "5,5"
      }
    },
    {
      "id": "e12",
      "source": "pod-context-menu",
      "target": "menu-items",
      "label": "shows",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "menu-items",
      "target": "port-dialog",
      "label": "Port Forward →",
      "type": "smoothstep",
      "style": {
        "stroke": "#2196f3",
        "strokeWidth": 2
      }
    },
    {
      "id": "e14",
      "source": "port-dialog",
      "target": "dialog-content",
      "label": "displays",
      "type": "smoothstep"
    },
    {
      "id": "e15",
      "source": "status-bar",
      "target": "status-item",
      "label": "contains",
      "type": "smoothstep"
    },
    {
      "id": "e16",
      "source": "status-item",
      "target": "port-forwarding-subcategory",
      "label": "click → focus",
      "type": "smoothstep",
      "style": {
        "stroke": "#4caf50",
        "strokeWidth": 2,
        "strokeDasharray": "5,5"
      }
    },
    {
      "id": "e17",
      "source": "notifications",
      "target": "success-notification",
      "label": "on success",
      "type": "smoothstep"
    },
    {
      "id": "e18",
      "source": "notifications",
      "target": "error-notification",
      "label": "on error",
      "type": "smoothstep"
    },
    {
      "id": "e19",
      "source": "tooltip",
      "target": "tooltip-content",
      "label": "displays",
      "type": "smoothstep"
    },
    {
      "id": "e20",
      "source": "forward-item-1",
      "target": "tooltip",
      "label": "hover",
      "type": "smoothstep",
      "style": {
        "strokeDasharray": "5,5"
      }
    }
  ]
}
```

## Component Descriptions

### Tree View Components

**Networking Category**:
- **Icon**: 📡 Network icon (VS Code ThemeIcon: 'globe' or 'plug')
- **Label**: "Networking"
- **Expandable**: Yes
- **Children**: Services, Port Forwarding
- **Position**: After Storage, before Helm

**Port Forwarding Subcategory**:
- **Icon**: ⚡ Lightning bolt (VS Code ThemeIcon: 'zap' or 'broadcast')
- **Label**: "Port Forwarding"
- **Expandable**: Yes (collapses when empty)
- **Children**: Active forward items
- **Badge**: Shows count when collapsed (e.g., "2")
- **Empty State**: Shows "No active port forwards" message item

**Port Forward Items**:
- **Format**: `localhost:{localPort} → {namespace}/{podName}:{remotePort}`
- **Examples**:
  - `localhost:8080 → default/nginx-pod:80`
  - `localhost:3000 → production/api-service:3000`
  - `localhost:5432 → staging/postgres-0:5432`
- **Icon**: Connection status indicator
  - 🟢 Green dot: Connected
  - 🔴 Red dot: Disconnected/Error
  - 🟡 Yellow dot: Connecting
- **Context Menu**: Right-click shows actions
- **Tooltip**: Detailed information on hover

**Pod Items with Active Forwards**:
- **Badge**: ⚡ Lightning bolt suffix to indicate active forward
- **Example**: "nginx-pod ⚡"
- **Tooltip**: Shows forward details
- **Behavior**: Clicking pod shows its details, clicking badge could focus forward in tree

### Context Menus

**Pod Context Menu** (Right-click on Pod):
- **Port Forward**: New action added at top of networking-related actions
- **Position**: After "Open Terminal", before "View YAML"
- **When Clause**: `viewItem == resource:Pod && podStatus == Running`
- **Group**: `kube9-networking@1`

**Forward Item Context Menu** (Right-click on Port Forward item):
- **Stop Port Forward**: Primary action (with confirmation)
- **Copy Local URL**: Copy `http://localhost:{localPort}` to clipboard
- **Copy Address**: Copy `localhost:{localPort}` to clipboard
- **View Pod**: Focus tree on associated pod
- **Restart Forward**: Stop and start again (useful for connection errors)

### Port Selection Dialog

**Dialog Type**: VS Code `InputBox` or `QuickPick` (multi-step)

**Step 1: Remote Port**:
- **Title**: "Select Remote Port"
- **Prompt**: "Choose the port on {podName} to forward"
- **Items**: Dropdown of container ports from pod spec
  - Format: `{port} ({name})` e.g., "80 (http)", "443 (https)"
  - Include all containerPort entries
  - Add option: "Custom port..."
- **Validation**: Numeric, 1-65535 range
- **Placeholder**: "e.g., 8080"

**Step 2: Local Port**:
- **Title**: "Select Local Port"
- **Prompt**: "Choose local port to forward to localhost"
- **Default Value**: Same as remote port (if available)
- **Validation**: 
  - Numeric, 1024-65535 range (avoid privileged ports)
  - Check availability
  - If in use, show error and suggest next free port
- **Placeholder**: "e.g., 8080"
- **Quick Picks**: Suggested ports
  - Same as remote port (if available)
  - Common alternatives: 8080, 3000, 5000, 8000, 9000
  - Next available port

**Alternative: Single-Dialog**:
- Use VS Code `showQuickPick` with custom UI
- Both ports in single view
- Real-time availability checking
- Immediate feedback

### Status Bar

**Status Bar Item**:
- **Text**: `kube9: {count} forward{s} active`
- **Examples**:
  - "kube9: 1 forward active"
  - "kube9: 3 forwards active"
- **Icon**: ⚡ Lightning bolt prefix
- **Color**: Default (or green when active)
- **Position**: Left side of status bar, after language mode
- **Visibility**: Only shown when count > 0
- **Click Action**: Focus tree on Port Forwarding subcategory and expand it
- **Tooltip**: "Click to view active port forwards"

### Notifications

**Success Notification**:
- **Type**: Information message
- **Format**: "✅ Port forward established: localhost:{localPort} → {namespace}/{podName}:{remotePort}"
- **Duration**: 5 seconds auto-dismiss
- **Actions**: Optional "Open Browser" button (opens http://localhost:{localPort})

**Error Notifications**:

1. **Port Conflict**:
   - **Format**: "❌ Port {localPort} is already in use. Try port {suggestedPort}?"
   - **Actions**: "Try {suggestedPort}" button, "Cancel" button

2. **Pod Not Running**:
   - **Format**: "❌ Cannot port forward: Pod '{podName}' is not in Running state (current: {phase})"
   - **Actions**: None

3. **Connection Failed**:
   - **Format**: "❌ Port forward failed: {errorMessage}"
   - **Actions**: "Retry" button, "View Logs" button

4. **Permission Denied**:
   - **Format**: "❌ Permission denied: You need pods/portforward permission in namespace '{namespace}'"
   - **Actions**: "View RBAC Docs" button

5. **kubectl Not Found**:
   - **Format**: "❌ kubectl not found. Please install kubectl to use port forwarding."
   - **Actions**: "Install kubectl" button (opens installation docs)

**Info Notifications**:
- **Pod Deleted**: "ℹ️ Port forward stopped: Pod '{podName}' was deleted"
- **Forward Stopped**: "ℹ️ Port forward stopped: localhost:{localPort} → {namespace}/{podName}:{remotePort}"

### Tooltips

**Forward Item Tooltip**:
```
Port Forward
Pod: {namespace}/{podName}
Local: localhost:{localPort}
Remote: {remotePort}
Status: Connected
Uptime: {duration}
Started: {timestamp}
```

**Pod Item Tooltip** (with active forward):
```
Pod: {podName}
Namespace: {namespace}
Status: Running
Active Port Forward: localhost:{localPort} → {remotePort}
```

**Port Forwarding Subcategory Tooltip**:
```
Active Port Forwards
Manage local port forwards to pods in your cluster
Right-click a pod to start forwarding
```

### Empty States

**No Active Forwards**:
- Show tree item in Port Forwarding subcategory
- **Label**: "No active port forwards"
- **Icon**: Info icon
- **Description**: "Right-click a running pod to start port forwarding"
- **Not Clickable**: Purely informational

**No Running Pods**:
- If user tries to forward when no pods are running
- **Notification**: "No running pods found. Start a pod to use port forwarding."

## Visual Design Patterns

### Icons
- **Networking Category**: `new ThemeIcon('globe')` or `new ThemeIcon('plug')`
- **Port Forwarding Subcategory**: `new ThemeIcon('zap')` or `new ThemeIcon('broadcast')`
- **Forward Items**:
  - Connected: `new ThemeIcon('circle-filled', new ThemeColor('charts.green'))`
  - Disconnected: `new ThemeIcon('circle-filled', new ThemeColor('charts.red'))`
  - Connecting: `new ThemeIcon('loading~spin')`
- **Pod Badge**: `new ThemeIcon('zap', new ThemeColor('charts.yellow'))`

### Colors
- **Success**: Green (#4caf50)
- **Error**: Red (#f44336)
- **Warning**: Yellow (#fbc02d)
- **Info**: Blue (#2196f3)
- **Active**: Orange (#ff9800)

### Text Formatting
- **Forward Item Label**: Monospace font for port numbers
- **Status Indicators**: Emoji or ThemeIcon
- **Tooltips**: Multi-line with clear sections
- **Notifications**: Concise, actionable

### Accessibility
- **Screen Reader Labels**: Descriptive text for all tree items
- **Keyboard Navigation**: Full keyboard support
- **High Contrast Mode**: Use ThemeIcons and ThemeColors
- **Focus Indicators**: Clear focus states
- **Announcements**: Status changes announced to screen readers

## Interaction Patterns

### Starting a Forward
1. User right-clicks pod
2. Selects "Port Forward" from context menu
3. Chooses remote port (dropdown or input)
4. Chooses local port (auto-suggested, validated)
5. Confirms, sees progress notification
6. Sees success notification with "Open Browser" option
7. Forward appears in tree
8. Status bar updates

### Stopping a Forward
1. User right-clicks forward item in tree
2. Selects "Stop Port Forward"
3. Confirmation dialog appears (optional)
4. Forward removed from tree
5. Status bar updates
6. Info notification shown

### Viewing Active Forwards
- **Option 1**: Expand Networking → Port Forwarding in tree
- **Option 2**: Click status bar item to focus and expand
- **Option 3**: Use command palette: "kube9: Show Port Forwards"

### Copying Forward Info
- Right-click forward item
- "Copy Local URL" → copies `http://localhost:8080`
- "Copy Address" → copies `localhost:8080`
- Useful for pasting into browser or configuration

### Quick Access to Pod
- Right-click forward item
- "View Pod" → focuses tree on associated pod in Workloads
- Useful for checking pod status or accessing other pod actions

## Responsive Behavior

### Window Resize
- Status bar item remains visible (doesn't overflow)
- Tree items truncate gracefully with ellipsis
- Tooltips adjust position to stay on-screen

### Tree Collapse/Expand
- Port Forwarding subcategory remembers expansion state
- Badge shows count when collapsed
- Forward items reappear when expanded

### State Persistence
- Expansion states saved to workspace state
- Active forwards NOT persisted (start fresh each session)
- User preferences (default ports, etc.) saved to settings

## Future UI Enhancements

### Forward Profiles
- Save common forward configurations
- Quick start from saved profiles
- Share profiles with team

### Multi-Port Forwarding
- Dialog supports multiple port mappings
- Single kubectl process for multiple ports
- Tree item shows all mapped ports

### Visual Connection Status
- Real-time bandwidth indicator
- Request count display
- Last activity timestamp

### Browser Integration
- "Open in Browser" button in tree item inline
- Auto-open browser on forward start (optional)
- Browser extension for forward management

