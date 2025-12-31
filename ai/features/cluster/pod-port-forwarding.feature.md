---
feature_id: pod-port-forwarding
name: Pod Port Forwarding
description: Forward pod ports to localhost for local testing and debugging with visual tracking in tree view
spec_id:
  - port-forwarding-manager-spec
  - port-forwarding-command-spec
  - port-forwarding-tree-spec
---

# Pod Port Forwarding

```gherkin
Background:
  Given the kube9 VS Code extension is installed and activated
  And the user has a valid kubeconfig file
  And the user is connected to a cluster
  And kubectl is installed and available in PATH
  And the cluster contains running pods
```

## Starting Port Forwards

```gherkin
Scenario: Start port forward from pod context menu
  Given a user has expanded the "Workloads" category in the tree view
  And they have expanded the "Pods" subcategory
  And a Pod named "nginx-pod" exists with status "Running"
  And the pod has a container port 80 exposed
  When they right-click on "nginx-pod"
  Then they should see a "Port Forward" option in the context menu
  When they click on the "Port Forward" option
  Then a port selection dialog should appear
  And the dialog should show remote port options including "80"
  When they select remote port "80"
  Then a local port input dialog should appear
  And the default value should be "80" if available
  When they enter "8080" as the local port
  And they confirm the dialog
  Then a progress notification should appear saying "Starting port forward for nginx-pod..."
  And a kubectl port-forward process should start
  And a success notification should appear saying "Port forward established: localhost:8080 → default/nginx-pod:80"
  And the notification should have "Open Browser" and "Show Forwards" action buttons
```

```gherkin
Scenario: Remote port dropdown shows container ports
  Given a Pod named "web-pod" exists with container ports 80, 443, and 8080
  When a user right-clicks on "web-pod" and selects "Port Forward"
  Then the remote port dialog should appear
  And the dropdown should show:
    | Port | Name    |
    | 80   | http    |
    | 443  | https   |
    | 8080 | metrics |
  And the dropdown should include "Custom port..." option
  When they select "443"
  Then the local port dialog should appear with "443" as the suggested value
```

```gherkin
Scenario: Select custom remote port
  Given a Pod named "app-pod" exists
  When a user right-clicks on "app-pod" and selects "Port Forward"
  And they select "Custom port..." from the remote port dropdown
  Then a custom port input dialog should appear
  When they enter "9000"
  And they confirm the input
  Then the local port dialog should appear
  And the suggested local port should be "9000" if available
```

```gherkin
Scenario: Auto-suggest same port for local if available
  Given a Pod named "nginx-pod" exists with container port 8080
  And local port 8080 is not in use
  When a user starts port forwarding with remote port 8080
  Then the local port dialog should appear
  And the default value should be "8080"
  And the placeholder should say "Default: 8080 (same as remote)"
  When they press Enter to accept the default
  Then the forward should start with localhost:8080 → pod:8080
```

```gherkin
Scenario: Suggest alternative port when default is in use
  Given a Pod named "nginx-pod" exists with container port 8080
  And local port 8080 is already in use
  When a user starts port forwarding with remote port 8080
  Then the local port dialog should appear
  And the suggested value should be "8081" or next available port
  And the placeholder should say "Suggested: 8081 (8080 is in use)"
  When they accept the suggestion
  Then the forward should start with localhost:8081 → pod:8080
```

```gherkin
Scenario: Validate local port range
  Given a user is in the local port selection dialog
  When they enter "100" (privileged port)
  Then validation should fail with message "Port must be between 1024 and 65535"
  When they enter "70000" (out of range)
  Then validation should fail with message "Port must be between 1024 and 65535"
  When they enter "abc" (non-numeric)
  Then validation should fail with message "Port must be a number"
  When they enter "8080" (valid)
  Then validation should pass
  And they can proceed to start the forward
```

```gherkin
Scenario: Handle port conflict with retry
  Given a user has selected ports 80 (remote) and 8080 (local)
  And port 8080 becomes in use after validation but before starting
  When the port forward attempts to start
  Then it should fail with a port conflict error
  And an error notification should appear saying "Port 8080 is already in use. Try port 8081?"
  And the notification should have "Use 8081" and "Cancel" buttons
  When they click "Use 8081"
  Then the port forward should retry with port 8081
  And it should succeed
```

