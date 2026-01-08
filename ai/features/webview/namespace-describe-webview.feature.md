---
feature_id: namespace-describe-webview
name: Namespace Describe Webview
description: Comprehensive namespace information display in the shared describe webview with overview, resources, quotas, limit ranges, and events
spec_id:
  - namespace-describe-webview-spec
diagram_id:
  - namespace-describe-architecture
---

# Namespace Describe Webview

```gherkin
Background:
  Given the kube9 VS Code extension is installed and activated
  And the user has a valid kubeconfig file
  And the user is connected to a cluster
  And the cluster contains Namespace resources
```

## Opening Describe Webview

```gherkin
Scenario: Left-click Namespace opens shared Describe webview
  Given a user has expanded the "Namespaces" category in the tree view
  And a Namespace named "production" exists
  When they left-click on "production"
  Then the shared Describe webview should open or reveal
  And the webview title should show "Namespace / production"
  And the webview should display detailed Namespace information
  And the Overview tab should be selected by default
```

```gherkin
Scenario: Reuse webview for same cluster
  Given the Describe webview is already open showing "Pod / nginx-pod"
  And the webview is for cluster context "my-cluster"
  When the user left-clicks on a Namespace "production" in the same cluster
  Then the existing webview should update its content
  And the webview title should change to "Namespace / production"
  And the webview should display information for "production"
  And no additional webview panels should be created
```

```gherkin
Scenario: Separate webviews for different clusters
  Given the Describe webview is open for cluster "cluster-1" showing a namespace
  When the user switches to cluster "cluster-2"
  And they left-click on a Namespace "staging" in "cluster-2"
  Then a new Describe webview should open for "cluster-2"
  And both webviews should remain open independently
  And each webview title should include the cluster context
```

## Overview Tab

```gherkin
Scenario: Overview displays Namespace status information
  Given a user has opened the Describe webview for a Namespace named "production"
  And the Namespace has status "Active"
  When they view the Overview tab
  Then they should see the Namespace name "production"
  And they should see the status badge showing "Active" with a green indicator
  And they should see the phase "Active"
  And they should see the UID and resource version
```

```gherkin
Scenario: Overview shows Namespace metadata
  Given a Namespace "production" was created 30 days ago
  And the Namespace has labels:
    | Key                  | Value       |
    | environment          | production  |
    | managed-by           | kube9       |
    | app.kubernetes.io/name | myapp     |
  And the Namespace has annotations:
    | Key                  | Value                 |
    | description          | Production workloads  |
    | owner                | platform-team         |
  When a user views the Overview tab
  Then they should see:
    | Field             | Value                |
    | Name              | production           |
    | Status            | Active               |
    | Age               | 30d                  |
    | Creation Time     | exact timestamp      |
  And they should see the Labels section with all labels
  And they should see the Annotations section with all annotations
  And labels and annotations should be copyable
```

```gherkin
Scenario: Overview calculates and displays Namespace age
  Given a Namespace "staging" was created 5 hours and 30 minutes ago
  When a user views the Overview tab
  Then they should see the Age field showing "5h"
  And the Creation Time field showing the exact timestamp
  And the age should update if they refresh the webview
```

```gherkin
Scenario: Overview shows Terminating phase
  Given a Namespace "old-project" is being deleted
  And the Namespace phase is "Terminating"
  When a user views the Overview tab
  Then the phase should show "Terminating"
  And the status badge should show "Terminating" with a yellow indicator
  And a message should explain "Namespace is being deleted"
```

## Resources Tab

```gherkin
Scenario: Resources tab shows comprehensive resource counts
  Given a Namespace "production" contains various resources
  When a user clicks on the Resources tab
  Then they should see a Resource Summary section showing:
    | Resource Type     | Count | Health Status |
    | Pods              | 25    | 22 Running, 2 Pending, 1 Failed |
    | Deployments       | 8     | Healthy       |
    | StatefulSets      | 3     | Healthy       |
    | DaemonSets        | 2     | Healthy       |
    | Services          | 12    | 10 ClusterIP, 1 NodePort, 1 LoadBalancer |
    | ConfigMaps        | 15    | -             |
    | Secrets           | 20    | -             |
    | Ingresses         | 4     | -             |
    | Jobs              | 5     | 3 Completed, 2 Failed |
    | CronJobs          | 3     | -             |
    | PersistentVolumeClaims | 8  | 8 Bound      |
  And each resource type should have a visual indicator
  And resource counts should be accurate
```

```gherkin
Scenario: Resources tab shows health indicators for workloads
  Given a Namespace contains Pods with various statuses
  And 22 Pods are Running
  And 2 Pods are Pending
  And 1 Pod is Failed
  When a user views the Resources tab
  Then the Pods row should show:
    - Count: 25
    - Health breakdown: "22 Running, 2 Pending, 1 Failed"
    - Visual indicator: Yellow (some issues)
  And the Failed Pod count should be highlighted in red
```

