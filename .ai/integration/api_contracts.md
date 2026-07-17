# API Contracts

## Kubernetes API

- Core interactions use `@kubernetes/client-node` clients (`CoreV1`, `AppsV1`, `BatchV1`, `NetworkingV1`, `StorageV1`, `AuthorizationV1`, `ApiextensionsV1`, `Version`, `RbacAuthorizationV1`).
- Context switching rebinds API clients to the selected kubeconfig context.
- Resource detail providers may compose typed Kubernetes API clients, dynamic custom-resource access, discovery metadata, and events. They must preserve Kubernetes scope rules instead of assuming every resource is namespaced.

## CLI-backed Contracts

- `kubectl` is used for selected workflows (Argo CD Application CRD get/patch/list, port forwarding when Argo CD REST enrichment is enabled, and other flows documented in operations).
- `helm` is required for Helm package manager features and is checked non-blocking at startup.

## Argo CD — installation and application CRD

- **Detection** supports operator-assisted status ConfigMap and direct CRD/deployment detection (basic mode).
- **Application list/detail** reads `applications.argoproj.io` in the detected Argo CD namespace; parsed shape matches `ArgoCDApplication` / `ArgoCDResource` in extension types (`status.sync`, `status.health`, `status.resources`, `status.operationState`).
- **Sync / refresh / hard refresh** patch Application metadata annotation `argocd.argoproj.io/refresh` (`normal` or `hard`); host invalidates application cache and may poll `operationState` until terminal phase.

### `ArgoCDResource` (CRD `status.resources[]`)

Each entry is a **flat** managed-resource row, not a graph edge list:

| Field | Source | Notes |
|-------|--------|-------|
| `kind`, `name`, `namespace` | resource row | Stable node identity with API group resolved at graph-build time when needed |
| `syncStatus` | `status` on row | Argo CD resource sync: `Synced`, `OutOfSync`, etc. |
| `healthStatus` | `health.status` | Argo CD resource health codes (`Healthy`, `Degraded`, …) |
| `message`, `requiresPruning` | optional | Drift and pruning hints |

**No `parentRefs`** appear on the Application CRD resource list. CRD-only graphs cannot reproduce Argo CD UI parent/child ordering without enrichment.

## Argo CD — resource graph data sourcing

The application detail **resource graph** consumes a normalized **`ApplicationResourceGraph`** DTO (node/edge model owned in data contracts). The integration layer defines **how** that DTO is populated, in strict precedence.

**Operated mode** (kube9-operator installed, `status.argocd.detected`):

```text
1. argocd_resource_tree — Extension REST when kube9.argocd.restEnabled and authorized (wins over operator)
2. argocd_resource_tree — Operator CLI on-demand fetch (raw Argo CD JSON → buildResourceTreeApplicationResourceGraph)
3. kubernetes_owner_ref — Kubernetes metadata.ownerReferences (optional fallback for edges)
4. crd_flat       — Application CRD status.resources only (required baseline)
```

**Basic mode** (no operator):

```text
1. argocd_resource_tree — Extension REST when restEnabled and authorized
2. kubernetes_owner_ref
3. crd_flat
```

On operator or REST success assembling from resource-tree shape, the host sets `topologySource: argocd_resource_tree` and `topologyMode: full`. Operator is transport only; it does not emit a separate `operator_snapshot` topology label on success.

The host sets `topologySource` on each push so the webview can label degraded vs full topology.

### Tier A — `crd_flat` (required baseline)

| Item | Contract |
|------|----------|
| **Source** | Single Application CRD get (same as `getApplication`) |
| **Nodes** | One node per **valid** `status.resources[]` row plus one **Application root** node |
| **Edges** | Synthetic star only: one `manages` edge from Application root to each managed node; no claim of Argo CD UI parent/child parity |
| **Status on tiles** | Resource `syncStatus` + `healthStatus`; root uses application-level `syncStatus` / `healthStatus` |
| **RBAC** | `applications` get (and list for refresh flows) — see [authorization.md](./authorization.md) |
| **Failure** | If Application get fails, post `error`; no `resourceGraph` |

#### ManagedResourceKey parsing (Tier A)

Each `ArgoCDResource` row from `ArgoCDService.parseResources` maps to `ManagedResourceKey` as follows:

