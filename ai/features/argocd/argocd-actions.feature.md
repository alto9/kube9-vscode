---
feature_id: argocd-actions
spec_id: [argocd-service-spec]
context_id: [kubernetes-cluster-management, vscode-extension-development]
---

# ArgoCD Application Actions Feature

## Overview

The VS Code extension provides actions to interact with ArgoCD Applications directly from the tree view and webview panel. Users can sync applications (to apply Git changes), refresh application state (to detect cluster changes), and perform hard refresh (to bypass cache). All actions execute via kubectl commands that patch the Application CRD to trigger ArgoCD controller operations.

## Behavior

```gherkin
Feature: ArgoCD Application Actions

Background:
  Given the VS Code extension is connected to a Kubernetes cluster
  And ArgoCD is detected in the cluster
  And the user has access to ArgoCD Applications

Scenario: User executes sync action on out-of-sync application
  Given an application named "api-service" exists
  And status.sync.status is "OutOfSync"
  When the user triggers sync action
  Then the extension should execute kube9.argocd.sync command
  And the extension should create an operation annotation on the Application CRD
  And a progress notification should show "Syncing api-service..."
  And the operation should be tracked until completion

Scenario: Sync action patches Application CRD with operation annotation
  Given the user triggers sync on "api-service"
  When the extension executes the sync operation
  Then the extension should run kubectl patch command
  And the patch should add metadata.annotations["argocd.argoproj.io/refresh"]
  And the annotation value should be "normal"
  And ArgoCD controller should detect the annotation and initiate sync

Scenario: Sync operation completes successfully
  Given the user has triggered sync on "api-service"
  And the sync operation is in progress
  When ArgoCD completes the sync successfully
  Then a success notification should show "Successfully synced api-service"
  And the tree view should automatically refresh
  And the application status should update to "Synced"
  And the application icon should change to synced indicator

Scenario: Sync operation fails with error
  Given the user has triggered sync on "api-service"
  And the sync operation is in progress
  When ArgoCD sync fails with error
  And status.operationState.message contains "Failed to apply manifest"
  Then an error notification should show "Sync failed: Failed to apply manifest"
  And the tree view should refresh to show failed state
  And the user should see error details in the application webview

Scenario: User executes sync action on already-synced application
  Given an application named "guestbook" exists
  And status.sync.status is "Synced"
  When the user triggers sync action
  Then the extension should execute the sync normally
  And a notification should show "Syncing guestbook..."
  And the sync should proceed (may be no-op if nothing changed)

Scenario: User executes refresh action
  Given an application named "guestbook" exists
  When the user triggers refresh action
  Then the extension should execute kube9.argocd.refresh command
  And the extension should patch the Application CRD
  And the patch should add annotation argocd.argoproj.io/refresh
  And a notification should show "Refreshing guestbook..."

Scenario: Refresh action updates application state without sync
  Given the user has triggered refresh on "guestbook"
  When ArgoCD processes the refresh
  Then ArgoCD should compare Git state with cluster state
  And status.sync.status should update if drift detected
  And status.sync.revision should update to latest Git commit
  And no resources should be modified in the cluster
  And a notification should show "Refresh completed"

Scenario: User executes hard refresh action
  Given an application named "guestbook" exists
  When the user triggers hard refresh action
  Then a confirmation dialog should appear
  And the dialog should warn "Hard refresh clears cache and may take longer. Continue?"
  And the dialog should have "Continue" and "Cancel" buttons

Scenario: User confirms hard refresh
  Given the hard refresh confirmation dialog is shown
  When the user clicks "Continue"
  Then the extension should execute kube9.argocd.hardRefresh command
  And the extension should patch the Application CRD
  And the patch should add annotation argocd.argoproj.io/refresh with value "hard"
  And a notification should show "Hard refreshing guestbook..."
  And ArgoCD should clear its cache before comparing state

Scenario: User cancels hard refresh
  Given the hard refresh confirmation dialog is shown
  When the user clicks "Cancel"
  Then the dialog should close
  And no hard refresh operation should be initiated
  And no kubectl command should be executed

Scenario: Hard refresh completes successfully
  Given the user has confirmed and triggered hard refresh on "guestbook"
  When ArgoCD completes the hard refresh
  Then a notification should show "Hard refresh completed"
  And the application status should be fully updated
  And the tree view should refresh automatically

Scenario: Extension tracks sync operation progress
  Given the user has triggered sync on "api-service"
  When the sync operation is in progress
  Then the extension should poll the application status every 2 seconds
  And the extension should check status.operationState.phase
  And the extension should update progress notification with current phase
  And the extension should detect when phase becomes "Succeeded" or "Failed"

Scenario: Sync operation phases are displayed to user
  Given the user has triggered sync on "api-service"
  When status.operationState.phase changes
  Then the notification should update to show current phase:
    | Phase | Notification Message |
    | Running | Syncing api-service... |
    | Terminating | Finalizing sync... |
    | Succeeded | Successfully synced api-service |
    | Failed | Sync failed: [error message] |
    | Error | Sync error: [error message] |

Scenario: Extension handles kubectl patch failure for sync
  Given the user triggers sync on "api-service"
  When kubectl patch command fails with error
  Then an error notification should show "Failed to initiate sync"
  And the error details should be logged
  And no operation tracking should start
  And the tree view should not change

Scenario: Extension handles RBAC permission denied for sync
  Given the user triggers sync on "api-service"
  When kubectl patch fails with Forbidden error
  Then an error notification should show "Permission denied: Cannot sync applications"
  And the notification should suggest checking RBAC permissions
  And no operation should be initiated

Scenario: Extension handles application not found during sync
  Given the user triggers sync on "deleted-app"
  When kubectl patch fails with NotFound error
  Then an error notification should show "Application not found: deleted-app"
  And the notification should suggest the application may have been deleted
  And the tree view should refresh to remove stale items

Scenario: Multiple sync operations on different applications
  Given the user triggers sync on "app1"
  And sync is in progress for "app1"
  When the user triggers sync on "app2"
  Then both sync operations should run concurrently
  And separate progress notifications should be shown
  And each operation should be tracked independently
  And completions should be handled independently

Scenario: User cancels ongoing sync operation
  Given the user has triggered sync on "api-service"
  And the sync operation is in progress
  When the user clicks the cancel button in the notification
  Then the extension should stop polling for operation status
  And the notification should dismiss
  And the sync operation should continue in ArgoCD (cannot be cancelled)
  And the user should see final status on next manual refresh

Scenario: Extension handles sync timeout
  Given the user has triggered sync on "slow-app"
  And the sync operation takes longer than 5 minutes
  When the operation timeout is reached
  Then the extension should stop polling
  And a notification should show "Sync operation timed out (still running in ArgoCD)"
  And the operation should continue in ArgoCD
  And the user can refresh manually to see final status

Scenario: Sync action available from tree view context menu
  Given the user right-clicks on application "api-service" in tree view
  When the context menu appears
  Then "Sync" option should be available
  And clicking "Sync" should trigger kube9.argocd.sync command

Scenario: Refresh action available from tree view context menu
  Given the user right-clicks on application "guestbook" in tree view
  When the context menu appears
  Then "Refresh" option should be available
  And clicking "Refresh" should trigger kube9.argocd.refresh command

Scenario: Hard refresh action available from tree view context menu
  Given the user right-clicks on application "guestbook" in tree view
  When the context menu appears
  Then "Hard Refresh" option should be available
  And clicking "Hard Refresh" should trigger kube9.argocd.hardRefresh command
  And confirmation dialog should appear

Scenario: Sync button available in application webview
  Given the application webview is open for "api-service"
  And the Overview tab is selected
  When the webview displays action buttons
  Then "Sync" button should be prominently displayed
  And clicking the button should trigger kube9.argocd.sync command

Scenario: Refresh button available in application webview
  Given the application webview is open for "guestbook"
  And the Overview tab is selected
  When the webview displays action buttons
  Then "Refresh" button should be displayed
  And clicking the button should trigger kube9.argocd.refresh command

Scenario: Hard refresh button available in application webview
  Given the application webview is open for "guestbook"
  And the Overview tab is selected
  When the webview displays action buttons
  Then "Hard Refresh" button should be displayed
  And clicking the button should trigger kube9.argocd.hardRefresh command

Scenario: Webview buttons disabled during active operation
  Given the application webview is open for "api-service"
  And the user triggers sync
  When the sync operation is in progress
  Then all action buttons should be disabled
  And buttons should show disabled state styling
  And the sync button should show "Syncing..." label
  When the sync operation completes
  Then all action buttons should be re-enabled

Scenario: Tree view shows syncing indicator during operation
  Given the user triggers sync on "api-service" from tree view
  When the sync operation is in progress
  Then the application tree item should show a syncing indicator
  And the indicator should be an animated icon or spinner
  And the description should show "Syncing..."
  When the sync operation completes
  Then the indicator should update to show final status
  And the description should show updated sync status

Scenario: Extension handles concurrent sync and refresh gracefully
  Given the user triggers sync on "api-service"
  And sync is in progress
  When the user triggers refresh on the same application
  Then the refresh should be queued or rejected
  And a notification should show "Wait for sync to complete before refreshing"
  And the sync operation should continue unaffected

Scenario: Extension handles ArgoCD not responding during operation
  Given the user has triggered sync on "api-service"
  And the extension is polling for operation status
  When kubectl get application fails with timeout
  Then the extension should retry polling up to 3 times
  And if still failing, show notification "Unable to track sync progress"
  And the extension should stop polling
  And the user should refresh manually to check status

Scenario: Extension cleans up operation annotations after completion
  Given the user has triggered sync on "api-service"
  When the sync operation completes
  Then ArgoCD controller should automatically clean up the operation annotation
  And the extension should not need to remove annotations
  And subsequent queries should not show stale operation state

Scenario: Extension validates application state before sync
  Given the user triggers sync on "api-service"
  When the extension prepares the sync operation
  Then the extension should verify the application still exists
  And the extension should verify the application is not already syncing
  And if already syncing, show notification "Sync already in progress"
  And do not initiate duplicate sync operation

Scenario: Extension logs all operation commands for debugging
  Given the user triggers any action (sync, refresh, hard refresh)
  When the extension executes kubectl commands
  Then the extension should log the full kubectl command
  And the extension should log operation parameters
  And the extension should log response status
  And logs should be available in VS Code output panel
```

