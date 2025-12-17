---
feature_id: timeout-errors
name: Timeout Error Handling
description: User-friendly handling of operation timeouts with retry and configuration options
spec_id:
  - error-handler-utility
  - timeout-configuration
---

# Timeout Error Handling

```gherkin
Feature: Timeout Error Handling

Scenario: Operation timeout with duration display
  Given a Kubernetes operation is in progress
  And the operation exceeds the configured timeout
  When the timeout occurs
  Then an error should display: "Operation timed out after [duration]"
  And the duration should be in human-readable format (e.g., "30 seconds")
  And explain: "The cluster may be slow to respond"
  And provide a "Retry" button
  And provide an "Increase Timeout" button

Scenario: Retry after timeout
  Given a timeout error has occurred
  And the error includes a "Retry" button
  When the user clicks "Retry"
  Then the operation should be attempted again
  And use the same timeout value as before
  And show a progress notification during retry
  And if timeout occurs again, show the same error options

Scenario: Increase timeout from error message
  Given a timeout error has occurred
  And the error includes an "Increase Timeout" button
  When the user clicks "Increase Timeout"
  Then VS Code settings should open to the kube9 timeout configuration
  And the relevant timeout setting should be highlighted
  And a tooltip should explain the recommended range

Scenario: Link to timeout settings
  Given a timeout error is displayed
  When the error message is shown
  Then include a link: "Adjust timeout in settings"
  And clicking the link should open VS Code settings
  And navigate to kube9.timeout configuration section
  And show all available timeout settings

Scenario: Network timeout for cluster connection
  Given the extension attempts to connect to a cluster
  And the network connection is slow or unstable
  When the connection attempt times out
  Then show: "Connection timeout: Unable to reach cluster after [duration]"
  And suggest: "Check your network connection"
  And suggest: "Verify the cluster endpoint is correct"
  And provide "Retry" and "View Cluster Config" buttons

Scenario: API request timeout
  Given the extension makes a Kubernetes API request
  And the API is slow to respond
  When the request times out
  Then show: "API request timed out after [duration]"
  And show: "Cluster: [cluster-name]"
  And show: "Operation: [operation-type]"
  And explain: "The Kubernetes API is responding slowly"
  And provide "Retry" button

Scenario: Fetch resources timeout during tree load
  Given the tree view is loading cluster resources
  And fetching resources times out
  When the timeout occurs
  Then the tree view should not freeze or hang
  And show an error item in the tree: "Failed to load resources (timeout)"
  And right-clicking should offer "Retry" and "Increase Timeout"
  And other clusters in the tree should continue to load

Scenario: Timeout during resource watch
  Given the extension is watching resources for live updates
  And the watch connection times out
  When the timeout occurs
  Then log to Output Panel: "Watch timeout for [resource-type]"
  And automatically attempt to reconnect
  And use exponential backoff for reconnection
  And do not show a popup (background operation)
  And show a status bar notification: "Reconnecting to cluster..."

Scenario: Timeout with exponential backoff retry
  Given an operation has timed out multiple times
  And automatic retry is enabled
  When the retry is attempted
  Then use exponential backoff (e.g., 1s, 2s, 4s, 8s)
  And show: "Retrying in [countdown] seconds..."
  And allow user to cancel the retry
  And after max retries, show: "Failed after [count] attempts"

Scenario: Configurable timeout per operation type
  Given different operations have different timeout requirements
  When setting timeout values
  Then provide separate settings for:
    - Connection timeout
    - API request timeout
    - Resource fetch timeout
    - Watch timeout
  And document recommended values for each
  And show current values in error messages

Scenario: Timeout during YAML apply
  Given a user applies a YAML manifest
  And the apply operation times out
  When the timeout occurs
  Then show: "Timeout while applying manifest after [duration]"
  And explain: "The resource may still be creating in the background"
  And suggest: "Check cluster to verify resource status"
  And provide "View Cluster Resources" button
  And log full details to Output Panel

Scenario: Long-running operation progress indicator
  Given an operation is expected to take significant time
  When the operation is in progress
  Then show a progress notification with percentage (if determinable)
  And show elapsed time: "Running for [duration]..."
  And show a "Cancel" button
  And update progress every few seconds
  And if approaching timeout, show: "Operation may time out soon"

Scenario: Timeout during exec/shell operations
  Given a user opens a terminal into a pod
  And the exec connection times out
  When the timeout occurs
  Then show: "Terminal connection timed out"
  And explain: "Unable to establish connection to pod"
  And suggest: "Verify pod is running"
  And provide "Retry" and "Check Pod Status" buttons

Scenario: Graceful timeout for batch operations
  Given the extension is performing a batch operation
  And some items in the batch time out
  When timeouts occur for specific items
  Then show: "Completed [success-count] of [total-count] operations"
  And list which items timed out
  And provide "Retry Failed Items" button
  And successfully completed items should not retry

Scenario: Timeout warning before actual timeout
  Given an operation is taking longer than expected
  And approaching the configured timeout
  When 80% of timeout duration has elapsed
  Then show a warning notification: "Operation is taking longer than usual"
  And show elapsed time and remaining time
  And allow user to cancel or continue
  And do not interrupt the operation
```

