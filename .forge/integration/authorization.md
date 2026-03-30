# Authorization

## Authorization Model

- Kubernetes RBAC is the authoritative access control system.
- Extension-side permission checks determine read/write editor behavior and command eligibility.
- ArgoCD and operator data access inherit Kubernetes API credentials and RBAC boundaries.

## Enforcement

1. Permission-denied outcomes must not be masked as missing resources.
2. Read-only access must still permit safe inspection workflows.
