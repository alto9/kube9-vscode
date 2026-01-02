---
feature_id: pod-describe-webview
name: Pod Describe Webview
description: Graphical kubectl describe functionality for Pod resources with detailed information display
spec_id:
  - pod-describe-webview-spec
diagram_id:
  - pod-describe-architecture
---

# Pod Describe Webview

```gherkin
Background:
  Given the kube9 VS Code extension is installed and activated
  And the user has a valid kubeconfig file
  And the user is connected to a cluster
  And the cluster contains Pod resources
```

## Opening Describe Webview

```gherkin
Scenario: Left-click Pod opens Describe webview
  Given a user has expanded the "Workloads" category in the tree view
  And they have expanded the "Pods" subcategory
  And a Pod named "nginx-pod" exists in namespace "default"
  When they left-click on "nginx-pod"
  Then a Describe webview should open or reveal
  And the webview title should show "Pod / nginx-pod"
  And the webview should display detailed Pod information in a graphical format
  And the Overview tab should be selected by default
```

```gherkin
Scenario: Reuse webview for same cluster
  Given a Describe webview is already open showing "nginx-pod"
  And the webview is for cluster context "my-cluster"
  When the user left-clicks on another Pod "api-pod" in the same cluster
  Then the existing webview should update its content
  And the webview title should change to "Pod / api-pod"
  And the webview should display information for "api-pod"
  And no additional webview panels should be created
```

```gherkin
Scenario: Separate webviews for different clusters
  Given a Describe webview is open for cluster "cluster-1" showing "nginx-pod"
  When the user switches to cluster "cluster-2"
  And they left-click on a Pod "api-pod" in "cluster-2"
  Then a new Describe webview should open for "cluster-2"
  And both webviews should remain open independently
  And each webview title should include the cluster context
```

## Overview Tab

```gherkin
Scenario: Overview displays Pod status information
  Given a user has opened the Describe webview for a Pod named "nginx-pod"
  And the Pod has status "Running" and phase "Running"
  When they view the Overview tab
  Then they should see the Pod name "nginx-pod"
  And they should see the namespace "default"
  And they should see the status badge showing "Running" with a green indicator
  And they should see the health status "Healthy" with appropriate color
  And they should see the Pod phase "Running"
```

```gherkin
Scenario: Overview shows node placement and networking
  Given a Pod "web-pod" is running on node "worker-node-1"
  And the Pod has IP "10.244.1.5"
  And the host node has IP "192.168.1.10"
  When a user views the Overview tab
  Then they should see:
    | Field     | Value           |
    | Node      | worker-node-1   |
    | Pod IP    | 10.244.1.5      |
    | Host IP   | 192.168.1.10    |
  And the node name should be clickable to view node details
```

```gherkin
Scenario: Overview shows Pod configuration details
  Given a Pod "api-pod" with QoS class "Burstable"
  And restart policy "Always"
  And service account "api-service-account"
  When a user views the Overview tab
  Then they should see:
    | Field            | Value                |
    | QoS Class        | Burstable            |
    | Restart Policy   | Always               |
    | Service Account  | api-service-account  |
```

```gherkin
Scenario: Overview calculates and displays Pod age
  Given a Pod "old-pod" was created 3 days, 5 hours, and 23 minutes ago
  When a user views the Overview tab
  Then they should see the Age field showing "3d"
  And the Start Time field showing the exact timestamp
  And the age should update if they refresh the webview
```

```gherkin
Scenario: Health status reflects Pod conditions
  Given a Pod with phase "Running"
  And all conditions show status "True"
  And no containers have restarted
  When a user views the Overview tab
  Then the health status should show "Healthy" with a green indicator
  
  Given a Pod with phase "Running"
  And Ready condition is "False"
  Then the health status should show "Unhealthy" with a red indicator
  
  Given a Pod with phase "Pending"
  Then the health status should show "Degraded" with a yellow indicator
```

## Containers Tab

```gherkin
Scenario: Containers tab shows all container information
  Given a Pod "web-pod" has 2 containers: "nginx" and "sidecar"
  When a user clicks on the Containers tab
  Then they should see 2 container cards displayed
  And each card should show:
    - Container name
    - Status (Running/Waiting/Terminated)
    - Image and Image ID
    - Ready indicator
    - Restart count
```

```gherkin
Scenario: Container card displays status with visual indicator
  Given a container "nginx" with status "Running"
  When displayed in the Containers tab
  Then the container card should show status "Running"
  And the status should have a green background
  And the status should include a checkmark icon
  
  Given a container "init" with status "Waiting" and reason "PodInitializing"
  Then the container card should show status "Waiting: PodInitializing"
  And the status should have a yellow background
  And the status should include a clock icon
  
  Given a container "failed" with status "Terminated" and exit code 1
  Then the container card should show status "Terminated: Error (Exit 1)"
  And the status should have a red background
  And the status should include an error icon
```

