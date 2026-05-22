# Integration

How **kube9-vscode** connects to external systems: Kubernetes API, kubectl, optional kube9-operator status, and Argo CD (CRD and optional REST).

## Documents

| Doc | Scope |
|-----|--------|
| [api_contracts.md](./api_contracts.md) | Protocol families, payloads, failure modes, Argo CD resource graph sourcing |
| [external_systems.md](./external_systems.md) | Cluster, operator, Argo CD server boundaries |
| [authorization.md](./authorization.md) | RBAC and trust boundaries per integration path |
| [messaging_async.md](./messaging_async.md) | Webview messaging, polling, refresh after async work |

## Principles

1. **CRD-first Argo CD** — Application list, detail, sync/refresh, and baseline graph nodes work with Kubernetes API access to `applications.argoproj.io` only.
2. **Optional enrichment** — Resource-tree topology and server-native semantics require a separate, explicit Argo CD REST path; failure degrades to CRD baseline without blocking the panel.
3. **Extension hosts secrets and credentials** — Webviews never receive kubeconfig paths, bearer tokens, or raw API endpoints.
4. **Kind actions use Kubernetes RBAC** — Graph tile operations (for example Deployment rollout restart) invoke existing workload integration surfaces under the active context, not Argo CD server APIs.
