---
feature_id: apply-yaml-manifest
spec_id: [apply-yaml-command-spec]
context_id: [vscode-extension-development, kubernetes-cluster-management]
---

# Apply YAML Manifest to Cluster

## Overview

Users can apply Kubernetes YAML manifests directly from VS Code to the connected cluster. This feature supports applying manifests from open files or via file selection, with options for dry-run validation before applying changes.

## Behavior

```gherkin
Feature: Apply YAML Manifest to Cluster

Background:
  Given the kube9 VS Code extension is active
  And the user has a valid kubeconfig with at least one accessible cluster
  And kubectl is available in the system PATH

# Command Activation

Scenario: User applies YAML from active editor via command palette
  Given the user has a YAML file open in the active editor
  And the file has a .yaml or .yml extension
  When the user opens the command palette
  And selects "kube9: Apply YAML"
  Then the extension should present apply options
  And the active editor's file path should be used as the target

Scenario: User applies YAML from context menu
  Given the user has a YAML file open in the active editor
  When the user right-clicks in the editor
  And selects "kube9: Apply YAML" from the context menu
  Then the extension should present apply options
  And the active editor's file path should be used as the target

Scenario: User applies YAML when no YAML file is active
  Given the user does not have a YAML file open in the active editor
  When the user invokes "kube9: Apply YAML" from the command palette
  Then the extension should open a file picker dialog
  And the file picker should filter for .yaml and .yml files
  And the user should be able to select a YAML file from the filesystem

# Apply Options

Scenario: User selects Apply option
  Given the user has selected a YAML file to apply
  When the extension presents apply options
  And the user selects "Apply"
  Then the extension should execute kubectl apply -f with the file path
  And the command should use the current kubectl context
  And the command should use the current kubectl namespace

Scenario: User selects Dry Run Server option
  Given the user has selected a YAML file to apply
  When the extension presents apply options
  And the user selects "Dry Run (Server)"
  Then the extension should execute kubectl apply -f with --dry-run=server flag
  And the cluster should validate the manifest against its API
  And the manifest should not be persisted to the cluster

Scenario: User selects Dry Run Client option
  Given the user has selected a YAML file to apply
  When the extension presents apply options
  And the user selects "Dry Run (Client)"
  Then the extension should execute kubectl apply -f with --dry-run=client flag
  And kubectl should perform local validation only
  And no requests should be made to the cluster API

Scenario: User cancels apply operation
  Given the user has selected a YAML file to apply
  When the extension presents apply options
  And the user presses Escape or clicks away
  Then no kubectl command should be executed
  And no notifications should be shown

# Success Handling

Scenario: Apply succeeds with single resource
  Given the user has selected "Apply" option
  When kubectl successfully applies the manifest
  And the manifest contains a single resource
  Then the extension should show a success notification
  And the notification should indicate the resource was created or configured
  And the output should be logged to the kube9 output channel

Scenario: Apply succeeds with multiple resources
  Given the user has selected "Apply" option
  And the YAML file contains multiple documents separated by ---
  When kubectl successfully applies the manifest
  Then the extension should show a success notification
  And the notification should summarize all resources created or configured
  And the output should be logged to the kube9 output channel

Scenario: Dry run succeeds
  Given the user has selected a dry run option
  When kubectl dry run completes successfully
  Then the extension should show an information notification
  And the notification should indicate the dry run passed validation
  And the output should be logged to the kube9 output channel

# Error Handling

Scenario: Apply fails due to invalid YAML syntax
  Given the user has selected a YAML file with invalid syntax
  When the user attempts to apply the manifest
  Then kubectl should return a syntax error
  And the extension should show an error notification
  And the error message should include the YAML parsing issue
  And the full error should be logged to the kube9 output channel

Scenario: Apply fails due to invalid Kubernetes manifest
  Given the user has selected a YAML file with invalid Kubernetes schema
  When the user attempts to apply the manifest
  Then kubectl should return a validation error
  And the extension should show an error notification
  And the error message should explain the validation failure
  And the full error should be logged to the kube9 output channel

Scenario: Apply fails due to cluster connectivity issues
  Given the user has selected a valid YAML file
  And the cluster is unreachable
  When the user attempts to apply the manifest
  Then kubectl should return a connection error
  And the extension should show an error notification
  And the error message should indicate the cluster is unreachable
  And the full error should be logged to the kube9 output channel

Scenario: Apply fails due to RBAC permissions
  Given the user has selected a valid YAML file
  And the user does not have permission to create the resource
  When the user attempts to apply the manifest
  Then kubectl should return a forbidden error
  And the extension should show an error notification
  And the error message should indicate insufficient permissions
  And the full error should be logged to the kube9 output channel

Scenario: Apply fails due to namespace not found
  Given the user has selected a valid YAML file
  And the manifest specifies a namespace that does not exist
  When the user attempts to apply the manifest
  Then kubectl should return a not found error
  And the extension should show an error notification
  And the error message should indicate the namespace was not found
  And the full error should be logged to the kube9 output channel

# Output Channel

Scenario: Output channel shows command execution
  Given the user initiates an apply operation
  When kubectl command is executed
  Then the kube9 output channel should show the command being executed
  And the output channel should show the timestamp
  And the output channel should show the full kubectl output
  And the output channel should preserve history of previous operations
```

## Integration Points

- **Command Registration**: Command registered in `package.json` and `extension.ts`
- **Context Menu**: Right-click menu on YAML/YML files in editor
- **Command Palette**: Available via Ctrl+Shift+P / Cmd+Shift+P
- **Output Channel**: Uses existing kube9 output channel for logging
- **kubectl**: Delegates to kubectl for all Kubernetes operations

## Non-Goals

- Paste YAML into input box (future feature)
- Diff preview before apply (future feature)
- Namespace override UI (future feature)
- Auto-create namespace if missing (future feature)

