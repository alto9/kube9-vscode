---
diagram_id: port-forwarding-workflow
name: Port Forwarding Workflow
description: End-to-end workflow for starting, managing, and stopping port forwards
type: flows
spec_id:
  - port-forwarding-command-spec
  - port-forwarding-manager-spec
feature_id:
  - pod-port-forwarding
---

# Port Forwarding Workflow

This diagram illustrates the complete workflow from initiating a port forward through managing active forwards to cleanup.

```json
{
  "nodes": [
    {
      "id": "start",
      "type": "input",
      "position": { "x": 400, "y": 50 },
      "data": {
        "label": "User Action:\nRight-click Pod",
        "description": "Start workflow"
      },
      "style": {
        "background": "#4caf50",
        "color": "#fff"
      }
    },
    {
      "id": "validate-pod",
      "type": "default",
      "position": { "x": 400, "y": 150 },
      "data": {
        "label": "Validate Pod State",
        "description": "Check if pod is Running"
      }
    },
    {
      "id": "pod-not-running",
      "type": "default",
      "position": { "x": 150, "y": 250 },
      "data": {
        "label": "Error: Pod Not Running",
        "description": "Show error notification"
      },
      "style": {
        "background": "#ffebee",
        "border": "2px solid #f44336"
      }
    },
    {
      "id": "get-container-ports",
      "type": "default",
      "position": { "x": 400, "y": 250 },
      "data": {
        "label": "Extract Container Ports",
        "description": "Parse pod spec for ports"
      }
    },
    {
      "id": "show-port-dialog",
      "type": "default",
      "position": { "x": 400, "y": 350 },
      "data": {
        "label": "Show Port Selection Dialog",
        "description": "Remote + Local port inputs"
      },
      "style": {
        "background": "#e3f2fd",
        "border": "2px solid #2196f3"
      }
    },
    {
      "id": "user-cancelled",
      "type": "default",
      "position": { "x": 150, "y": 450 },
      "data": {
        "label": "User Cancelled",
        "description": "Close dialog, no action"
      },
      "style": {
        "background": "#fff3e0",
        "border": "2px solid #ff9800"
      }
    },
    {
      "id": "validate-ports",
      "type": "default",
      "position": { "x": 400, "y": 450 },
      "data": {
        "label": "Validate Port Selection",
        "description": "Check availability"
      }
    },
    {
      "id": "port-conflict",
      "type": "default",
      "position": { "x": 650, "y": 450 },
      "data": {
        "label": "Port Conflict Detected",
        "description": "Suggest alternative port"
      },
      "style": {
        "background": "#fff9c4",
        "border": "2px solid #fbc02d"
      }
    },
    {
      "id": "start-forward",
      "type": "default",
      "position": { "x": 400, "y": 550 },
      "data": {
        "label": "Start Port Forward",
        "description": "PortForwardManager.startForward()"
      },
      "style": {
        "background": "#e8f5e9",
        "border": "2px solid #4caf50"
      }
    },
    {
      "id": "spawn-kubectl",
      "type": "default",
      "position": { "x": 400, "y": 650 },
      "data": {
        "label": "Spawn kubectl Process",
        "description": "kubectl port-forward pod localPort:remotePort"
      }
    },
    {
      "id": "monitor-process",
      "type": "default",
      "position": { "x": 400, "y": 750 },
      "data": {
        "label": "Monitor Process",
        "description": "Watch stdout/stderr/exit"
      }
    },
    {
      "id": "connection-success",
      "type": "default",
      "position": { "x": 600, "y": 850 },
      "data": {
        "label": "Connection Established",
        "description": "Show success notification"
      },
      "style": {
        "background": "#e8f5e9",
        "border": "2px solid #4caf50"
      }
    },
    {
      "id": "connection-failed",
      "type": "default",
      "position": { "x": 200, "y": 850 },
      "data": {
        "label": "Connection Failed",
        "description": "Show error notification"
      },
      "style": {
        "background": "#ffebee",
        "border": "2px solid #f44336"
      }
    },
    {
      "id": "add-to-state",
      "type": "default",
      "position": { "x": 600, "y": 950 },
      "data": {
        "label": "Add to Manager State",
        "description": "Track active forward"
      }
    },
    {
      "id": "update-tree",
      "type": "default",
      "position": { "x": 600, "y": 1050 },
      "data": {
        "label": "Update Tree View",
        "description": "Show in Port Forwarding category"
      }
    },
    {
      "id": "update-status-bar",
      "type": "default",
      "position": { "x": 600, "y": 1150 },
      "data": {
        "label": "Update Status Bar",
        "description": "Increment active count"
      }
    },
    {
      "id": "forward-active",
      "type": "default",
      "position": { "x": 600, "y": 1250 },
      "data": {
        "label": "Forward Active",
        "description": "Visible in tree"
      },
      "style": {
        "background": "#4caf50",
        "color": "#fff"
      }
    },
    {
      "id": "stop-trigger",
      "type": "default",
      "position": { "x": 900, "y": 1250 },
      "data": {
        "label": "Stop Trigger",
        "description": "User action or pod deletion"
      },
      "style": {
        "background": "#fff3e0",
        "border": "2px solid #ff9800"
      }
    },
    {
      "id": "stop-forward",
      "type": "default",
      "position": { "x": 900, "y": 1350 },
      "data": {
        "label": "Stop Port Forward",
        "description": "PortForwardManager.stopForward()"
      }
    },
    {
      "id": "kill-process",
      "type": "default",
      "position": { "x": 900, "y": 1450 },
      "data": {
        "label": "Kill kubectl Process",
        "description": "SIGTERM to process"
      }
    },
    {
      "id": "remove-from-state",
      "type": "default",
      "position": { "x": 900, "y": 1550 },
      "data": {
        "label": "Remove from State",
        "description": "Clean up tracking"
      }
    },
    {
      "id": "refresh-tree",
      "type": "default",
      "position": { "x": 900, "y": 1650 },
      "data": {
        "label": "Refresh Tree View",
        "description": "Remove from display"
      }
    },
    {
      "id": "update-status-bar-2",
      "type": "default",
      "position": { "x": 900, "y": 1750 },
      "data": {
        "label": "Update Status Bar",
        "description": "Decrement active count"
      }
    },
    {
      "id": "end",
      "type": "output",
      "position": { "x": 900, "y": 1850 },
      "data": {
        "label": "Forward Stopped",
        "description": "End workflow"
      },
      "style": {
        "background": "#f44336",
        "color": "#fff"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "start",
      "target": "validate-pod",
      "label": "Click 'Port Forward'",
      "type": "smoothstep"
    },
    {
      "id": "e2-fail",
      "source": "validate-pod",
      "target": "pod-not-running",
      "label": "Not Running",
      "type": "smoothstep",
      "style": {
        "stroke": "#f44336"
      }
    },
    {
      "id": "e2-success",
      "source": "validate-pod",
      "target": "get-container-ports",
      "label": "Running",
      "type": "smoothstep",
      "style": {
        "stroke": "#4caf50"
      }
    },
    {
      "id": "e3",
      "source": "get-container-ports",
      "target": "show-port-dialog",
      "type": "smoothstep"
    },
    {
      "id": "e4-cancel",
      "source": "show-port-dialog",
      "target": "user-cancelled",
      "label": "Cancel",
      "type": "smoothstep"
    },
    {
      "id": "e4-confirm",
      "source": "show-port-dialog",
      "target": "validate-ports",
      "label": "Confirm",
      "type": "smoothstep"
    },
    {
      "id": "e5-conflict",
      "source": "validate-ports",
      "target": "port-conflict",
      "label": "Port in use",
      "type": "smoothstep",
      "style": {
        "stroke": "#fbc02d"
      }
    },
    {
      "id": "e5-retry",
      "source": "port-conflict",
      "target": "show-port-dialog",
      "label": "Show alternative",
      "type": "smoothstep",
      "style": {
        "strokeDasharray": "5,5"
      }
    },
    {
      "id": "e5-ok",
      "source": "validate-ports",
      "target": "start-forward",
      "label": "Available",
      "type": "smoothstep",
      "style": {
        "stroke": "#4caf50"
      }
    },
    {
      "id": "e6",
      "source": "start-forward",
      "target": "spawn-kubectl",
      "type": "smoothstep"
    },
    {
      "id": "e7",
      "source": "spawn-kubectl",
      "target": "monitor-process",
      "type": "smoothstep"
    },
    {
      "id": "e8-success",
      "source": "monitor-process",
      "target": "connection-success",
      "label": "Connected",
      "type": "smoothstep",
      "style": {
        "stroke": "#4caf50"
      }
    },
    {
      "id": "e8-fail",
      "source": "monitor-process",
      "target": "connection-failed",
      "label": "Error",
      "type": "smoothstep",
      "style": {
        "stroke": "#f44336"
      }
    },
    {
      "id": "e9",
      "source": "connection-success",
      "target": "add-to-state",
      "type": "smoothstep"
    },
    {
      "id": "e10",
      "source": "add-to-state",
      "target": "update-tree",
      "type": "smoothstep"
    },
    {
      "id": "e11",
      "source": "update-tree",
      "target": "update-status-bar",
      "type": "smoothstep"
    },
    {
      "id": "e12",
      "source": "update-status-bar",
      "target": "forward-active",
      "type": "smoothstep"
    },
    {
      "id": "e13",
      "source": "forward-active",
      "target": "stop-trigger",
      "label": "User stops or pod deleted",
      "type": "smoothstep"
    },
    {
      "id": "e14",
      "source": "stop-trigger",
      "target": "stop-forward",
      "type": "smoothstep"
    },
    {
      "id": "e15",
      "source": "stop-forward",
      "target": "kill-process",
      "type": "smoothstep"
    },
    {
      "id": "e16",
      "source": "kill-process",
      "target": "remove-from-state",
      "type": "smoothstep"
    },
    {
      "id": "e17",
      "source": "remove-from-state",
      "target": "refresh-tree",
      "type": "smoothstep"
    },
    {
      "id": "e18",
      "source": "refresh-tree",
      "target": "update-status-bar-2",
      "type": "smoothstep"
    },
    {
      "id": "e19",
      "source": "update-status-bar-2",
      "target": "end",
      "type": "smoothstep"
    }
  ]
}
```