## Tree View Integration

```gherkin
Scenario: Port forwards appear under Networking category
  Given the tree view is displayed
  When a user expands the "Networking" category
  Then they should see a "Port Forwarding" subcategory
  And the "Port Forwarding" subcategory should be collapsible
  And the subcategory should show an icon (lightning bolt)
  When they expand the "Port Forwarding" subcategory
  And no port forwards are active
  Then they should see "No active port forwards" with description "Right-click a running pod to start forwarding"
```

```gherkin
Scenario: Active forwards displayed in tree when expanded
  Given a port forward is active: localhost:8080 → default/nginx-pod:80
  And another forward is active: localhost:3000 → prod/api-pod:3000
  When a user expands the "Networking" → "Port Forwarding" category
  Then the tree queries PortForwardManager for current state
  And they should see both forward items:
    | Label                                    |
    | localhost:8080 → default/nginx-pod:80   |
    | localhost:3000 → prod/api-pod:3000      |
  And each item should show a connection status icon (green dot for connected)
  And each item should show status and uptime calculated from start time
```

```gherkin
Scenario: Forward item shows detailed tooltip
  Given a port forward is active: localhost:8080 → default/nginx-pod:80
  And the forward has been running for 5 minutes and 32 seconds
  When a user hovers over the forward item in the tree
  Then a tooltip should appear showing:
    """
    Port Forward
    Pod: default/nginx-pod
    Local: localhost:8080
    Remote: 80
    Status: connected
    Uptime: 5m 32s
    Started: 2025-12-23 14:30:15
    """
```

```gherkin
Scenario: Port Forwarding badge shows count when collapsed
  Given 3 port forwards are active
  When the "Port Forwarding" subcategory is collapsed
  Then the subcategory should show "3 active" in the description
  When expanded
  Then all 3 forward items should be visible
```

```gherkin
Scenario: Pod shows badge when has active forward
  Given a port forward is active for pod "nginx-pod"
  When the user views the Pods subcategory
  Then the "nginx-pod" item should show a lightning bolt badge: "nginx-pod ⚡"
  And the tooltip should mention "Active Port Forwards: 1"
```

## Stopping Port Forwards

```gherkin
Scenario: Stop port forward from tree context menu
  Given a port forward is active: localhost:8080 → default/nginx-pod:80
  And the forward is visible in the "Port Forwarding" subcategory
  When a user right-clicks on the forward item
  Then they should see a "Stop Port Forward" option in the context menu
  When they click "Stop Port Forward"
  Then a confirmation dialog should appear
  And the dialog should say "Stop port forward localhost:8080 → default/nginx-pod:80?"
  When they click "Stop"
  Then the kubectl process should be terminated
  And the forward item should be removed from the tree
  And an info notification should appear saying "Port forward stopped: localhost:8080"
  And the status bar should update to decrement the active count
```

```gherkin
Scenario: Stop all port forwards
  Given 3 port forwards are active
  When a user runs command "kube9: Stop All Port Forwards" from command palette
  Then a confirmation dialog should appear saying "Stop all 3 active port forward(s)?"
  When they click "Stop All"
  Then a progress notification should appear saying "Stopping all port forwards..."
  And all 3 kubectl processes should be terminated
  And all forward items should be removed from the tree
  And an info notification should appear saying "All port forwards stopped"
  And the status bar item should be hidden
```

```gherkin
Scenario: Cancel stop forward
  Given a port forward is active
  When a user right-clicks and selects "Stop Port Forward"
  And the confirmation dialog appears
  When they click "Cancel"
  Then the dialog should close
  And the port forward should remain active
  And the tree should not change
```

## Status Bar Integration

```gherkin
Scenario: Status bar shows active forward count
  Given no port forwards are active
  Then the status bar should not show a port forwarding item
  When a user starts a port forward
  Then the status bar should show "kube9: 1 forward active" with a lightning bolt icon
  When they start a second port forward
  Then the status bar should update to "kube9: 2 forwards active"
```

