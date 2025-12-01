---
feature_id: operator-presence-awareness
spec_id: [operator-status-api-spec]
context_id: [kubernetes-cluster-management, vscode-extension-development]
---

# Operator Presence Awareness and Reporting Feature

## Overview

The VS Code extension must be aware of the presence and status of the kube9-operator in each connected cluster, and report this status visually to users through icons and context menus. This awareness enables the extension to provide appropriate features based on the operator's tier and health status.

## Behavior

```gherkin
Feature: Operator Presence Awareness and Reporting

Background:
  Given the VS Code extension is connected to a Kubernetes cluster
  And the extension has access to the cluster via kubeconfig
  And the extension maintains a clusters view showing all connected clusters
  And the extension can query Kubernetes resources using kubectl

Scenario: Extension checks for operator presence on cluster connection
  Given a user connects to a Kubernetes cluster
  When the extension establishes the cluster connection
  Then the extension should check for the kube9-operator-status ConfigMap in kube9-system namespace
  And the extension should determine the cluster's operator status
  And the extension should cache the status for 5 minutes
  And the extension should store the status per cluster context

Scenario: Extension determines basic status when operator not installed
  Given the operator is NOT installed in the cluster
  When the extension checks for operator presence
  Then the extension should determine cluster operator status is "basic"
  And the extension should enable kubectl-only operations
  And the extension should show installation prompts for the operator when appropriate
  And the extension should display a basic status icon in the clusters view
  And the extension should cache the basic status for 5 minutes

Scenario: Extension determines operated status when operator installed in free tier
  Given the operator is installed in the cluster
  And the operator is running in "operated" mode
  When the extension checks for operator presence
  Then the extension should determine cluster operator status is "operated"
  And the extension should enable local webviews and basic features
  And the extension should show upgrade prompts for Pro tier features when appropriate
  And the extension should display an operated status icon in the clusters view
  And the extension should cache the operated status for 5 minutes

Scenario: Extension determines enabled status when operator registered
  Given the operator is installed in the cluster
  And the operator has successfully registered with kube9-server
  And the operator is running in "enabled" mode
  When the extension checks for operator presence
  Then the extension should determine cluster operator status is "enabled"
  And the extension should enable rich UIs from server
  And the extension should enable AI features and advanced dashboards
  And the extension should display an enabled status icon in the clusters view
  And the extension should cache the enabled status for 5 minutes

Scenario: Extension determines degraded status when operator has issues
  Given the operator is installed in the cluster
  And the operator status ConfigMap exists
  And the operator status indicates "degraded" health
  Or the operator status timestamp is stale (> 5 minutes old)
  When the extension checks for operator presence
  Then the extension should determine cluster operator status is "degraded"
  And the extension should enable temporary fallback features
  And the extension should show a warning about registration issues
  And the extension should display a degraded status icon in the clusters view
  And the extension should cache the degraded status for 5 minutes

Scenario: Extension updates cluster icon based on operator status
  Given the extension has determined a cluster's operator status
  When the extension displays the cluster in the clusters view
  Then the extension should display an icon that reflects the operator status
  And the icon should be different for each status: basic, operated, enabled, degraded
  And the icon should be visually distinct to help users quickly identify status
  And the icon should override or complement the connection status icon
  And the icon should use VS Code ThemeIcon for theme compatibility

Scenario: Extension shows status in cluster hover context menu
  Given a cluster is displayed in the clusters view
  When a user hovers over the cluster tree item
  Then the extension should display a tooltip
  And the tooltip should include the operator status information
  And the status information should show the cluster operator status mode (basic/operated/enabled/degraded)
  And the status information should show the operator tier (free/pro) if available
  And the status information should show the operator version if available
  And the status information should show the operator health if available
  And the status information should show any error messages if status is degraded
  And the status information should show the last update timestamp if available

Scenario: Extension refreshes operator status on manual refresh
  Given the extension has cached operator status for a cluster
  When the user manually refreshes the clusters view
  Then the extension should refresh the operator status from the cluster
  And the extension should update the cached status
  And the extension should update the cluster icon if status changed
  And the extension should update the hover tooltip if status changed

Scenario: Extension handles status check failures gracefully
  Given the extension is attempting to check operator status
  When the status check fails due to network error
  Or the status check fails due to RBAC permissions
  Or the status check fails due to cluster connectivity issues
  Or the ConfigMap does not exist (404 error)
  Then the extension should not crash or show error dialogs
  And the extension should fall back to cached status if available
  And the extension should display a basic status icon if no cache available
  And the extension should retry the status check on next manual refresh
  And the extension should log the error for debugging purposes

Scenario: Extension maintains status awareness across all clusters
  Given the extension is connected to multiple clusters
  When the extension displays the clusters view
  Then the extension should be aware of each cluster's operator status independently
  And the extension should display appropriate icons for each cluster
  And the extension should allow users to see status for each cluster independently
  And the extension should cache status separately for each cluster context
  And the extension should refresh status for each cluster independently

Scenario: Extension uses status to enable appropriate features
  Given the extension has determined a cluster's operator status
  When the user interacts with that cluster
  Then the extension should enable features appropriate to the status
  And the extension should disable features not available for the status
  And the extension should show upgrade prompts for unavailable features when appropriate
  And the extension should check operator status before enabling Pro tier features

Scenario: Extension handles status parsing errors gracefully
  Given the extension successfully retrieves the operator status ConfigMap
  When the status JSON is malformed or invalid
  Or the status JSON is missing required fields
  Then the extension should not crash
  And the extension should fall back to basic status
  And the extension should log the parsing error for debugging
  And the extension should display a basic status icon

Scenario: Extension checks operator status on manual refresh
  Given the extension has cached operator status for a cluster
  When the user manually refreshes the clusters view
  Then the extension should force refresh the operator status
  And the extension should bypass the cache
  And the extension should update the cluster icon immediately
  And the extension should update the tooltip immediately
```

## Integration Points

- **VS Code Extension**: Primary system implementing presence awareness
- **Status ConfigMap**: Source of truth for operator status (`kube9-operator-status` in `kube9-system` namespace)
- **Clusters View**: UI component displaying status icons (ClusterTreeProvider)
- **Cluster Tree Items**: Tree items that display operator status icons and tooltips
- **kubectl Commands**: Used to query the ConfigMap via ConfigurationCommands

## Status Definitions

| Status | Operator State | Features Available | Icon Indication |
|--------|---------------|-------------------|-----------------|
| **basic** | No operator installed | kubectl-only operations, show installation prompts | Basic/minimal icon |
| **operated** | Installed, free tier | Local webviews, basic features, show upgrade prompts | Operated/free tier icon |
| **enabled** | Installed, registered with server | Rich UIs from server, AI features, advanced dashboards | Enabled/pro tier icon |
| **degraded** | Installed, but registration failed or stale | Temporary fallback, registration failed | Degraded/warning icon |

## Non-Goals

- Operator installation from extension (future feature)
- Status history or trends (future feature)
- Real-time status push notifications (future feature)
- Status-based automatic actions (future feature)
- Modifying operator configuration (future feature)