```gherkin
Scenario: Container shows resource requests and limits
  Given a container "nginx" with resource configuration:
    | Type     | CPU   | Memory |
    | Requests | 100m  | 128Mi  |
    | Limits   | 500m  | 512Mi  |
  When displayed in the Containers tab
  Then the container card should show a Resources section with:
    | Requests | CPU: 100m, Memory: 128Mi  |
    | Limits   | CPU: 500m, Memory: 512Mi  |
  And resource values should be formatted with units
```

```gherkin
Scenario: Container shows no resources if not set
  Given a container "app" with no resource requests or limits
  When displayed in the Containers tab
  Then the Resources section should show:
    | Requests | CPU: Not set, Memory: Not set |
    | Limits   | CPU: Not set, Memory: Not set |
```

```gherkin
Scenario: Container displays exposed ports
  Given a container "nginx" exposes ports:
    | Name   | Container Port | Protocol | Host Port |
    | http   | 80             | TCP      | -         |
    | https  | 443            | TCP      | -         |
    | metrics| 9090           | TCP      | 9090      |
  When displayed in the Containers tab
  Then the Ports section should show:
    | http: 80/TCP           |
    | https: 443/TCP         |
    | metrics: 9090/TCP → 9090 |
```

```gherkin
Scenario: Container shows restart count with warning
  Given a container "unstable" with restart count 0
  When displayed in the Containers tab
  Then the restart count should show "0" with normal styling
  
  Given a container "crashing" with restart count 5
  Then the restart count should show "5" with a yellow warning indicator
  And there should be a tooltip explaining "Container has restarted 5 times"
  
  Given a container "broken" with restart count 15
  Then the restart count should show "15" with a red error indicator
  And there should be a tooltip with last termination reason if available
```

```gherkin
Scenario: Init containers shown separately
  Given a Pod has 1 init container "init-config" and 2 regular containers
  When a user views the Containers tab
  Then they should see a section titled "Init Containers (1)"
  And they should see a section titled "Containers (2)"
  And init containers should be displayed above regular containers
  And both sections should use the same card format
```

```gherkin
Scenario: Container environment variables displayed
  Given a container "app" has environment variables:
    | Name       | Value          | Source     |
    | PORT       | 8080           | direct     |
    | DB_HOST    | postgres.svc   | direct     |
    | API_KEY    | <from-secret>  | secret/keys|
    | NODE_NAME  | <from-field>   | spec.nodeName|
  When a user expands the Environment section of the container card
  Then they should see all environment variables listed
  And direct values should show the actual value
  And secret references should show "<from-secret: secret/keys>"
  And field references should show "<from-field: spec.nodeName>"
  And the section should be collapsible
```

```gherkin
Scenario: Container volume mounts displayed
  Given a container "app" has volume mounts:
    | Name       | Mount Path        | Read Only | Sub Path |
    | config-vol | /etc/config       | true      | -        |
    | data-vol   | /var/data         | false     | -        |
    | logs-vol   | /var/log/app      | false     | app      |
  When a user expands the Volume Mounts section
  Then they should see all mounts listed with:
    - Volume name
    - Mount path
    - Read-only indicator if applicable
    - Sub path if specified
```

## Conditions Tab

```gherkin
Scenario: Conditions tab displays Pod conditions
  Given a Pod has conditions:
    | Type              | Status | Last Transition      | Reason    | Message                  |
    | Initialized       | True   | 2025-12-30T10:00:00 | -         | -                        |
    | Ready             | True   | 2025-12-30T10:01:00 | -         | -                        |
    | ContainersReady   | True   | 2025-12-30T10:01:00 | -         | -                        |
    | PodScheduled      | True   | 2025-12-30T09:59:00 | -         | -                        |
  When a user clicks on the Conditions tab
  Then they should see a table with all 4 conditions
  And each row should show Type, Status, Last Transition, Reason, and Message
  And "True" status should have a green indicator
  And "False" status should have a red indicator
  And "Unknown" status should have a gray indicator
```

```gherkin
Scenario: Conditions show helpful messages when not ready
  Given a Pod has condition:
    | Type   | Status | Reason              | Message                                    |
    | Ready  | False  | ContainersNotReady  | containers with unready status: [web]      |
  When displayed in the Conditions tab
  Then the Ready row should show:
    - Status "False" with red indicator
    - Reason "ContainersNotReady"
    - Message explaining which containers are not ready
  And the row should be visually distinct to highlight the issue
```

