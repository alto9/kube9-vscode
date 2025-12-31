---
feature_id: pod-logs-panel
name: Pod Logs Panel Lifecycle
description: Webview panel lifecycle management for Pod Logs Viewer, including creation, reveal, disposal, and cluster-specific behavior
spec_id:
  - pod-logs-panel-spec
---

# Pod Logs Panel Lifecycle

```gherkin
Feature: Pod Logs Panel Lifecycle

Scenario: Opening log viewer from pod right-click menu
  Given a user has a cluster connected
  And a pod "nginx-deployment-abc123" is visible in the tree view
  When they right-click the pod
  And select "View Logs" from the context menu
  Then the Pod Logs Viewer webview panel should open for that cluster
  And the panel title should show "Logs: {cluster-name}"
  And the panel should be focused in the editor area
  And if the pod has only one container, logs should start streaming immediately
  And if the pod has multiple containers, a container selector should be shown

Scenario: Container selection for multi-container pods
  Given a user right-clicks a pod with containers ["nginx", "sidecar", "init-db"]
  And selects "View Logs"
  When the log viewer opens
  Then a quick pick menu should appear with container options:
    | nginx |
    | sidecar |
    | init-db |
    | All Containers |
  When they select "nginx"
  Then logs for the nginx container should start streaming
  And the panel should show "Container: nginx" in the toolbar

Scenario: One webview panel per cluster context
  Given a user has two clusters connected: "production" and "staging"
  And they open logs for pod "api-server" in cluster "production"
  When they open logs for pod "db-server" in cluster "staging"
  Then two separate log viewer panels should be open
  And panel 1 should show "Logs: production"
  And panel 2 should show "Logs: staging"
  And both panels should stream logs independently
  And closing one panel should not affect the other

Scenario: Reusing panel when viewing logs from same cluster
  Given a user has Pod Logs Viewer open for cluster "production"
  And currently viewing logs for pod "api-server"
  When they right-click a different pod "worker-123" in cluster "production"
  And select "View Logs"
  Then the existing "production" log viewer panel should be revealed and focused
  And the logs should switch to show pod "worker-123"
  And a new panel should NOT be created
  And the panel title should remain "Logs: production"

Scenario: Creating new panel when viewing logs from different cluster
  Given a user has Pod Logs Viewer open for cluster "production"
  And currently viewing logs for pod "api-server"
  When they right-click a pod "db-server" in cluster "staging"
  And select "View Logs"
  Then a new Pod Logs Viewer panel should open
  And the new panel title should show "Logs: staging"
  And both panels should remain open
  And each panel should maintain independent state

Scenario: Panel disposal when closed by user
  Given a user has Pod Logs Viewer open for a cluster
  And logs are actively streaming
  When they close the panel (click X or close editor tab)
  Then the panel should be disposed properly
  And the streaming connection should be terminated immediately
  And event listeners should be cleaned up
  And memory should be released
  And the panel entry should be removed from the panel registry

Scenario: Panel disposal when extension deactivates
  Given a user has multiple log viewer panels open for different clusters
  When the extension is deactivated (VS Code closing, reload window, etc.)
  Then all open log viewer panels should be disposed
  And all streaming connections should be terminated
  And all resources should be released
  And no memory leaks should occur

Scenario: Panel opens in editor area
  Given a user opens Pod Logs Viewer
  When the panel is created
  Then it should open in vscode.ViewColumn.One by default
  And it should be placed alongside other editor tabs
  And the user can move it to other columns or editor groups
  And panel placement should follow VS Code's editor behavior

Scenario: Panel retains context when hidden
  Given a user has Pod Logs Viewer open with follow mode disabled
  And they have scrolled to a specific position in the logs
  And they have a search filter applied
  When they switch to a different tab (panel becomes hidden)
  And then switch back to the Pod Logs Viewer tab
  Then the panel should retain its scroll position
  And the search filter should still be applied
  And follow mode should still be disabled
  And the logs should not be re-fetched unnecessarily

Scenario: Panel handles pod deletion gracefully
  Given a user has Pod Logs Viewer open viewing logs for pod "temporary-job-xyz"
  And logs are streaming normally
  When the pod is deleted from the cluster
  Then the streaming connection should close
  And an informational message should appear: "Pod no longer exists"
  And the existing logs should remain visible
  And the user should be able to export or copy the logs
  And streaming controls should be disabled

Scenario: Panel handles namespace deletion gracefully
  Given a user has Pod Logs Viewer open viewing logs for a pod in namespace "test-env"
  When the namespace "test-env" is deleted
  Then the streaming connection should close
  And an informational message should appear: "Namespace no longer exists"
  And existing logs should remain visible
  And streaming controls should be disabled

Scenario: Panel displays loading state during initial fetch
  Given a user opens Pod Logs Viewer for the first time
  When the panel is created
  Then a loading spinner should be displayed
  And a message "Loading logs..." should be shown
  When logs start streaming
  Then the spinner should disappear
  And logs should be displayed in the main area

Scenario: Panel displays empty state when pod has no logs
  Given a user opens logs for a pod that has just started
  And the pod has not written any logs yet
  When the log viewer displays
  Then an empty state message should show: "No logs available yet"
  And the streaming indicator should show "Waiting for logs..."
  And as soon as logs appear, they should be displayed

Scenario: Panel displays error state when fetch fails
  Given a user opens Pod Logs Viewer
  When the Kubernetes API request fails (network error, authentication error, etc.)
  Then an error message should be displayed in the panel
  And the error should include the reason (e.g., "Connection refused", "Unauthorized")
  And a "Retry" button should be provided
  When they click "Retry"
  Then the connection should be re-attempted

Scenario: Multiple panels open simultaneously for different clusters
  Given a user has 3 clusters: "prod", "staging", "dev"
  When they open log viewers for all three clusters
  Then 3 separate Pod Logs Viewer panels should be open
  And each panel title should show its respective cluster name
  And each panel should stream logs independently
  And each panel should maintain independent state (scroll, filters, follow mode)
  And closing one panel should not affect the others

Scenario: Webview resources loaded properly
  Given a user opens Pod Logs Viewer
  When the webview panel is created
  Then React and required scripts should load successfully from localResourceRoots
  And the webview should establish message channel with extension
  And Content Security Policy should be properly configured
  And no CSP violations should occur
  And the UI should render correctly

Scenario: Panel icon in editor tab
  Given a user has Pod Logs Viewer open
  Then the editor tab should display an appropriate icon
  And the icon should use VS Code ThemeIcon for theme compatibility
  And the icon should represent logs or terminal output visually
```

## Integration Points

- **ClusterTreeProvider**: Pod context menu action triggers panel
- **LogsProvider**: Manages Kubernetes API streaming connections
- **VS Code Webview API**: Panel creation, disposal, lifecycle
- **Extension Context**: Panel tied to extension activation
- **Message Protocol**: Communication for pod/container changes

## Panel Architecture

The Pod Logs Viewer follows the cluster-specific pattern:

- **Panel Registry**: `Map<contextName, PanelInfo>` - Key: cluster context, Value: panel info
- **PanelInfo Structure**: `{ panel: WebviewPanel, logsProvider: LogsProvider }`
- **Creation Flow**: `PodLogsViewerPanel.show(context, contextName, clusterName, podName, namespace, containerName?)`
- **Reuse Logic**: If panel exists for contextName → reveal and update; else → create new
- **Cleanup**: `onDidDispose` removes panel from registry and stops streaming

