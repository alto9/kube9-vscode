---
feature_id: cluster-alias-management
name: Cluster Alias Management
description: Assign friendly alias names to clusters for improved readability
spec_id:
  - cluster-manager-webview-spec
  - cluster-customization-storage-spec
---

# Cluster Alias Management

```gherkin
Feature: Cluster Alias Management

Background:
  Given the Cluster Organizer is open
  And the user has clusters configured

Scenario: Setting an alias for a cluster
  Given a cluster with context name "arn:aws:eks:us-east-1:123456789:cluster/prod-eks"
  When the user clicks the edit icon next to the cluster
  Then an inline text input appears
  And the input is pre-filled with the current name
  When they enter "Production EKS East"
  And press Enter
  Then the cluster displays "Production EKS East" as its name
  And the customization is automatically saved
  And the tree view updates to show the alias

Scenario: Viewing original context name via tooltip
  Given a cluster has alias "Prod EKS"
  And the original context name is "arn:aws:eks:us-east-1:123456789:cluster/prod-eks"
  When the user hovers over the cluster name in Cluster Organizer
  Then a tooltip appears
  And the tooltip displays "Original: arn:aws:eks:us-east-1:123456789:cluster/prod-eks"

Scenario: Viewing original context name in tree view
  Given a cluster has alias "Prod EKS" in the tree view
  When the user hovers over "Prod EKS" in the tree view
  Then a tooltip displays the original context name
  And the tooltip shows "Context: arn:aws:eks:us-east-1:123456789:cluster/prod-eks"

Scenario: Removing an alias
  Given a cluster has alias "Prod EKS"
  When the user clicks the edit icon
  And clears the text field (makes it empty)
  And presses Enter
  Then the cluster displays its original context name
  And the alias is removed from customizations
  And the tree view shows the original context name

Scenario: Canceling alias edit
  Given a cluster has alias "Prod EKS"
  When the user clicks the edit icon
  And changes the text to "Production"
  But presses Escape before confirming
  Then the alias remains "Prod EKS"
  And the edit is canceled
  And no changes are saved

Scenario: Alias length validation
  Given the user is editing a cluster alias
  When they enter an alias longer than 100 characters
  And attempt to save
  Then an error message appears: "Alias must be 100 characters or less"
  And the alias is not saved
  And the input field shows the error state

Scenario: Alias supports unicode characters
  Given the user is editing a cluster alias
  When they enter "生产环境 (Production)" with Chinese characters
  And press Enter
  Then the alias is saved successfully
  And the cluster displays "生产环境 (Production)"
  And unicode characters render correctly

Scenario: Alias supports special characters
  Given the user is editing a cluster alias
  When they enter "Prod-EKS (US-East-1) 🚀"
  And press Enter
  Then the alias is saved successfully
  And special characters and emoji render correctly

Scenario: Multiple clusters can have same alias
  Given two clusters: "cluster-1" and "cluster-2"
  When the user sets alias "Production" for "cluster-1"
  And sets alias "Production" for "cluster-2"
  Then both clusters display "Production" as their name
  And tooltips show different original context names
  And no error or warning is shown

Scenario: Alias persists across sessions
  Given a cluster has alias "Prod EKS"
  When the user closes the Cluster Organizer
  And closes VS Code
  And reopens VS Code
  And opens the Cluster Organizer
  Then the cluster still displays alias "Prod EKS"

Scenario: Alias updates in tree view immediately
  Given the tree view is open and visible
  And a cluster "arn:aws:eks:..." is displayed in the tree
  When the user sets alias "Prod EKS" in Cluster Organizer
  Then the tree view updates immediately
  And the cluster in the tree view displays "Prod EKS"
  And no manual refresh is required

Scenario: Searching by alias
  Given a cluster has original name "arn:aws:eks:us-east-1:123:cluster/production"
  And the cluster has alias "Prod EKS East"
  When the user searches for "Prod EKS"
  Then the cluster appears in search results
  And the alias "Prod EKS East" is highlighted

Scenario: Searching by original name still works with alias
  Given a cluster has alias "Prod EKS"
  And original name "arn:aws:eks:us-east-1:123:cluster/production"
  When the user searches for "arn:aws"
  Then the cluster appears in search results
  And the alias "Prod EKS" is displayed
  And the tooltip shows the matched original name

Scenario: Alias shown in folder organization
  Given a cluster has alias "Prod EKS"
  And the cluster is in folder "Production"
  When the user views the folder contents
  Then the cluster displays as "Prod EKS"
  And not the original context name

Scenario: Batch alias editing
  Given the user has 10 clusters without aliases
  When they click a "Batch Edit" button (future enhancement)
  Then a dialog appears showing all 10 clusters
  And each cluster has an alias input field
  And they can enter aliases for multiple clusters
  And clicking "Save All" saves all aliases at once

Scenario: Importing aliases via configuration
  Given a JSON configuration file with aliases defined
  When the user imports the configuration
  Then all aliases from the file are applied to matching clusters
  And existing aliases are overwritten by imported ones
  And clusters not in the import keep their current aliases

Scenario: Exporting aliases
  Given several clusters have aliases configured
  When the user exports the configuration
  Then the exported JSON includes all alias mappings
  And the format is: `{ "clusters": { "context-name": { "alias": "Friendly Name" } } }`

Scenario: Alias edit focus behavior
  Given the user clicks edit icon for cluster "eks-1"
  And the input field appears
  When they click edit icon for cluster "eks-2" without saving "eks-1"
  Then the "eks-1" edit is auto-saved
  And the "eks-2" edit mode opens
  And both edits persist

Scenario: Alias with leading/trailing whitespace
  Given the user is editing an alias
  When they enter "  Prod EKS  " with leading and trailing spaces
  And press Enter
  Then the alias is automatically trimmed to "Prod EKS"
  And no extra whitespace is saved

Scenario: Empty alias treated as removal
  Given a cluster has alias "Prod EKS"
  When the user edits the alias to be empty
  Or enters only whitespace "   "
  And confirms the change
  Then the alias is removed
  And the cluster shows its original context name

Scenario: Alias displayed in Quick Pick dialogs
  Given a cluster has alias "Prod EKS"
  When VS Code shows a cluster picker dialog
  Then the cluster appears as "Prod EKS" in the list
  And the original context name is shown as description
  And selecting the item uses the original context name for kubectl commands

Scenario: Alias does not affect kubectl commands
  Given a cluster has alias "Prod EKS"
  And original context name "arn:aws:eks:us-east-1:123:cluster/prod"
  When the extension runs kubectl commands
  Then kubectl uses "arn:aws:eks:us-east-1:123:cluster/prod" as context
  And not the alias "Prod EKS"
  And commands execute correctly

Scenario: Icon next to aliased cluster
  Given a cluster has an alias
  When displayed in the Cluster Organizer
  Then a small edit icon appears next to the name
  And hovering the icon shows tooltip "Click to edit alias"
  And the icon is always visible (not only on hover)
```








