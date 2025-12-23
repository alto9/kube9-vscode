---
session_id: add-port-forwarding-for-pods
start_time: '2025-12-23T12:54:04.435Z'
status: development
problem_statement: Add port forwarding for pods with tree view management and visual tracking
changed_files:
  - path: ai/features/cluster/pod-port-forwarding.feature.md
    change_type: added
    scenarios_added:
      - Start port forward from pod context menu
      - Remote port dropdown shows container ports
      - Select custom remote port
      - Auto-suggest same port for local if available
      - Suggest alternative port when default is in use
      - Validate local port range
      - Handle port conflict with retry
      - Port forwards appear under Networking category
      - Active forwards displayed in tree
      - Forward item shows detailed tooltip
      - Port Forwarding badge shows count when collapsed
      - Pod shows badge when has active forward
      - Stop port forward from tree context menu
      - Stop all port forwards
      - Cancel stop forward
      - Status bar shows active forward count
      - Click status bar to view forwards
      - Status bar hides when no forwards
      - Show connection status in tree
      - Handle connection timeout
      - Handle pod not running error
      - Handle kubectl not found error
      - Handle RBAC permission denied
      - Auto-cleanup on pod deletion
      - Auto-cleanup on extension deactivate
      - Auto-cleanup on context switch
      - Copy local URL
      - View associated pod
      - Restart port forward
      - Open browser after successful forward
      - Show forwards after successful start
      - Multiple forwards to same pod
      - Multiple forwards across namespaces
      - Forward sorting in tree
      - Uptime updates in tree
      - Uptime refreshes periodically
      - Start forward when pod exists in multiple contexts
      - Handle rapid start and stop
      - Handle large number of forwards
      - Forward persistence across tree refresh
      - No forward persistence across extension reload
      - Prevent duplicate forwards
      - Handle special characters in pod names
      - Port Forward only visible for running pods
      - Keyboard navigation in port forward tree
      - Screen reader announces forward changes
      - Clear error messages for common issues
      - Active forwards displayed in tree when expanded
      - Uptime calculated on-demand
      - Uptime accuracy without polling
      - Forward state persists independent of tree
      - Tree shows current state on-demand
      - Manual refresh shows latest state
      - Status bar click refreshes tree
      - No background refresh overhead
    scenarios_modified:
      - Auto-cleanup on pod deletion
    scenarios_removed:
      - Active forwards displayed in tree
      - Uptime updates in tree
      - Uptime refreshes periodically
      - Forward persistence across tree refresh
start_commit: bc647fa501227f49f33418ec8afef6486398de30
end_time: '2025-12-23T13:25:00.809Z'
---
## Problem Statement

Users cannot forward pod ports to localhost for local testing and debugging. There is no way to:
- Start port forwards from pod context menus
- See active port forwards in a centralized location
- Stop individual port forwards
- Track which pods have active forwards

## Goals

1. Enable users to start port forwards directly from pod context menu
2. Display active port forwards in a "Port Forwarding" subcategory under Networking in the tree
3. Provide ability to stop individual port forwards from the tree
4. Show visual indicators for pods with active forwards
5. Handle port conflicts gracefully
6. Auto-cleanup forwards on extension deactivate or pod deletion
7. Provide clear feedback on connection status and errors

## Approach

### Tree Structure
- Add "Port Forwarding" as a subcategory under Networking (similar to Services)
- Each active port forward appears as a tree item showing local:remote port mapping
- Port forward items have a "Stop" action in their context menu

### Pod Context Menu
- Add "Port Forward" option to pod context menu
- Show dialog asking for remote port (with dropdown of container ports from pod spec)
- Show dialog asking for local port (with auto-suggestion of same port or next available)
- Allow custom local port entry

### Port Forward Manager
- Singleton service to track all active port forwards
- Manages kubectl port-forward processes
- Handles cleanup on extension deactivate
- Monitors for pod deletions and stops associated forwards
- Detects port conflicts and suggests alternatives

### Status Tracking
- Status bar item showing count of active forwards: "kube9: 3 forwards active"
- Clicking status bar item focuses tree on Port Forwarding category
- Tree view badges on pods with active forwards
- Connection status indicators (Connected, Disconnected, Error)

## Key Decisions

### Decision 1: Use kubectl port-forward
- **Rationale**: Reliable, well-tested, and respects RBAC permissions
- **Alternative considered**: Direct Kubernetes API port forwarding (more complex)
- **Implementation**: Spawn kubectl process and monitor its lifecycle

### Decision 2: Store forwards in extension global state
- **Rationale**: Persist across tree view refreshes, accessible from multiple components
- **Implementation**: PortForwardManager maintains in-memory state, updates tree via event emitter

### Decision 3: Auto-suggest ports intelligently
- **Rationale**: Reduce user friction while avoiding conflicts
- **Implementation**: Parse pod spec for container ports, check if local port available, suggest next free port if conflict

### Decision 4: Show Port Forwarding under Networking category
- **Rationale**: Logically groups with Services and other networking resources
- **Implementation**: New subcategory following same pattern as Services subcategory

### Decision 5: Auto-cleanup on pod deletion
- **Rationale**: Prevent orphaned forwards and confusing error states
- **Implementation**: Watch for pod deletion events, stop associated forwards automatically

### Decision 6: On-demand tree refresh (not automatic)
- **Rationale**: Minimize tree refresh overhead and avoid performance impact
- **Implementation**: 
  - Tree does NOT subscribe to PortForwardManager events
  - Tree queries manager when Port Forwarding category is expanded (getChildren)
  - Status bar updates in real-time (lightweight)
  - Uptime calculated on-demand from startTime (no polling)
- **Benefits**: Zero overhead when collapsed, always accurate when viewed, no flicker

## Notes

### Port Conflict Handling
- Check if local port is in use before starting forward
- Use Node.js `net` module to test port availability
- If conflict, suggest next available port (e.g., 8080 → 8081 → 8082)
- Show clear error message if user insists on conflicting port

### Process Management
- Each port forward is a child process running kubectl
- Store process PID for cleanup
- Handle process termination gracefully
- Parse kubectl stderr for connection errors

### Status Bar Integration
- Show count only when forwards are active
- Hide status bar item when no forwards exist
- Provide quick access to Port Forwarding tree category

### Tree Item Format
Example tree item label: `localhost:8080 → default/nginx-pod:80`
Format: `localhost:<localPort> → <namespace>/<podName>:<remotePort>`

### Future Enhancements
- Support forwarding to Services (not just Pods)
- Multiple ports per pod in single forward
- Save/restore port forward configurations
- Port forward profiles per namespace/context
