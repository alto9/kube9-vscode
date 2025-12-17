---
feature_id: rbac-permission-errors
name: RBAC Permission Error Handling
description: Clear messaging for Kubernetes RBAC and permission denied errors
spec_id:
  - error-handler-utility
  - rbac-error-detection
---

# RBAC Permission Error Handling

```gherkin
Feature: RBAC Permission Error Handling

Scenario: Permission denied when listing resources
  Given a user attempts to list pods in a namespace
  And their ServiceAccount lacks "list" permission for pods
  When the API returns a 403 Forbidden error
  Then an error should display: "Permission denied: Cannot list pods in namespace '[namespace]'"
  And the error should show: "Required permission: pods.list in namespace '[namespace]'"
  And the error should suggest: "Check your ServiceAccount permissions"
  And the error should suggest: "Contact your cluster administrator for access"
  And a "View RBAC Documentation" link should be included

Scenario: Permission denied when viewing resource details
  Given a user attempts to view details of a specific deployment
  And their role lacks "get" permission for deployments
  When the API returns 403 Forbidden
  Then an error should display: "Permission denied: Cannot get deployment '[name]' in namespace '[namespace]'"
  And the error should show: "Required permission: deployments.get"
  And the error should include namespace and resource type context

Scenario: Permission denied when deleting resources
  Given a user attempts to delete a pod
  And they lack "delete" permission for pods
  When the delete operation is attempted
  Then an error should display: "Permission denied: Cannot delete pod '[pod-name]' in namespace '[namespace]'"
  And the error should show: "Required permission: pods.delete"
  And the error should suggest contacting the cluster administrator
  And no partial deletion should occur

Scenario: Permission denied when creating resources
  Given a user attempts to apply a YAML manifest
  And they lack "create" permission for the resource type
  When the apply operation is attempted
  Then an error should display: "Permission denied: Cannot create [resource-type] in namespace '[namespace]'"
  And the error should show: "Required permission: [resource-type].create"
  And the YAML should not be partially applied

Scenario: Permission denied for cluster-scoped resources
  Given a user attempts to list nodes
  And they lack cluster-level "list" permission for nodes
  When the operation is attempted
  Then an error should display: "Permission denied: Cannot list nodes (cluster-level resource)"
  And the error should show: "Required permission: nodes.list at cluster scope"
  And the error should explain this is a cluster-wide permission

Scenario: Namespace access denied
  Given a user attempts to access a specific namespace
  And they do not have permission to access that namespace
  When the namespace is expanded in the tree view
  Then an error should display in the tree item
  And the error should state: "Access denied to namespace '[namespace]'"
  And child resources should not be loaded
  And a "Request Access" suggestion should be shown

Scenario: RBAC error logged to Output Panel
  Given any RBAC permission error occurs
  When the error is handled
  Then the full API response should be logged to the Output Panel
  And the log should include the HTTP status code (403)
  And the log should include the full Kubernetes API message
  And the log should include the resource type and namespace
  And a "Copy Error Details" button should be available in the error message

Scenario: View RBAC documentation from error
  Given a permission error is displayed
  And the error includes a "View RBAC Documentation" link
  When the user clicks the link
  Then the default browser should open to Kubernetes RBAC documentation
  And the URL should be the official Kubernetes RBAC docs

Scenario: Check permissions proactively
  Given the extension is loading cluster resources
  When fetching resources for the tree view
  Then the extension should catch 403 errors gracefully
  And show permission errors only for affected resources
  And allow other resources with proper permissions to load
  And not block the entire tree view due to one permission error

Scenario: Multiple permission errors grouped
  Given a user lacks permissions for multiple resource types
  And the tree view attempts to load multiple categories
  When multiple 403 errors occur
  Then errors should be grouped by permission type
  And a summary notification should show: "Missing permissions for [count] resource types"
  And users can expand to see details for each resource type
  And individual errors should not spam the user

Scenario: ServiceAccount identification
  Given a permission error occurs
  When displaying the error
  Then the error should attempt to identify the current ServiceAccount
  And show: "Current ServiceAccount: [account-name]"
  And show the namespace of the ServiceAccount
  And suggest checking RBAC bindings for that account

Scenario: Permission error with suggested kubectl command
  Given a permission error occurs
  When displaying the error
  Then include a helpful kubectl command to check permissions
  And show: "Check permissions with: kubectl auth can-i [verb] [resource]"
  And provide the specific verb and resource for the failed operation
  And include namespace in the command if applicable
```

