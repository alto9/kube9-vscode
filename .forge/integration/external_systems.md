# External Systems

## Kubernetes API

Primary integration for cluster tree, resource describe, YAML, workload commands, and Argo CD Application CRD read/patch.

- Client: `@kubernetes/client-node` with context from active kubeconfig.
- Supplemental: `kubectl` for selected flows (Argo CD Application get/patch today; port-forward when used for Argo CD REST).

## kube9-operator (optional)

When operated mode is available, the extension reads **detection metadata** from the operator status ConfigMap (`status.argocd`: detected, namespace, version, lastChecked). Application queries still use the Application CRD in the detected namespace unless a future contract adds operator-mediated snapshots.

The operator peer today calls Argo CD **`GET /api/v1/applications`** for drift/status cycles only. It does **not** publish resource-tree or per-resource graph DTOs to the extension. Resource graph topology for kube9-vscode is **extension-local** unless a later cross-repo contract adds operator export.

## Argo CD

Two distinct integration surfaces:

| Surface | Role | Required for graph? |
|---------|------|---------------------|
| **Application CRD** (`argoproj.io/v1alpha1`, `Application`) | List/get apps, `status.resources`, sync/refresh via annotation patch | Yes (baseline nodes and status) |
| **Argo CD API server** (REST, v1) | `resource-tree` and other UI-parity topology | No (optional enrichment) |

Argo CD server URL and API token are **user- or environment-supplied** when REST enrichment is enabled (settings, port-forward to `argocd-server`, or cluster ingress). They are not inferred from the Application CRD alone.

## Out of scope (this repo)

- **kube9-web**, **kube9-desktop**, **kube9-api** — reference UX only; no delivery contract in kube9-vscode for this initiative.
- **Argo CD CLI** (`argocd`) — not a required dependency; REST or CRD paths cover extension needs.
