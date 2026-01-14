---
feature_id: kubectl-context-switching
spec_id: [kubectl-context-operations-spec]
context_id: [kubernetes-cluster-management]
---

# Kubectl Context Switching Feature

```gherkin
Feature: Kubectl Context Switching from VS Code

Background:
  Given the kube9 VS Code extension is installed and activated
  And the user has multiple kubectl contexts configured in their kubeconfig

Scenario: Switch context via command palette
  Given the user has multiple kubectl contexts: "minikube", "staging", and "prod-cluster"
  And kubectl's current context is "minikube"
  When the user opens the command palette
  And selects "Kube9: Switch Context"
  Then a quick pick should appear showing all available contexts
  And "minikube" should be marked with a checkmark icon indicating it's the current context
  And each context should show its cluster name and namespace (if set)
  When the user selects "prod-cluster"
  Then kubectl's current context should be switched to "prod-cluster"
  And the tree view should refresh to show "prod-cluster" as the active cluster
  And the status bar should update to show "kube9: prod-cluster"
  And the namespace status bar should update to show the namespace for "prod-cluster"
  And a notification should appear: "Switched to context: prod-cluster"
  And all webviews associated with "minikube" should be closed

Scenario: Switch context via status bar
  Given kubectl's current context is "staging"
  When the user clicks on the context status bar item showing "kube9: staging"
  Then the context switcher quick pick should open
  When the user selects a different context
  Then the context should switch and status bar should update immediately

Scenario: Switch context via right-click menu on inactive cluster
  Given kubectl's current context is "minikube"
  And the tree view shows multiple clusters
  When the user right-clicks on an inactive cluster "prod-cluster"
  Then the context menu should show "Set as Active Context" option
  When the user selects "Set as Active Context"
  Then kubectl's current context should switch to "prod-cluster"
  And the tree view should refresh
  And "prod-cluster" should become expandable
  And "minikube" should become non-expandable
  And the status bars should update

Scenario: Right-click menu not shown for active cluster
  Given kubectl's current context is "prod-cluster"
  When the user right-clicks on the "prod-cluster" cluster in the tree view
  Then the context menu should NOT show "Set as Active Context" option
  And only cluster-specific actions should be available

Scenario: Only active cluster is expandable
  Given the user has three contexts: "dev", "staging", and "prod"
  And kubectl's current context is "staging"
  When the user views the cluster tree
  Then "staging" should be expandable (collapsed state)
  And "dev" should NOT be expandable (none state)
  And "prod" should NOT be expandable (none state)
  When the user switches context to "prod"
  Then "prod" should become expandable
  And "staging" should become non-expandable
  And "dev" should remain non-expandable

Scenario: Context switching closes webviews
  Given the user has opened a namespace webview for "default" namespace under "minikube" context
  And the user has opened a pod describe webview for a pod in "minikube"
  And kubectl's current context is "minikube"
  When the user switches context to "prod-cluster"
  Then all webviews associated with "minikube" should be closed
  And webviews for "prod-cluster" (if any) should remain open

Scenario: Context switching updates namespace status bar
  Given kubectl's current context is "minikube" with namespace "default"
  And the namespace status bar shows "Namespace: default"
  When the user switches context to "prod-cluster" which has namespace "production"
  Then the namespace status bar should immediately update to show "Namespace: production"
  And the tooltip should show the new context and cluster information

Scenario: Context switching persists across VS Code reloads
  Given the user switches context from "minikube" to "prod-cluster"
  When the user reloads VS Code window
  Then kubectl's current context should still be "prod-cluster"
  And the tree view should show "prod-cluster" as the active cluster
  And the status bars should show the correct context and namespace

Scenario: Context switching integrates with namespace selection
  Given kubectl's current context is "minikube"
  And "minikube" context has namespace "default" set
  When the user switches context to "prod-cluster"
  Then the namespace status bar should update to show the namespace for "prod-cluster"
  And if "prod-cluster" has no namespace set, it should show "Namespace: All"
  And the namespace watcher should detect the context change immediately
  And all status bars should update synchronously

Scenario: Error handling for non-existent context
  Given the user has a cluster tree item for "old-cluster" that no longer exists
  When the user tries to switch to "old-cluster" via quick pick
  Then kubectl should return an error
  And the extension should display: "Failed to switch to context 'old-cluster'. The context may not exist in your kubeconfig."
  And the current context should remain unchanged
  And no webviews should be closed

Scenario: Visual indicators in quick pick
  Given the user opens the context switcher
  Then the current context should be marked with "$(check)" icon
  And each context should show:
    - Context name as the label
    - Cluster name as the description
    - Namespace (if set) as the detail
  And contexts should be searchable by name, cluster, or namespace
```
