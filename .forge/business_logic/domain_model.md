# Domain Model

## Core Entities

- **Cluster Context**: active kubeconfig context selected by user.
- **Namespace Scope**: active namespace for scoped resource actions.
- **Kubernetes Resource**: tree-addressable workload/config/storage/network object.
- **YAML Session**: editable or read-only document bound to a resource identifier.
- **Port Forward Session**: managed kubectl port-forward process with lifecycle state.
- **ArgoCD Application**: detected/surfaced GitOps application with sync and health state.
- **Operator Status**: optional in-cluster signal indicating operated capabilities.

## Core Invariants

1. Commands execute against the currently selected context.
2. Destructive actions require explicit user intent.
3. Read-only permission states must block write operations.
4. Resource views should degrade gracefully when optional integrations are unavailable.
