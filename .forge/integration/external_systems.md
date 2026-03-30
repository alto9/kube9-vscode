# External Systems

## Primary Systems

- **Kubernetes API servers** reachable through user kubeconfig contexts.
- **kubectl** local executable for command paths and process-backed operations.
- **helm** local executable for chart/release management.
- **ArgoCD** optional in-cluster CRDs/controllers.
- **kube9-operator** optional in-cluster status and reporting source.

## Boundary Statement

Core extension operations are local-first and cluster-native; no mandatory external SaaS dependency is required for baseline cluster management.
