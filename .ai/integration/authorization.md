# Authorization

Trust boundaries for kube9-vscode integrations. This document states **requirements**; example ClusterRole snippets in user docs are illustrative, not normative for every cluster.

## Identity model

- The extension runs as the **local user** with credentials from the active kubeconfig context.
- **Webviews are untrusted UI** — they request actions via `postMessage`; the extension host validates context, namespace, and RBAC before calling Kubernetes or Argo CD REST.
- **Argo CD API tokens** (when used) live in VS Code secret storage or settings scoped to the workspace; they are never passed into webview HTML/JS payloads.

## Kubernetes RBAC — Argo CD Application CRD (baseline)

Required for detection (basic mode), application list/detail, sync/refresh/hard-refresh, and CRD-sourced graph nodes:

| API group | Resource | Verbs |
|-----------|----------|-------|
| `argoproj.io` | `applications` | `get`, `list`, `patch` |

Detection in basic mode additionally uses read-only access to CRDs, namespaces, and Argo CD server `Deployment` metadata (see user-facing Argo CD integration guide).

Operated mode may satisfy detection via operator status ConfigMap read without extra CRD list permissions for detection only; **application and graph baseline still require** `applications` get/list (and patch for sync actions).

## Kubernetes RBAC — resource graph enrichment

### CRD-flat topology (default)

No additional permissions beyond Application CRD access. Nodes are derived from `status.resources` on the Application; edges are **synthetic** (Application root to each resource, or grouped presentation) because the CRD does not expose `parentRefs`.

### Owner-reference topology (optional fallback)

When the extension infers edges by reading managed objects:

| Scope | Typical resources | Verbs |
|-------|-------------------|-------|
| Application **destination namespace(s)** | `deployments`, `statefulsets`, `daemonsets`, `services`, `configmaps`, `secrets`, `pods`, and other kinds present in `status.resources` | `get`, `list` |

Incomplete reads produce a partial graph; the UI must indicate **degraded topology**, not silent full parity with Argo CD UI.

### Kind actions on graph tiles

Actions execute against **Kubernetes**, not the Argo CD API:

| Action (initial) | Target | Verbs (typical) |
|------------------|--------|-----------------|
| Deployment rollout restart | `apps/deployments` in resource namespace | `get`, `patch` (restart annotation) or equivalent supported by workload command layer |
| Navigate to tree / open describe | Same as existing tree/describe routing | `get` on target kind |

Denied verbs map to `PERMISSION_DENIED` (or kubectl permission errors) surfaced in the webview and host notifications. Menus should hide or disable actions when the host knows the user lacks permission (SelfSubjectAccessReview is optional optimization).

## Argo CD API RBAC (optional resource-tree path)

Separate from Kubernetes RBAC:

- Caller must present credentials accepted by **argocd-server** (Bearer token or session established via port-forward + login flow defined at implementation time).
- Argo CD project/RBAC must allow **`get`** on the application and **`get`** on **resource-tree** for that application in the relevant project/namespace.
- TLS verification follows user configuration (`tlsInsecure` only when explicitly allowed for local dev).

If REST returns 401/403 or connection failure, the extension **falls back** to CRD-flat (and optionally owner-reference if enabled and permitted) without treating the panel as fatal-error solely for topology.

## Operator status ConfigMap

Read access to `kube9-operator-status` (namespace from discovery flow) is required for operated detection metadata and operated report summaries such as Kubernetes AI Conformance. This permission does not grant graph topology by itself.

The AI Conformance report must not require additional Kubernetes RBAC beyond the ConfigMap read already used by operator status. If the ConfigMap cannot be read, the report shows permission guidance and does not attempt alternate local checks.

## Failure and disclosure

- Permission errors must not leak cluster-internal object names beyond what the user already opened in the panel.
- Do not echo tokens, kubeconfig paths, or raw `kubectl` command lines into webview messages.
