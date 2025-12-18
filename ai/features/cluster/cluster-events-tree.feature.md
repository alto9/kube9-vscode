---
feature_id: cluster-events-tree
name: Cluster Events Tree Category
description: Tree view category showing Kubernetes events for troubleshooting, available only for operated clusters
spec_id:
  - events-tree-spec
  - operator-status-api-spec
---

# Cluster Events Tree Category

## Overview

The Events category provides access to Kubernetes cluster events for troubleshooting purposes. Events are critical for understanding what's happening in the cluster but are difficult to access without executing kubectl commands. The Events category appears only for operated clusters (those with kube9-operator installed) and retrieves event data through the operator CLI utility.

## Behavior

```gherkin
Feature: Cluster Events Tree Category

Background:
  Given the kube9 VS Code extension is installed and activated
  And the user has a valid kubeconfig file
  And the extension maintains operator status awareness for each cluster

Scenario: Events category appears when operator is installed (operated mode)
  Given a user has connected to a cluster
  And the cluster has operator status "operated"
  When they expand the cluster in the tree view
  Then they should see "Events" as a category
  And the Events category should appear after "Reports"
  And the Events category should be expandable

Scenario: Events category appears when operator is installed (enabled mode)
  Given a user has connected to a cluster
  And the cluster has operator status "enabled"
  When they expand the cluster in the tree view
  Then they should see "Events" as a category
  And the Events category should appear after "Reports"
  And the Events category should be expandable

Scenario: Events category appears when operator is installed (degraded mode)
  Given a user has connected to a cluster
  And the cluster has operator status "degraded"
  When they expand the cluster in the tree view
  Then they should see "Events" as a category
  And the Events category should appear after "Reports"
  And the Events category should be expandable

Scenario: Events category does not appear when operator is not installed (basic mode)
  Given a user has connected to a cluster
  And the cluster has operator status "basic"
  When they expand the cluster in the tree view
  Then they should NOT see "Events" category
  And only kubectl-based features should be available

Scenario: Expanding Events category retrieves events from operator CLI
  Given a user has expanded a cluster showing the Events category
  And the cluster has operator status other than "basic"
  When they expand the "Events" category
  Then the extension should discover the operator pod in kube9-system namespace
  And the extension should use Kubernetes client Exec API to execute operator CLI
  And the operator CLI command should be: kube9-operator query events --format=json
  And the extension should parse the JSON response
  And the extension should display events in the tree
  And the extension should limit display to 500 events for performance

Scenario: Events are displayed with color coding by severity
  Given a user has expanded the Events category
  And events have been retrieved from the operator CLI
  When they view the events in the tree
  Then Normal events should display with default color
  And Warning events should display with yellow/orange color
  And Error events should display with red color
  And each event should have an appropriate severity icon

Scenario: Events display reason, resource, and age
  Given a user has expanded the Events category
  And events have been retrieved from the operator CLI
  When they view an event in the tree
  Then the event label should show the event reason (e.g., "Created", "Failed", "BackOff")
  And the event description should show the involved resource (namespace/kind/name)
  And the event should show age since first occurrence
  And the event should show count if occurred multiple times

Scenario: Clicking an event shows full details in Output Panel
  Given a user has expanded the Events category
  And events are displayed in the tree
  When they click on an event
  Then the extension should show full event details in the Output Panel
  And the details should include event reason, type, message, involved resource, count, and timestamps
  And the details should be formatted for readability

Scenario: Event tooltip shows message preview
  Given a user has expanded the Events category
  And events are displayed in the tree
  When they hover over an event
  Then a tooltip should appear
  And the tooltip should show the event message
  And the tooltip should show the involved resource
  And the tooltip should show the event count and age

Scenario: Filter events by namespace
  Given a user has expanded the Events category
  When they click the namespace filter toolbar button
  Then a QuickPick should appear with namespace options
  And the options should include "All Namespaces" and each individual namespace
  When they select a namespace
  Then the events should be filtered to only that namespace
  And the tree should refresh to show only filtered events
  And the filter should be persisted for the cluster session

Scenario: Filter events by type (Normal/Warning/Error)
  Given a user has expanded the Events category
  When they click the type filter toolbar button
  Then a QuickPick should appear with type options: "All", "Normal", "Warning", "Error"
  When they select a type
  Then the events should be filtered to only that type
  And the tree should refresh to show only filtered events
  And the filter should be persisted for the cluster session

Scenario: Filter events by time range
  Given a user has expanded the Events category
  When they click the time range filter toolbar button
  Then a QuickPick should appear with time range options: "Last 1 hour", "Last 6 hours", "Last 24 hours", "All"
  When they select a time range
  Then the events should be filtered to only events within that time range
  And the tree should refresh to show only filtered events
  And the filter should be persisted for the cluster session

Scenario: Filter events by resource type
  Given a user has expanded the Events category
  When they click the resource type filter toolbar button
  Then a QuickPick should appear with resource type options: "All", "Pod", "Deployment", "Service", "StatefulSet", "DaemonSet", etc.
  When they select a resource type
  Then the events should be filtered to only events for that resource type
  And the tree should refresh to show only filtered events
  And the filter should be persisted for the cluster session

Scenario: Auto-refresh events every 30 seconds
  Given a user has expanded the Events category
  And auto-refresh is enabled (default state)
  When 30 seconds pass
  Then the extension should automatically re-query events from operator CLI
  And the tree should refresh with new events
  And the scroll position should be maintained if possible
  And the current filters should be applied to the refreshed events

Scenario: Toggle auto-refresh on and off
  Given a user has expanded the Events category
  And auto-refresh is enabled
  When they click the auto-refresh toggle toolbar button
  Then auto-refresh should be disabled
  And events should not automatically refresh
  And the toolbar button should indicate auto-refresh is off
  When they click the toggle button again
  Then auto-refresh should be enabled
  And events should resume refreshing every 30 seconds

Scenario: Manual refresh events
  Given a user has expanded the Events category
  When they click the refresh toolbar button
  Or they right-click the Events category and select "Refresh"
  Then the extension should immediately re-query events from operator CLI
  And the tree should refresh with current events
  And the current filters should be applied

Scenario: Events are limited to recent 500 for performance
  Given a user has expanded the Events category
  And the cluster has more than 500 events
  When events are retrieved from operator CLI
  Then the extension should limit display to the most recent 500 events
  And older events should not be displayed
  And a message should indicate if events were truncated

Scenario: Handle operator CLI errors gracefully
  Given a user has expanded the Events category
  When the operator CLI query fails
  Or the operator pod is not reachable
  Or the CLI returns an error
  Then the extension should not crash
  And the extension should display an error message in the tree
  And the error message should suggest checking operator health
  And the extension should log the error for debugging

Scenario: Events category updates when operator status changes
  Given a user has a cluster with operator status "basic"
  And the cluster tree view is expanded
  And the Events category is not visible
  When the operator is installed and status changes to "operated"
  And the tree view is refreshed
  Then the Events category should appear
  And the Events category should be positioned after Reports

Scenario: Events category disappears when operator is removed
  Given a user has a cluster with operator status "operated"
  And the cluster tree view is expanded
  And the Events category is visible
  When the operator is removed and status changes to "basic"
  And the tree view is refreshed
  Then the Events category should no longer be visible

Scenario: Multiple clusters show Events independently based on operator status
  Given a user has connected to multiple clusters
  And cluster "production" has operator status "enabled"
  And cluster "staging" has operator status "basic"
  When they expand both clusters in the tree view
  Then "production" cluster should show Events category
  And "staging" cluster should NOT show Events category
  And each cluster's Events visibility should be independent
  And events should be retrieved independently for each cluster

Scenario: Search/filter events by message text
  Given a user has expanded the Events category
  And events are displayed in the tree
  When they click the search toolbar button
  And they enter search text (e.g., "BackOff")
  Then events should be filtered to only those containing the search text in the message
  And the tree should refresh to show only matching events
  And the search should be case-insensitive

Scenario: Clear all filters
  Given a user has expanded the Events category
  And multiple filters are applied (namespace, type, time range, resource type, search)
  When they click the clear filters toolbar button
  Then all filters should be reset to defaults (All)
  And the tree should refresh to show all events
  And the filter state should be cleared

Scenario: Events toolbar shows filter indicators
  Given a user has expanded the Events category
  And filters are applied
  When they view the Events category toolbar
  Then the toolbar should show indicators for active filters
  And each filter button should show its current value (e.g., "Namespace: default")
  And the clear filters button should be enabled when filters are active

Scenario: Events category has appropriate icon
  Given a user has expanded a cluster showing the Events category
  When they view the Events category in the tree
  Then it should display an appropriate icon for events
  And the icon should use VS Code ThemeIcon for theme compatibility
  And the icon should be visually distinct from other categories
```