```gherkin
Scenario: Resources tab shows Service type breakdown
  Given a Namespace contains Services with various types
  When a user views the Resources tab
  Then the Services row should show:
    - Total count: 12
    - Type breakdown: "10 ClusterIP, 1 NodePort, 1 LoadBalancer"
  And each Service type should be clearly labeled
```

```gherkin
Scenario: Resources tab shows Job completion status
  Given a Namespace contains Jobs
  And 3 Jobs have completed successfully
  And 2 Jobs have failed
  When a user views the Resources tab
  Then the Jobs row should show:
    - Total count: 5
    - Status breakdown: "3 Completed, 2 Failed"
  And the failed count should have a warning indicator
```

```gherkin
Scenario: Resources tab handles empty namespace
  Given a Namespace "empty-namespace" contains no resources
  When a user views the Resources tab
  Then all resource counts should show "0"
  And a message should indicate "This namespace contains no resources"
  And the display should remain clean and readable
```

```gherkin
Scenario: Resources tab clickable resource types
  Given a user views the Resources tab
  When they click on a resource type row (e.g., "Deployments")
  Then the tree view should navigate to show that resource type in the namespace
  And the Deployments category should expand
  And the namespace filter should be applied
```

## Quotas Tab

```gherkin
Scenario: Quotas tab displays configured resource quotas
  Given a Namespace "production" has a resource quota configured
  And the quota limits:
    | Resource    | Hard Limit | Current Usage |
    | CPU         | 20 cores   | 12 cores      |
    | Memory      | 64Gi       | 42Gi          |
    | Pods        | 100        | 67            |
    | Services    | 50         | 23            |
  When a user clicks on the Quotas tab
  Then they should see each resource quota listed
  And each resource should show:
    - Resource name
    - Hard limit
    - Current usage
    - Percentage used
    - Visual progress bar
```

```gherkin
Scenario: Quotas tab shows usage percentage with visual indicators
  Given a resource quota for CPU is 20 cores
  And current usage is 12 cores (60%)
  When displayed in the Quotas tab
  Then the progress bar should show 60% filled
  And the bar should be colored blue (normal usage)
  
  Given current usage increases to 18 cores (90%)
  Then the progress bar should show 90% filled
  And the bar should be colored yellow (high usage)
  
  Given current usage reaches 20 cores (100%)
  Then the progress bar should show 100% filled
  And the bar should be colored red (at limit)
  And a warning icon should appear
```

```gherkin
Scenario: Quotas tab warns when approaching limits
  Given a Namespace has a memory quota of 64Gi
  And current usage is 60Gi (93.75%)
  When a user views the Quotas tab
  Then the memory quota row should have a warning indicator
  And a tooltip should explain "Approaching quota limit"
  And the progress bar should be yellow
```

```gherkin
Scenario: Quotas tab handles multiple resource quota objects
  Given a Namespace has 2 resource quota objects:
    - "compute-quota" for CPU and memory
    - "object-quota" for Pods, Services, ConfigMaps
  When a user views the Quotas tab
  Then each quota object should be displayed in a separate section
  And each section should be labeled with the quota name
  And all resources should be grouped by their quota object
```

```gherkin
Scenario: Quotas tab shows no quotas message
  Given a Namespace "dev" has no resource quotas configured
  When a user clicks on the Quotas tab
  Then they should see a message "No resource quotas configured for this namespace"
  And a suggestion to "Resource quotas help limit resource consumption"
  And no quota information should be displayed
```

```gherkin
Scenario: Quotas tab shows all quota-supported resources
  Given a Namespace has a comprehensive resource quota
  When a user views the Quotas tab
  Then they should see quotas for:
    | Resource Type               |
    | CPU (requests and limits)   |
    | Memory (requests and limits)|
    | Storage requests            |
    | Ephemeral storage           |
    | Pods                        |
    | Services                    |
    | Services (LoadBalancer)     |
    | Services (NodePort)         |
    | ConfigMaps                  |
    | Secrets                     |
    | PersistentVolumeClaims      |
  And each resource should format values appropriately
```

## Limit Ranges Tab

```gherkin
Scenario: Limit Ranges tab displays configured limit ranges
  Given a Namespace "production" has limit ranges configured
  And the limit range for Container type specifies:
    | Constraint      | CPU     | Memory  |
    | Default Request | 100m    | 128Mi   |
    | Default Limit   | 500m    | 512Mi   |
    | Min             | 50m     | 64Mi    |
    | Max             | 2 cores | 4Gi     |
  When a user clicks on the Limit Ranges tab
  Then they should see the Container limit range section
  And they should see all constraints with their values
  And resource values should be formatted with units
```