```gherkin
Scenario: Conditions sorted by transition time
  Given a Pod has conditions with various transition times
  When a user views the Conditions tab
  Then conditions should be sorted by Last Transition time
  And the most recent transition should appear at the top
  And users can click column headers to change sort order
```

## Events Tab

```gherkin
Scenario: Events tab shows Pod events in timeline
  Given a Pod "nginx-pod" has events:
    | Type    | Reason    | Message                            | Count | Age  |
    | Normal  | Scheduled | Successfully assigned to node-1    | 1     | 10m  |
    | Normal  | Pulling   | Pulling image "nginx:latest"       | 1     | 9m   |
    | Normal  | Pulled    | Successfully pulled image          | 1     | 8m   |
    | Normal  | Created   | Created container nginx            | 1     | 8m   |
    | Normal  | Started   | Started container nginx            | 1     | 8m   |
  When a user clicks on the Events tab
  Then they should see all events in a timeline view
  And events should be ordered by most recent first
  And each event should show Type, Reason, Message, Count, and Age
```

```gherkin
Scenario: Warning events visually distinct
  Given a Pod has events including:
    | Type    | Reason      | Message                        |
    | Normal  | Started     | Container started successfully |
    | Warning | BackOff     | Back-off restarting failed container |
    | Warning | FailedMount | Unable to mount volume         |
  When displayed in the Events tab
  Then Normal events should have a blue/gray indicator
  And Warning events should have a yellow/orange indicator
  And Warning events should be visually prominent
  And users can filter to show only warnings
```

```gherkin
Scenario: Events grouped by type and reason
  Given a Pod has received the same event multiple times:
    | Type    | Reason   | First Occurrence    | Last Occurrence     | Count |
    | Warning | BackOff  | 2025-12-30T10:00:00 | 2025-12-30T10:15:00 | 23    |
  When displayed in the Events tab
  Then the event should appear once with count "23"
  And it should show First Occurrence: 10:00:00
  And it should show Last Occurrence: 10:15:00 (most recent)
  And the Age should be calculated from the last occurrence
```

```gherkin
Scenario: Events show source component
  Given events from different sources:
    | Source              | Reason    |
    | kubelet             | Started   |
    | scheduler           | Scheduled |
    | default-scheduler   | Bound     |
  When displayed in the Events tab
  Then each event should show its source component
  And source should be displayed in a secondary color
  And users can filter events by source
```

```gherkin
Scenario: No events message
  Given a Pod has no events
  When a user views the Events tab
  Then they should see a message "No events found for this Pod"
  And a suggestion to "Check if events have expired (events are retained for ~1 hour)"
```

## Header Actions

```gherkin
Scenario: Refresh button updates Pod data
  Given a user has the Describe webview open for "nginx-pod"
  When they click the "Refresh" button in the header
  Then a loading indicator should appear
  And the extension should fetch fresh Pod data from the API
  And all tabs should update with the latest information
  And a success notification should briefly appear
  And the last refresh time should be updated
```

```gherkin
Scenario: View YAML button opens editor
  Given a user has the Describe webview open for "nginx-pod"
  When they click the "View YAML" button in the header
  Then a new editor tab should open
  And the editor should contain the full YAML manifest for "nginx-pod"
  And the editor should use YAML syntax highlighting
  And the editor should be read-only
```

```gherkin
Scenario: Additional quick actions in header
  Given the Describe webview is open for a running Pod
  When a user views the header action buttons
  Then they should see:
    - Refresh button
    - View YAML button
    - Open Terminal button (if Pod is running)
    - Port Forward button (if Pod is running)
  And all buttons should have clear labels and icons
```

## Tab Navigation

```gherkin
Scenario: Tab navigation updates content area
  Given the Describe webview is open showing the Overview tab
  When a user clicks on the "Containers" tab button
  Then the Containers tab should become active
  And the content area should display container information
  And the Overview tab should become inactive
  And the tab button should be visually highlighted
```

```gherkin
Scenario: Tab badges show counts
  Given a Pod has 3 containers and 12 events
  When a user views the tab navigation
  Then the Containers tab should show badge "Containers (3)"
  And the Events tab should show badge "Events (12)"
  And the Overview and Conditions tabs should not have badges
```

```gherkin
Scenario: Keyboard navigation between tabs
  Given the Describe webview is focused
  When a user presses Tab key to reach the tab navigation
  And presses Right Arrow key
  Then the next tab should be selected
  When they press Left Arrow key
  Then the previous tab should be selected
  When they press Enter
  Then the selected tab should activate and show its content
```

## Error Handling