## Flow Steps

### Initiation Phase

**1. User Right-clicks Pod**:
- Context menu shows "Port Forward" option
- Only visible for Pod tree items
- Pod must be accessible in tree

**2. Validate Pod State**:
- Check pod.status.phase === 'Running'
- If not Running, show error and exit workflow
- Error message: "Cannot port forward: Pod is not in Running state (current: {phase})"

**3. Extract Container Ports**:
- Parse pod.spec.containers[].ports[] from pod spec
- Collect containerPort values and names
- Populate dropdown in port dialog
- Allow custom port entry if needed

### Configuration Phase

**4. Show Port Selection Dialog**:
- **Remote Port**: Dropdown of container ports + custom input
  - Example: "80 (http)", "443 (https)", "8080 (custom)"
  - Allow numeric input for unlisted ports
- **Local Port**: Input with auto-suggestion
  - Default: Same as remote port
  - Check availability, suggest next free port if conflict
  - Validation on input

**5. User Interaction**:
- **Cancel**: Close dialog, exit workflow
- **Confirm**: Proceed to validation

**6. Validate Port Selection**:
- Check if local port is available using Node.js `net` module
- Test by attempting to bind to port
- If conflict detected, show error and suggest alternative
- Alternative suggestion: localPort + 1, then + 2, etc. until free port found