## Integration Points

- **Tree View Navigation**: Events category is part of the tree view navigation structure
- **Operator Status Awareness**: Events visibility depends on operator presence awareness feature
- **ClusterTreeProvider**: Implements the conditional display logic for Events category
- **kube9-operator CLI**: Provides event data via kubectl exec interface
- **Output Panel**: Displays full event details when clicked
- **Toolbar Actions**: Filtering, auto-refresh toggle, manual refresh

## Operator CLI Integration

### Execution Method
Uses Kubernetes client Exec API (from `@kubernetes/client-node`) instead of kubectl process spawning:

```typescript
const exec = new k8s.Exec(kubeConfig);
exec.exec(
  'kube9-system',          // namespace
  operatorPodName,         // discovered from deployment
  'kube9-operator',        // container name
  ['kube9-operator', 'query', 'events', '--format=json', ...filterArgs],
  ...
);
```

### Command Arguments
```
kube9-operator query events
  --namespace=<namespace>
  --type=<Normal|Warning|Error>
  --since=<duration>
  --resource-type=<kind>
  --limit=500
  --format=json
```

### CLI Response
```json
{
  "events": [
    {
      "reason": "Created",
      "type": "Normal",
      "message": "Created container main",
      "involvedObject": {
        "kind": "Pod",
        "namespace": "default",
        "name": "api-server-abc123"
      },
      "count": 1,
      "firstTimestamp": "2024-12-17T10:00:00Z",
      "lastTimestamp": "2024-12-17T10:00:00Z"
    }
  ]
}
```

## Non-Goals

- Direct kubectl process spawning (we use Kubernetes client Exec API)
- Direct Kubernetes Events API (we use operator CLI for consistency)
- Event history beyond what operator provides
- Event creation or modification from extension
- Event export functionality (future feature)
- Event custom views or saved filters (future feature)
- Real-time event streaming (auto-refresh is polling-based)