| Field | Rule |
|-------|------|
| `namespace` | Trim whitespace; use empty string when CRD omits namespace (cluster-scoped kinds) |
| `kind` | Trim whitespace; **required** — blank or missing → invalid row |
| `name` | Trim whitespace; **required** — blank or missing → invalid row |
| `apiGroup` | Omitted in Tier A (CRD `status.resources[]` rows do not carry a stable group field in the current parser) |

`GraphNodeId` for managed resources is `res:{namespace}/{kind}/{name}` (no `apiGroup` suffix in Tier A). Application root id is `app:{applicationNamespace}/{applicationName}`.

#### Invalid and duplicate rows

| Condition | Graph behavior | Warning |
|-----------|----------------|---------|
| Missing or whitespace-only `kind` or `name` | Omit node; do not invent placeholder keys | `Skipped resource row: missing kind or name` |
| Duplicate `ManagedResourceKey` (same namespace/kind/name) | Keep **first** row's sync/health; omit later rows | `Skipped duplicate managed resource: {namespace}/{kind}/{name}` |

Assembly warnings are non-fatal. The host logs each warning to the **`kube9 ArgoCD Service`** output channel with a `crd_flat graph assembly` prefix. When any invalid row was skipped, the webview shows a non-blocking graph info banner (no raw CRD fragments).

#### Count consistency

After assembly, managed-resource node count must equal the count of **valid** rows in `ArgoCDApplication.resources` (invalid and duplicate rows excluded). See [consistency.md](../data/consistency.md).

This tier matches **current** `ArgoCDService.parseResources` behavior and is sufficient for baseline graph rendering. Optional Tier B/C enrichment runs only after Tier A completeness is shippable; enrichment failure falls back to Tier A without failing the panel.

### Tier B — `argocd_resource_tree` (optional enrichment)

| Item | Contract |
|------|----------|
| **Source** | Argo CD server REST: `GET /api/v1/applications/{name}/resource-tree` with application namespace as query parameter when namespaced |
| **Response use** | Map Argo CD `nodes[]` (`group`, `kind`, `namespace`, `name`, `version`, `parentRefs`, optional `network`, hook/health fields) into `ApplicationResourceGraph` nodes and directed edges (`parentRefs` → edges parent → child, layout left-to-right in UI) |
| **Auth** | Bearer token (or equivalent) to argocd-server; TLS per settings; optional local access via **kubectl port-forward** to `argocd-server` Service — token and base URL remain in extension host only |
| **Preconditions** | User-enabled REST path; server reachable; Argo CD RBAC allows resource-tree for the application. In operated mode, extension REST **wins** over operator when both are available and authorized. |
| **Failure** | Log, set `topologySource` to fallback tier, do not fail the whole panel solely for tree API errors |
| **Peer note** | kube9-operator exposes on-demand `query argocd resource-tree get` returning raw Argo CD JSON when extension REST is not configured or authorized |

Native Argo CD UI resource graphs use this API; kube9-vscode targets **visual parity** when Tier B is active.

### Tier B2 — Operator CLI resource-tree (operated mode)

| Item | Contract |
|------|----------|
| **When** | Operated mode; extension REST not configured or not authorized; operator present with `status.argocd.detected` and resource-tree capability |
| **Client** | Dedicated `OperatorResourceTreeClient` invoked from `ApplicationResourceGraphBuilder` |
| **Source** | `kubectl exec` → `kube9-operator query argocd resource-tree get <appName> --namespace=<appNamespace> [--format=json]` |
| **Response use** | Raw Argo CD resource-tree JSON (`nodes[]`, `parentRefs[]`); extension reuses `buildResourceTreeApplicationResourceGraph` |
| **Auth** | Operator authenticates to argocd-server with platform-supplied dedicated bearer token (Helm Secret); extension does not hold operator token |
| **Preconditions** | Operator installed; Argo CD detected; `status.argocd.resourceTreeCapable === true`; extension pod exec RBAC. When capability is false or omitted, **hard-skip** the operator tier (no exec). |
| **Timeout / cancel** | Host wait aligns with operator `ARGOCD_API_TIMEOUT_MS` default **30000** ms (no new vscode setting in v1). Cancel in-flight exec when the Application panel is disposed. |
| **Failure** | Fall through to `kubernetes_owner_ref` → `crd_flat` (REST already skipped or failed for this load). Map structured stderr `code` to Output Channel only; set `limitedTopologyReason` for the webview affordance. |
| **topologySource on success** | `argocd_resource_tree` (operator is transport only; do not emit `operator_snapshot`) |
| **limitedTopologyReason on skip/fail** | `operator_not_capable` when capability false / token-missing class at status level; `enrichment_failed` when capability true but per-app CLI fails (`APPLICATION_NOT_FOUND`, per-app RBAC, `TIMEOUT`, parse error, exec error) |

