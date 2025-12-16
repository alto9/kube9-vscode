---
feature_id: argocd-detection
spec_id: [argocd-service-spec, argocd-status-spec]
context_id: [kubernetes-cluster-management, vscode-extension-development]
---

# ArgoCD Detection and Status Awareness Feature

## Overview

The VS Code extension must detect the presence of ArgoCD in connected clusters and be aware of its status. Detection works in two modes: consuming ArgoCD status from the kube9-operator (when installed), or falling back to direct CRD detection (in basic mode). This awareness enables the extension to show ArgoCD Applications in the tree view and provide drift detection features.

## Behavior

```gherkin
Feature: ArgoCD Detection and Status Awareness

Background:
  Given the VS Code extension is connected to a Kubernetes cluster
  And the extension has access to the cluster via kubeconfig
  And the extension can query Kubernetes resources using kubectl

Scenario: Extension checks for ArgoCD presence on cluster connection
  Given a user connects to a Kubernetes cluster
  When the extension establishes the cluster connection
  Then the extension should check for ArgoCD presence
  And the extension should determine ArgoCD installation status
  And the extension should cache the status for 5 minutes
  And the extension should store the status per cluster context

Scenario: Extension consumes ArgoCD status from operator (Operated mode)
  Given the kube9-operator is installed in the cluster
  And the operator status ConfigMap exists in kube9-system namespace
  When the extension checks for ArgoCD presence
  Then the extension should read the operator status ConfigMap
  And the extension should extract the argocd field from operatorStatus
  And the extension should use operatorStatus.argocd.detected to determine presence
  And the extension should use operatorStatus.argocd.namespace to locate ArgoCD
  And the extension should use operatorStatus.argocd.version for version info
  And the extension should use operatorStatus.argocd.lastChecked for staleness
  And the extension should cache the ArgoCD status for 5 minutes

Scenario: Operator status indicates ArgoCD is detected
  Given the kube9-operator is installed in the cluster
  And the operator status ConfigMap contains argocd field
  And operatorStatus.argocd.detected is true
  And operatorStatus.argocd.namespace is "argocd"
  And operatorStatus.argocd.version is "v2.8.4"
  When the extension reads the operator status
  Then the extension should mark ArgoCD as installed
  And the extension should store the ArgoCD namespace as "argocd"
  And the extension should store the ArgoCD version as "v2.8.4"
  And the extension should enable ArgoCD tree view category

Scenario: Operator status indicates ArgoCD is not detected
  Given the kube9-operator is installed in the cluster
  And the operator status ConfigMap contains argocd field
  And operatorStatus.argocd.detected is false
  When the extension reads the operator status
  Then the extension should mark ArgoCD as not installed
  And the extension should not show ArgoCD tree view category
  And the extension should cache the not-installed status for 5 minutes

Scenario: Extension falls back to direct CRD detection (Basic mode)
  Given the kube9-operator is NOT installed in the cluster
  Or the operator status ConfigMap does not exist
  When the extension checks for ArgoCD presence
  Then the extension should fall back to direct CRD detection
  And the extension should check for applications.argoproj.io CRD
  And the extension should determine ArgoCD presence based on CRD existence

Scenario: Direct CRD detection finds ArgoCD installed
  Given the kube9-operator is NOT installed
  When the extension performs direct CRD detection
  And kubectl get crd applications.argoproj.io returns success
  Then the extension should mark ArgoCD as installed
  And the extension should attempt to find ArgoCD server deployment
  And the extension should search for deployments with label app.kubernetes.io/name=argocd-server
  And the extension should extract ArgoCD version from server deployment if found
  And the extension should default to "argocd" namespace if not specified
  And the extension should enable ArgoCD tree view category
  And the extension should cache the detected status for 5 minutes

Scenario: Direct CRD detection finds ArgoCD not installed
  Given the kube9-operator is NOT installed
  When the extension performs direct CRD detection
  And kubectl get crd applications.argoproj.io returns NotFound error
  Then the extension should mark ArgoCD as not installed
  And the extension should not show ArgoCD tree view category
  And the extension should cache the not-installed status for 5 minutes

Scenario: Extension finds ArgoCD server deployment for version info
  Given the extension has determined ArgoCD is installed via CRD
  When the extension searches for ArgoCD server deployment
  And kubectl get deployments -A -l app.kubernetes.io/name=argocd-server returns deployment
  And the deployment is in namespace "argocd"
  And the deployment image tag is "quay.io/argoproj/argocd:v2.8.4"
  Then the extension should extract namespace as "argocd"
  And the extension should extract version as "v2.8.4"
  And the extension should store this information in cached status

Scenario: Extension handles ArgoCD in custom namespace
  Given the kube9-operator is installed
  And operatorStatus.argocd.detected is true
  And operatorStatus.argocd.namespace is "gitops"
  When the extension reads the operator status
  Then the extension should store the ArgoCD namespace as "gitops"
  And the extension should query ArgoCD Applications in "gitops" namespace
  And the extension should handle all ArgoCD operations in "gitops" namespace

Scenario: Extension handles operator status without ArgoCD field
  Given the kube9-operator is installed
  And the operator status ConfigMap exists
  And the argocd field is missing from operatorStatus
  When the extension reads the operator status
  Then the extension should fall back to direct CRD detection
  And the extension should check for applications.argoproj.io CRD
  And the extension should continue with normal detection flow

Scenario: Extension refreshes ArgoCD status on manual refresh
  Given the extension has cached ArgoCD status for a cluster
  When the user manually refreshes the clusters view
  Then the extension should refresh the ArgoCD status from the cluster
  And the extension should bypass the cache
  And the extension should update the cached status
  And the extension should update the tree view if ArgoCD status changed
  And the extension should show or hide ArgoCD category based on new status

Scenario: Extension handles ArgoCD detection failures gracefully
  Given the extension is attempting to detect ArgoCD
  When the detection fails due to network error
  Or the detection fails due to RBAC permissions
  Or the detection fails due to cluster connectivity issues
  Then the extension should not crash or show error dialogs
  And the extension should fall back to cached status if available
  And the extension should mark ArgoCD as not installed if no cache available
  And the extension should retry detection on next manual refresh
  And the extension should log the error for debugging purposes

Scenario: Extension handles CRD query failures gracefully
  Given the extension is performing direct CRD detection
  When kubectl get crd applications.argoproj.io fails with permission denied
  Then the extension should mark ArgoCD as not installed
  And the extension should log the RBAC error
  And the extension should not show error dialog to user
  And the extension should cache the not-installed status for 5 minutes

Scenario: Extension maintains ArgoCD status awareness across all clusters
  Given the extension is connected to multiple clusters
  When the extension displays the clusters view
  Then the extension should detect ArgoCD presence for each cluster independently
  And the extension should cache status separately for each cluster context
  And the extension should show ArgoCD category only for clusters with ArgoCD installed
  And the extension should refresh status for each cluster independently

Scenario: Extension handles stale operator ArgoCD status
  Given the kube9-operator is installed
  And operatorStatus.argocd.lastChecked timestamp is older than 7 hours
  When the extension reads the operator status
  Then the extension should consider the ArgoCD status potentially stale
  And the extension should still use the cached operator status
  And the extension should log a warning about stale status
  And the extension should rely on operator's automatic re-check (every 6 hours)

Scenario: Extension prioritizes operator status over direct detection
  Given the kube9-operator is installed
  And the operator status ConfigMap contains argocd field
  And the applications.argoproj.io CRD exists
  When the extension checks for ArgoCD presence
  Then the extension should read from operator status first
  And the extension should NOT perform direct CRD detection
  And the extension should use operator's detected status as source of truth

Scenario: Extension detects when ArgoCD is newly installed
  Given the extension has cached status showing ArgoCD not installed
  And ArgoCD has been newly installed in the cluster
  When the user manually refreshes the clusters view
  Then the extension should detect the new ArgoCD installation
  And the extension should update the cached status to installed
  And the extension should add ArgoCD Applications category to tree view
  And the extension should query and display ArgoCD applications

Scenario: Extension detects when ArgoCD is uninstalled
  Given the extension has cached status showing ArgoCD installed
  And ArgoCD has been uninstalled from the cluster
  When the user manually refreshes the clusters view
  Then the extension should detect the ArgoCD removal
  And the extension should update the cached status to not installed
  And the extension should remove ArgoCD Applications category from tree view

Scenario: Extension handles multiple ArgoCD namespaces (unsupported)
  Given ArgoCD is installed in multiple namespaces
  When the extension detects ArgoCD presence
  Then the extension should detect only the first ArgoCD installation found
  And the extension should log a warning about multiple installations
  And the extension should work with the first detected namespace

Scenario: Extension validates ArgoCD version compatibility
  Given the extension has detected ArgoCD installation
  And the ArgoCD version is "v2.4.0"
  When the extension checks version compatibility
  Then the extension should check if version is >= "v2.5.0"
  And the extension should log a warning if version is below 2.5
  And the extension should still attempt to work with older versions
  And the extension should display version info in status tooltips

Scenario: Extension caches ArgoCD status per cluster context
  Given the extension is connected to cluster "prod-cluster"
  And ArgoCD is detected and cached for "prod-cluster"
  When the user switches to cluster "dev-cluster"
  Then the extension should use separate cache for "dev-cluster"
  And the extension should not assume dev-cluster has ArgoCD
  And the extension should perform fresh detection for "dev-cluster"
  And the extension should maintain both cache entries independently

Scenario: Extension handles ArgoCD status in disconnected cluster
  Given the extension has cached ArgoCD status for "prod-cluster"
  And "prod-cluster" becomes disconnected
  When the user views the clusters tree
  Then the extension should still show cached ArgoCD status
  And the extension should show ArgoCD category with disconnected indicator
  And the extension should not attempt to refresh status until reconnected
  And the extension should show appropriate error when user expands category
```

