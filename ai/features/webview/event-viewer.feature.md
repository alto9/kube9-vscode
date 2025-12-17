---
feature_id: event-viewer
spec_id:
  - event-viewer-webview-spec
  - event-query-api-spec
diagram_id:
  - event-viewer-flow
context_id:
  - kubernetes-cluster-management
  - vscode-extension-development
---

# Event Viewer Feature

## Overview

The Event Viewer provides a visual interface to view, filter, and analyze cluster events collected by the kube9-operator. This feature enables developers and cluster administrators to view historical events, troubleshoot issues, and audit cluster changes directly from VS Code.

## Behavior

```gherkin
Feature: Event Viewer for Operated Clusters

Background:
  Given the kube9 VS Code extension is installed and activated
  And the user is connected to a Kubernetes cluster
  And the cluster context is displayed in the tree view

Scenario: Events tree item appears for all clusters
  Given a cluster context is displayed in the tree view
  When the tree view is rendered
  Then an "Events" tree item should appear under the cluster context
  And the "Events" item should be positioned after the "Dashboard" item
  And the "Events" item should use a calendar icon
  And the "Events" item should be clickable

Scenario: Opening Event Viewer for operated cluster
  Given a cluster with kube9-operator installed
  When the user clicks the "Events" tree item
  Then the Event Viewer webview should open
  And the webview should display a table of recent events
  And the webview should show filtering controls
  And the webview should show pagination controls

Scenario: Opening Event Viewer for non-operated cluster
  Given a cluster without kube9-operator installed
  When the user clicks the "Events" tree item
  Then the Event Viewer webview should open
  And the webview should display a call-to-action message
  And the message should explain that the operator is required
  And the message should list benefits of the Event Viewer
  And an "Install Operator" button should be displayed
  And a "Learn More" link should be displayed

Scenario: Event list displays paginated events
  Given the Event Viewer is open for an operated cluster
  When events are loaded from the operator
  Then the webview should display events in a table format
  And each event row should show event type icon
  And each event row should show event severity
  And each event row should show event description
  And each event row should show relative timestamp
  And each event row should show affected resource
  And the table should display 20 events per page
  And pagination controls should appear at the bottom

Scenario: Filtering events by type
  Given the Event Viewer is open showing events
  When the user selects an event type from the filter dropdown
  Then the table should refresh
  And only events of the selected type should be displayed
  And the pagination should reset to page 1
  And the filter selection should persist during the session

Scenario: Filtering events by severity
  Given the Event Viewer is open showing events
  When the user selects a severity level from the filter dropdown
  Then the table should refresh
  And only events with the selected severity should be displayed
  And the pagination should reset to page 1
  And the filter selection should persist during the session

Scenario: Filtering events by time range
  Given the Event Viewer is open showing events
  When the user selects a time range from the filter dropdown
  Then the table should refresh
  And only events within the selected time range should be displayed
  And the pagination should reset to page 1
  And the filter selection should persist during the session

Scenario: Searching events by text
  Given the Event Viewer is open showing events
  When the user types text into the search box
  And the user presses Enter or the search button
  Then the table should refresh
  And only events matching the search text should be displayed
  And the search should match against event description and object name
  And the pagination should reset to page 1

Scenario: Combining multiple filters
  Given the Event Viewer is open showing events
  When the user applies multiple filters (type, severity, time range)
  Then the table should refresh
  And events should match ALL applied filters (AND logic)
  And the pagination should reset to page 1

Scenario: Clearing all filters
  Given the Event Viewer has active filters applied
  When the user clicks the "Clear Filters" button
  Then all filter selections should reset to default
  And the event table should refresh showing all events
  And the pagination should reset to page 1

Scenario: Navigating between pages
  Given the Event Viewer is showing page 1 of multiple pages
  When the user clicks "Next Page"
  Then the table should load and display page 2
  And the current page indicator should update to "Page 2"
  When the user clicks "Previous Page"
  Then the table should display page 1 again
  And the current page indicator should update to "Page 1"

Scenario: Expanding event details
  Given the Event Viewer is showing a list of events
  When the user clicks on an event row
  Then the event row should expand
  And expanded details should show full event description
  And expanded details should show event ID
  And expanded details should show exact timestamp
  And expanded details should show affected object details
  And expanded details should show additional metadata as JSON
  And an action to "View Object" should be available if applicable

Scenario: Grouping events by type
  Given the Event Viewer is showing multiple event types
  When the user enables "Group by Type" option
  Then events should be visually grouped by their event type
  And each group should have a header showing the type name
  And events within each group should be sorted by timestamp

Scenario: Sorting events
  Given the Event Viewer is showing events in a table
  When the user clicks a column header (timestamp, severity, type)
  Then the events should re-sort by that column
  And clicking again should reverse the sort order
  And a sort indicator should appear on the active column

Scenario: Refreshing event data
  Given the Event Viewer is open
  When the user clicks the "Refresh" button
  Then the extension should query fresh events from the operator
  And the table should update with the latest events
  And current filters and page position should be maintained

Scenario: Handling empty event list
  Given the Event Viewer is open for an operated cluster
  When the operator returns no events matching filters
  Then the table should display an empty state message
  And the message should say "No events found"
  And the message should suggest adjusting filters

Scenario: Handling operator query errors
  Given the Event Viewer is open for an operated cluster
  When the operator query fails or times out
  Then the webview should display an error message
  And the error message should explain the failure
  And a "Retry" button should be displayed
  And existing event data should remain visible if available

Scenario: Install Operator button action
  Given the Event Viewer is showing the call-to-action for non-operated cluster
  When the user clicks "Install Operator"
  Then VS Code should open the operator installation documentation URL
  And the documentation should open in the user's default browser

Scenario: Event Viewer supports multiple clusters independently
  Given the extension is connected to multiple clusters
  When the user opens Event Viewer for cluster A
  Then events should be loaded from cluster A's operator
  When the user opens Event Viewer for cluster B
  Then events should be loaded from cluster B's operator
  And the two Event Viewers should show independent data

Scenario: Relative timestamps update over time
  Given the Event Viewer is displaying events with relative timestamps
  When time passes (e.g., 1 minute)
  Then relative timestamps should update automatically
  And "2 minutes ago" should change to "3 minutes ago"

Scenario: View object action from event details
  Given an event is expanded showing details
  And the event references a Kubernetes object (Pod, Deployment, etc)
  When the user clicks "View Object" action
  Then the extension should navigate to that object in the tree view
  Or the extension should open the appropriate detail view for that object
```

