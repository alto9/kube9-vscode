---
feature_id: operator-health-report
name: Operator Health Report
description: Webview displaying comprehensive Kube9 Operator health and status information for the connected cluster
spec_id:
  - operator-health-report-spec
---

# Operator Health Report

```gherkin
Feature: Operator Health Report displays comprehensive operator status

Background:
  Given the kube9 VS Code extension is installed and activated
  And the user is connected to a Kubernetes cluster
  And the Reports → Kube9 Operator menu is available

Scenario: Clicking Health report opens Health webview with operator status
  Given a user has expanded "Reports" → "Kube9 Operator" in the tree
  When the user clicks on "Health"
  Then a Health Report webview should open
  And the webview title should show "Kube9 Operator Health"
  And the webview should display an Operator Status section with:
    | Field            | Description                                    |
    | Status Mode      | operated, enabled, degraded, or basic          |
    | Tier             | free or pro                                    |
    | Health           | healthy, degraded, or unhealthy                |
    | Version          | Operator version (semver)                      |
    | Registered       | Yes/No (whether registered with kube9-server)  |
    | Last Update      | Timestamp of last status update                |
  And each status field should have appropriate visual indicators (colors, icons)

Scenario: Health report shows healthy operated status
  Given the operator is installed in free tier
  And the operator status is "operated" with health "healthy"
  When the user opens the Health report
  Then the Status Mode should show "Operated (Free Tier)"
  And the Health should show "Healthy" with a green indicator
  And the Registered field should show "No" or "N/A"
  And no error messages should be displayed

Scenario: Health report shows healthy enabled status
  Given the operator is installed in pro tier
  And the operator status is "enabled" with health "healthy"
  And the operator is registered with kube9-server
  When the user opens the Health report
  Then the Status Mode should show "Enabled (Pro Tier)"
  And the Tier should show "Pro"
  And the Health should show "Healthy" with a green indicator
  And the Registered field should show "Yes" with a success indicator
  And the Cluster ID should be displayed if available

Scenario: Health report shows degraded status with error
  Given the operator is installed
  And the operator status is "degraded"
  And there is an error message "Failed to connect to kube9-server"
  When the user opens the Health report
  Then the Status Mode should show "Degraded"
  And the Health should show "Degraded" with a yellow/warning indicator
  And an error section should be displayed
  And the error message should show "Failed to connect to kube9-server"

Scenario: Health report shows basic status when operator not installed
  Given the operator is not installed in the cluster
  And the cluster operator status is "basic"
  When the user opens the Health report
  Then the Status Mode should show "Basic (No Operator)"
  And a message should indicate "Kube9 Operator is not installed"
  And an "Install Operator" call-to-action should be displayed
  And operator-specific fields (version, health, registered) should not be shown

Scenario: Health report shows stale status warning
  Given the operator is installed
  And the status timestamp is older than 5 minutes
  When the user opens the Health report
  Then a warning banner should be displayed
  And the warning should indicate "Status data is stale (last updated X minutes ago)"
  And the Health should show "Degraded" with a warning indicator
  And a "Refresh Status" button should be available

Scenario: User refreshes Health report to get latest status
  Given the Health report is open
  And the webview has a "Refresh" button
  When the user clicks the "Refresh" button
  Then the extension should bypass the status cache
  And the extension should query the latest operator status from the cluster
  And the webview should update with the latest status information
  And a loading indicator should be shown during the refresh

Scenario: Health report displays operator version information
  Given the operator is installed with version "1.2.3"
  When the user opens the Health report
  Then the Version field should show "1.2.3"
  And the version should be displayed in a readable format
  And if a newer version is available, an upgrade indicator should be shown

Scenario: Health report shows timestamp in human-readable format
  Given the operator status was last updated 2 minutes ago
  When the user opens the Health report
  Then the Last Update field should show a human-readable time
  And the format should be like "2 minutes ago" or "Just now"
  And hovering over the timestamp should show the full ISO 8601 datetime

Scenario: Health report displays cluster ID for enabled tier
  Given the operator is installed in pro tier
  And the operator is registered with cluster ID "cls-abc123xyz"
  When the user opens the Health report
  Then a Cluster ID field should be displayed
  And the value should show "cls-abc123xyz"
  And the field should be copyable (copy to clipboard button)

Scenario: Health report handles status query failures gracefully
  Given the Health report is open
  When the extension fails to query the operator status
  And the failure is due to network connectivity issues
  Then the webview should show a graceful error message
  And the message should indicate "Unable to fetch operator status"
  And cached status should be shown if available
  And a "Retry" button should be available

Scenario: Health report is responsive to operator status changes
  Given the Health report is open with status "operated"
  When the operator is upgraded and registered (status changes to "enabled")
  And the user refreshes the Health report
  Then the Status Mode should update to show "Enabled (Pro Tier)"
  And the Tier should change from "Free" to "Pro"
  And the Registered field should change to "Yes"
  And the Cluster ID should be displayed

Scenario: Health report shows minimal placeholder for future expansion
  Given the operator is installed with basic health information
  When the user opens the Health report
  Then the webview should show current available information
  And placeholder sections should be shown for future metrics
  And placeholders should indicate "More metrics coming soon"
  And the layout should be designed for easy expansion

Scenario: Health report provides installation guidance for basic mode
  Given the cluster operator status is "basic"
  When the user opens the Health report
  Then an installation section should be displayed
  And the section should provide a brief description of Kube9 Operator
  And a "How to Install" link or guide should be available
  And the benefits of installing the operator should be highlighted

Scenario: Health report webview uses consistent styling
  Given the Health report is open
  Then the webview should use VS Code theme colors
  And status indicators should use appropriate semantic colors
  And the layout should be clear and organized
  And fonts and spacing should match other kube9 webviews
```

## Integration Points

- **Operator Status API**: Queries operator status via `OperatorStatusClient`
- **Tree View Navigation**: Health report accessed from Reports → Kube9 Operator menu
- **Status ConfigMap**: Reads data from `kube9-operator-status` ConfigMap in `kube9-system` namespace
- **Cache Management**: Uses cached status with 5-minute TTL, can force refresh

## Non-Goals

- Operator installation from webview (future feature)
- Operator configuration management (future feature)
- Historical health metrics or trends (future feature)
- Detailed resource metrics (future feature)
- Log viewing for operator pods (future feature)
- Alerting or notifications (future feature)