```gherkin
Scenario: Limit Ranges tab shows constraints by resource type
  Given a Namespace has limit ranges for:
    - Container
    - Pod
    - PersistentVolumeClaim
  When a user views the Limit Ranges tab
  Then each resource type should have its own section
  And the sections should be labeled:
    - "Container Limits"
    - "Pod Limits"
    - "Persistent Volume Claim Limits"
  And each section should show applicable constraints
```

```gherkin
Scenario: Limit Ranges tab explains constraint types
  Given a user views a limit range in the Limit Ranges tab
  Then each constraint type should have a clear label:
    | Constraint       | Description                                    |
    | Default Request  | Applied if container doesn't specify request  |
    | Default Limit    | Applied if container doesn't specify limit    |
    | Min              | Minimum value allowed                          |
    | Max              | Maximum value allowed                          |
    | Max/Min Ratio    | Maximum ratio between limit and request        |
  And hovering over constraint labels should show tooltips
```

```gherkin
Scenario: Limit Ranges tab handles multiple limit range objects
  Given a Namespace has 2 limit range objects:
    - "default-limits" for containers
    - "storage-limits" for PVCs
  When a user views the Limit Ranges tab
  Then each limit range object should be displayed in a separate card
  And each card should be labeled with the limit range name
  And constraints should be grouped by their limit range object
```

```gherkin
Scenario: Limit Ranges tab shows no limit ranges message
  Given a Namespace "test" has no limit ranges configured
  When a user clicks on the Limit Ranges tab
  Then they should see a message "No limit ranges configured for this namespace"
  And a suggestion to "Limit ranges provide default resource constraints for pods and containers"
  And no limit range information should be displayed
```

```gherkin
Scenario: Limit Ranges tab shows PVC constraints
  Given a Namespace has a limit range for PersistentVolumeClaim
  And the limit range specifies:
    | Constraint | Storage |
    | Min        | 1Gi     |
    | Max        | 100Gi   |
  When a user views the Limit Ranges tab
  Then they should see the PVC limit range section
  And storage constraints should be displayed with appropriate units
```

## Events Tab

```gherkin
Scenario: Events tab shows Namespace events in timeline
  Given a Namespace "production" has events:
    | Type    | Reason           | Message                                 | Count | Age  |
    | Normal  | NamespaceCreated | Namespace created successfully          | 1     | 30d  |
    | Warning | QuotaExceeded    | Resource quota exceeded for memory      | 5     | 2h   |
    | Warning | LimitRangeViolation | Pod exceeds maximum CPU limit        | 2     | 1h   |
  When a user clicks on the Events tab
  Then they should see all events in a timeline view
  And events should be ordered by most recent first
  And each event should show Type, Reason, Message, Count, and Age
```

```gherkin
Scenario: Warning events visually distinct in Events tab
  Given a Namespace has events including:
    | Type    | Reason           | Message                          |
    | Normal  | NamespaceCreated | Namespace created successfully   |
    | Warning | QuotaExceeded    | Resource quota exceeded          |
  When displayed in the Events tab
  Then Normal events should have a blue/gray indicator
  And Warning events should have a yellow/orange indicator
  And Warning events should be visually prominent
  And users can filter to show only warnings
```

```gherkin
Scenario: Events grouped by type and reason
  Given a Namespace has received the same event multiple times:
    | Type    | Reason        | First Occurrence    | Last Occurrence     | Count |
    | Warning | QuotaExceeded | 2025-12-30T10:00:00 | 2025-12-30T12:00:00 | 15    |
  When displayed in the Events tab
  Then the event should appear once with count "15"
  And it should show First Occurrence: 10:00:00
  And it should show Last Occurrence: 12:00:00 (most recent)
  And the Age should be calculated from the last occurrence
```

```gherkin
Scenario: Events show source component
  Given events from different sources:
    | Source              | Reason           |
    | namespace-controller| NamespaceCreated |
    | resource-quota-controller | QuotaExceeded |
  When displayed in the Events tab
  Then each event should show its source component
  And source should be displayed in a secondary color
  And users can filter events by source
```

```gherkin
Scenario: No events message in Events tab
  Given a Namespace has no events
  When a user views the Events tab
  Then they should see a message "No events found for this Namespace"
  And a suggestion to "Check if events have expired (events are retained for ~1 hour)"
```

```gherkin
Scenario: Events tab shows namespace-level events only
  Given a Namespace contains Pods with their own events
  And the Namespace itself has events
  When a user views the Events tab
  Then only namespace-level events should be displayed
  And Pod-level events should not appear
  And event filtering should be based on involvedObject.kind === "Namespace"
```

