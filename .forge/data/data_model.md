# Data Model

## Primary Data Shapes

- Parsed kubeconfig contexts/clusters/users.
- Tree item models for categories, resources, and error placeholders.
- Kubernetes resource snapshots fetched via client APIs.
- ArgoCD application/status DTOs.
- Port forward records (`connecting`, `connected`, `disconnected`, `error`, `stopped`).
- YAML resource identifiers and editor tracking keys.

## Data Ownership

- Kubernetes cluster is source of truth for resource state.
- Extension memory/cache is an optimization layer, not authoritative storage.
