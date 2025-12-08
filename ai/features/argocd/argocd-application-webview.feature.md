---
feature_id: argocd-application-webview
spec_id: [argocd-webview-spec, argocd-status-spec]
context_id: [kubernetes-cluster-management, vscode-extension-development]
---

# ArgoCD Application Webview Feature

## Overview

The ArgoCD Application webview provides a detailed panel showing comprehensive information about a selected ArgoCD Application. The webview has two tabs: Overview (showing metadata, sync/health status, and Git information) and Drift Details (showing resource-level sync status and out-of-sync resources). Users can perform actions like sync and refresh, and navigate to related Kubernetes resources in the tree view.

## Behavior

```gherkin
Feature: ArgoCD Application Webview

Background:
  Given the VS Code extension is connected to a Kubernetes cluster
  And ArgoCD is detected in the cluster
  And the user has access to ArgoCD Applications

Scenario: User opens application webview from tree view
  Given the user has expanded "ArgoCD Applications" category
  And an application named "guestbook" is visible
  When the user clicks on the application
  Then a webview panel should open
  And the panel title should show "ArgoCD: guestbook"
  And the Overview tab should be selected by default
  And the webview should load application details

Scenario: Webview Overview tab displays application metadata
  Given the application webview is open for "guestbook"
  And the Overview tab is selected
  Then the webview should display:
    | Section | Content |
    | Application Name | guestbook |
    | Namespace | argocd |
    | Project | default |
    | Created | 2025-12-01 09:00 AM |
    | Cluster | https://kubernetes.default.svc |
    | Destination Namespace | default |

Scenario: Webview Overview tab displays sync status information
  Given the application webview is open for "guestbook"
  And the Overview tab is selected
  And status.sync.status is "Synced"
  And status.sync.revision is "abc123def456"
  And spec.source.targetRevision is "main"
  And status.operationState.finishedAt is "2025-12-08T10:30:00Z"
  Then the webview should display sync status section:
    | Sync Status | Synced (with green checkmark icon) |
    | Current Revision | abc123d (first 7 chars, clickable to copy full SHA) |
    | Target Revision | main |
    | Last Sync | 2 hours ago (human-readable) |
    | Sync Result | Successful |

Scenario: Webview Overview tab displays OutOfSync status
  Given the application webview is open for "api-service"
  And the Overview tab is selected
  And status.sync.status is "OutOfSync"
  Then the sync status should show "OutOfSync" with warning icon
  And the icon color should be orange or yellow
  And a "Sync Now" button should be prominently displayed

Scenario: Webview Overview tab displays health status information
  Given the application webview is open for "guestbook"
  And the Overview tab is selected
  And status.health.status is "Healthy"
  Then the webview should display health status section:
    | Health Status | Healthy (with green heart icon) |
    | Health Message | All resources are healthy |

Scenario: Webview Overview tab displays Degraded health status
  Given the application webview is open for "api-service"
  And the Overview tab is selected
  And status.health.status is "Degraded"
  And status.health.message is "Deployment has insufficient replicas"
  Then the health status should show "Degraded" with error icon
  And the health message should display "Deployment has insufficient replicas"
  And the message should be styled to indicate attention needed

Scenario: Webview Overview tab displays Progressing health status
  Given the application webview is open for "frontend"
  And the Overview tab is selected
  And status.health.status is "Progressing"
  Then the health status should show "Progressing" with progress icon
  And the icon should indicate ongoing work

Scenario: Webview Overview tab displays Git source information
  Given the application webview is open for "guestbook"
  And the Overview tab is selected
  And spec.source.repoURL is "https://github.com/argoproj/argocd-example-apps"
  And spec.source.path is "guestbook"
  And spec.source.targetRevision is "main"
  Then the webview should display source information:
    | Repository | https://github.com/argoproj/argocd-example-apps (clickable link) |
    | Path | guestbook |
    | Target Revision | main |

Scenario: User clicks repository URL to open in browser
  Given the application webview is open
  And the repository URL is displayed as a link
  When the user clicks the repository URL
  Then the URL should open in the default web browser
  And the user should see the Git repository

Scenario: User clicks to copy full Git revision SHA
  Given the application webview is open for "guestbook"
  And the current revision shows "abc123d" (truncated)
  When the user clicks on the revision
  Then the full SHA "abc123def456789abcdef123456789abcdef0123" should be copied to clipboard
  And a notification should show "Copied full revision SHA"

Scenario: Webview displays action buttons in Overview tab
  Given the application webview is open for "guestbook"
  And the Overview tab is selected
  Then the webview should display action buttons:
    | Sync | Primary button |
    | Refresh | Secondary button |
    | Hard Refresh | Secondary button |
    | View in Tree | Link button |

Scenario: User triggers sync from Overview tab
  Given the application webview is open for "api-service"
  And status.sync.status is "OutOfSync"
  When the user clicks the "Sync" button
  Then a sync operation should be initiated
  And the button should change to "Syncing..." with disabled state
  And a progress indicator should appear
  And the webview should update when sync completes

Scenario: User triggers refresh from Overview tab
  Given the application webview is open for "guestbook"
  When the user clicks the "Refresh" button
  Then a refresh operation should be initiated
  And the button should show "Refreshing..." with disabled state
  And the application status should update when refresh completes

Scenario: User triggers hard refresh from Overview tab
  Given the application webview is open for "guestbook"
  When the user clicks the "Hard Refresh" button
  Then a confirmation dialog should appear
  And the dialog should warn "Hard refresh will clear cache. Continue?"
  And if confirmed, a hard refresh operation should be initiated

Scenario: User clicks "View in Tree" to navigate to tree view
  Given the application webview is open for "guestbook"
  When the user clicks "View in Tree" button
  Then the focus should switch to the tree view
  And the "ArgoCD Applications" category should expand
  And the "guestbook" application should be revealed and highlighted

Scenario: User switches to Drift Details tab
  Given the application webview is open for "guestbook"
  And the Overview tab is currently selected
  When the user clicks on the "Drift Details" tab
  Then the tab should switch to Drift Details
  And the drift details content should load
  And the tab should visually indicate it is active

Scenario: Drift Details tab displays resource-level sync status
  Given the application webview is open for "guestbook"
  And the Drift Details tab is selected
  And the application has 5 managed resources
  Then the webview should display a table with columns:
    | Kind | Name | Namespace | Sync Status | Health Status |
  And each resource should be listed in the table

Scenario: Drift Details tab shows all resources synced
  Given the application webview is open for "guestbook"
  And the Drift Details tab is selected
  And all resources have syncStatus "Synced"
  Then each resource row should show:
    | Deployment | guestbook-ui | default | Synced (green) | Healthy |
    | Service | guestbook-ui | default | Synced (green) | Healthy |
  And no out-of-sync warning should be shown

Scenario: Drift Details tab highlights out-of-sync resources
  Given the application webview is open for "api-service"
  And the Drift Details tab is selected
  And one resource has syncStatus "OutOfSync"
  Then the out-of-sync resource should be highlighted
  And the row should have a warning background color
  And the sync status should show "OutOfSync" with warning icon

Scenario: Drift Details tab displays out-of-sync summary
  Given the application webview is open for "api-service"
  And the Drift Details tab is selected
  And 2 out of 6 resources are out-of-sync
  Then the webview should display summary:
    | 2 resources out of sync |
    | 4 resources synced |
  And the summary should be prominent at the top

Scenario: Drift Details tab shows resource sync message
  Given the application webview is open for "api-service"
  And the Drift Details tab is selected
  And a Deployment is out-of-sync
  And the resource has message "Replicas mismatch: live 2, target 3"
  Then the resource row should be expandable
  And expanding should show the sync message
  And the message should be displayed in a code or pre-formatted style

Scenario: User expands resource to see sync details
  Given the application webview is open for "api-service"
  And the Drift Details tab is selected
  And a resource row is visible
  When the user clicks the expand icon on the row
  Then the row should expand to show details
  And the details should include:
    | Sync Message | (if out-of-sync) |
    | Health Message | (if degraded) |
    | Last Sync | timestamp |

Scenario: User navigates to Kubernetes resource from drift table
  Given the application webview is open for "guestbook"
  And the Drift Details tab is selected
  And a resource "guestbook-ui" of kind "Deployment" is shown
  When the user clicks on the resource name
  Then the tree view should navigate to that resource
  And the Workloads > Deployments category should expand
  And the "guestbook-ui" deployment should be revealed and highlighted

Scenario: Drift Details tab shows no resources message
  Given the application webview is open for "empty-app"
  And the Drift Details tab is selected
  And the application has no managed resources
  Then the webview should display "No resources found"
  And the message should be centered and subdued

Scenario: Drift Details tab filters to show only out-of-sync resources
  Given the application webview is open for "api-service"
  And the Drift Details tab is selected
  And there are both synced and out-of-sync resources
  When the user enables "Show only out-of-sync" filter
  Then only out-of-sync resources should be displayed
  And the resource count should update to show filtered count

Scenario: Webview updates when application status changes
  Given the application webview is open for "api-service"
  And the user triggers a sync operation from the webview
  When the sync operation completes
  Then the Overview tab should update to show new sync status
  And the Drift Details tab should update to show new resource status
  And the webview should not require manual refresh

Scenario: Webview shows loading state while fetching data
  Given the user opens application webview for "guestbook"
  When the webview is loading application details
  Then a loading spinner should be displayed
  And the message "Loading application details..." should show
  And action buttons should be disabled during loading

Scenario: Webview displays error when application not found
  Given the user opens application webview for "deleted-app"
  And the application no longer exists in the cluster
  When the webview attempts to load details
  Then an error message should display "Application not found"
  And the error should suggest the application may have been deleted
  And a "Close" button should be provided

Scenario: Webview displays error when fetch fails
  Given the application webview is open for "guestbook"
  When kubectl get application fails with network error
  Then an error message should display "Failed to load application details"
  And a "Retry" button should be provided
  And clicking retry should attempt to reload the data

Scenario: Webview handles RBAC permission errors
  Given the user opens application webview for "guestbook"
  When kubectl get application fails with Forbidden error
  Then an error message should display "Permission denied"
  And the message should explain "You don't have permission to view this application"
  And no action buttons should be available

Scenario: Webview persists tab selection across reopens
  Given the user has opened webview for "guestbook"
  And switched to Drift Details tab
  When the user closes and reopens the webview for "guestbook"
  Then the Drift Details tab should be selected by default
  And the user's last tab preference should be remembered

Scenario: Webview respects VS Code theme
  Given the application webview is open
  When VS Code is using dark theme
  Then the webview should use dark color scheme
  And text should be readable with appropriate contrast
  When VS Code is using light theme
  Then the webview should use light color scheme

Scenario: Webview displays sync operation progress
  Given the application webview is open for "api-service"
  And the user triggers a sync
  When the sync is in progress
  Then a progress bar should be visible
  And status messages should update: "Syncing resources...", "Applying changes..."
  And the current sync phase should be displayed

Scenario: Webview shows last sync operation details
  Given the application webview is open for "guestbook"
  And the Overview tab is selected
  And status.operationState exists
  Then the webview should display last operation section:
    | Operation | Sync |
    | Started | 10:30 AM |
    | Finished | 10:31 AM |
    | Duration | 1 minute 23 seconds |
    | Result | Successful |
    | Message | (if any) |

Scenario: Webview shows sync operation failure details
  Given the application webview is open for "failed-app"
  And the last sync operation failed
  And status.operationState.message contains error details
  Then the webview should display operation failure prominently
  And the error message should be shown in a visible error box
  And the message should be formatted for readability
```

## Integration Points

- **ArgoCD Service**: Provides application details and resource-level status
- **Tree View**: Navigation target when "View in Tree" is clicked
- **Webview Panel**: VS Code webview component hosting the UI
- **Command Handlers**: Sync, Refresh, Hard Refresh actions
- **kubectl Commands**: Query application CRDs and patch for operations
- **Theme Service**: Respects VS Code theme for styling

## Webview Tab Structure

### Overview Tab
- Application Metadata (name, namespace, project, created date)
- Sync Status (status, current revision, target revision, last sync)
- Health Status (status, message)
- Git Source Information (repository URL, path, target revision)
- Action Buttons (Sync, Refresh, Hard Refresh, View in Tree)
- Last Operation Details (if available)

### Drift Details Tab
- Out-of-Sync Summary (if applicable)
- Resource Table (Kind, Name, Namespace, Sync Status, Health Status)
- Expandable Resource Details (sync message, health message)
- Filter: "Show only out-of-sync" toggle
- Navigation links to Kubernetes resources

## Non-Goals

- Inline YAML editing of applications
- Application creation or deletion from webview
- Rollback to previous revisions
- Manual resource synchronization selection
- Application logs or events display
- Real-time sync progress streaming (polling-based updates only)

