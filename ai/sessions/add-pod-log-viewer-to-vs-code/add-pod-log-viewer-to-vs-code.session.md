---
session_id: add-pod-log-viewer-to-vs-code
start_time: '2025-12-29T14:38:55.402Z'
status: completed
problem_statement: Add pod log viewer to VS Code
changed_files:
  - path: ai/features/webview/pod-logs-viewer/pod-logs-panel.feature.md
    change_type: added
    scenarios_added:
      - Opening log viewer from pod right-click menu
      - Container selection for multi-container pods
      - One webview panel per cluster context
      - Reusing panel when viewing logs from same cluster
      - Creating new panel when viewing logs from different cluster
      - Panel disposal when closed by user
      - Panel disposal when extension deactivates
      - Panel opens in editor area
      - Panel retains context when hidden
      - Panel handles pod deletion gracefully
      - Panel handles namespace deletion gracefully
      - Panel displays loading state during initial fetch
      - Panel displays empty state when pod has no logs
      - Panel displays error state when fetch fails
      - Multiple panels open simultaneously for different clusters
      - Webview resources loaded properly
      - Panel icon in editor tab
  - path: ai/features/webview/pod-logs-viewer/pod-logs-ui.feature.md
    change_type: added
    scenarios_added:
      - Toolbar displays pod and container information
      - Container selector dropdown for multi-container pods
      - Container selector hidden for single-container pods
      - Line limit selector dropdown
      - Custom line limit input
      - Timestamps toggle button
      - Follow mode toggle button
      - Previous container logs checkbox
      - Previous logs option hidden for running containers
      - Main log display area
      - Virtual scrolling for performance
      - Log line syntax highlighting for JSON
      - Log line timestamp display
      - Footer status bar displays line count
      - Footer shows streaming status
      - Footer shows connection status
      - Action buttons in toolbar
      - Search bar appears when search button clicked
      - Responsive layout for smaller windows
      - Theme integration
      - Loading state display
      - Empty state display
      - Error state display
      - Accessibility features
      - Copy button copies visible logs
      - Clear button clears display
      - Export button saves logs to file
      - Refresh button reloads logs
  - path: ai/features/webview/pod-logs-viewer/pod-logs-actions.feature.md
    change_type: added
    scenarios_added:
      - Search within logs
      - Case-sensitive search toggle
      - Regular expression search
      - Clear search
      - Copy all visible logs to clipboard
      - Copy selected logs to clipboard
      - Export logs to file with default filename
      - Export logs with custom filename
      - Refresh logs manually
      - Clear log display
      - Cancel clear action
      - Toggle follow mode on
      - Toggle follow mode off
      - Follow mode automatically turns off when user scrolls up
      - Toggle timestamps on
      - Toggle timestamps off
      - Change line limit to 100
      - Change line limit to "All lines"
      - Switch container in multi-container pod
      - View all containers simultaneously
      - Enable previous container logs for crashed pod
      - Disable previous container logs
      - Keyboard shortcut for search
      - Keyboard shortcut for refresh
      - Keyboard shortcut for copy
      - Scroll to top button appears when scrolled down
      - Scroll to bottom button appears when scrolled up
      - Context menu on log line for quick actions
      - Double-click to select and copy log line
      - Auto-reconnect on connection loss
      - Retry after error
      - Persist user preferences per cluster
    scenarios_removed:
      - Search within logs
      - Case-sensitive search toggle
      - Regular expression search
      - Clear search
      - Copy all visible logs to clipboard
      - Copy selected logs to clipboard
      - Export logs to file with default filename
      - Export logs with custom filename
      - Refresh logs manually
      - Clear log display
      - Cancel clear action
      - Toggle follow mode on
      - Toggle follow mode off
      - Follow mode automatically turns off when user scrolls up
      - Toggle timestamps on
      - Toggle timestamps off
      - Change line limit to 100
      - Change line limit to "All lines"
      - Switch container in multi-container pod
      - View all containers simultaneously
      - Enable previous container logs for crashed pod
      - Disable previous container logs
      - Keyboard shortcut for search
      - Keyboard shortcut for refresh
      - Keyboard shortcut for copy
      - Scroll to top button appears when scrolled down
      - Scroll to bottom button appears when scrolled up
      - Context menu on log line for quick actions
      - Double-click to select and copy log line
      - Auto-reconnect on connection loss
      - Retry after error
      - Persist user preferences per cluster
