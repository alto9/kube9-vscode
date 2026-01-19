---
feature_id: pvc-describe-webview
name: PVC Describe Webview
description: Graphical kubectl describe functionality for PersistentVolumeClaim resources with detailed information display
spec_id:
  - pvc-describe-webview-spec
---

# PVC Describe Webview

```gherkin
Background:
  Given the kube9 VS Code extension is installed and activated
  And the user has a valid kubeconfig file
  And the user is connected to a cluster
  And the cluster contains PersistentVolumeClaim resources
```

## Opening Describe Webview

```gherkin
Scenario: Left-click PVC opens Describe webview
  Given a user has expanded the "Storage" category in the tree view
  And they have expanded the "Persistent Volume Claims" subcategory
  And a PVC named "data-pvc" exists in namespace "default"
  When they left-click on "data-pvc"
  Then a Describe webview should open or reveal
  And the webview title should show "PersistentVolumeClaim / data-pvc"
  And the webview should display detailed PVC information in a graphical format
  And the Overview tab should be selected by default
```

```gherkin
Scenario: Reuse webview for same cluster
  Given a Describe webview is already open showing "data-pvc"
  And the webview is for cluster context "my-cluster"
  When the user left-clicks on another PVC "backup-pvc" in the same cluster
  Then the existing webview should update its content
  And the webview title should change to "PersistentVolumeClaim / backup-pvc"
  And the webview should display information for "backup-pvc"
  And no additional webview panels should be created
```

## Overview Tab

```gherkin
Scenario: Overview displays PVC status information
  Given a user has opened the Describe webview for a PVC named "data-pvc"
  And the PVC has status "Bound" and phase "Bound"
  When they view the Overview tab
  Then they should see the PVC name "data-pvc"
  And they should see the namespace "default"
  And they should see the status badge showing "Bound" with a green indicator
  And they should see the health status "Healthy" with appropriate color
  And they should see the PVC phase "Bound"
```

```gherkin
Scenario: Overview shows capacity and storage information
  Given a PVC "data-pvc" with requested capacity "10Gi"
  And actual capacity "10Gi" (if bound)
  And storage class "fast-ssd"
  When a user views the Overview tab
  Then they should see:
    | Field              | Value      |
    | Requested Capacity | 10Gi       |
    | Actual Capacity    | 10Gi       |
    | Storage Class      | fast-ssd   |
```

```gherkin
Scenario: Overview shows access modes
  Given a PVC "data-pvc" with access modes ["ReadWriteOnce"]
  When a user views the Overview tab
  Then they should see Access Modes showing "ReadWriteOnce"
  
  Given a PVC "shared-pvc" with access modes ["ReadWriteMany"]
  Then they should see Access Modes showing "ReadWriteMany"
  
  Given a PVC "readonly-pvc" with access modes ["ReadOnlyMany"]
  Then they should see Access Modes showing "ReadOnlyMany"
```

```gherkin
Scenario: Overview shows bound PV information
  Given a PVC "data-pvc" is bound to PV "pv-data-001"
  When a user views the Overview tab
  Then they should see Bound PV field showing "pv-data-001"
  
  Given a PVC "pending-pvc" is not bound
  Then they should not see a Bound PV field
```

```gherkin
Scenario: Overview calculates and displays PVC age
  Given a PVC "old-pvc" was created 3 days, 5 hours, and 23 minutes ago
  When a user views the Overview tab
  Then they should see the Age field showing "3d"
  And the Creation Timestamp field showing the exact timestamp
  And the age should update if they refresh the webview
```

```gherkin
Scenario: Health status reflects PVC phase
  Given a PVC with phase "Bound"
  And no problematic conditions
  When a user views the Overview tab
  Then the health status should show "Healthy" with a green indicator
  
  Given a PVC with phase "Pending"
  Then the health status should show "Degraded" with a yellow indicator
  
  Given a PVC with phase "Lost"
  Then the health status should show "Unhealthy" with a red indicator
```

## Volume Details Tab

```gherkin
Scenario: Volume Details tab displays volume configuration
  Given a PVC "data-pvc" with volume mode "Filesystem"
  And storage class "fast-ssd"
  And requested capacity "10Gi"
  When a user clicks on the Volume Details tab
  Then they should see:
    | Field              | Value        |
    | Volume Mode        | Filesystem   |
    | Storage Class      | fast-ssd     |
    | Requested Capacity | 10Gi         |
```

```gherkin
Scenario: Volume Details shows finalizers
  Given a PVC "data-pvc" has finalizers ["kubernetes.io/pv-protection"]
  When a user views the Volume Details tab
  Then they should see a Finalizers section
  And the finalizer "kubernetes.io/pv-protection" should be listed
```

```gherkin
Scenario: Volume Details shows Block volume mode
  Given a PVC "block-pvc" has volume mode "Block"
  When a user views the Volume Details tab
  Then they should see Volume Mode showing "Block"
```

## Usage Tab

