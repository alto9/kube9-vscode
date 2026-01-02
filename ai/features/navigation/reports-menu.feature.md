---
feature_id: reports-menu
spec_id: [tree-view-spec]
context_id: [kubernetes-cluster-management, vscode-extension-development]
---

# Reports Menu Feature

## Overview

The Reports menu provides access to cluster reports and compliance information when the kube9-operator is installed and functioning. The Reports menu appears conditionally at the top of the tree view based on operator status, providing a hierarchical structure for future report functionality.

## Behavior

```gherkin
Feature: Reports Menu in Tree View

Background:
  Given the kube9 VS Code extension is installed and activated
  And the user has a valid kubeconfig file
  And the extension maintains operator status awareness for each cluster

Scenario: Reports menu appears when operator is installed (operated mode)
  Given a user has connected to a cluster
  And the cluster has operator status "operated"
  When they expand the cluster in the tree view
  Then they should see "Reports" as the first category
  And the Reports category should appear before "Nodes"
  And the Reports category should be expandable

Scenario: Reports menu appears when operator is installed (enabled mode)
  Given a user has connected to a cluster
  And the cluster has operator status "enabled"
  When they expand the cluster in the tree view
  Then they should see "Reports" as the first category
  And the Reports category should appear before "Nodes"
  And the Reports category should be expandable

Scenario: Reports menu appears when operator is installed (degraded mode)
  Given a user has connected to a cluster
  And the cluster has operator status "degraded"
  When they expand the cluster in the tree view
  Then they should see "Reports" as the first category
  And the Reports category should appear before "Nodes"
  And the Reports category should be expandable

Scenario: Reports menu does not appear when operator is not installed (basic mode)
  Given a user has connected to a cluster
  And the cluster has operator status "basic"
  When they expand the cluster in the tree view
  Then they should NOT see "Reports" category
  And "Nodes" should be the first category displayed
  And the tree should show 7 resource categories: Nodes, Namespaces, Workloads, Storage, Helm, Configuration, Custom Resources

Scenario: Expanding Reports category shows Kube9 Operator subcategory
  Given a user has expanded a cluster showing the Reports category
  And the cluster has operator status other than "basic"
  When they expand the "Reports" category
  Then they should see "Kube9 Operator" as a subcategory
  And the Kube9 Operator subcategory should be expandable

Scenario: Expanding Kube9 Operator subcategory shows Health report
  Given a user has expanded the "Reports" category
  When they expand the "Kube9 Operator" subcategory
  Then they should see "Health" as a report item
  And the Health report item should be clickable

Scenario: Clicking Health report opens Health webview
  Given a user has expanded the "Kube9 Operator" subcategory
  When they click on "Health"
  Then a Health report webview should open
  And the webview should display operator status information
  And the webview should show operator health metrics

Scenario: Reports menu updates when operator status changes
  Given a user has a cluster with operator status "basic"
  And the cluster tree view is expanded
  And the Reports category is not visible
  When the operator is installed and status changes to "operated"
  And the tree view is refreshed
  Then the Reports category should appear at the top
  And the tree view should update to show Reports as the first category

Scenario: Reports menu disappears when operator is removed
  Given a user has a cluster with operator status "operated"
  And the cluster tree view is expanded
  And the Reports category is visible
  When the operator is removed and status changes to "basic"
  And the tree view is refreshed
  Then the Reports category should no longer be visible
  And "Nodes" should become the first category displayed

Scenario: Multiple clusters show Reports independently based on operator status
  Given a user has connected to multiple clusters
  And cluster "production" has operator status "enabled"
  And cluster "staging" has operator status "basic"
  When they expand both clusters in the tree view
  Then "production" cluster should show Reports category
  And "staging" cluster should NOT show Reports category
  And each cluster's Reports visibility should be independent

Scenario: Reports category has appropriate icon
  Given a user has expanded a cluster showing the Reports category
  When they view the Reports category in the tree
  Then it should display an appropriate icon
  And the icon should use VS Code ThemeIcon for theme compatibility
  And the icon should be visually distinct from other categories

Scenario: Kube9 Operator subcategory has appropriate icon
  Given a user has expanded the Reports category
  When they view the Kube9 Operator subcategory in the tree
  Then it should display an appropriate icon
  And the icon should use VS Code ThemeIcon for theme compatibility
  And the icon should indicate it is related to the operator

Scenario: Health report item has appropriate icon
  Given a user has expanded the Kube9 Operator subcategory
  When they view the Health item in the tree
  Then it should display an appropriate icon
  And the icon should indicate it is a health/status report
  And the icon should use VS Code ThemeIcon for theme compatibility
```

## Integration Points

- **Tree View Navigation**: Reports menu is part of the tree view navigation structure
- **Operator Status Awareness**: Reports visibility depends on operator presence awareness feature
- **ClusterTreeProvider**: Implements the conditional display logic for Reports category
- **TreeItemFactory**: Creates Reports category items and subcategories

## Non-Goals

- Actual report generation or data collection (future feature)
- Report configuration or settings (future feature)
- Report export functionality (future feature)
- Report scheduling (future feature)
- Multiple report types beyond Data Collection (future feature)

