# Configuration

## Extension Settings

- `kube9.debugMode`
- `kube9.operatorNamespace` (global or per-cluster override)
- timeout settings for connection and API requests
- error presentation throttling/detail toggles

## External Inputs

- `KUBECONFIG` / default kubeconfig location
- availability of local CLIs (`kubectl`, optional `helm`)

## Configuration Principle

Configuration is user-local and editor-scoped; core behavior assumes no remote Kube9 backend dependency for standard Kubernetes operations.