## Integration Points

- **VS Code Commands**: `kube9.argocd.sync`, `kube9.argocd.refresh`, `kube9.argocd.hardRefresh`
- **Tree View Context Menu**: Right-click actions on application items
- **Webview Action Buttons**: Sync, Refresh, Hard Refresh buttons in application details
- **ArgoCDService**: Executes kubectl patch commands and tracks operations
- **Notification System**: Shows progress, success, and error notifications
- **kubectl Commands**: Patch Application CRDs to trigger ArgoCD operations

## ArgoCD Operation Mechanism

Actions work by patching the Application CRD with annotations that trigger ArgoCD controller operations:

| Action | Annotation | Value | Effect |
|--------|-----------|-------|--------|
| **Sync** | `argocd.argoproj.io/refresh` | `normal` | Applies Git state to cluster |
| **Refresh** | `argocd.argoproj.io/refresh` | `normal` | Compares Git vs cluster, updates status |
| **Hard Refresh** | `argocd.argoproj.io/refresh` | `hard` | Clears cache, then compares and updates |

## Operation Tracking

After triggering an action:
1. Extension patches Application CRD with annotation
2. Extension polls `status.operationState` every 2 seconds
3. Extension updates notification with current phase
4. Extension detects completion when phase is "Succeeded" or "Failed"
5. Extension refreshes tree view to show updated status
6. Extension shows final notification (success or error)

## Non-Goals

- Manual resource selection for sync (all resources synced)
- Dry-run or preview of sync changes
- Rollback to previous application state
- Application deletion from extension
- Custom sync options or parameters
- Cancellation of in-progress sync operations (ArgoCD limitation)