```gherkin
Scenario: Click status bar to view forwards
  Given 2 port forwards are active
  And the status bar shows "kube9: 2 forwards active"
  When a user clicks on the status bar item
  Then the tree view should focus
  And the "Networking" → "Port Forwarding" category should expand
  And both forward items should be visible
```

```gherkin
Scenario: Status bar hides when no forwards
  Given 1 port forward is active
  And the status bar shows "kube9: 1 forward active"
  When the user stops the port forward
  Then the status bar item should disappear
```

## Connection Status and Errors

```gherkin
Scenario: Show connection status in tree
  Given a port forward is connecting
  Then the tree item should show a spinning loading icon
  And the description should say "connecting"
  When the connection is established
  Then the icon should change to a green filled circle
  And the description should update to "connected • 0s"
```

```gherkin
Scenario: Handle connection timeout
  Given a user starts a port forward
  And the kubectl process does not establish connection within 10 seconds
  Then the port forward should fail
  And an error notification should appear saying "Port forward connection timed out. Check pod logs and try again."
  And the forward should be removed from the tree
```

```gherkin
Scenario: Handle pod not running error
  Given a Pod named "pending-pod" exists with status "Pending"
  When a user right-clicks on "pending-pod" and selects "Port Forward"
  Then an error notification should immediately appear
  And the message should say "Cannot port forward: Pod 'pending-pod' is not in Running state (current: Pending)"
  And no port selection dialog should appear
```

```gherkin
Scenario: Handle kubectl not found error
  Given kubectl is not installed or not in PATH
  When a user attempts to start a port forward
  Then an error notification should appear
  And the message should say "kubectl not found. Please install kubectl to use port forwarding."
  And the notification should have an "Install kubectl" button
  When they click "Install kubectl"
  Then a browser should open to kubectl installation documentation
```

```gherkin
Scenario: Handle RBAC permission denied
  Given the user does not have pods/portforward permission in the namespace
  When they attempt to start a port forward
  Then the kubectl process should fail with Forbidden error
  And an error notification should appear
  And the message should say "Permission denied: You need pods/portforward permission in namespace 'default'"
  And the notification should have a "View RBAC Docs" button
```

## Auto-Cleanup

```gherkin
Scenario: Auto-cleanup on pod deletion
  Given a port forward is active for pod "nginx-pod"
  And the "Port Forwarding" category is currently expanded
  When the pod "nginx-pod" is deleted from the cluster
  Then the kubectl process should terminate
  And the forward should be removed from PortForwardManager state
  And an info notification should appear saying "Port forward stopped: Pod 'nginx-pod' was deleted"
  And the status bar should update immediately
  When the user collapses and re-expands "Port Forwarding"
  Then the deleted forward should no longer appear in the list
```

```gherkin
Scenario: Auto-cleanup on extension deactivate
  Given 3 port forwards are active
  When the VS Code extension is deactivated
  Then all 3 kubectl processes should be terminated gracefully
  And all forwards should be removed from state
  And no orphaned processes should remain
```

```gherkin
Scenario: Auto-cleanup on context switch
  Given a port forward is active for context "cluster-1"
  When the user switches kubectl context to "cluster-2"
  Then the port forward should remain active (cross-context forwards are supported)
  And the forward should still be visible in the tree
  But it should be associated with "cluster-1" context
```

## Context Menu Actions

```gherkin
Scenario: Copy local URL
  Given a port forward is active: localhost:8080 → default/nginx-pod:80
  When a user right-clicks on the forward item
  And selects "Copy Local URL"
  Then "http://localhost:8080" should be copied to clipboard
  And an info notification should appear saying "Copied: http://localhost:8080"
```

```gherkin
Scenario: View associated pod
  Given a port forward is active for pod "nginx-pod"
  When a user right-clicks on the forward item
  And selects "View Pod"
  Then the tree should focus on the "nginx-pod" item in Workloads → Pods
  And the pod item should be visible and highlighted
```

```gherkin
Scenario: Restart port forward
  Given a port forward has status "error"
  When a user right-clicks on the forward item
  And selects "Restart Forward"
  Then the existing forward should stop
  And a new forward should start with the same configuration
  And a progress notification should appear
```

