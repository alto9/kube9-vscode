# External Systems

## Kubernetes API

Primary integration for cluster tree, resource describe, YAML, workload commands, and Argo CD Application CRD read/patch.

- Client: `@kubernetes/client-node` with context from active kubeconfig.
- Supplemental: `kubectl` for selected flows (Argo CD Application get/patch today; port-forward when used for Argo CD REST).

## kube9-operator (optional)

When operated mode is available, the extension reads **detection and enrichment metadata** from the operator status ConfigMap (`status.argocd`: detected, namespace, version, lastChecked, `resourceTreeCapable` or equivalent). Per-application **resource-tree** payloads are fetched on-demand via `kubectl exec` → `kube9-operator query argocd resource-tree get` when the Application graph opens or refreshes. Application CRD reads remain the sync/health baseline.

The operator peer calls Argo CD **`GET /api/v1/applications`** for status cycles and **`GET /api/v1/applications/{name}/resource-tree`** for topology enrichment. It returns **raw Argo CD resource-tree JSON** to kube9-vscode; the extension assembles `ApplicationResourceGraph` and emits `topologySource: argocd_resource_tree` on success. Full tree payloads do **not** belong in the status ConfigMap (1 MiB limit).

The operator status ConfigMap may also publish bounded report summaries for VS Code report surfaces. For Kubernetes AI Conformance, kube9-vscode consumes `status.aiConformance` as a readiness summary only. The operator remains the evaluator and publisher; the extension is the viewer/parser and does not run conformance checks itself.

## Argo CD

Two distinct integration surfaces:

| Surface | Role | Required for graph? |
|---------|------|---------------------|
| **Application CRD** (`argoproj.io/v1alpha1`, `Application`) | List/get apps, `status.resources`, sync/refresh via annotation patch | Yes (baseline nodes and status) |
| **Argo CD API server** (REST, v1) | `resource-tree` topology | No in basic mode; optional via extension REST or operator CLI in operated mode |

Argo CD server URL and API token are **user- or environment-supplied** when REST enrichment is enabled (settings, port-forward to `argocd-server`, or cluster ingress). They are not inferred from the Application CRD alone.

## Out of scope (this repo)

- **kube9-web**, **kube9-desktop**, **kube9-api** — reference UX only; no delivery contract in kube9-vscode for this initiative.
- **Argo CD CLI** (`argocd`) — not a required dependency; REST or CRD paths cover extension needs.
