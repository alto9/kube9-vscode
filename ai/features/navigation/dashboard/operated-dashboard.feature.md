---
feature_id: operated-dashboard
spec_id: [dashboard-webview-spec, free-operated-dashboard-spec]
diagram_id: [dashboard-architecture]
context_id: [kubernetes-cluster-management, vscode-extension-development, ai-integration]
---

# Operated Dashboard Feature

## Overview

The Operated Dashboard displays cluster statistics from operator-managed resources when the kube9-operator is installed. It includes a conditional content section that shows AI-powered recommendations when the operator is in enabled mode, or an upsell call-to-action for the free tier. This dashboard is designed for users who have installed the kube9-operator and represents the paid/premium experience.

## Behavior

```gherkin
Feature: Operated Dashboard

Background:
  Given the VS Code extension is connected to a Kubernetes cluster
  And the extension displays the cluster in the tree view
  And the kube9-operator is installed in the cluster
  And the cluster has operator status "operated" or "enabled"

Scenario: Dashboard menu item appears in tree view
  Given a user expands a cluster in the tree view
  When the cluster tree categories are displayed
  Then the Dashboard menu item should appear first in the list
  And the Dashboard menu item should be positioned before all other categories
  And the Dashboard menu item should use a dashboard icon
  And the Dashboard menu item should be clickable
  And the menu item appearance should be identical to Free Dashboard

Scenario: User opens Operated Dashboard
  Given a cluster is expanded in the tree view
  And the Dashboard menu item is visible
  And the operator is installed in the cluster
  When the user clicks the Dashboard menu item
  Then the extension should detect the operator presence
  And the extension should open a webview panel
  And the webview panel should display the Operated Dashboard
  And the webview panel should be titled "Dashboard: <cluster-name>"
  And the dashboard should indicate operator integration

Scenario: Operated Dashboard displays operator-provided statistics
  Given the user has opened the Operated Dashboard
  When the dashboard queries for data
  Then the dashboard should query the kube9-dashboard-data ConfigMap in kube9-system namespace
  And the dashboard should parse operator-provided statistics
  And the dashboard should display namespace count from operator data
  And the dashboard should display workload counts from operator data
  And the dashboard should display node information from operator data
  And the dashboard should complete data loading within 5 seconds

Scenario: Operated Dashboard displays operator information
  Given the Operated Dashboard has loaded operator data
  When the dashboard renders
  Then the dashboard should indicate that the operator is providing the data
  And the dashboard should display operator status information

Scenario: Dashboard detects operator mode for conditional content
  Given the Operated Dashboard is open
  When the dashboard determines which conditional content to display
  Then the dashboard should query the operator status ConfigMap
  And the dashboard should check the operator mode
  And if mode is "enabled", the dashboard should prepare to display AI recommendations
  And if mode is "operated", the dashboard should prepare to display upsell CTA

Scenario: Dashboard displays AI recommendations panel when operator is enabled
  Given the Operated Dashboard is open
  And the operator has operator status "enabled"
  When the dashboard loads conditional content
  Then the dashboard should display the AI Recommendations panel
  And the panel should be prominently positioned after stats cards
  And the panel should have a distinct visual style
  And the panel should not show any upsell messaging
  And the panel header should include a lightbulb icon

Scenario: AI recommendations panel displays recommendations
  Given the AI Recommendations panel is visible
  When the dashboard queries for AI recommendations
  Then the dashboard should query the kube9-ai-recommendations ConfigMap
  And the dashboard should parse the recommendations array
  And the dashboard should display each recommendation as a card
  And each recommendation card should show the title and description
  And the panel should provide value to users with insights about their cluster

Scenario: Dashboard displays upsell CTA for free tier
  Given the Operated Dashboard is open
  And the operator has operator status "operated"
  When the dashboard loads conditional content
  Then the dashboard should display the Upsell CTA panel
  And the panel should be positioned where AI recommendations would appear
  And the panel should explain the benefits of upgrading to Pro tier
  And the panel should provide information about upgrading

Scenario: Dashboard refreshes data automatically
  Given the Operated Dashboard is open
  When 30 seconds have passed since the last data update
  Then the dashboard should automatically refresh all data
  And the dashboard should query operator ConfigMaps again
  And the dashboard should refresh AI recommendations if applicable
  And the dashboard should update all stats cards and charts
  And the refresh should not disrupt user interaction

Scenario: User manually refreshes dashboard
  Given the Operated Dashboard is open
  When the user clicks the refresh button
  Then the dashboard should immediately query for updated data
  And the dashboard should bypass any cached data
  And the dashboard should re-check operator status for conditional content
  And the dashboard should display a loading indicator during refresh
  And the dashboard should update all displayed content within 5 seconds

Scenario: Dashboard switches conditional content when operator status changes
  Given the Operated Dashboard is open
  And the dashboard is displaying upsell CTA (free tier)
  When the operator status changes to "enabled"
  And the dashboard refreshes or auto-refreshes
  Then the dashboard should detect the status change
  And the dashboard should switch from upsell CTA to AI recommendations panel

Scenario: Multiple Operated Dashboards can be open simultaneously
  Given the user has multiple clusters with operators installed
  When the user opens Operated Dashboards for multiple clusters
  Then each dashboard should open in its own webview panel
  And each dashboard should display appropriate conditional content for its cluster

Scenario: Dashboard closes cleanly
  Given an Operated Dashboard is open
  When the user closes the webview panel
  Then the dashboard should stop all data refresh timers
  And the dashboard should release all resources
```

## Integration Points

- **VS Code Extension**: ClusterTreeProvider displays Dashboard menu item
- **Tree View**: Dashboard appears as first item under each cluster
- **Webview**: Dashboard content rendered in VS Code webview panel
- **kubectl**: Queries operator ConfigMaps for statistics
- **Operator ConfigMaps**: 
  - `kube9-operator-status` (operator status and API key presence)
  - `kube9-dashboard-data` (cluster statistics)
  - `kube9-ai-recommendations` (AI-powered insights when enabled)
- **kube9-server**: Provides AI recommendations via operator synchronization

## Operator Status Mapping

| Operator Status | API Key | Conditional Content |
|-----------------|---------|---------------------|
| **operated** | No | Upsell CTA Panel |
| **enabled** | Yes | AI Recommendations Panel |
| **degraded** | Any | Degraded Warning Panel |

## Non-Goals

- Historical AI recommendation tracking (future feature)
- Custom AI model configuration (future feature)
- Real-time streaming AI updates (future feature)
- Interactive recommendation wizards (future feature)
- Multi-cluster AI insights aggregation (future feature)
- AI recommendation feedback mechanism (future feature)

