---
feature_id: event-viewer-panel
name: Event Viewer Panel Lifecycle
description: Webview panel lifecycle management for Events Viewer, including creation, reveal, disposal, and auto-refresh
spec_id:
  - event-viewer-panel-spec
---

# Event Viewer Panel Lifecycle

```gherkin
Feature: Event Viewer Panel Lifecycle

Scenario: Opening Events Viewer from tree category
  Given a user has a cluster with operator status "operated"
  And the cluster tree is expanded showing the Events category
  When they click on the Events category node
  Then the Events Viewer webview panel should open
  And the panel title should show "Events: {cluster-name}"
  And the panel should be focused in the editor area
  And the panel should display a loading indicator while fetching events
  And events should be loaded from the kube9-operator CLI

Scenario: Opening Events Viewer via command palette
  Given a user has a cluster connected with operator installed
  When they run the command "Kube9: Open Events Viewer"
  And they select a cluster from the QuickPick
  Then the Events Viewer webview panel should open for that cluster
  And the panel title should include the cluster name
  And events should be loaded automatically

Scenario: One webview panel per cluster context
  Given a user has multiple clusters connected
  And cluster "production" Events Viewer is already open
  When they open Events Viewer for cluster "staging"
  Then a second Events Viewer panel should open
  And both panels should remain open independently
  And each panel should display events for its respective cluster
  And each panel title should clearly identify its cluster
  And switching between panels should work normally

Scenario: Revealing existing panel instead of creating duplicate
  Given a user has Events Viewer open for cluster "production"
  And the panel is in the background (not focused)
  When they click the Events category for "production" again
  Then the existing panel should be brought to focus
  And a new panel should NOT be created
  And the existing panel should retain its state (filters, scroll position)

Scenario: Panel disposal when closed by user
  Given a user has Events Viewer open for a cluster
  When they close the panel (click X or close editor)
  Then the panel should be disposed properly
  And auto-refresh should be stopped for that cluster
  And event listeners should be cleaned up
  And memory should be released
  And the panel can be reopened cleanly

Scenario: Panel disposal when extension deactivates
  Given a user has one or more Events Viewer panels open
  When the extension is deactivated (VS Code closing, reload, etc.)
  Then all open Events Viewer panels should be disposed
  And all auto-refresh timers should be cleared
  And all resources should be released
  And no memory leaks should occur

Scenario: Panel title shows cluster name
  Given a user opens Events Viewer for cluster "production-us-west-2"
  Then the panel title should display "Events: production-us-west-2"
  And the title should be visible in the editor tab
  And the title should update if the cluster is renamed in configuration

Scenario: Panel opens in editor area with appropriate column
  Given a user opens Events Viewer
  When the panel is created
  Then it should open in vscode.ViewColumn.One by default
  And it should be placed alongside other editor tabs
  And the user can move it to other columns or editor groups
  And panel placement preferences should be respected

Scenario: Panel retains context when hidden
  Given a user has Events Viewer open with filters applied
  And the user has scrolled to a specific position
  When they switch to a different tab (panel becomes hidden)
  And then switch back to the Events Viewer tab
  Then the panel should retain its state
  And applied filters should still be active
  And scroll position should be approximately preserved
  And events should not be re-fetched unnecessarily

Scenario: Auto-refresh starts when panel opens
  Given a user opens Events Viewer for a cluster
  When the panel finishes initial loading
  Then auto-refresh should be enabled by default
  And events should refresh every 30 seconds
  And a status indicator should show "Auto-refresh: On (30s)"
  And the refresh should happen in the background without disrupting the UI

Scenario: Auto-refresh continues while panel is visible
  Given a user has Events Viewer open with auto-refresh enabled
  And 30 seconds have elapsed
  When the next refresh interval triggers
  Then events should be re-fetched from the operator CLI
  And the table should update with new events
  And the user's scroll position should be maintained if possible
  And any selected event should remain selected if still present

Scenario: Auto-refresh stops when panel is closed
  Given a user has Events Viewer open with auto-refresh enabled
  When they close the Events Viewer panel
  Then the auto-refresh timer should be stopped immediately
  And no further refresh requests should be made
  And the EventsProvider should stop auto-refresh for that cluster context

Scenario: Toggle auto-refresh on and off
  Given a user has Events Viewer open with auto-refresh enabled
  When they click the "Toggle Auto-refresh" button in the toolbar
  Then auto-refresh should be disabled
  And the status indicator should show "Auto-refresh: Off"
  And events should not refresh automatically
  When they click the "Toggle Auto-refresh" button again
  Then auto-refresh should be re-enabled
  And the status indicator should show "Auto-refresh: On (30s)"
  And automatic refreshes should resume

Scenario: Auto-refresh state persists per cluster
  Given a user has Events Viewer open for cluster "production"
  And they disable auto-refresh
  When they close and reopen Events Viewer for "production"
  Then auto-refresh should still be disabled
  And the state should be remembered for that cluster
  When they open Events Viewer for cluster "staging"
  Then auto-refresh should be enabled (default) for "staging"
  And each cluster maintains independent auto-refresh state

Scenario: Manual refresh button works regardless of auto-refresh state
  Given a user has Events Viewer open
  And auto-refresh is disabled
  When they click the "Refresh" button
  Then events should be immediately re-fetched
  And the table should update with current events
  And auto-refresh should remain disabled
  And the user should see a brief "Refreshing..." indicator

Scenario: Panel handles operator becoming unavailable
  Given a user has Events Viewer open with events displayed
  When the kube9-operator pod becomes unavailable
  And auto-refresh attempts to fetch events
  Then an error message should be displayed in the panel
  And the message should indicate the operator is unavailable
  And previously displayed events should remain visible
  And auto-refresh should continue attempting (with exponential backoff)
  And when operator recovers, events should load successfully

Scenario: Panel displays loading state during initial fetch
  Given a user opens Events Viewer for the first time
  When the panel is created
  Then a loading spinner should be displayed
  And a message "Loading events..." should be shown
  When events finish loading
  Then the spinner should disappear
  And events should be displayed in the table

Scenario: Panel displays empty state when no events exist
  Given a user opens Events Viewer for a cluster
  When the operator returns zero events
  Then the table should display an empty state message
  And the message should say "No events found"
  And filter information should be shown (e.g., "for the last 24 hours")
  And the user should be able to adjust filters to expand the search

Scenario: Panel displays error state when fetch fails
  Given a user opens Events Viewer
  When the event fetch operation fails (network error, operator error, etc.)
  Then an error message should be displayed in the panel
  And the error should include helpful troubleshooting information
  And a "Retry" button should be provided
  When they click "Retry"
  Then the fetch should be attempted again

Scenario: Panel icon shows in editor tab
  Given a user has Events Viewer open
  Then the editor tab should display an appropriate icon
  And the icon should use VS Code ThemeIcon for theme compatibility
  And the icon should visually represent "events" or "logs"

Scenario: Multiple panels can be open simultaneously
  Given a user has 3 clusters connected: "prod", "staging", "dev"
  When they open Events Viewer for all three clusters
  Then 3 separate Events Viewer panels should be open
  And each panel should maintain independent state
  And auto-refresh should work independently for each
  And closing one panel should not affect the others
  And each panel should display events only for its own cluster

Scenario: Panel layout adapts to window size
  Given a user has Events Viewer open
  When they resize the VS Code window to a smaller size
  Then the panel layout should adapt responsively
  And the three-pane layout may collapse to prioritize content
  And horizontal scrolling should be available if needed
  When they resize to a larger window
  Then the layout should expand to use available space

Scenario: Webview scripts are loaded properly
  Given a user opens Events Viewer
  When the webview panel is created
  Then React and required scripts should load successfully
  And the webview should receive the initial state from extension
  And the message channel should be established for bidirectional communication
  And any script loading errors should be caught and reported

Scenario: Content Security Policy is properly configured
  Given a user opens Events Viewer
  Then the webview should have appropriate CSP headers
  And inline scripts should be allowed via nonce
  And external scripts should be restricted
  And VS Code webview security best practices should be followed
  And the application should function without CSP violations
```

## Integration Points

- **ClusterTreeProvider**: Events category click triggers panel opening
- **EventsProvider**: Provides event data to the panel
- **VS Code Webview API**: Panel creation and lifecycle management
- **Extension Context**: Webview panel lifecycle tied to extension activation
- **Auto-refresh**: Managed by EventsProvider with callbacks to panel

## Panel Architecture

The Events Viewer panel follows the singleton-per-cluster pattern:

- Static panel registry: `Map<clusterContext, EventViewerPanel>`
- `EventViewerPanel.show(context, clusterContext)` → create or reveal
- Panel holds reference to webview and manages message protocol
- Panel integrates with EventsProvider for data operations
- Panel cleanup handled via `onDidDispose` event

