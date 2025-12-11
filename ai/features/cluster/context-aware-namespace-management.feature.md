---
feature_id: context-aware-namespace-management
spec_id: [kubectl-context-operations-spec]
context_id: [kubernetes-cluster-management]
---

# Context-Aware Namespace Management Feature

```gherkin
Feature: Context-Aware Namespace Management

Background:
  Given the kube9 VS Code extension is installed and activated
  And the user has multiple kubectl contexts configured

Scenario: Setting namespace on the clicked context (not current context)
  Given the user has two kubectl contexts: "minikube" and "prod-cluster"
  And kubectl's current context is "prod-cluster"
  When the user expands the "minikube" cluster in the tree view
  And right-clicks the "default" namespace under "minikube"
  And selects "Set as Active Namespace"
  Then the extension should execute "kubectl config set-context minikube --namespace=default"
  And the namespace should be set on the "minikube" context specifically
  And the "default" namespace under "minikube" should show a checkmark icon
  And the kubectl current context should remain "prod-cluster"

Scenario: Setting namespace updates the correct context
  Given the user has three kubectl contexts: "dev", "staging", and "prod"
  And kubectl's current context is "prod"
  When the user right-clicks "kube-system" namespace under "staging" cluster
  And selects "Set as Active Namespace"
  Then the extension should execute "kubectl config set-context staging --namespace=kube-system"
  And the namespace should be set on "staging" context only
  And other contexts should remain unchanged

Scenario: Clearing namespace on a specific context
  Given the user has "production" namespace set on "prod-cluster" context
  And kubectl's current context is "minikube"
  When the user right-clicks "production" namespace under "prod-cluster"
  And selects "Clear Active Namespace"
  Then the extension should execute "kubectl config set-context prod-cluster --namespace=''"
  And the namespace should be cleared from "prod-cluster" context specifically
  And the checkmark should be removed from "production" under "prod-cluster"
  And the current context should remain "minikube"

Scenario: Visual indicators show per-context namespace state
  Given the user has "default" namespace set on "minikube" context
  And the user has "production" namespace set on "prod-cluster" context
  When the user views the tree
  Then "default" under "minikube" should show a checkmark
  And "production" under "prod-cluster" should show a checkmark
  And other namespaces should not show checkmarks
  And each context maintains its own namespace setting independently

Scenario: Setting namespace from webview targets correct context
  Given the user has opened the namespace webview for "staging" under "prod-cluster"
  And kubectl's current context is "minikube"
  When the user clicks "Set as Default Namespace" button in the webview
  Then the extension should execute "kubectl config set-context prod-cluster --namespace=staging"
  And the namespace should be set on "prod-cluster" context
  And the button should update to disabled state with checkmark
  And kubectl's current context should remain "minikube"

Scenario: Multiple webviews show correct button states for different contexts
  Given "default" namespace is set on "minikube" context
  And "production" namespace is set on "prod-cluster" context
  When the user opens webview for "default" namespace under "minikube"
  And opens webview for "staging" namespace under "prod-cluster"
  Then the "minikube/default" webview button should be disabled with checkmark
  And the "prod-cluster/staging" webview button should be enabled without checkmark

Scenario: Setting namespace on non-current context does not switch context
  Given kubectl's current context is "prod-cluster"
  When the user sets "kube-system" namespace on "minikube" context
  Then kubectl's current context should still be "prod-cluster"
  And the namespace should be set on "minikube" context in the background
  And no context switching should occur

Scenario: Context name extracted from cluster tree item
  Given a user clicks on a namespace in the tree view
  When the setActiveNamespaceCommand is invoked
  Then the command should extract contextName from item.resourceData.context.name
  And pass both namespace and contextName to setNamespace function
  And kubectl should target the extracted context, not --current

Scenario: Backward compatibility when context name not provided
  Given a command invokes setNamespace() without passing contextName
  When the setNamespace function is called with only namespace parameter
  Then the function should fall back to using --current flag
  And the operation should complete successfully for backward compatibility

Scenario: Error handling for non-existent context
  Given a tree item references a context "old-cluster" that no longer exists in kubeconfig
  When the user tries to set a namespace on "old-cluster"
  Then kubectl should return an error "context 'old-cluster' not found"
  And the extension should display error: "Failed to set namespace: context 'old-cluster' not found"
  And the tree view should not update to show a checkmark
```