```gherkin
Scenario: Pod not found error
  Given a user has the Describe webview open for "nginx-pod"
  When the Pod "nginx-pod" is deleted from the cluster
  And they click Refresh
  Then an error message should appear in the webview
  And the message should say "Pod 'nginx-pod' not found in namespace 'default'"
  And there should be a "Refresh Tree" button to update the tree view
  And there should be a "Close" button to close the webview
```

```gherkin
Scenario: Permission denied error
  Given a user lacks permissions to read Pods in namespace "production"
  When they attempt to open Describe webview for a Pod in "production"
  Then an error message should appear
  And the message should say "Permission denied: Unable to read Pod. Check your RBAC permissions."
  And there should be a link to Kubernetes RBAC documentation
```

```gherkin
Scenario: Network connectivity error
  Given the Kubernetes API server becomes unreachable
  When a user tries to open or refresh the Describe webview
  Then an error message should appear
  And the message should say "Unable to connect to Kubernetes API. Check your cluster connection."
  And there should be a "Retry" button
  And there should be a "View Connection Settings" button
```

```gherkin
Scenario: Graceful handling of missing data
  Given a Pod has incomplete status information
  When displayed in the webview
  Then missing fields should show "N/A" or "Unknown"
  And no JavaScript errors should occur
  And the webview should remain functional
  And available information should display correctly
```

## Performance

```gherkin
Scenario: Fast initial load
  Given a user clicks on a Pod in the tree view
  When the Describe webview opens
  Then the webview should appear within 500ms
  And a loading indicator should show while fetching data
  And the Overview tab should populate first
  And other tabs should load in the background
```

```gherkin
Scenario: Efficient data refresh
  Given the Describe webview is open with cached data
  When a user clicks Refresh
  And the Pod data has not changed
  Then the webview should reuse cached data where possible
  And only changed information should trigger UI updates
  And the refresh should complete within 300ms
```

```gherkin
Scenario: Virtual scrolling for large event lists
  Given a Pod has over 100 events
  When a user views the Events tab
  Then only visible events should be rendered in the DOM
  And scrolling should be smooth and responsive
  And all events should be accessible through scrolling
  And memory usage should remain reasonable
```

## Accessibility

```gherkin
Scenario: Screen reader announces Pod information
  Given a screen reader is active
  When a user opens the Describe webview for "nginx-pod"
  Then the screen reader should announce "Pod nginx-pod describe view opened"
  When they navigate to the status badge
  Then the screen reader should announce "Status: Running, Healthy"
  When they navigate to the Containers tab
  Then the screen reader should announce "Containers, 2 containers"
```

```gherkin
Scenario: High contrast mode support
  Given the user has enabled high contrast mode
  When they view the Describe webview
  Then all status indicators should use high contrast colors
  And text should be clearly readable
  And borders and separators should be visible
  And no information should be conveyed by color alone
```

```gherkin
Scenario: Keyboard-only navigation
  Given a user navigates using only keyboard
  When they open the Describe webview
  Then they can Tab to all interactive elements
  And they can use arrow keys to navigate tabs
  And they can use Enter to activate buttons
  And they can use Escape to close dialogs
  And focus indicators are clearly visible at all times
```

## Edge Cases

```gherkin
Scenario: Pod with no containers
  Given a Pod exists with no containers defined
  When a user views the Containers tab
  Then they should see a message "No containers found"
  And the tab should not show an error
  And other tabs should work normally
```

```gherkin
Scenario: Pod in multiple namespaces with same name
  Given a Pod "api-pod" exists in namespace "dev"
  And a Pod "api-pod" exists in namespace "prod"
  When a user opens Describe for "dev/api-pod"
  Then the webview should clearly show namespace "dev"
  When they open Describe for "prod/api-pod"
  Then the webview should update to show namespace "prod"
  And the correct Pod data should be displayed for each namespace
```

```gherkin
Scenario: Very long Pod names or labels
  Given a Pod with a 63-character name (max allowed)
  And labels with long values
  When displayed in the webview
  Then the Pod name should wrap or truncate gracefully
  And long label values should be truncatable or scrollable
  And the layout should not break
  And the full name should be available in a tooltip
```

```gherkin
Scenario: Pod with many containers
  Given a Pod has 10 containers
  When a user views the Containers tab
  Then all 10 containers should be displayed
  And the tab should remain scrollable and performant
  And each container card should be equally readable
```

```gherkin
Scenario: Rapid Pod switching
  Given a user quickly clicks on multiple different Pods
  When each click triggers a webview update
  Then only the most recent Pod's data should display
  And no race conditions should occur
  And previous requests should be cancelled
  And the webview should show the correct final Pod
```