**Operator stderr → host log (do not show in webview):** Prefix lines with `[INFO] Argo CD resource-tree enrichment unavailable` and include the structured `code` when present (`ARGOCD_TOKEN_MISSING`, `ARGOCD_AUTH_FAILED`, `ARGOCD_RBAC_DENIED`, `APPLICATION_NOT_FOUND`, `TIMEOUT`, `ARGOCD_API_UNREACHABLE`, `ARGOCD_NOT_DETECTED`, `INVALID_ARGUMENT`, `INTERNAL_ERROR`). Never log the operator token or raw bearer material.

See peer contract: `kube9-operator/.ai/integration/api_contracts.md` (resource-tree query).

### Tier C — `kubernetes_owner_ref` (optional edge fallback)

| Item | Contract |
|------|----------|
| **When** | Tier B unavailable or disabled, but product requires inferred hierarchy beyond `crd-flat` star |
| **Source** | For each resource named in `status.resources`, GET live object in destination namespace; read `metadata.ownerReferences` to link child → parent among managed set |
| **Limits** | Hooks, cluster-scoped objects, multi-namespace apps, and resources not listed in `status.resources` may be missing or wrong; UI shows **degraded topology** |
| **RBAC** | Additional get/list on implicated kinds in destination namespaces — see [authorization.md](./authorization.md) |

### Topology and refresh merge

