---
feature_id: argocd-tree-view
spec_id: [argocd-service-spec, tree-view-spec]
context_id: [kubernetes-cluster-management, vscode-extension-development]
---

# ArgoCD Tree View Integration Feature

## Overview

The VS Code extension displays ArgoCD Applications in the cluster tree view when ArgoCD is detected. The "ArgoCD Applications" category appears in the tree with an application count badge, and each application shows sync status (Synced/OutOfSync) and health status (Healthy/Degraded/Progressing) with visual indicators. Users can interact with applications through context menu actions.

## Behavior

```gherkin
Feature: ArgoCD Tree View Integration

Background:
  Given the VS Code extension is connected to a Kubernetes cluster
  And ArgoCD is detected as installed in the cluster
  And the extension can query ArgoCD Application CRDs using kubectl

Scenario: Extension shows ArgoCD Applications category when ArgoCD detected
  Given ArgoCD is detected in the cluster
  When the user expands the cluster in the tree view
  Then the extension should display "ArgoCD Applications" category
  And the category should appear after "Configuration" and before "Custom Resources"
  And the category should show an ArgoCD icon
  And the category should be collapsible

Scenario: Extension hides ArgoCD Applications category when ArgoCD not detected
  Given ArgoCD is NOT detected in the cluster
  When the user expands the cluster in the tree view
  Then the extension should NOT display "ArgoCD Applications" category
  And the standard categories should appear without ArgoCD section

Scenario: Extension displays application count badge on ArgoCD category
  Given ArgoCD is detected in the cluster
  And there are 5 ArgoCD Applications in the cluster
  When the user views the tree
  Then the "ArgoCD Applications" category should show "(5)" badge
  And the badge should display the total application count
  And the badge should update when applications are added or removed

Scenario: Extension displays zero applications badge
  Given ArgoCD is detected in the cluster
  And there are 0 ArgoCD Applications in the cluster
  When the user views the tree
  Then the "ArgoCD Applications" category should show "(0)" badge
  And expanding the category should show "No applications found" message

Scenario: Extension queries ArgoCD Applications when category expanded
  Given the "ArgoCD Applications" category is visible
  When the user expands the category
  Then the extension should execute kubectl get applications.argoproj.io -n <argocd-namespace> -o json
  And the extension should parse the Application CRD resources
  And the extension should display application list items
  And the extension should cache results for 30 seconds

Scenario: Extension displays application with Synced and Healthy status
  Given the user has expanded "ArgoCD Applications" category
  And an application named "guestbook" exists
  And status.sync.status is "Synced"
  And status.health.status is "Healthy"
  When the extension displays the application
  Then the application should show "guestbook"
  And the application should show a green checkmark icon
  And the description should show "Synced, Healthy"
  And the application should be clickable

Scenario: Extension displays application with OutOfSync and Degraded status
  Given the user has expanded "ArgoCD Applications" category
  And an application named "api-service" exists
  And status.sync.status is "OutOfSync"
  And status.health.status is "Degraded"
  When the extension displays the application
  Then the application should show "api-service"
  And the application should show a warning icon (yellow/orange)
  And the description should show "OutOfSync, Degraded"
  And the icon should visually indicate attention needed

Scenario: Extension displays application with Synced and Progressing status
  Given the user has expanded "ArgoCD Applications" category
  And an application named "frontend" exists
  And status.sync.status is "Synced"
  And status.health.status is "Progressing"
  When the extension displays the application
  Then the application should show "frontend"
  And the application should show a blue progress icon
  And the description should show "Synced, Progressing"

Scenario: Extension displays application with Unknown status
  Given the user has expanded "ArgoCD Applications" category
  And an application named "backend" exists
  And status.sync.status is "Unknown"
  And status.health.status is "Unknown"
  When the extension displays the application
  Then the application should show "backend"
  And the application should show a question mark icon
  And the description should show "Unknown, Unknown"

Scenario: Extension sorts applications alphabetically
  Given the user has expanded "ArgoCD Applications" category
  And applications exist: "zebra-app", "alpha-app", "beta-app"
  When the extension displays the application list
  Then the applications should be sorted: "alpha-app", "beta-app", "zebra-app"
  And the sort should be case-insensitive

Scenario: Extension displays application tooltip with details
  Given the user has expanded "ArgoCD Applications" category
  And an application named "guestbook" is visible
  When the user hovers over the application
  Then the tooltip should display:
    | Name: guestbook |
    | Namespace: argocd |
    | Sync Status: Synced |
    | Health Status: Healthy |
    | Target Revision: main |
    | Current Revision: abc123d (first 7 chars) |
    | Last Sync: 2025-12-08 10:30 AM |

Scenario: Extension shows context menu on right-click
  Given the user has expanded "ArgoCD Applications" category
  And an application named "guestbook" is visible
  When the user right-clicks on the application
  Then a context menu should appear with options:
    | View Details |
    | Sync |
    | Refresh |
    | Hard Refresh |
    | Copy Name |
    | Copy Namespace |

Scenario: User opens application details from tree item click
  Given the user has expanded "ArgoCD Applications" category
  And an application named "guestbook" is visible
  When the user clicks on the application
  Then the extension should open the ArgoCD Application webview
  And the webview should display details for "guestbook"
  And the webview should show Overview tab by default

Scenario: User opens application details from context menu
  Given the user has expanded "ArgoCD Applications" category
  And an application named "guestbook" is visible
  When the user right-clicks on the application
  And selects "View Details"
  Then the extension should open the ArgoCD Application webview
  And the webview should display details for "guestbook"

Scenario: User triggers sync from context menu
  Given the user has expanded "ArgoCD Applications" category
  And an application named "api-service" is visible
  And status.sync.status is "OutOfSync"
  When the user right-clicks on the application
  And selects "Sync"
  Then the extension should execute kube9.argocd.sync command
  And a progress notification should show "Syncing api-service..."
  And the extension should patch the Application CRD to trigger sync

Scenario: User triggers refresh from context menu
  Given the user has expanded "ArgoCD Applications" category
  And an application named "guestbook" is visible
  When the user right-clicks on the application
  And selects "Refresh"
  Then the extension should execute kube9.argocd.refresh command
  And a notification should show "Refreshing guestbook..."
  And the extension should patch the Application CRD to trigger refresh

Scenario: User triggers hard refresh from context menu
  Given the user has expanded "ArgoCD Applications" category
  And an application named "guestbook" is visible
  When the user right-clicks on the application
  And selects "Hard Refresh"
  Then the extension should execute kube9.argocd.hardRefresh command
  And a confirmation dialog should appear
  And the dialog should warn "Hard refresh will clear cache and may take longer"

Scenario: User copies application name from context menu
  Given the user has expanded "ArgoCD Applications" category
  And an application named "guestbook" is visible
  When the user right-clicks on the application
  And selects "Copy Name"
  Then "guestbook" should be copied to the clipboard
  And a brief notification should show "Copied: guestbook"

Scenario: User copies application namespace from context menu
  Given the user has expanded "ArgoCD Applications" category
  And an application named "guestbook" is visible in namespace "argocd"
  When the user right-clicks on the application
  And selects "Copy Namespace"
  Then "argocd" should be copied to the clipboard
  And a brief notification should show "Copied: argocd"

Scenario: Extension refreshes tree after sync operation
  Given the user has triggered sync on "api-service"
  And the sync operation completes successfully
  When the extension receives sync completion
  Then the extension should automatically refresh the ArgoCD Applications category
  And the extension should update the application's status
  And the application's icon and description should update to reflect new status

Scenario: Extension shows sync progress in tree item
  Given the user has triggered sync on "api-service"
  When the sync operation is in progress
  Then the application tree item should show a progress indicator
  And the description should show "Syncing..."
  And the icon should show a syncing animation or indicator

Scenario: Extension handles application query failures gracefully
  Given the user expands "ArgoCD Applications" category
  When kubectl get applications.argoproj.io fails with error
  Then the extension should display error message in tree
  And the error should show "Failed to load ArgoCD Applications"
  And the extension should suggest manual refresh
  And the extension should log the error for debugging

Scenario: Extension handles RBAC permission denied for applications
  Given the user expands "ArgoCD Applications" category
  When kubectl get applications.argoproj.io fails with Forbidden error
  Then the extension should display permission error message
  And the message should show "Permission denied: Cannot list ArgoCD Applications"
  And the message should suggest checking RBAC permissions

Scenario: Extension caches application list for performance
  Given the user has expanded "ArgoCD Applications" category
  And the application list was loaded 10 seconds ago
  When the user collapses and re-expands the category
  Then the extension should use cached application list
  And the extension should not make a new kubectl query
  And the cache should be valid for 30 seconds

Scenario: Extension bypasses cache on manual refresh
  Given the "ArgoCD Applications" category has cached data
  When the user manually refreshes the tree view
  Then the extension should bypass the cache
  And the extension should make a fresh kubectl query
  And the extension should update all application status
  And the extension should update the application count badge

Scenario: Extension shows applications from custom ArgoCD namespace
  Given ArgoCD is installed in namespace "gitops"
  And operatorStatus.argocd.namespace is "gitops"
  When the user expands "ArgoCD Applications" category
  Then the extension should query applications in "gitops" namespace
  And the extension should execute kubectl get applications.argoproj.io -n gitops
  And applications should display correctly

Scenario: Extension handles application in terminating state
  Given the user has expanded "ArgoCD Applications" category
  And an application "old-app" has metadata.deletionTimestamp set
  When the extension displays the application
  Then the application should show a terminating icon
  And the description should show "Terminating"
  And the context menu should have limited options

Scenario: Extension shows suspended application status
  Given the user has expanded "ArgoCD Applications" category
  And an application named "paused-app" exists
  And status.health.status is "Suspended"
  When the extension displays the application
  Then the application should show a pause icon
  And the description should show "Synced, Suspended" or "OutOfSync, Suspended"

Scenario: Extension shows missing application status
  Given the user has expanded "ArgoCD Applications" category
  And an application named "broken-app" exists
  And status.health.status is "Missing"
  When the extension displays the application
  Then the application should show an error icon
  And the description should show "Missing"
  And the icon should indicate critical issue

Scenario: Extension displays multi-namespace applications count correctly
  Given ArgoCD Applications exist in multiple namespaces
  And there are 3 applications in "argocd" namespace
  And there are 2 applications in "argocd-prod" namespace
  When the extension displays the ArgoCD category
  Then the category should show total count from all namespaces
  And applications from all namespaces should be listed
  And each application should show its namespace in tooltip

Scenario: Extension handles no applications found scenario
  Given ArgoCD is detected and installed
  And there are no ArgoCD Applications in any namespace
  When the user expands "ArgoCD Applications" category
  Then the extension should show "No applications found" item
  And the item should be non-clickable
  And the item should use a subdued style

Scenario: Extension preserves tree expansion state after sync
  Given the user has "ArgoCD Applications" category expanded
  And applications "app1", "app2", "app3" are visible
  When the user syncs "app2"
  And the tree refreshes automatically
  Then the "ArgoCD Applications" category should remain expanded
  And all applications should remain visible
  And the user should not need to re-expand the category
```

## Integration Points

- **Clusters Tree Provider**: Main tree view component showing ArgoCD category
- **ArgoCDService**: Service that queries Application CRDs and provides data
- **Context Menus**: Right-click actions for applications
- **Webview Panel**: Application details view opened from tree items
- **kubectl Commands**: Query and patch ArgoCD Application CRDs
- **Icon Service**: Provides status-specific icons for applications

## Status Icon Mapping

| Sync Status | Health Status | Icon | Color |
|------------|---------------|------|-------|
| Synced | Healthy | Checkmark | Green |
| Synced | Progressing | Progress | Blue |
| OutOfSync | Degraded | Warning | Orange/Yellow |
| OutOfSync | Healthy | Warning | Yellow |
| * | Missing | Error | Red |
| * | Suspended | Pause | Gray |
| Unknown | Unknown | Question | Gray |

## Non-Goals

- Application creation or deletion from tree view
- Inline editing of application manifests
- Application grouping or filtering (all apps shown)
- Historical sync status or trends
- Real-time application status updates (polling-based only)

