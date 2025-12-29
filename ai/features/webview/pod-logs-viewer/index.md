---
folder_id: pod-logs-viewer
name: Pod Logs Viewer
description: Cluster-specific webview for viewing and managing pod logs within VS Code
---

# Pod Logs Viewer

Pod Logs Viewer provides a rich interface for viewing, searching, and managing Kubernetes pod logs directly within VS Code, eliminating the need to switch to terminal for log viewing.

## Background

```gherkin
Background: Pod Logs Viewer is cluster-specific
  Given the kube9 VS Code extension is installed and activated
  And the user is connected to one or more Kubernetes clusters
  And the user has pods running in those clusters
  When viewing pod logs
  Then each cluster maintains its own log viewer panel
  And multiple clusters can have their log viewers open simultaneously
  And clicking a pod in the same cluster reuses the existing viewer for that cluster
  And clicking a pod in a different cluster creates a new viewer for that cluster
  And each panel title shows "Logs: {cluster-name}"
```

## Rules

```gherkin
Rule: One log viewer per cluster
  Given a user has opened a log viewer for cluster A
  When they click to view logs for another pod in cluster A
  Then the existing cluster A log viewer should update to show the new pod's logs
  And a new panel should NOT be created
  When they click to view logs for a pod in cluster B
  Then a new log viewer should open for cluster B
  And both cluster A and cluster B log viewers should remain open independently

Rule: Multi-container pod handling
  Given a pod has multiple containers (including init containers)
  When a user opens logs for that pod
  Then they should be prompted to select which container's logs to view
  And an "All Containers" option should be available
  And they should be able to switch between containers without closing the panel
  When a pod has only one container
  Then logs should open immediately without prompting

Rule: Real-time streaming by default
  Given a user opens pod logs
  When the log viewer panel opens
  Then logs should stream in real-time by default (follow mode on)
  And new log lines should appear automatically as they are generated
  And the user can toggle follow mode off to pause streaming
  And the user can toggle follow mode back on to resume streaming
  And manual refresh should work regardless of follow mode state

Rule: Performance and resource management
  Given the log viewer is displaying logs
  When logs become very large (thousands of lines)
  Then virtual scrolling should be used to maintain UI performance
  And only visible lines should be rendered in the DOM
  And buffer limits should prevent unbounded memory growth
  When the panel is closed
  Then all streaming connections should be terminated
  And all resources should be properly cleaned up
  And memory should be released

Rule: Previous container logs for crashed pods
  Given a pod has a crashed container
  When a user opens logs for that pod
  Then they should have an option to view "Previous Container" logs
  And the previous logs should show logs from before the crash
  And the UI should clearly indicate when viewing previous logs vs current logs
```

## Integration Points

- **ClusterTreeProvider**: Pod right-click menu triggers log viewer
- **Kubernetes API**: Streams logs from pods via `/api/v1/namespaces/{namespace}/pods/{pod}/log`
- **VS Code Webview API**: Panel creation and lifecycle management
- **Extension Context**: Panel lifecycle tied to extension activation
- **Message Protocol**: Bidirectional communication for controls and data

## Architecture Overview

The Pod Logs Viewer follows the cluster-specific webview pattern:

- **Panel Registry**: `Map<clusterContext, PanelInfo>` - One panel per cluster
- **PodLogsViewerPanel.show()**: Create or reveal panel for cluster
- **LogsProvider**: Manages Kubernetes API streaming connections
- **React UI**: Rich log display with toolbar, search, and controls
- **Message Protocol**: Extension ↔ Webview communication for actions
- **Cleanup**: Proper disposal via `onDidDispose` event

