---
feature_id: cluster-visibility-control
name: Cluster Visibility Control
description: Hide and show clusters in the tree view to reduce clutter
spec_id:
  - cluster-manager-webview-spec
  - cluster-customization-storage-spec
---

# Cluster Visibility Control

```gherkin
Feature: Cluster Visibility Control

Background:
  Given the Cluster Manager is open
  And the user has multiple clusters configured

Scenario: Hiding a cluster from tree view
  Given a cluster "test-cluster" is visible in the tree view
  When the user opens the Cluster Manager
  And toggles the visibility switch for "test-cluster" to "hidden"
  Then the cluster displays a "Hidden" badge in Cluster Manager
  And the cluster appears grayed out in Cluster Manager
  And the tree view updates automatically
  And "test-cluster" no longer appears in the tree view

Scenario: Showing a hidden cluster
  Given a cluster "test-cluster" is hidden
  When the user toggles the visibility switch for "test-cluster" to "visible"
  Then the "Hidden" badge is removed
  And the cluster appears with normal styling
  And the tree view updates automatically
  And "test-cluster" appears in the tree view

Scenario: Hidden clusters remain accessible in Cluster Manager
  Given a cluster "old-cluster" is hidden from tree view
  When the user opens the Cluster Manager
  Then "old-cluster" appears in the list
  And the cluster is grayed out
  And shows a "Hidden" badge
  And the user can unhide or modify it

Scenario: Visibility persists across sessions
  Given a cluster "test-cluster" is hidden
  When the user closes VS Code
  And reopens VS Code
  Then "test-cluster" remains hidden from tree view
  When they open Cluster Manager
  Then "test-cluster" shows as hidden with badge

Scenario: Visibility toggle is a switch control
  Given the user views a cluster in Cluster Manager
  Then a toggle switch appears next to the cluster
  And the switch shows "Visible" when on
  And the switch shows "Hidden" when off
  And clicking the switch toggles the state
  And the change is immediate with visual feedback

Scenario: Hidden cluster count in footer
  Given 3 clusters are hidden out of 10 total
  When the user views Cluster Manager
  Then the footer displays "7 visible / 10 total clusters"
  And the footer displays "3 hidden"
  And clicking "3 hidden" filters to show only hidden clusters

Scenario: Filtering to show only hidden clusters
  Given some clusters are hidden
  When the user clicks "3 hidden" in the footer
  Then the view filters to show only hidden clusters
  And a "Show All" button appears
  And the toolbar indicates filter is active

Scenario: Clearing hidden filter
  Given the view is filtered to show only hidden clusters
  When the user clicks "Show All" button
  Then all clusters become visible in Cluster Manager
  And both hidden and visible clusters are shown
  And the filter is cleared

Scenario: Hidden clusters not included in tree view counts
  Given a folder "Production" contains 5 clusters
  And 2 of those clusters are hidden
  When the user views the tree view
  Then the folder shows count badge "3"
  And only the 3 visible clusters appear when expanded
  And the 2 hidden clusters do not appear

Scenario: Hiding last visible cluster in folder
  Given a folder "Test" contains 2 clusters
  And 1 cluster is already hidden
  When the user hides the last remaining visible cluster
  Then the folder still appears in tree view
  And the folder shows count badge "0"
  And expanding the folder shows no clusters
  And the folder is not automatically deleted

Scenario: Unhiding cluster restores folder position
  Given a cluster "eks-1" was in folder "Production" before being hidden
  When the user unhides "eks-1"
  Then "eks-1" reappears in folder "Production"
  And not at root level
  And the cluster order within the folder is preserved

Scenario: Hiding cluster preserves alias and folder
  Given a cluster "arn:aws:..." has alias "Prod EKS"
  And is located in folder "Production"
  When the user hides the cluster
  And then unhides it
  Then the alias "Prod EKS" is still present
  And the cluster is still in folder "Production"

Scenario: Cannot hide currently active cluster - warning
  Given a cluster "prod-eks" is the active kubectl context
  When the user attempts to hide "prod-eks"
  Then a warning dialog appears
  And the dialog states "This is your currently active cluster"
  And the dialog asks "Are you sure you want to hide it?"
  And options are "Hide Anyway" and "Cancel"

Scenario: Hiding active cluster with confirmation
  Given a cluster "prod-eks" is the active kubectl context
  When the user hides "prod-eks" and confirms the warning
  Then the cluster is hidden from tree view
  And kubectl context remains "prod-eks" (not changed)
  And the user can still run kubectl commands against "prod-eks"

Scenario: Bulk hide operation
  Given the user selects 5 clusters in Cluster Manager (future enhancement)
  When they click "Hide Selected" button
  Then all 5 clusters are hidden at once
  And the tree view updates to remove all 5
  And a single notification confirms "5 clusters hidden"

Scenario: Bulk show operation
  Given 5 clusters are currently hidden
  When the user selects all 5 hidden clusters
  And clicks "Show Selected" button
  Then all 5 clusters become visible
  And the tree view updates to show all 5
  And a notification confirms "5 clusters shown"

Scenario: Hidden indicator styling in Cluster Manager
  Given a cluster is hidden
  Then the cluster row has 50% opacity
  And a "Hidden" badge appears with gray background
  And the cluster name is shown in gray text
  And the row is still interactive (can click to edit)

Scenario: Visibility does not affect kubectl operations
  Given a cluster "test-cluster" is hidden from tree view
  When the user switches kubectl context to "test-cluster" externally
  Then kubectl commands still work normally
  And the cluster is still hidden in tree view
  And Cluster Manager shows "Active" badge on hidden cluster

Scenario: Search includes hidden clusters
  Given a cluster "test-cluster" is hidden
  When the user searches for "test" in Cluster Manager
  Then "test-cluster" appears in search results
  And the cluster is shown with "Hidden" badge
  And the user can unhide it from search results

Scenario: Export includes visibility settings
  Given some clusters are hidden
  When the user exports the configuration
  Then the exported JSON includes visibility settings
  And format is: `{ "clusters": { "context": { "hidden": true } } }`

Scenario: Import restores visibility settings
  Given an imported configuration has some clusters marked as hidden
  When the user imports the configuration
  Then matching clusters become hidden
  And the tree view updates accordingly

Scenario: Reset to defaults shows all clusters
  Given 3 clusters are hidden
  When the user clicks "Reset to Defaults"
  And confirms the reset
  Then all clusters become visible
  And the tree view shows all clusters
  And all visibility customizations are cleared

Scenario: Hidden status icon
  Given a cluster is hidden
  When displayed in Cluster Manager
  Then an eye-off icon appears next to the visibility switch
  When the cluster is visible
  Then an eye icon appears next to the visibility switch

Scenario: Quick toggle from context menu
  Given the user views a cluster in Cluster Manager
  When they right-click the cluster
  Then the context menu includes "Hide from Tree View"
  When they select this option
  Then the cluster is immediately hidden
  And the tree view updates without opening settings

Scenario: Visibility priority over folder deletion
  Given a folder contains only hidden clusters
  When the user deletes the folder
  Then the hidden clusters are not deleted
  And the clusters move to root level (still hidden)
  And the clusters can be unhidden later
```