**7. Port Conflict Handling**:
- Show error: "Port {localPort} is already in use"
- Suggest: "Try port {suggestedPort}?"
- Update dialog with suggested port
- User can accept suggestion or choose different port

### Execution Phase

**8. Start Port Forward**:
- Call `PortForwardManager.startForward(config)`
- Config includes: podName, namespace, context, localPort, remotePort
- Manager validates and proceeds

**9. Spawn kubectl Process**:
- Command: `kubectl port-forward {pod} {localPort}:{remotePort} -n {namespace} --context {context}`
- Spawn as child process
- Store process PID
- Capture stdout and stderr

**10. Monitor Process**:
- Watch for connection success message in stdout
- Watch for errors in stderr
- Monitor process exit events
- Timeout after 10 seconds if no connection

**11a. Connection Success**:
- Show notification: "Port forward established: localhost:{localPort} → {namespace}/{pod}:{remotePort}"
- Proceed to state management

**11b. Connection Failed**:
- Kill process
- Parse error from stderr
- Show error notification with specific message
- Exit workflow

### State Management Phase

**12. Add to Manager State**:
- Create forward record in PortForwardManager
- Record: { id, podName, namespace, context, localPort, remotePort, processId, status: 'connected', startTime }
- Emit refresh event

**13. Update Status Bar**:
- Increment active forward count
- Show status bar item: "kube9: {count} forward{s} active"
- Status bar item becomes visible

