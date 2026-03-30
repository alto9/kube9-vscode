# API Contracts

## Kubernetes API

- Core interactions use `@kubernetes/client-node` clients (`CoreV1`, `AppsV1`, `BatchV1`, `NetworkingV1`, `StorageV1`, `AuthorizationV1`, `ApiextensionsV1`, `Version`, `RbacAuthorizationV1`).
- Context switching rebinds API clients to the selected kubeconfig context.

## CLI-backed Contracts

- `kubectl` is used for selected workflows (for example some ArgoCD CRD operations and port forwarding).
- `helm` is required for Helm package manager features and is checked non-blocking at startup.

## ArgoCD Contracts

- Installation detection supports operator-assisted and direct CRD detection modes.
- Application sync/refresh flows patch ArgoCD Application CRDs and poll operation state.
