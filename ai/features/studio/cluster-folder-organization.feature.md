---
feature_id: cluster-folder-organization
name: Cluster Folder Organization
description: Create and manage folders to organize clusters hierarchically
spec_id:
  - cluster-manager-webview-spec
  - cluster-customization-storage-spec
---

# Cluster Folder Organization

```gherkin
Feature: Cluster Folder Organization

Background:
  Given the Cluster Manager is open
  And the user has multiple clusters configured

Scenario: Creating a new root-level folder
  Given the user clicks the "New Folder" button
  When a folder creation dialog appears
  And they enter folder name "Production"
  And click "Create"
  Then a new folder "Production" appears in the list
  And the folder is expandable
  And the folder has no parent (root level)
  And the customization configuration is automatically saved

Scenario: Creating a nested folder
  Given a folder "AWS" exists at root level
  When the user selects the "AWS" folder
  And clicks "New Folder" button
  And enters folder name "Production"
  And clicks "Create"
  Then a new folder "Production" appears as a child of "AWS"
  And the folder is indented to show nesting
  And the parent folder "AWS" is expanded to show the child

Scenario: Folder name validation - empty name
  Given the user clicks "New Folder" button
  When they leave the folder name empty
  And attempt to create the folder
  Then an error message appears: "Folder name cannot be empty"
  And the folder is not created

Scenario: Folder name validation - duplicate name
  Given a folder "Production" already exists at root level
  When the user attempts to create another folder named "Production" at root level
  Then an error message appears: "A folder with this name already exists"
  And the folder is not created

Scenario: Folder name validation - duplicate in different parent
  Given a folder "Production" exists under "AWS"
  When the user creates a folder "Production" under "Azure"
  Then the folder is created successfully
  And both folders named "Production" exist under different parents

Scenario: Expanding and collapsing folders
  Given a folder "Production" contains 3 clusters
  And the folder is collapsed
  When the user clicks on the folder name
  Then the folder expands
  And the 3 clusters become visible
  When they click the folder name again
  Then the folder collapses
  And the clusters are hidden

Scenario: Renaming a folder
  Given a folder "Prod" exists
  When the user double-clicks on the folder name
  Then the folder name becomes editable
  When they change the name to "Production"
  And press Enter
  Then the folder name updates to "Production"
  And the customization configuration is automatically saved

Scenario: Renaming folder - canceling edit
  Given a folder "Production" is in edit mode
  When the user presses Escape key
  Then the folder name reverts to "Production"
  And edit mode is canceled
  And no changes are saved

Scenario: Deleting an empty folder
  Given a folder "Test" exists with no clusters inside
  When the user right-clicks the folder
  And selects "Delete Folder" from context menu
  Then the folder is deleted immediately
  And no confirmation dialog appears
  And the customization configuration is automatically saved

Scenario: Deleting a folder with clusters
  Given a folder "Development" contains 2 clusters
  When the user right-clicks the folder
  And selects "Delete Folder" from context menu
  Then a confirmation dialog appears
  And the dialog shows "This folder contains 2 clusters"
  And the dialog asks "Move clusters to root level or delete them?"
  And options are "Move to Root" and "Delete All"

Scenario: Deleting folder - move clusters to root
  Given a folder "Development" contains 2 clusters
  When the user deletes the folder
  And chooses "Move to Root" option
  Then the folder is deleted
  And the 2 clusters appear at root level
  And the clusters retain their aliases and visibility settings

Scenario: Deleting folder - delete clusters
  Given a folder "Development" contains 2 clusters
  When the user deletes the folder
  And chooses "Delete All" option
  Then the folder is deleted
  And the 2 clusters are removed from customizations
  And the clusters still appear in kubeconfig
  And the clusters show with default settings (no alias, visible, root level)

Scenario: Drag and drop cluster into folder
  Given a cluster "prod-eks" is at root level
  And a folder "Production" exists
  When the user drags "prod-eks" cluster
  And drops it onto "Production" folder
  Then "prod-eks" moves into "Production" folder
  And the folder expands to show the cluster
  And the tree view updates to show the cluster under the folder

Scenario: Drag and drop cluster between folders
  Given a cluster "prod-eks" is in "AWS" folder
  And a folder "Azure" exists
  When the user drags "prod-eks" cluster
  And drops it onto "Azure" folder
  Then "prod-eks" moves from "AWS" to "Azure" folder
  And "AWS" folder no longer contains "prod-eks"
  And "Azure" folder shows "prod-eks"

Scenario: Drag and drop cluster out of folder
  Given a cluster "prod-eks" is in "Production" folder
  When the user drags "prod-eks" cluster
  And drops it at root level (not on a folder)
  Then "prod-eks" moves to root level
  And "Production" folder no longer contains "prod-eks"

Scenario: Drag and drop visual feedback - valid target
  Given the user is dragging a cluster
  When they hover over a folder
  Then the folder shows a blue highlight border
  And the cursor shows a "move" icon
  And the folder slightly expands to indicate drop target

Scenario: Drag and drop visual feedback - invalid target
  Given the user is dragging a folder
  When they attempt to drop it on itself or its children
  Then the cursor shows a "no-drop" icon
  And the target shows a red border
  And the drop operation is prevented

Scenario: Reordering clusters within a folder
  Given a folder "Production" contains clusters in order: "eks-1", "eks-2", "eks-3"
  When the user drags "eks-3"
  And drops it before "eks-1"
  Then the clusters reorder to: "eks-3", "eks-1", "eks-2"
  And the tree view shows the new order
  And the order persists after reload

Scenario: Reordering folders at same level
  Given folders exist at root in order: "Production", "Development", "Test"
  When the user drags "Test" folder
  And drops it between "Production" and "Development"
  Then folders reorder to: "Production", "Test", "Development"
  And the new order persists across sessions

Scenario: Folder expansion state persists
  Given a folder "Production" is expanded
  When the user closes VS Code
  And reopens VS Code
  And opens the Cluster Manager
  Then the "Production" folder is still expanded

Scenario: Creating nested folder structure
  Given no folders exist
  When the user creates folder "Cloud Providers"
  And creates subfolder "AWS" under "Cloud Providers"
  And creates subfolder "Production" under "AWS"
  And creates subfolder "Staging" under "AWS"
  Then the hierarchy is displayed as:
    """
    📁 Cloud Providers
      📁 AWS
        📁 Production
        📁 Staging
    """
  And each level is properly indented

Scenario: Maximum nesting depth
  Given folders are nested 5 levels deep
  When the user attempts to create a folder at the 6th level
  Then an error message appears: "Maximum folder depth reached (5 levels)"
  And the folder is not created

Scenario: Folder icon reflects state
  Given a folder "Production" is collapsed
  Then the folder shows a collapsed arrow icon (▶)
  When the folder is expanded
  Then the folder shows an expanded arrow icon (▼)

Scenario: Folder context menu options
  Given a folder "Production" exists
  When the user right-clicks the folder
  Then the context menu displays:
    | Rename Folder      |
    | New Subfolder      |
    | Delete Folder      |
    | Expand All         |
    | Collapse All       |

Scenario: Expand all subfolders
  Given a folder "Production" has 2 subfolders, each with their own subfolders
  And all subfolders are collapsed
  When the user right-clicks "Production"
  And selects "Expand All"
  Then "Production" and all its subfolders expand recursively

Scenario: Collapse all subfolders
  Given a folder "Production" has 2 subfolders, both expanded
  When the user right-clicks "Production"
  And selects "Collapse All"
  Then all subfolders collapse
  And only "Production" remains expanded

Scenario: Tree view synchronizes with folder changes
  Given the tree view is visible
  And the Cluster Manager is open
  When the user creates a new folder "Production" in Cluster Manager
  Then the tree view automatically refreshes
  And the "Production" folder appears in the tree view

Scenario: Tree view displays folders with clusters
  Given a folder "Production" contains clusters "eks-1" and "eks-2"
  When the user views the tree view
  Then the "Production" folder appears as an expandable item
  When they expand "Production" in the tree view
  Then "eks-1" and "eks-2" appear under the folder
  And clicking on clusters opens their details as usual
```