## Header Actions

```gherkin
Scenario: Refresh button updates Namespace data
  Given a user has the Describe webview open for "production"
  When they click the "Refresh" button in the header
  Then a loading indicator should appear
  And the extension should fetch fresh Namespace data from the API
  And all tabs should update with the latest information
  And a success notification should briefly appear
  And the last refresh time should be updated
```

```gherkin
Scenario: View YAML button opens editor
  Given a user has the Describe webview open for "production"
  When they click the "View YAML" button in the header
  Then a new editor tab should open
  And the editor should contain the full YAML manifest for "production"
  And the editor should use YAML syntax highlighting
  And the editor should be editable if user has permissions
```

```gherkin
Scenario: Set as Default Namespace button
  Given a user has the Describe webview open for "production"
  And the current default namespace is "default"
  When they click the "Set as Default Namespace" button in the header
  Then the kubectl context should be updated to use "production" as the default namespace
  And a success notification should appear
  And the tree view should refresh to show resources from "production"
```

## Tab Navigation

```gherkin
Scenario: Tab navigation updates content area
  Given the Describe webview is open showing the Overview tab
  When a user clicks on the "Resources" tab button
  Then the Resources tab should become active
  And the content area should display resource information
  And the Overview tab should become inactive
  And the tab button should be visually highlighted
```

```gherkin
Scenario: Tab badges show counts
  Given a Namespace has 12 events and 3 resource quotas
  When a user views the tab navigation
  Then the Events tab should show badge "Events (12)"
  And the Quotas tab should show badge "Quotas (3)"
  And tabs without counts should not have badges
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
Scenario: Namespace not found error
  Given a user has the Describe webview open for "production"
  When the Namespace "production" is deleted from the cluster
  And they click Refresh
  Then an error message should appear in the webview
  And the message should say "Namespace 'production' not found"
  And there should be a "Refresh Tree" button to update the tree view
  And there should be a "Close" button to close the webview
```

```gherkin
Scenario: Permission denied error
  Given a user lacks permissions to read Namespaces
  When they attempt to open Describe webview for a Namespace
  Then an error message should appear
  And the message should say "Permission denied: Unable to read Namespace. Check your RBAC permissions."
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
  Given a Namespace has incomplete status information
  When displayed in the webview
  Then missing fields should show "N/A" or "Unknown"
  And no JavaScript errors should occur
  And the webview should remain functional
  And available information should display correctly
```

## Performance

```gherkin
Scenario: Fast initial load
  Given a user clicks on a Namespace in the tree view
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
  And the Namespace data has not changed
  Then the webview should reuse cached data where possible
  And only changed information should trigger UI updates
  And the refresh should complete within 300ms
```

```gherkin
Scenario: Resource counting optimization
  Given a Namespace contains 500+ resources
  When loading the Resources tab
  Then resource counting should use pagination
  And initial counts should display within 1 second
  And the UI should remain responsive during counting
```

## Accessibility

```gherkin
Scenario: Screen reader announces Namespace information
  Given a screen reader is active
  When a user opens the Describe webview for "production"
  Then the screen reader should announce "Namespace production describe view opened"
  When they navigate to the status badge
  Then the screen reader should announce "Status: Active"
  When they navigate to the Resources tab
  Then the screen reader should announce "Resources, 25 total resources"
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
Scenario: kube-system namespace special handling
  Given a user opens Describe for "kube-system" namespace
  When the webview displays
  Then a notice should appear explaining "This is a system namespace containing cluster components"
  And resource counts should include system workloads
  And quotas/limits should display normally if configured
```

```gherkin
Scenario: Namespace with many resources
  Given a Namespace contains 1000+ Pods
  When a user views the Resources tab
  Then the Pod count should display accurately
  And the UI should remain responsive
  And resource counting should complete within reasonable time
  And a note should explain that large namespaces may take longer to load
```

```gherkin
Scenario: Very long Namespace names
  Given a Namespace with a 63-character name (max allowed)
  When displayed in the webview
  Then the Namespace name should wrap or truncate gracefully
  And the layout should not break
  And the full name should be available in a tooltip
```

```gherkin
Scenario: Rapid Namespace switching
  Given a user quickly clicks on multiple different Namespaces
  When each click triggers a webview update
  Then only the most recent Namespace's data should display
  And no race conditions should occur
  And previous requests should be cancelled
  And the webview should show the correct final Namespace
```

```gherkin
Scenario: Namespace with complex quota configurations
  Given a Namespace has 5 different resource quota objects
  And each quota covers different resource types
  When a user views the Quotas tab
  Then all quota objects should be displayed
  And each should be clearly separated and labeled
  And the UI should remain organized and readable
  And scroll should be smooth if content exceeds viewport
```

