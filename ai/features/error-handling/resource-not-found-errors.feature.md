---
feature_id: resource-not-found-errors
name: Resource Not Found Error Handling
description: Graceful handling when Kubernetes resources are not found or have been deleted
spec_id:
  - error-handler-utility
  - resource-lifecycle-tracking
---

# Resource Not Found Error Handling

```gherkin
Feature: Resource Not Found Error Handling

Scenario: Resource deleted by another user
  Given a user is viewing a pod in the tree view
  And another user or process deletes that pod
  When the extension attempts to fetch updated details
  Then an error should display: "Resource pod/[name] not found in namespace '[namespace]'"
  And the error should explain: "It may have been deleted by another user or process"
  And a "Refresh Tree View" button should be available
  And the tree item should be removed on refresh

Scenario: Namespace deleted while viewing resources
  Given a user has a namespace expanded in the tree view
  And that namespace is deleted externally
  When the extension attempts to list resources in that namespace
  Then an error should display: "Namespace '[namespace]' not found"
  And the error should explain: "This namespace may have been deleted"
  And the tree view should automatically refresh
  And the namespace should be removed from the tree

Scenario: Refresh tree view after not found error
  Given a resource not found error has been displayed
  And the error includes a "Refresh Tree View" button
  When the user clicks "Refresh Tree View"
  Then the entire tree view should refresh
  And outdated items should be removed
  And current items should be displayed
  And a progress indicator should show during refresh

Scenario: Resource renamed or moved
  Given a user attempts to access a resource by name
  And that resource has been renamed
  When the 404 Not Found error occurs
  Then an error should display: "Resource [type]/[name] not found"
  And suggest: "The resource may have been renamed or deleted"
  And provide a "Search for Similar Resources" option
  And show the resource type and expected namespace

Scenario: Watching a resource that gets deleted
  Given the extension is watching a specific resource for changes
  And that resource is deleted
  When the watch detects the deletion
  Then a notification should show: "[Resource-type] '[name]' has been deleted"
  And the tree view should automatically update
  And the resource should be removed from the tree
  And no error popup should appear (this is expected behavior)

Scenario: Opening webview for deleted resource
  Given a user has a resource webview open
  And the resource is deleted externally
  When the webview attempts to refresh data
  Then the webview should display: "This resource no longer exists"
  And show: "[Resource-type] '[name]' was not found in namespace '[namespace]'"
  And provide a "Close" button
  And optionally offer to "Go Back to Tree View"

Scenario: Context not found in kubeconfig
  Given a tree item references a kubectl context
  And that context has been removed from the kubeconfig
  When attempting to interact with that context
  Then an error should display: "Context '[context-name]' not found in kubeconfig"
  And suggest: "This context may have been removed from your kubeconfig"
  And provide an "Open Kubeconfig" button
  And offer a "Refresh Contexts" button

Scenario: Cluster not found error
  Given a user attempts to connect to a cluster
  And the cluster context does not exist
  When the connection is attempted
  Then an error should display: "Cluster '[cluster-name]' not found"
  And show available clusters from kubeconfig
  And provide a "Select Different Cluster" option
  And refresh the tree to show current clusters

Scenario: Handle 404 for resource details
  Given a user clicks on a resource to view details
  And the resource returns 404 Not Found
  When the describe or get operation executes
  Then an error should display: "Cannot retrieve details for [type]/[name]"
  And explain: "The resource was not found and may have been deleted"
  And log the full error to Output Panel
  And not show a generic "command failed" message

Scenario: Graceful degradation in tree view
  Given the tree view is loading multiple resource types
  And one resource type returns 404 for specific items
  When rendering the tree
  Then successfully loaded resources should display normally
  And failed items should show an error icon
  And hovering over error icon should show "Resource not found"
  And the tree should not fail to load entirely

Scenario: Resource not found during deletion
  Given a user attempts to delete a resource
  And the resource has already been deleted by another process
  When the delete command executes
  Then a notification should show: "[Resource] '[name]' was already deleted"
  And this should be treated as success (idempotent)
  And the tree view should refresh
  And no error popup should be displayed

Scenario: Search for similar resources after not found
  Given a resource not found error occurred
  And the error includes a "Search for Similar Resources" option
  When the user clicks the option
  Then a quick pick should show resources of the same type
  And resources should be filtered by similar names
  And the user can select a resource to view
  And the search should span the same namespace
```

