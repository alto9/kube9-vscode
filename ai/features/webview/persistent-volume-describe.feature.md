---
feature_id: persistent-volume-describe-webview
spec_id: [webview-spec]
context_id: [kubernetes-cluster-management]
---

# PersistentVolume Describe Webview Feature

```gherkin
Feature: Describe webview for PersistentVolume resources

Background:
  Given the kube9 VS Code extension is installed and activated
  And the user is connected to a Kubernetes cluster
  And PersistentVolumes exist in the cluster

Scenario: Left-click PV opens describe webview
  Given a user left-clicks a PersistentVolume in the kube9 tree (e.g., "pv-001 (10Gi)")
  Then a shared Describe webview should open or reveal
  And the webview title should show "PersistentVolume / pv-001"
  And the webview should display PV information in a formatted, graphical layout
  And the webview should show tabs: Overview, Source Details, Binding, Events, Metadata

Scenario: Right-click Describe opens webview
  Given a user right-clicks a PersistentVolume in the kube9 tree
  When they select "Describe"
  Then a shared Describe webview should open or reveal
  And the webview title should show the PV name
  And the webview should display PV information in a formatted, graphical layout

Scenario: Overview tab displays PV status and capacity
  Given the PV describe webview is open
  When the Overview tab is displayed
  Then it should show the PV status (Available, Bound, Released, Failed)
  And it should show the health status (Healthy, Degraded, Unhealthy, Unknown)
  And it should show the capacity (e.g., "10Gi")
  And it should show access modes (ReadWriteOnce, ReadOnlyMany, ReadWriteMany)
  And it should show the reclaim policy (Retain, Delete, Recycle)
  And it should show the storage class name
  And it should show the bound PVC namespace/name if bound
  And it should show the PV age and creation timestamp

Scenario: Source Details tab displays volume source information
  Given the PV describe webview is open
  When the Source Details tab is displayed
  Then it should show the volume source type (NFS, iSCSI, AWS EBS, GCE PD, Azure Disk, hostPath, local, CSI, etc.)
  And it should show source-specific details (server, path, volume ID, etc.)
  And it should show mount options if specified
  And it should show node affinity constraints if specified

Scenario: Binding tab displays PV binding status
  Given the PV describe webview is open
  When the Binding tab is displayed
  Then it should show whether the PV is bound or available
  And if bound, it should show the bound PVC namespace and name
  And if bound, it should provide a link to navigate to the bound PVC describe webview
  And if not bound, it should indicate the PV is available for binding

Scenario: Events tab displays PV events
  Given the PV describe webview is open
  When the Events tab is displayed
  Then it should show PV-related events in a timeline format
  And events should be grouped by type and reason
  And events should show Normal and Warning types with visual distinction
  And events should show event count, age, source, and timestamps

Scenario: Metadata tab displays PV labels and annotations
  Given the PV describe webview is open
  When the Metadata tab is displayed
  Then it should show PV UID, resource version, and creation timestamp
  And it should show all labels as key-value pairs
  And it should show all annotations as key-value pairs
  And it should indicate when no labels or annotations exist

Scenario: Refresh updates PV data
  Given the PV describe webview is open
  When the user clicks the Refresh button
  Then the webview should reload PV data from the cluster
  And the displayed information should update to reflect current PV state

Scenario: View YAML opens YAML editor
  Given the PV describe webview is open
  When the user clicks the View YAML button
  Then a read-only YAML editor should open
  And the editor should display the full PV resource YAML
  And the editor title should include the PV name

Scenario: Navigate to bound PVC
  Given the PV describe webview is open
  And the PV is bound to a PVC
  When the user clicks the bound PVC link in the Binding tab
  Then the PVC describe webview should open
  And it should display information for the bound PVC
  And the PV describe webview should be replaced or updated

Scenario: Cluster-scoped resource handling
  Given a PersistentVolume is selected
  When the describe webview opens
  Then it should work correctly without a namespace
  And events should be fetched from all namespaces
  And the webview should display cluster-scoped information correctly

Scenario: Error handling for missing PV
  Given a user attempts to describe a PV that no longer exists
  When the describe webview attempts to load
  Then an error message should be displayed
  And a retry button should be available
  And the error should clearly indicate the PV was not found

Scenario: Reusing shared webview across resources
  Given the PV describe webview is already open for a PV
  When the user triggers "Describe" on a different PV
  Then the existing webview should update its title to the new PV name
  And the content should update to show the new PV information
  And no additional Describe panels should be created
```