start_commit: bc647fa501227f49f33418ec8afef6486398de30
end_time: '2025-12-29T14:49:47.607Z'
---
## Problem Statement

Add pod log viewer to VS Code

## Goals

1. **Cluster-specific log viewing** - Users can view pod logs within VS Code without switching to terminal
2. **One viewer per cluster** - Each cluster maintains its own log viewer panel (can have multiple open simultaneously)
3. **Real-time streaming** - Logs stream in real-time with follow mode support
4. **Multi-container support** - Users can select and switch between containers in multi-container pods
5. **Rich features** - Search, filter, copy, export, timestamps, line limits, previous container logs
6. **Performance** - Handle large log volumes efficiently with virtual scrolling and buffer management

## Approach

### Architecture Pattern
Follow the **FreeDashboardPanel pattern** for cluster-specific webviews:
- Use `Map<contextName, PanelInfo>` to track one panel per cluster
- When user clicks pod logs in same cluster → reuse/update existing panel
- When user clicks pod logs in different cluster → create new panel
- Panel title: "Logs: {cluster-name}"

### File Structure
```
ai/features/webview/pod-logs-viewer/
  - index.md (Background and Rules)
  - pod-logs-panel.feature.md (Panel lifecycle)
  - pod-logs-ui.feature.md (UI components and layout)
  - pod-logs-actions.feature.md (User actions: search, copy, export, etc.)

ai/specs/webview/pod-logs-viewer/
  - pod-logs-panel-spec.spec.md (Panel management and Kubernetes API)
  - pod-logs-ui-spec.spec.md (UI implementation details)

ai/diagrams/webview/pod-logs-viewer/
  - pod-logs-architecture.diagram.md (Component architecture)
  - pod-logs-workflow.diagram.md (User workflows)
```

### Key Components
1. **PodLogsViewerPanel** - Manages webview panels per cluster
2. **LogsProvider** - Fetches logs from Kubernetes API with streaming
3. **React UI** - Log display, toolbar, controls
4. **Message Protocol** - Bidirectional communication between webview and extension

### Kubernetes API Integration
- Use Kubernetes client library `@kubernetes/client-node`
- Endpoint: `/api/v1/namespaces/{namespace}/pods/{pod}/log`
- Streaming: `follow=true` for real-time tailing
- Parameters: `timestamps`, `tailLines`, `previous`, `container`

## Key Decisions

### Decision: Cluster-Specific Panels (Not Resource-Specific)
**Rationale**: Unlike describe webview (one shared panel), log viewer needs multiple simultaneous views. But one per cluster (not per pod) to avoid panel proliferation.
- Clicking another pod in same cluster → updates existing panel
- Clicking pod in different cluster → opens new panel
- User can manually open multiple viewers for same cluster if needed (future enhancement)

### Decision: React-Based Webview
**Rationale**: Consistent with other complex webviews (Events Viewer, Dashboard)
- Enables rich UI with search, filtering, virtual scrolling
- Better performance for large log volumes
- Easier state management

### Decision: Streaming with Kubernetes API
**Rationale**: Direct streaming from Kubernetes API (not kubectl spawning)
- Better performance and control
- Consistent with @kubernetes/client-node usage elsewhere
- Enables proper connection management and cleanup

### Decision: Virtual Scrolling for Performance
**Rationale**: Logs can be very large (thousands of lines)
- Only render visible lines in DOM
- Keep full log data in memory (with buffer limits)
- Smooth scrolling with good performance

## Notes

### Similar Patterns in Codebase
- **FreeDashboardPanel** - Cluster-specific pattern with Map<contextName, PanelInfo>
- **EventViewerPanel** - Auto-refresh, message protocol, React UI
- **DescribeWebview** - Simple webview, but singleton (not cluster-specific)

### Future Enhancements (Out of Scope)
- Multiple log viewers for same cluster (advanced use case)
- Log level filtering (if structured logs detected)
- Log export to external monitoring systems
- Historical log viewing (beyond Kubernetes retention)
- Log comparison between pods
- Log aggregation across multiple pods
