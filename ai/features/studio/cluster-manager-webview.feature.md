---
feature_id: cluster-manager-webview
name: Cluster Organizer Webview
description: Main webview interface for managing cluster customizations
spec_id:
  - cluster-manager-webview-spec
  - cluster-customization-storage-spec
---

# Cluster Organizer Webview

```gherkin
Feature: Cluster Organizer Webview

Background:
  Given the kube9 VS Code extension is installed and activated
  And the user has clusters configured in their kubeconfig

Scenario: Opening Cluster Organizer from Command Palette
  Given the user opens the VS Code Command Palette
  When they search for "Kube9: Cluster Organizer"
  And execute the command
  Then a webview panel opens with title "Cluster Organizer"
  And the webview displays all clusters from kubeconfig
  And clusters appear in a list with their original context names

Scenario: Cluster Organizer displays all clusters
  Given the user has 5 clusters in their kubeconfig
  When they open the Cluster Organizer
  Then all 5 clusters appear in the list
  And each cluster shows its original context name
  And each cluster has an edit icon for alias
  And each cluster has a visibility toggle switch
  And clusters without folders appear at root level

Scenario: Cluster Organizer shows current active cluster
  Given the user has "prod-eks" set as their current kubectl context
  When they open the Cluster Organizer
  Then the "prod-eks" cluster displays an "Active" badge
  And the badge uses a distinct color to stand out
  And other clusters do not have the Active badge

Scenario: Cluster Organizer displays existing customizations
  Given the user has previously customized their clusters
  And created folders "Production" and "Development"
  And assigned alias "Prod EKS" to cluster "arn:aws:eks:us-east-1:123:cluster/prod"
  And hidden cluster "test-cluster"
  When they open the Cluster Organizer
  Then folders "Production" and "Development" are visible
  And the aliased cluster displays "Prod EKS" as its name
  And "test-cluster" appears grayed out with "Hidden" badge

Scenario: Cluster Organizer supports theme switching
  Given the Cluster Organizer is open
  And VS Code is using light theme
  When the user switches VS Code to dark theme
  Then the Cluster Organizer updates to dark theme
  And all colors and icons adapt to dark theme
  And text remains readable

Scenario: Only one Cluster Organizer can be open
  Given the Cluster Organizer is already open
  When the user executes "Kube9: Cluster Organizer" again
  Then the existing Cluster Organizer panel is revealed and focused
  And no new panel is created
  And the panel shows the current state of customizations

Scenario: Cluster Organizer retains state when hidden
  Given the Cluster Organizer is open
  And the user has unsaved search text "production"
  When they switch to a different editor tab
  And the Cluster Organizer panel is hidden
  And they return to the Cluster Organizer panel
  Then the search text "production" is still present
  And filtered results are still displayed

Scenario: Cluster Organizer updates when kubeconfig changes
  Given the Cluster Organizer is open showing 3 clusters
  When a new cluster is added to kubeconfig externally
  Then the Cluster Organizer automatically updates
  And the new cluster appears in the list
  And the new cluster has default customizations (no folder, no alias, visible)

Scenario: Cluster Organizer toolbar displays action buttons
  Given the Cluster Organizer is open
  Then the toolbar displays a "New Folder" button
  And the toolbar displays a search input field
  And the toolbar displays an "Export" button
  And the toolbar displays an "Import" button
  And the toolbar displays a "Reset to Defaults" button

Scenario: Search filters clusters by name
  Given the Cluster Organizer displays 10 clusters
  And one cluster has alias "Production EKS"
  When the user types "production" in the search field
  Then only clusters matching "production" are visible
  And the cluster with alias "Production EKS" is visible
  And matching text is highlighted in results

Scenario: Search filters clusters by original context name
  Given the Cluster Organizer displays a cluster with alias "Prod"
  And the original context name is "arn:aws:eks:us-east-1:123:cluster/production"
  When the user types "arn:aws" in the search field
  Then the cluster with alias "Prod" appears in results
  And the original context name is shown in tooltip

Scenario: Clearing search shows all clusters again
  Given the user has filtered clusters using search
  And only 2 clusters are visible
  When they clear the search field
  Then all clusters become visible again
  And folders are restored to their previous state

Scenario: Cluster Organizer shows status footer
  Given the Cluster Organizer is open with 10 total clusters
  And 2 clusters are hidden
  And 8 clusters are visible
  Then the footer displays "8 visible / 10 total clusters"
  And the footer displays "2 hidden"

Scenario: Cluster Organizer handles empty kubeconfig
  Given the user has no clusters in their kubeconfig
  When they open the Cluster Organizer
  Then the webview displays a message "No clusters found in kubeconfig"
  And the message suggests adding clusters to kubeconfig
  And the toolbar and actions are still accessible

Scenario: Cluster Organizer handles corrupted customization configuration
  Given the stored customization configuration is corrupted
  When the user opens the Cluster Organizer
  Then an error notification appears
  And the notification offers "Reset to Defaults" option
  And the Cluster Organizer loads with default empty customizations
  And all clusters appear at root level without aliases

Scenario: Keyboard navigation in Cluster Organizer
  Given the Cluster Organizer is open with multiple clusters
  When the user presses Tab key
  Then focus moves to the first interactive element
  When they press Tab repeatedly
  Then focus cycles through toolbar buttons, search field, folders, and clusters
  When they press Enter on a focused folder
  Then the folder expands or collapses
  When they press Delete on a focused folder
  Then the delete confirmation dialog appears

Scenario: Cluster Organizer displays inactive clusters
  Given the user has customized a cluster "old-cluster"
  And "old-cluster" has been removed from kubeconfig
  When they open the Cluster Organizer
  Then "old-cluster" appears with an "Inactive" warning badge
  And the cluster is grayed out
  And a tooltip explains "This cluster is not in your kubeconfig"
  And the user can delete the inactive cluster manually
```







