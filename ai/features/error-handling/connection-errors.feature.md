---
feature_id: connection-errors
name: Connection Error Handling
description: User-friendly handling of cluster connection failures with troubleshooting guidance
spec_id:
  - error-handler-utility
  - connection-error-detection
---

# Connection Error Handling

```gherkin
Feature: Connection Error Handling

Scenario: Display helpful message when cluster is unreachable
  Given a user has a cluster configured in their kubeconfig
  And the cluster endpoint is not reachable
  When the extension attempts to connect to the cluster
  Then an error message should display: "Cannot connect to cluster '[cluster-name]'"
  And the error should show the cluster endpoint
  And the error should show the kubeconfig path
  And the error should show the context name
  And a "Retry" button should be available
  And an "Open Kubeconfig" button should be available
  And a "View Troubleshooting Guide" link should be included

Scenario: Connection error shows in tree view
  Given a user expands a cluster in the tree view
  And the cluster is unreachable
  When the tree item attempts to load
  Then the cluster item should show an error icon
  And the tree item should display "Connection Failed"
  And right-clicking should show a "Retry Connection" option
  And right-clicking should show a "View Error Details" option

Scenario: Check kubectl executable exists
  Given a user attempts to run a kubectl-based command
  And kubectl is not in the system PATH
  When the command executes
  Then an error should display: "kubectl executable not found"
  And the error should suggest: "Please install kubectl and add it to your PATH"
  And a link to kubectl installation docs should be provided
  And the extension should check for kubectl on startup

Scenario: Kubeconfig file is invalid
  Given a user's kubeconfig file is malformed or unreadable
  When the extension attempts to load contexts
  Then an error should display: "Invalid kubeconfig file"
  And the error should show the kubeconfig file path
  And the error should show parsing errors (if available)
  And an "Open Kubeconfig" button should be available
  And the error should suggest validating YAML syntax

Scenario: Network timeout during connection
  Given a cluster endpoint is extremely slow to respond
  And the connection times out
  When the timeout occurs
  Then an error should display: "Connection timed out after [duration]"
  And the error should suggest: "The cluster may be slow or network connectivity is poor"
  And a "Retry with Longer Timeout" button should be available
  And a link to timeout settings should be provided

Scenario: Certificate validation failure
  Given a cluster uses TLS certificates
  And the certificate is invalid or expired
  When the extension attempts to connect
  Then an error should display: "Certificate validation failed"
  And the error should show certificate details (issuer, expiry)
  And the error should suggest: "Verify cluster certificates are valid"
  And an option to "Skip TLS Verification (not recommended)" should be available

Scenario: Retry connection action
  Given a connection error has occurred
  And the error message includes a "Retry" button
  When the user clicks "Retry"
  Then the extension should attempt to reconnect
  And a progress indicator should show during retry
  And if successful, the tree view should refresh
  And if failed again, the error should be shown again

Scenario: Open kubeconfig from error message
  Given a connection error displays the kubeconfig path
  And the error includes an "Open Kubeconfig" button
  When the user clicks "Open Kubeconfig"
  Then VS Code should open the kubeconfig file in an editor
  And the relevant context section should be highlighted (if possible)

Scenario: DNS resolution failure
  Given a cluster endpoint hostname cannot be resolved
  When DNS lookup fails
  Then an error should display: "Cannot resolve cluster hostname '[hostname]'"
  And the error should suggest: "Check your network connection and DNS settings"
  And the error should show the full cluster endpoint
  And a "Retry" button should be available

Scenario: Connection refused by cluster
  Given a cluster endpoint is reachable but refuses connections
  When connection is refused
  Then an error should display: "Connection refused by cluster"
  And the error should show the cluster endpoint and port
  And the error should suggest: "Verify the cluster is running and the endpoint is correct"
  And a "View Cluster Configuration" button should be available
```

