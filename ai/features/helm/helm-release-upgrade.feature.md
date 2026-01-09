---
feature_id: helm-release-upgrade
name: Helm Release Upgrade
description: Users can upgrade installed Helm releases to new versions
spec_id:
  - helm-release-operations
---

# Helm Release Upgrade

```gherkin
Scenario: Upgrade release to latest version
  Given a release "postgresql" is installed with version "12.1.0"
  And version "12.5.0" is available
  When the user clicks the "Upgrade" button on the release
  Then an upgrade modal opens
  And the modal shows current version "12.1.0"
  And the modal shows available versions with "12.5.0" selected
  And the "Reuse existing values" checkbox is checked by default
  When the user clicks "Upgrade"
  Then the release is upgraded to version "12.5.0"
  And existing values are preserved
  And a progress indicator shows upgrade status
  And a success notification is displayed
```

```gherkin
Scenario: Upgrade with new custom values
  Given a release "nginx" is installed
  And the upgrade modal is open
  When the user unchecks "Reuse existing values"
  And enters custom values in YAML:
    """
    replicaCount: 3
    resources:
      limits:
        memory: 512Mi
    """
  And clicks "Upgrade"
  Then the release is upgraded with the new values
  And the new values replace the previous values
  And the revision number increments
```

```gherkin
Scenario: Upgrade with modified existing values
  Given the upgrade modal is open
  And "Reuse existing values" is checked
  When the user clicks "Edit Values"
  Then the current values are displayed in the editor
  When the user modifies a specific value
  And clicks "Upgrade"
  Then the release is upgraded with modified values
  And unchanged values are preserved
```

```gherkin
Scenario: Select specific version for upgrade
  Given the upgrade modal is open
  And multiple versions are available
  When the user clicks the version dropdown
  Then versions are listed from newest to oldest
  When the user selects version "12.3.0"
  And clicks "Upgrade"
  Then the release is upgraded to that specific version
```

```gherkin
Scenario: Upgrade fails - values validation error
  Given the upgrade modal is open
  When the user enters invalid values:
    """
    invalid: yaml: syntax
    """
  And clicks "Upgrade"
  Then the upgrade fails with validation error
  And an error message explains the YAML syntax issue
  And the release remains at the current version
```

```gherkin
Scenario: Upgrade fails - chart not found
  Given a release "old-app" is installed
  And the chart repository no longer contains the chart
  When the user attempts to upgrade
  Then the upgrade fails
  And an error explains the chart cannot be found
  And suggests updating repositories or using a different chart
```

```gherkin
Scenario: Upgrade with wait for ready
  Given the upgrade modal is open
  When the user enables "Wait for resources to be ready"
  And sets timeout to "5m"
  And clicks "Upgrade"
  Then the upgrade waits for all resources to be ready
  And monitors pod status during upgrade
  And completes when all resources are healthy
```

```gherkin
Scenario: Upgrade times out waiting for ready
  Given an upgrade is in progress with wait enabled
  And timeout is set to "2m"
  When resources do not become ready within 2 minutes
  Then the upgrade operation times out
  And an error notification is displayed
  And the release revision is created but marked as failed
  And the error suggests checking pod logs
```

```gherkin
Scenario: Cancel upgrade before execution
  Given the upgrade modal is open
  When the user clicks "Cancel"
  Then the modal closes
  And no upgrade is performed
  And the release remains unchanged
```

```gherkin
Scenario: Upgrade progress feedback
  Given the user clicks "Upgrade"
  When the upgrade is executing
  Then a progress notification is displayed
  And progress messages update:
    - "Preparing upgrade..."
    - "Executing helm upgrade..."
    - "Waiting for resources..."
    - "Upgrade complete"
  And the progress percentage increases
```

```gherkin
Scenario: Upgrade creates new revision
  Given a release "app" is at revision 3
  When the user upgrades the release
  And the upgrade completes successfully
  Then the release is at revision 4
  And the previous revision 3 is preserved in history
  And the user can rollback to revision 3 if needed
```

```gherkin
Scenario: View values diff before upgrade
  Given the upgrade modal is open
  And custom values are entered
  When the user clicks "Show Diff"
  Then a side-by-side diff is displayed
  And the left side shows current values
  And the right side shows new values
  And differences are highlighted
  And the user can review changes before upgrading
```

```gherkin
Scenario: Upgrade from featured section
  Given the Kube9 Operator is installed
  And a new version is available
  And the Featured Charts section shows an upgrade badge
  When the user clicks "Upgrade" in the featured section
  Then the upgrade modal opens
  And operator-specific upgrade options are shown
  And the default values are preserved
```

```gherkin
Scenario: Multiple releases can be upgraded
  Given multiple releases have updates available
  When the user upgrades one release
  Then other releases with updates remain in the list
  And their upgrade badges are still displayed
  And the user can upgrade them individually
```