## Success Actions

```gherkin
Scenario: Open browser after successful forward
  Given a user has just started a port forward to localhost:8080
  And the success notification appears with "Open Browser" button
  When they click "Open Browser"
  Then the default browser should open to "http://localhost:8080"
```

```gherkin
Scenario: Show forwards after successful start
  Given a user has just started a port forward
  And the success notification appears with "Show Forwards" button
  When they click "Show Forwards"
  Then the tree view should focus
  And the "Port Forwarding" category should expand
  And the new forward item should be visible
```

## Multiple Forwards

```gherkin
Scenario: Multiple forwards to same pod
  Given a Pod "nginx-pod" with ports 80 and 443
  When a user starts forward localhost:8080 → nginx-pod:80
  And then starts forward localhost:8443 → nginx-pod:443
  Then both forwards should be active
  And both should appear in the tree:
    | localhost:8080 → default/nginx-pod:80  |
    | localhost:8443 → default/nginx-pod:443 |
  And the pod should show badge "nginx-pod ⚡"
  And the status bar should show "kube9: 2 forwards active"
```

```gherkin
Scenario: Multiple forwards across namespaces
  Given a pod "api" in namespace "dev" and a pod "api" in namespace "prod"
  When forwards are active for both:
    | localhost:3000 → dev/api:3000  |
    | localhost:3001 → prod/api:3000 |
  Then both should appear in the tree
  And they should be distinguishable by namespace in the label
```

```gherkin
Scenario: Forward sorting in tree
  Given multiple forwards are active:
    | localhost:8080 → prod/web:80    |
    | localhost:3000 → dev/api:3000   |
    | localhost:9000 → dev/admin:9000 |
  When displayed in the tree
  Then they should be sorted by:
    1. Namespace (alphabetically): dev before prod
    2. Pod name (alphabetically): admin before api
    3. Local port (numerically): 3000 before 9000
  And the order should be:
    | localhost:9000 → dev/admin:9000 |
    | localhost:3000 → dev/api:3000   |
    | localhost:8080 → prod/web:80    |
```

## Uptime Display

```gherkin
Scenario: Uptime calculated on-demand
  Given a port forward started 45 seconds ago
  When a user expands the "Port Forwarding" category
  Then the description should show "connected • 45s"
  When they collapse and re-expand after 30 more seconds
  Then the description should show "connected • 1m 15s"
  When they view it again after 1 hour and 5 minutes total
  Then the description should show "connected • 1h 5m"
```

```gherkin
Scenario: Uptime accuracy without polling
  Given a port forward is active
  Then no periodic refresh timers should be running
  And uptime is calculated fresh from startTime each time the category is expanded
  When a user expands "Port Forwarding" at any time
  Then the uptime shown is accurate to the current moment
```

## Tree Refresh Behavior

```gherkin
Scenario: Tree shows current state on-demand
  Given the "Port Forwarding" category is collapsed
  And a port forward is started: localhost:8080 → default/nginx-pod:80
  Then the status bar should immediately show "kube9: 1 forward active"
  But the tree does not automatically refresh
  When the user expands "Port Forwarding" category
  Then the tree queries PortForwardManager for current state
  And the forward item should appear: "localhost:8080 → default/nginx-pod:80"
```

```gherkin
Scenario: Manual refresh shows latest state
  Given the "Port Forwarding" category is expanded showing 1 forward
  And a second forward is started without the user seeing it
  And a third forward is stopped without the user seeing it
  When the user clicks the "Refresh" button on the tree
  Then the tree queries PortForwardManager again
  And the display updates to show the current state of all forwards
  And the uptime is recalculated from startTime for accurate values
```

```gherkin
Scenario: Status bar click refreshes tree
  Given 2 port forwards are active
  And the status bar shows "kube9: 2 forwards active"
  And the tree is showing stale data or collapsed
  When the user clicks on the status bar item
  Then the tree should focus on "Port Forwarding" category
  And VS Code should call getChildren which queries current state
  And both forwards should be visible with current status
```

