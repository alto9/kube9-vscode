---
feature_id: free-dashboard
spec_id: [dashboard-webview-spec, free-nonoperated-dashboard-spec]
diagram_id: [dashboard-architecture]
context_id: [kubernetes-cluster-management, vscode-extension-development]
---

# Free Dashboard Feature

## Overview

The Free Dashboard provides basic cluster statistics for users without the kube9-operator installed. It queries the cluster directly using kubectl to display namespace counts, workload distributions, and node health. This dashboard is designed to work with any Kubernetes cluster without additional dependencies.

## Behavior

```gherkin
Feature: Free Dashboard

Background:
  Given the VS Code extension is connected to a Kubernetes cluster
  And the extension displays the cluster in the tree view
  And the cluster has operator status "basic" (no operator installed)
  And the extension has determined this is a Free tier cluster

Scenario: Dashboard menu item appears in tree view
  Given a user expands a cluster in the tree view
  When the cluster tree categories are displayed
  Then the Dashboard menu item should appear first in the list
  And the Dashboard menu item should be positioned before all other categories
  And the Dashboard menu item should use a dashboard icon
  And the Dashboard menu item should be clickable

Scenario: User opens Free Dashboard
  Given a cluster is expanded in the tree view
  And the Dashboard menu item is visible
  When the user clicks the Dashboard menu item
  Then the extension should open a webview panel
  And the webview panel should display the Free Dashboard
  And the webview panel should be titled "Dashboard: <cluster-name>"
  And the dashboard should not reference operators or API keys

Scenario: Free Dashboard displays cluster statistics
  Given the user has opened the Free Dashboard
  When the dashboard queries the cluster
  Then the dashboard should execute kubectl to gather statistics
  And the dashboard should display namespace count
  And the dashboard should display workload counts (Deployments, StatefulSets, DaemonSets, Pods, etc.)
  And the dashboard should display node health information
  And the dashboard should display basic charts visualizing the data
  And all statistics should be displayed in an easy-to-read format

Scenario: Dashboard refreshes data automatically
  Given the Free Dashboard is open
  When 30 seconds have passed since the last data update
  Then the dashboard should automatically refresh all data
  And the refresh should not disrupt user interaction

Scenario: User manually refreshes dashboard
  Given the Free Dashboard is open
  When the user clicks the refresh button
  Then the dashboard should immediately query for updated data
  And the dashboard should display a loading indicator during refresh
  And the dashboard should update all displayed metrics

Scenario: Dashboard displays loading state during initial load
  Given the user has just clicked the Dashboard menu item
  When the dashboard is fetching initial data
  Then the dashboard should display a loading spinner
  And the dashboard should show "Loading cluster statistics..." message

Scenario: Webview message handler registers before HTML is set
  Given a user clicks the Dashboard menu item
  When the extension creates the webview panel
  Then the extension should register the message handler FIRST
  And the extension should attach the handler to panel.webview.onDidReceiveMessage
  And ONLY AFTER the handler is registered should the extension set panel.webview.html
  And this order prevents the race condition where early messages are lost

Scenario: Dashboard receives initial data without manual request
  Given the webview panel has been created
  And the message handler has been registered
  And the HTML has been set
  When the webview loads and becomes ready
  Then the extension should proactively send initial dashboard data
  And the webview should receive the data via the 'updateData' message
  And the dashboard should display actual cluster statistics
  And no manual refresh should be required

Scenario: Dashboard initialization completes within timeout
  Given a user opens the Free Dashboard
  When the initialization sequence begins
  Then the message handler should register within 100ms
  And the HTML should be set within 200ms
  And initial data should be sent within 5 seconds
  And the dashboard should display data without requiring user interaction

Scenario: Dashboard handles query errors gracefully
  Given the Free Dashboard is attempting to query cluster data
  When a kubectl query fails
  Then the dashboard should not crash
  And the dashboard should display an error message
  And the dashboard should provide a way to retry

Scenario: Multiple dashboards can be open simultaneously
  Given the user has multiple clusters configured
  When the user opens Free Dashboards for multiple clusters
  Then each dashboard should open in its own webview panel
  And each dashboard should display data for its specific cluster
  And each dashboard should be independently refreshable
  And the extension should maintain separate state for each dashboard
  And users can switch between dashboard panels freely

Scenario: Dashboard maintains state when cluster context changes
  Given a Free Dashboard is open for a specific cluster
  When the user switches the active kubectl context to a different cluster
  Then the open dashboard should remain showing data for its original cluster
  And the dashboard title should clearly indicate which cluster it represents
  And the dashboard should not automatically switch to the new context's data
  And the user can open a second dashboard for the new cluster if desired

Scenario: Dashboard closes cleanly
  Given a Free Dashboard is open
  When the user closes the webview panel
  Then the dashboard should stop all data refresh timers
  And the dashboard should release all resources
```

## Integration Points

- **VS Code Extension**: ClusterTreeProvider displays Dashboard menu item
- **Tree View**: Dashboard appears as first item under each cluster
- **Webview**: Dashboard content rendered in VS Code webview panel
- **kubectl**: Direct queries to cluster for all statistics

## Data Sources

- **Namespaces**: `kubectl get namespaces --output=json`
- **Workloads**: `kubectl get <resource> --all-namespaces --output=json`
- **Nodes**: `kubectl get nodes --output=json`

## Non-Goals

- Operator integration (see operated-dashboard feature)
- Historical trend analysis (future feature)
- Custom dashboard configuration (future feature)
- Export dashboard data (future feature)
- Real-time streaming metrics (future feature)