## Integration Points

- **VS Code Extension**: Primary system implementing ArgoCD detection
- **kube9-operator**: Provides ArgoCD status in operator status ConfigMap (when installed)
- **Operator Status ConfigMap**: Source of ArgoCD detection in operated mode (`kube9-operator-status` in `kube9-system` namespace)
- **ArgoCD CRDs**: Fallback detection method in basic mode (`applications.argoproj.io`)
- **kubectl Commands**: Used to query operator status and CRDs
- **Clusters Tree View**: UI component that shows/hides ArgoCD category based on detection

## Detection Strategy

| Mode | Detection Method | Data Source |
|------|-----------------|-------------|
| **Operated** | Read operator status | `operatorStatus.argocd` field in ConfigMap |
| **Basic** | Direct CRD check | `kubectl get crd applications.argoproj.io` |
| **Fallback** | CRD check + deployment search | CRD existence + ArgoCD server deployment |

## ArgoCD Status Fields (from Operator)

```typescript
interface ArgoCDStatus {
  detected: boolean;
  namespace: string;
  version: string;
  lastChecked: string; // ISO timestamp
}
```

## Non-Goals

- Installing or configuring ArgoCD (user responsibility)
- Managing multiple ArgoCD installations in same cluster
- ArgoCD authentication or authorization
- ArgoCD server health monitoring (basic detection only)
- Real-time ArgoCD status push notifications

