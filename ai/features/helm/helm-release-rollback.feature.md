---
feature_id: helm-release-rollback
name: Helm Release Rollback
description: Users can rollback releases to previous revisions and uninstall releases
spec_id:
  - helm-release-operations
---

# Helm Release Rollback

```gherkin
Scenario: View release revision history
  Given a release "postgresql" has multiple revisions
  And the release details modal is open
  When the user clicks the "History" tab
  Then all revisions are listed in reverse chronological order
  And each revision shows:
    - Revision number
    - Update timestamp
    - Status (deployed, superseded, failed)
    - Chart version
    - Description
  And each historical revision has a "Rollback" button
  And the current revision is highlighted
```

```gherkin
Scenario: Rollback to previous revision
  Given a release "app" is at revision 5 with status "failed"
  And revision 4 was successful
  And the History tab is displayed
  When the user clicks "Rollback" on revision 4
  Then a confirmation dialog appears
  And the dialog shows:
    - Current revision: 5
    - Target revision: 4
    - Target chart version
  When the user confirms rollback
  Then the Helm CLI executes "helm rollback app 4"
  And a progress indicator is shown
  And the release is rolled back to revision 4
  And a new revision 6 is created (pointing to rev 4 state)
  And a success notification is displayed
```

```gherkin
Scenario: Rollback fails - revision not found
  Given the History tab is displayed
  When the user attempts to rollback to a non-existent revision
  Then the rollback fails
  And an error explains the revision cannot be found
  And the release remains at the current revision
```

```gherkin
Scenario: Cancel rollback
  Given a rollback confirmation dialog is displayed
  When the user clicks "Cancel"
  Then the dialog closes
  And no rollback is performed
  And the release remains unchanged
```

```gherkin
Scenario: Rollback after failed upgrade
  Given a release "database" was upgraded from rev 3 to rev 4
  And the upgrade failed (rev 4 status: failed)
  When the user opens release details
  And views the History tab
  And clicks "Rollback" on revision 3
  Then the release is rolled back to the last successful state
  And the failed revision 4 remains in history
  And the new revision 5 points to rev 3 state
```

```gherkin
Scenario: Rollback progress feedback
  Given the user confirms a rollback
  When the rollback is executing
  Then a progress notification is displayed
  And progress messages update:
    - "Starting rollback..."
    - "Executing helm rollback..."
    - "Rollback complete"
```

```gherkin
Scenario: View rolled-back release
  Given a release was rolled back to revision 3
  And a new revision 5 was created
  When the user views release info
  Then the current revision shows "5"
  And the description indicates "Rollback to 3"
  And the chart version matches revision 3
```

## Uninstall Release

```gherkin
Scenario: Uninstall release
  Given a release "nginx" is installed in namespace "default"
  When the user clicks the "Uninstall" button
  Then a confirmation dialog appears
  And the dialog shows:
    - Release name: nginx
    - Namespace: default
    - Chart name
    - Warning about permanent removal
  When the user confirms uninstall
  Then the Helm CLI executes "helm uninstall nginx -n default"
  And a progress indicator is shown
  And all resources created by the release are removed
  And the release disappears from Installed Releases
  And a success notification is displayed
```

```gherkin
Scenario: Cancel uninstall
  Given an uninstall confirmation dialog is displayed
  When the user clicks "Cancel"
  Then the dialog closes
  And the release remains installed
  And no changes are made
```

```gherkin
Scenario: Uninstall fails - release not found
  Given a release "ghost-app" appears in the list
  But the release no longer exists in Helm
  When the user attempts to uninstall
  Then the uninstall fails
  And an error explains the release cannot be found
  And the release is removed from the UI list
```

```gherkin
Scenario: Uninstall with dependencies
  Given a release "app" has resources in use by other workloads
  When the user uninstalls the release
  Then Helm removes the release and its resources
  And any dependent resources may fail if not handled
  And the user is warned in the confirmation dialog
```

```gherkin
Scenario: Uninstall progress feedback
  Given the user confirms uninstall
  When the uninstall is executing
  Then a progress notification is displayed
  And progress messages update:
    - "Starting uninstall..."
    - "Removing resources..."
    - "Uninstall complete"
```

```gherkin
Scenario: Uninstall from release details modal
  Given the release details modal is open for "test-app"
  When the user clicks the "Uninstall" button in the modal
  Then the confirmation dialog appears
  When confirmed
  Then the release is uninstalled
  And the modal closes automatically
  And the Installed Releases list is refreshed
```

```gherkin
Scenario: Uninstall clears namespace (if empty)
  Given a release "app" is the only resource in namespace "temp"
  And the namespace was created by Helm (via --create-namespace)
  When the user uninstalls the release
  Then the release is removed
  And the namespace may remain (Helm does not auto-delete namespaces)
  And the user can manually delete the namespace if needed
```

```gherkin
Scenario: Cannot rollback after uninstall
  Given a release "old-app" was uninstalled
  When the user views uninstalled releases (not in default view)
  Then the release has status "uninstalled"
  And no rollback option is available
  And the release history is still visible
  But the release cannot be restored via rollback
```

