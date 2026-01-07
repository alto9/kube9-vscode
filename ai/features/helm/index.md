---
folder_id: helm-features
name: Helm Package Manager Features
description: User-facing features for the Helm Package Manager webview
---

# Helm Package Manager Features

## Background

```gherkin
Background: Helm Package Manager context
  Given the Kube9 VS Code extension is installed and active
  And the user has Helm 3.x CLI installed on their machine
  And the Helm CLI is available in the system PATH
  And at least one Kubernetes cluster is configured
  And the user has kubectl access to the cluster
  When using the Helm Package Manager
  Then all Helm operations execute against the current cluster context
  And all Helm commands spawn as child processes
  And command output is parsed and displayed in the webview
  And errors are handled gracefully with user-friendly messages
```

## Rules

```gherkin
Rule: Webview-based interface
  Given any Helm Package Manager feature
  When the user interacts with Helm functionality
  Then all interactions occur within a single webview panel
  And the webview is opened from a single tree item
  And the webview persists state when hidden
  And the webview communicates with extension via message passing

Rule: Cluster context awareness
  Given the Helm Package Manager is open
  When the user has multiple clusters configured
  Then operations execute against the current cluster
  And the current cluster name is displayed in the webview
  And switching clusters refreshes the webview data
  And repository configuration is global (not per-cluster)

Rule: Helm CLI integration
  Given any Helm operation is triggered
  When the extension needs to interact with Helm
  Then the Helm CLI is invoked via child_process.spawn
  And commands use JSON output format when available
  And the user's kubeconfig is passed to Helm commands
  And standard error output is parsed for user-friendly messages
  And operations show progress feedback to the user

Rule: State management
  Given the Helm Package Manager webview
  When data is loaded or operations complete
  Then repository list is cached with 5-minute TTL
  And repository configuration is stored in workspace state
  And UI preferences (filters, sort order) persist across sessions
  And release status is polled every 30 seconds when webview is visible
  And polling stops when webview is hidden to conserve resources

Rule: Error handling
  Given any Helm operation
  When an error occurs
  Then the error is caught and handled gracefully
  And a user-friendly error message is displayed
  And technical details are available for debugging
  And the UI remains functional
  And the user can retry the operation if appropriate

Rule: Kube9 Operator promotion
  Given the Helm Package Manager Featured Charts section
  When the section is displayed
  Then the Kube9 Operator is prominently featured at the top
  And the operator has 1-click installation with defaults
  And operator status is detected and displayed
  And upgrade availability is checked and indicated
  And the operator installation is optimized for ease of use
```

## Feature Organization

This folder contains features for the complete Helm Package Manager experience:

### Core Access
- **helm-package-manager-access.feature.md**: Opening and using the package manager webview

### Repository Management
- **helm-repository-management.feature.md**: Adding, updating, and removing Helm repositories

### Chart Discovery
- **helm-chart-discovery.feature.md**: Searching for and browsing available charts

### Chart Installation  
- **helm-chart-installation.feature.md**: Installing charts with custom values

### Release Management
- **helm-release-management.feature.md**: Viewing and filtering installed releases
- **helm-release-upgrade.feature.md**: Upgrading releases to new versions
- **helm-release-rollback.feature.md**: Rolling back releases and uninstalling

### Operator Installation
- **helm-operator-quick-install.feature.md**: 1-click Kube9 Operator installation

## Related Documentation

- **Diagrams**: See `ai/diagrams/helm/` for architecture and workflow diagrams
- **Specs**: See `ai/specs/helm/` for technical specifications
- **Actors**: See `ai/actors/users/helm-user.actor.md` for user personas