```gherkin
Scenario: No background refresh overhead
  Given 5 port forwards are active
  And the "Port Forwarding" category is collapsed
  Then no tree refresh events should fire
  And no periodic timers should be running for tree updates
  And the tree performance is not impacted
  When the user expands "Port Forwarding"
  Then getChildren is called once to fetch current state
  And the tree displays accurate information
```

## Edge Cases

```gherkin
Scenario: Start forward when pod exists in multiple contexts
  Given a pod "nginx-pod" exists in context "cluster-1"
  And a pod "nginx-pod" exists in context "cluster-2"
  And the current context is "cluster-1"
  When a user starts a port forward for "nginx-pod"
  Then the forward should use context "cluster-1"
  And the tree item should show the forward associated with "cluster-1"
```

```gherkin
Scenario: Handle rapid start and stop
  Given a user quickly starts and stops a port forward multiple times
  Then each operation should complete without race conditions
  And the tree should reflect the correct state
  And no orphaned processes should remain
```

```gherkin
Scenario: Handle large number of forwards
  Given a user has 10 active port forwards
  When they view the "Port Forwarding" category
  Then all 10 forward items should display correctly
  And scrolling should work smoothly
  And performance should remain acceptable
```

```gherkin
Scenario: Forward state persists independent of tree
  Given 2 port forwards are active
  When the user manually refreshes the tree view
  Then the forwards remain active in PortForwardManager
  When they expand "Port Forwarding" category
  Then the tree queries the manager and shows both forwards
  And the status bar count remains accurate throughout
  And uptime is calculated fresh showing accurate elapsed time
```

```gherkin
Scenario: No forward persistence across extension reload
  Given 3 port forwards are active
  When the VS Code window is reloaded
  Then the extension should re-activate
  And all previous forwards should be stopped
  And the "Port Forwarding" category should show "No active port forwards"
  And the user must manually restart forwards if desired
```

## Validation and Error Prevention

```gherkin
Scenario: Prevent duplicate forwards
  Given a forward is active: localhost:8080 → default/nginx-pod:80
  When a user attempts to start the same forward again (same pod, same ports)
  Then they should see a message "This forward is already active"
  And no new forward should be created
  And the existing forward should remain unchanged
```

```gherkin
Scenario: Handle special characters in pod names
  Given a Pod named "my-app-pod-abc123-xyz" exists
  When a user starts a port forward for this pod
  Then the kubectl command should properly handle the pod name
  And the forward should establish successfully
  And the tree item should display the full pod name correctly
```

```gherkin
Scenario: Port Forward only visible for running pods
  Given the tree shows pods with various statuses
  When a user right-clicks on a pod with status "Running"
  Then the "Port Forward" option should appear in the context menu
  When they right-click on a pod with status "Pending"
  Then the "Port Forward" option should appear but trigger an error when clicked
  When they right-click on a Deployment, Service, or other non-Pod resource
  Then the "Port Forward" option should not appear
```

## Accessibility and User Experience

```gherkin
Scenario: Keyboard navigation in port forward tree
  Given the tree view is focused
  And the "Port Forwarding" category is visible
  When the user navigates with arrow keys to a forward item
  And presses Enter
  Then a quick actions menu should appear
  And the user can select actions without using a mouse
```

```gherkin
Scenario: Screen reader announces forward changes
  Given a screen reader is active
  When a new port forward is established
  Then the screen reader should announce "Port forward established localhost 8080 to default nginx-pod port 80"
  When a forward is stopped
  Then the screen reader should announce "Port forward stopped localhost 8080"
```

```gherkin
Scenario: Clear error messages for common issues
  Given various error conditions occur
  Then error messages should be clear and actionable:
    | Condition               | Message                                                                  |
    | kubectl not found       | kubectl not found. Please install kubectl to use port forwarding.       |
    | Pod not running         | Cannot port forward: Pod 'name' is not in Running state (current: Pending) |
    | Port in use             | Port 8080 is already in use. Try port 8081?                            |
    | Permission denied       | Permission denied: You need pods/portforward permission in namespace 'default' |
    | Connection timeout      | Port forward connection timed out. Check pod logs and try again.         |
    | Network error           | Connection failed: Unable to reach pod. Check cluster connectivity.      |
```