```gherkin
Scenario: Usage tab shows Pods using PVC
  Given a PVC "data-pvc" is mounted by Pod "app-pod" in namespace "default"
  And the Pod mounts the PVC at "/data" with read-only false
  When a user clicks on the Usage tab
  Then they should see a table with Pod information
  And the table should show:
    | Pod Name | Namespace | Phase  | Mount Path | Read-Only |
    | app-pod  | default   | Running| /data      | No        |
```

```gherkin
Scenario: Usage tab shows multiple Pods
  Given a PVC "shared-pvc" is mounted by:
    | Pod Name  | Namespace | Mount Path |
    | pod-1     | default   | /data      |
    | pod-2     | default   | /backup    |
  When a user views the Usage tab
  Then they should see both Pods listed in the table
  And the tab badge should show "Usage (2 Pods)"
```

```gherkin
Scenario: Usage tab shows read-only mounts
  Given a PVC "readonly-pvc" is mounted by Pod "reader-pod" with read-only true
  When a user views the Usage tab
  Then the Read-Only column should show "Yes" with appropriate styling
```

```gherkin
Scenario: Usage tab allows navigation to Pods
  Given a PVC "data-pvc" is mounted by Pod "app-pod"
  When a user views the Usage tab
  And clicks the "View Pod" button for "app-pod"
  Then the Pod describe webview should open for "app-pod"
```

```gherkin
Scenario: Usage tab shows empty state
  Given a PVC "unused-pvc" is not mounted by any Pods
  When a user views the Usage tab
  Then they should see a message "No Pods are currently using this PVC"
  And a hint "Pods that mount this PVC will appear here"
```

## Conditions Tab

```gherkin
Scenario: Conditions tab displays PVC conditions
  Given a PVC has conditions:
    | Type                  | Status | Last Transition      | Reason |
    | Resizing              | True   | 2025-12-30T10:00:00 | -      |
    | FileSystemResizePending| True  | 2025-12-30T10:01:00 | -      |
  When a user clicks on the Conditions tab
  Then they should see a table with all conditions
  And each row should show Type, Status, Last Transition, Reason, and Message
  And "True" status should have a green indicator
  And "False" status should have a red indicator
```

## Events Tab

```gherkin
Scenario: Events tab shows PVC events in timeline
  Given a PVC "data-pvc" has events:
    | Type    | Reason      | Message                            | Count | Age  |
    | Normal  | Provisioning| External provisioner is provisioning| 1     | 10m  |
    | Normal  | Provisioned | Successfully provisioned volume     | 1     | 9m   |
    | Normal  | Bound       | Bound to volume pv-data-001         | 1     | 8m   |
  When a user clicks on the Events tab
  Then they should see all events in a timeline view
  And events should be ordered by most recent first
  And each event should show Type, Reason, Message, Count, and Age
```

```gherkin
Scenario: Warning events visually distinct
  Given a PVC has events including:
    | Type    | Reason          | Message                        |
    | Normal  | Bound           | Successfully bound             |
    | Warning | FailedBinding   | No persistent volumes available|
  When displayed in the Events tab
  Then Normal events should have a blue/gray indicator
  And Warning events should have a yellow/orange indicator
```

## Metadata Tab

```gherkin
Scenario: Metadata tab displays labels and annotations
  Given a PVC "data-pvc" has labels:
    | Key           | Value    |
    | app           | database |
    | storage-tier  | fast     |
  And annotations:
    | Key                    | Value              |
    | volume.beta.kubernetes.io| storage-class     |
  When a user clicks on the Metadata tab
  Then they should see a Labels section with all labels
  And they should see an Annotations section with all annotations
  And each label/annotation should show key and value
```

```gherkin
Scenario: Metadata tab shows basic information
  Given a PVC "data-pvc" has UID "abc-123-def"
  And resource version "456789"
  And creation timestamp "2025-12-30T10:00:00Z"
  When a user views the Metadata tab
  Then they should see:
    | Field                | Value                    |
    | UID                  | abc-123-def              |
    | Resource Version     | 456789                   |
    | Creation Timestamp   | 2025-12-30T10:00:00Z    |
```

## Header Actions

```gherkin
Scenario: Refresh button updates PVC data
  Given a user has the Describe webview open for "data-pvc"
  When they click the "Refresh" button in the header
  Then a loading indicator should appear
  And the extension should fetch fresh PVC data from the API
  And all tabs should update with the latest information
```

```gherkin
Scenario: View YAML button opens editor
  Given a user has the Describe webview open for "data-pvc"
  When they click the "View YAML" button in the header
  Then a new editor tab should open
  And the editor should contain the full YAML manifest for "data-pvc"
  And the editor should use YAML syntax highlighting
```

## Error Handling

```gherkin
Scenario: PVC not found error
  Given a user has the Describe webview open for "data-pvc"
  When the PVC "data-pvc" is deleted from the cluster
  And they click Refresh
  Then an error message should appear in the webview
  And the message should say "PVC 'data-pvc' not found in namespace 'default'"
```

```gherkin
Scenario: Permission denied error
  Given a user lacks permissions to read PVCs in namespace "production"
  When they attempt to open Describe webview for a PVC in "production"
  Then an error message should appear
  And the message should say "Permission denied: Unable to read PVC. Check your RBAC permissions."
```