## Integration Points

- **VS Code Extension**: Primary system implementing Event Viewer
- **Tree View**: Events tree item appears under each cluster context
- **Webview**: Custom webview panel for event display
- **kube9-operator Pod**: Operator pod in kube9-system namespace containing CLI binary and SQLite database
- **kube9-operator CLI Binary**: Bundled in operator pod image, provides query interface via subcommands
- **kubectl exec**: Used to execute the CLI binary inside the operator pod to query events
- **SQLite Database**: Event storage inside operator pod, queried by CLI binary

## Event Types

The Event Viewer supports various event types emitted by the operator:

- **Cluster Events**: Cluster-wide state changes
- **Operator Events**: Operator lifecycle and health events
- **Insight Events**: New insights generated by the operator
- **Assessment Events**: Assessment completion and results
- **Workload Events**: Workload-related state changes
- **System Events**: Internal operator system events

## Success Criteria

- Events tree item appears for all cluster contexts
- Call-to-action displays correctly for non-operated clusters
- Event list loads and displays correctly for operated clusters
- All filters work as expected (type, severity, time range, search)
- Pagination works correctly with filtered results
- Event details expand/collapse smoothly
- Grouping by event type displays clearly
- Sorting works for timestamp, severity, and type columns
- Performance is acceptable with 1000+ events
- Error handling is graceful (operator down, query timeout)
- Multiple clusters can have independent Event Viewers open

## Non-Goals

- Event badge showing unread count (deferred)
- Real-time event streaming (future enhancement)
- Event export to CSV/JSON (future enhancement)
- Event notifications/toasts (future enhancement)
- Event correlation/grouping by relationship (future enhancement)
- Operator installation from extension (separate feature)

