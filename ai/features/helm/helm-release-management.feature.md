---
feature_id: helm-release-management
name: Helm Release Management
description: Users can view, filter, and manage installed Helm releases
spec_id:
  - helm-release-operations
---

# Helm Release Management

```gherkin
Scenario: View installed releases
  Given the Helm Package Manager is open
  When the Installed Releases section loads
  Then all installed releases are displayed
  And each release shows name, namespace, chart, and version
  And each release shows a status indicator (deployed, failed, pending)
  And each release shows the current revision number
  And each release has Upgrade, View Details, and Uninstall buttons
```

```gherkin
Scenario: Release with healthy status
  Given a release "nginx" is deployed and healthy
  When the Installed Releases section loads
  Then the release shows a green indicator 🟢
  And the status label shows "Deployed"
```

```gherkin
Scenario: Release with failed status
  Given a release "broken-app" has failed
  When the Installed Releases section loads
  Then the release shows a red indicator 🔴
  And the status label shows "Failed"
  And an error icon is displayed
```

```gherkin
Scenario: Release with upgrade available
  Given a release "postgresql" is installed with version "12.1.0"
  And version "12.5.0" is available in the repository
  When the Installed Releases section loads
  Then the release shows a yellow indicator 🟡
  And a badge displays "v12.5.0 available"
  And the Upgrade button is highlighted
```

```gherkin
Scenario: Filter releases by namespace
  Given multiple releases are installed across different namespaces
  When the user selects namespace "production" in the filter dropdown
  Then only releases from "production" namespace are displayed
  And releases from other namespaces are hidden
```

```gherkin
Scenario: Filter releases by status
  Given releases have various statuses (deployed, failed, pending)
  When the user selects "Failed" in the status filter dropdown
  Then only releases with failed status are displayed
  And other releases are hidden
```

```gherkin
Scenario: Search releases by name
  Given multiple releases are installed
  When the user enters "postgres" in the search field
  Then only releases with "postgres" in the name or chart are displayed
  And the search is case-insensitive
```

```gherkin
Scenario: Clear all filters
  Given namespace and status filters are applied
  And a search query is entered
  When the user clicks "Clear Filters"
  Then all filters are reset
  And all releases are displayed again
```

```gherkin
Scenario: View release details
  Given a release "nginx" is displayed
  When the user clicks "View Details" on the release
  Then a detail modal opens
  And the modal has tabs: Info, Manifest, Values, History
  And the Info tab is selected by default
```

```gherkin
Scenario: View release info tab
  Given the release details modal is open for "nginx"
  And the Info tab is selected
  Then the following information is displayed:
    - Release name
    - Namespace
    - Chart name and version
    - App version
    - Status and status message
    - Current revision
    - Last updated timestamp
    - Description
```

```gherkin
Scenario: View release manifest
  Given the release details modal is open for "nginx"
  When the user clicks the "Manifest" tab
  Then the deployed Kubernetes resources are displayed as YAML
  And the manifest includes all resources (Deployment, Service, etc.)
  And the YAML is syntax-highlighted
  And the user can copy the manifest
```

```gherkin
Scenario: View release values
  Given the release details modal is open for "nginx"
  When the user clicks the "Values" tab
  Then the current chart values are displayed as YAML
  And the values show what was actually deployed
  And computed/merged values are included
  And the user can copy the values
```

```gherkin
Scenario: View release history
  Given the release details modal is open for "nginx"
  When the user clicks the "History" tab
  Then all revisions of the release are listed
  And each revision shows:
    - Revision number
    - Updated date and time
    - Status
    - Chart version
    - Description
  And each revision has a "Rollback" button
```

```gherkin
Scenario: Empty releases list
  Given no Helm releases are installed in the cluster
  When the Installed Releases section loads
  Then an empty state is displayed
  And a message explains "No Helm releases installed"
  And a suggestion to install charts is shown
```

```gherkin
Scenario: Periodic release status updates
  Given the Helm Package Manager is open and visible
  When 30 seconds elapse
  Then the extension polls for release updates
  And release statuses are refreshed
  And any status changes are reflected in the UI
  When the webview is hidden
  Then polling stops to conserve resources
```

```gherkin
Scenario: Release status transitions
  Given a release is being upgraded
  And the status is "pending-upgrade"
  When the upgrade completes
  Then the status changes to "deployed"
  And the revision number increments
  And the updated timestamp changes
  And the UI updates automatically
```