**Tree View Update (On-Demand)**:
- Tree does NOT automatically refresh
- When user expands "Port Forwarding" category:
  - VS Code calls getChildren()
  - PortForwardingSubcategory queries manager for active forwards
  - Creates tree item for new forward
  - Tree item format: "localhost:{localPort} → {namespace}/{pod}:{remotePort}"
- User sees current state whenever they look at the category

**15. Forward Active**:
- Forward is now running and visible
- User can access application via localhost:{localPort}
- Forward continues until stopped or pod deleted

### Cleanup Phase

**16. Stop Trigger**:
- **User-initiated**: Right-click forward item → "Stop Port Forward"
- **Auto-cleanup**: Pod deleted from cluster
- **Extension deactivate**: All forwards stopped

**17. Stop Port Forward**:
- Call `PortForwardManager.stopForward(forwardId)`
- Manager retrieves process ID
- Proceeds to kill process

**18. Kill kubectl Process**:
- Send SIGTERM to process
- Wait for graceful exit (1 second timeout)
- Force kill (SIGKILL) if needed
- Ensure process is terminated

**19. Remove from State**:
- Delete forward record from manager state
- Emit event (for status bar)
- Log cleanup action

**20. Update Status Bar**:
- Decrement active forward count
- Update status bar item text
- Hide status bar item if count reaches zero

**Tree View Update (On-Demand)**:
- Tree does NOT automatically refresh
- When user views "Port Forwarding" category:
  - getChildren() queries manager for current state
  - Stopped forward no longer in results
  - Tree item removed from display
  - User sees updated state

**22. Forward Stopped**:
- Cleanup complete
- User notified if manual stop
- Silent if auto-cleanup

## Error Handling Paths

### Pod Not Running
- **Detection**: pod.status.phase !== 'Running'
- **Action**: Show error notification, exit workflow
- **Message**: "Cannot port forward: Pod '{name}' is not in Running state"

### Port Conflict
- **Detection**: Local port in use during validation
- **Action**: Show error with suggestion, allow retry
- **Message**: "Port {port} is already in use. Try {suggestedPort}?"

### Connection Timeout
- **Detection**: No success message after 10 seconds
- **Action**: Kill process, show error
- **Message**: "Port forward connection timed out. Check pod logs and try again."

### kubectl Not Found
- **Detection**: Process spawn error, command not found
- **Action**: Show error with installation link
- **Message**: "kubectl not found. Please install kubectl to use port forwarding."

### RBAC Permission Denied
- **Detection**: stderr contains "Forbidden" or "pods/portforward"
- **Action**: Show error with RBAC explanation
- **Message**: "Permission denied. You need pods/portforward permission in namespace '{namespace}'."

### Pod Deleted During Forward
- **Detection**: Process exits unexpectedly with pod not found error
- **Action**: Auto-cleanup, show info notification
- **Message**: "Port forward stopped: Pod '{name}' was deleted"

### Network Error
- **Detection**: Connection refused or unreachable error
- **Action**: Show error with retry option
- **Message**: "Connection failed: Unable to reach pod. Check cluster connectivity."

## Performance Considerations

- **Port availability check**: < 100ms using net.Server test
- **kubectl spawn**: 100-300ms process startup
- **Connection establishment**: 500-2000ms depending on cluster
- **State updates**: < 10ms in-memory operations
- **Status bar updates**: < 5ms (lightweight, single UI element)
- **Tree queries (on-demand)**: < 10ms to fetch current state when user views it
- **No automatic tree refresh**: Zero overhead when category is collapsed
- **Process cleanup**: < 100ms with graceful termination

**On-Demand Refresh Benefits**:
- No periodic timers or polling
- No unnecessary tree refresh events
- Tree only updates when user looks at it
- Minimal performance impact on VS Code

## Concurrency Handling

- **Multiple simultaneous starts**: Queued to prevent race conditions
- **Rapid start/stop**: Debounced to prevent state corruption
- **Concurrent stops**: Handled safely with state locks
- **Tree refresh coordination**: Batched updates to prevent flicker

