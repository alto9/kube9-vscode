---
folder_id: events-viewer
name: Events Viewer
description: Windows EventViewer-inspired webview for viewing and filtering Kubernetes events with rich troubleshooting capabilities
---

# Events Viewer

## Background

```gherkin
Background: Events Viewer Context
  Given the kube9 VS Code extension is installed and activated
  And the user has a valid kubeconfig file with at least one cluster
  And the cluster has the kube9-operator installed (operator status is not "basic")
  And the extension maintains operator status awareness for each cluster
  When the user interacts with Events functionality
  Then the Events Viewer provides a Windows EventViewer-inspired interface
  And events are displayed in a three-pane layout (filters, table, details)
  And events are retrieved from the kube9-operator CLI utility
  And the interface supports filtering, sorting, searching, and auto-refresh
  And one Events Viewer webview is maintained per cluster context
```

## Rules

```gherkin
Rule: Events Viewer availability depends on operator presence
  Given a cluster is connected
  When the operator status is checked
  Then the Events category appears in the tree only for operated clusters
  And clicking the Events category opens the Events Viewer webview
  And the webview displays events specific to that cluster context
  And basic-mode clusters do not have access to Events Viewer

Rule: Events Viewer replaces tree-based event display
  Given the Events Viewer webview is implemented
  When a user clicks the Events category in the tree
  Then a dedicated webview panel opens (not tree expansion)
  And events are no longer displayed as individual tree items
  And the Events category acts as a launcher for the webview

Rule: One Events Viewer per cluster context
  Given multiple clusters are connected
  When a user opens Events Viewer for different clusters
  Then each cluster gets its own webview panel instance
  And each panel maintains independent state (filters, scroll position)
  And switching between panels preserves their individual states
  And closing a panel does not affect other cluster panels

Rule: Dynamic namespace discovery prevents hardcoded assumptions
  Given the kube9-operator may be installed in any namespace
  When the extension needs to interact with the operator
  Then the operator namespace is discovered dynamically
  And the discovery follows: ConfigMap → User Settings → Default fallback
  And no component hardcodes 'kube9-system' namespace
  And custom namespace installations work without modification

Rule: Virtual scrolling is required for performance
  Given events can number in the hundreds or thousands
  When the Events Viewer displays the event table
  Then virtual scrolling is used to render only visible rows
  And scrolling performance remains smooth with 500+ events
  And memory usage remains reasonable regardless of event count

Rule: Events Viewer integrates with existing EventsProvider
  Given EventsProvider already handles event retrieval from operator CLI
  When the Events Viewer needs event data
  Then it uses the existing EventsProvider service
  And EventsProvider is enhanced (not replaced) for webview needs
  And caching, filtering, and auto-refresh logic is reused
  And the operator CLI execution method remains unchanged

Rule: Filter state is persisted per cluster
  Given a user applies filters in an Events Viewer
  When they close and reopen the Events Viewer for the same cluster
  Then the previously applied filters are restored
  And filter state is maintained separately for each cluster
  And filter state survives extension reload (within VS Code session)

Rule: Theme integration follows VS Code patterns
  Given VS Code supports light and dark themes
  When the Events Viewer is displayed
  Then it uses VS Code CSS variables for theming
  And color-coding for event types respects the active theme
  And the interface remains readable in all theme configurations
```

## Integration Points

- **Tree View Navigation**: Events category in cluster tree launches the webview
- **EventsProvider Service**: Existing service enhanced for webview data needs
- **Operator CLI**: Events retrieved via kube9-operator query events command
- **Dynamic Namespace Discovery**: All operator interactions use discovered namespace
- **VS Code Theming**: Webview uses VS Code CSS variables for theme compatibility
- **Message Protocol**: Extension ↔ Webview communication for data and commands

## Non-Goals

- Modifying Kubernetes events directly from the viewer
- Real-time event streaming (auto-refresh uses polling)
- Event history beyond what the operator provides
- Custom saved filters or views (future enhancement)
- Event correlation or analysis features (future enhancement)
- Direct Kubernetes Events API access (we use operator CLI for consistency)