- **Stable node id**: deterministic string from `(group/,)kind/namespace/name` (and Application root id from app metadata).
- **Incremental refresh**: new `resourceGraph` messages merge by node id; layout cache is a data/runtime concern, and graph payloads are complete snapshots for the host-to-webview contract unless a future patch message is explicitly added.
- **Large applications**: the host delivers the complete managed-resource node set on every `resourceGraph` post. Kind-based grouping and collapse are webview presentation concerns (issue #222); the host does not omit nodes to meet a render cap. Do not set `truncated: true` to signal node omission in v1.

### Status semantics (integration boundary)

- **Tile sync/health** — Argo CD resource **sync** and **health** from CRD row or resource-tree node; this is the default for GitOps graph tiles.
- **Kubernetes Ready** (replica ready counts, Pod Ready condition) is **not** part of the Argo CD CRD resource row; if shown, it comes from a separate optional workload read and must be labeled distinctly from Argo **health** (business/interface SME). Do not treat user "ReadyState" as a fourth Argo CD enum without explicit mapping.

## Argo CD — resource action registry

Graph tile menus invoke **host-executed** actions by stable `actionId`. Initial set:

| `actionId` | Applicable kinds (initial) | Integration backend |
|------------|------------------------------|---------------------|
| `application.sync` | Application root | Application CRD refresh annotation (`normal`) + existing operation tracking |
| `application.refresh` | Application root | Same as sync refresh path |
| `application.hardRefresh` | Application root | Annotation `hard` + confirmation |
| `deployment.restartRollout` | `Deployment` | Kubernetes workload layer (rollout restart via Deployment patch or kubectl rollout); **not** Argo CD API |
| `resource.navigateTree` | Kinds in `NAVIGATE_TREE_SUPPORTED_KINDS` (Deployment, StatefulSet, DaemonSet, CronJob, Pod, Service, ConfigMap, Secret) | Existing `navigateToResource` / tree reveal |
| `resource.openDescribe` | Kinds with describe support | Route to describe webview command surface _(registry entry; graph tile overflow not wired in v1 — see domain_model)_ |

Unknown `actionId` → `resourceActionResult` with `success: false` and message `Unknown action: {actionId}`. Unsupported kind for a known id → `success: false` with message `Action {actionId} is not supported for kind {kind}`; host must not crash. User-cancelled restart confirmation → `success: false`, message `Cancelled`; webview suppresses the action-notice banner for that message.

## Argo CD application webview protocol

JSON messages over `webview.postMessage` / `onDidReceiveMessage`. Types are string discriminators on `type`.

### Webview → extension

| `type` | Payload | Host behavior |
|--------|---------|---------------|
| `ready` | — | Idempotent; initial load already triggered on open |
| `sync` | — | Patch Application, track operation, refresh data + graph |
| `refresh` | — | Refresh annotation path, reload data + graph |
| `hardRefresh` | — | Confirm, patch hard refresh, reload |
| `viewInTree` | — | Focus `kube9ClusterView`, refresh tree, reveal open Application as `argocdApplication` item when context matches |
| `navigateToResource` | `kind`, `name`, `namespace` | Same reveal path as `resource.navigateTree` for supported kinds; explicit error for unsupported kinds |
| `graphRefresh` | optional `bypassCache?: boolean` | Reload Application and rebuild `ApplicationResourceGraph` |
| `resourceAction` | `actionId`, `kind`, `name`, `namespace`, optional `group`, `version` | Run registry action; emit progress/result. Wire uses `group` (not `apiGroup`); maps from `ManagedResourceKey.apiGroup` at the webview boundary. No `nodeId` on the wire — identity is the resource reference fields above. |

### Extension → webview

| `type` | Payload | Purpose |
|--------|---------|---------|
| `applicationData` | `data: ArgoCDApplication` | Full CRD parse (existing) |
| `updateStatus` | `syncStatus`, `healthStatus` | Partial status update |
| `operationProgress` | `phase`, `message?` | Application-level sync/refresh |
| `resourceGraph` | `graph` (`ApplicationResourceGraph` including `topologySource`, `topologyMode`, optional `limitedTopologyReason`), plus wire fields `topologySource`, `topologyMode`, `structureVersion`, `refreshedAt`, optional `truncated` as already shipped | Complete graph snapshot for React Flow merge |
| `resourceActionProgress` | `actionId`, `phase`, `message?`, optional node ref | Tile action in flight |
| `resourceActionResult` | `actionId`, `success`, `message`, optional node ref | Tile action terminal state |
| `error` | `message` | User-visible failure |

### `topologySource` enum (integration)

Canonical values match [data model](../data/data_model.md#topologysource):

| Value | Meaning |
|-------|---------|
| `argocd_resource_tree` | Edges primarily from resource-tree `parentRefs` |
| `kubernetes_owner_ref` | Edges from Kubernetes owner references |
| `crd_flat` | No real hierarchy; synthetic root edges only |
| `operator_snapshot` | Reserved for future operator-normalized tree DTO; M17 operator path emits `argocd_resource_tree` instead |

## Operator cross-read (informative)

kube9-operator Argo CD module:

- HTTP client: `GET /api/v1/applications` → normalized `ApplicationSnapshot` (sync/health/revision) into SQLite `argocd_apps`.
- **Resource-tree:** `GET /api/v1/applications/{name}/resource-tree` on-demand via CLI query; returns raw Argo CD JSON to kube9-vscode.
- Status ConfigMap: detection, bounded application summaries, and `resourceTreeCapable` (or equivalent) enrichment signal.

Extension uses operator status for **detection and enrichment gating**; per-application trees are fetched on graph open/refresh via CLI exec, not embedded in ConfigMap.

## Operator status — AI Conformance report

The Kubernetes AI Conformance report is an operated-mode report sourced from the existing `kube9-operator-status` ConfigMap. kube9-vscode reads the ConfigMap through `OperatorStatusClient` and parses an optional `aiConformance` object from the status JSON.

### Expected bounded payload

| Field | Required | Notes |
|-------|----------|-------|
| `checklistVersion` | yes | Version of the readiness checklist used by the operator. |
| `kubernetesMinor` | no | Kubernetes minor evaluated, when the operator can determine it. |
| `runId` | no | Stable id for the latest conformance run. |
| `observedAt` | yes | ISO 8601 timestamp for the report snapshot or run completion. |
| `status` | yes | Overall status using the conformance vocabulary. |
| `totals` | yes | Total, passed, failed, warning, not-applicable, not-evaluated, and needs-evidence counts. |
| `categoryRollups[]` | yes | Category-level rollups, including MUST and SHOULD counts. |
| `requirements[]` | yes | Bounded requirement rows with id, category, level, status, message, and optional remediation. |

The status vocabulary is `passed`, `failed`, `warning`, `not-applicable`, `not-evaluated`, and `needs-evidence`. The client treats unknown statuses as `not-evaluated` for display, logs the unexpected value, and avoids showing false-positive readiness.

### Failure and degradation

| Condition | Host → webview |
|-----------|----------------|
| Operator not installed / ConfigMap not found | Empty state explaining the report requires kube9-operator. |
| Operator status degraded or stale | Report may render last bounded summary with stale/degraded banner when present; otherwise empty/error state. |
| `aiConformance` missing | Empty state explaining no conformance run has been published yet. |
| JSON parse or validation failure | Error state with safe message; raw ConfigMap JSON stays out of the webview. |
| Permission denied reading ConfigMap | Permission guidance consistent with other operator status surfaces. |

The report does not shell out beyond the existing operator status read path. It does not request raw evidence, run kubectl conformance checks locally, or call external conformance services.

## Error mapping (Argo CD flows)

| Condition | Host → webview | User notification |
|-----------|----------------|-------------------|
| Application not found | `error` | Error message |
| Kubernetes RBAC denied on CRD | `error` (`PERMISSION_DENIED` semantics) | Permission guidance |
| Resource-tree / owner-ref partial failure | `resourceGraph` with lower tier + optional banner in UI | Informational (implementation) |
| Resource action denied | `resourceActionResult` success false | Error message |
| Tree reveal: context mismatch | `resourceActionResult` success false | Graph action-notice + result message |
| Tree reveal: resource not in tree | `resourceActionResult` success false | Graph action-notice; message includes `not found in cluster tree` |
| Application `viewInTree`: app not found | _(no webview message)_ | `showWarningMessage` naming application |
| Network / timeout on CRD get | `error` | Warning or error per severity |

### Tree reveal mapping (host)

`ClusterTreeProvider.revealTreeResource(kind, name, namespace)` resolves existing tree items only. The `namespace` argument is the **resolved reveal namespace** from `.ai/interface/interaction_flow.md` (managed resource key; never Application CR namespace).

| Kind | Tree path |
|------|-----------|
| Pod | Workloads → Pods |
| Deployment, StatefulSet, DaemonSet, CronJob | Workloads → matching subcategory |
| Service | Networking → Services |
| ConfigMap, Secret | Configuration → ConfigMaps / Secrets |

Before managed-resource reveal, the host focuses the cluster tree, invalidates the current-context resource cache and any prefetch/category children cache used by tree loading, fires tree data change, then awaits this lookup (issue #242). No debounce.

`ClusterTreeProvider.revealTreeApplication(name, namespace)` resolves under **ArgoCD Applications** (`argocd` → `argocdApplication`) by matching `resourceName` and application namespace. Returns `false` when the category, application list, or matching item is unavailable.

## Open Implementation Decisions

Implementation-level items not yet fully specified. `/refine-issue` resolves these into timeless contract prose and removes or collapses bullets when done.

### ArgoCD resource graph integration

**Resolved (`resourceAction` wire shape, issue #223):**

- **`resourceAction` payload (webview → host):** Required fields: `actionId`, `kind`, `name`, `namespace`. Optional: `group`, `version`. `GraphNodeId` is not serialized on this message; the host routes by resource reference plus `actionId`.
- **Canonical API group naming:** Internal DTOs and parsers use `ManagedResourceKey.apiGroup`. The webview protocol uses optional wire field `group` only. `buildResourceActionPayload` maps `apiGroup` → `group`; `buildResourceNodeRef` maps `group` → `ResourceNodeRef.group`. Validators reject `apiGroup` on webview messages. Tree reveal and action routing accept omitted `group` for core kinds in `NAVIGATE_TREE_SUPPORTED_KINDS`.
- **`resourceActionProgress` / `resourceActionResult`:** Include `actionId`, `phase` or `success`/`message`, and optional `nodeRef` with the same `kind`, `name`, `namespace`, optional `group`, `version` shape.

**Resolved (CRD-flat baseline):**

- **Owner-reference enrichment** ships after CRD-flat completeness. Tier C is optional; when unavailable the host keeps Tier A (`crd_flat`) without failing the panel.
- **Resource-tree fallback messaging:** When Tier B / B2 fails or is disabled, the webview shows the limited-topology affordance (`topologyMode: limited`) with tiered copy from `limitedTopologyReason` (see presentation contract). Raw upstream errors, endpoints, and credentials stay in the extension host output channel only, prefixed `[INFO] Argo CD resource-tree enrichment unavailable`.

**Resolved (operator Tier B2, issue #241):**

- Dedicated `OperatorResourceTreeClient`; hard-skip when `resourceTreeCapable` is not true; cancel on panel dispose; 30s host wait default; success labels `argocd_resource_tree` / `full`; affordance reasons as in Tier B2 table above.
