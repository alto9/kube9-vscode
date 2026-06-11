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

The application detail **resource graph** consumes a normalized **`ApplicationResourceGraph`** DTO (node/edge model owned in data contracts). The integration layer defines **how** that DTO is populated, in strict precedence:

```text
1. argocd_resource_tree — Argo CD REST resource-tree (preferred when configured and reachable)
2. kubernetes_owner_ref — Kubernetes metadata.ownerReferences (optional fallback for edges)
3. crd_flat       — Application CRD status.resources only (required baseline)
```

The host sets `topologySource` on each push so the webview can label degraded vs full topology.

### Tier A — `crd_flat` (required baseline)

| Item | Contract |
|------|----------|
| **Source** | Single Application CRD get (same as `getApplication`) |
| **Nodes** | One node per `status.resources[]` row plus one **Application root** node |
| **Edges** | Synthetic only: root → each resource (or implementation-defined grouping); no claim of Argo CD UI parity |
| **Status on tiles** | Resource `syncStatus` + `healthStatus`; root uses application-level `syncStatus` / `healthStatus` |
| **RBAC** | `applications` get (and list for refresh flows) — see [authorization.md](./authorization.md) |
| **Failure** | If Application get fails, post `error`; no `resourceGraph` |

This tier matches **current** `ArgoCDService.parseResources` behavior and is sufficient for MVP graph rendering.

### Tier B — `argocd_resource_tree` (optional enrichment)

| Item | Contract |
|------|----------|
| **Source** | Argo CD server REST: `GET /api/v1/applications/{name}/resource-tree` with application namespace as query parameter when namespaced |
| **Response use** | Map Argo CD `nodes[]` (`group`, `kind`, `namespace`, `name`, `version`, `parentRefs`, optional `network`, hook/health fields) into `ApplicationResourceGraph` nodes and directed edges (`parentRefs` → edges parent → child, layout left-to-right in UI) |
| **Auth** | Bearer token (or equivalent) to argocd-server; TLS per settings; optional local access via **kubectl port-forward** to `argocd-server` Service — token and base URL remain in extension host only |
| **Preconditions** | User-enabled REST path; server reachable; Argo CD RBAC allows resource-tree for the application |
| **Failure** | Log, set `topologySource` to fallback tier, do not fail the whole panel solely for tree API errors |
| **Peer note** | kube9-operator today implements **`GET /api/v1/applications`** list only, not resource-tree; extension must not depend on operator for this tier |

Native Argo CD UI resource graphs use this API; kube9-vscode targets **visual parity** when Tier B is active.

### Tier C — `kubernetes_owner_ref` (optional edge fallback)

| Item | Contract |
|------|----------|
| **When** | Tier B unavailable or disabled, but product requires inferred hierarchy beyond `crd-flat` star |
| **Source** | For each resource named in `status.resources`, GET live object in destination namespace; read `metadata.ownerReferences` to link child → parent among managed set |
| **Limits** | Hooks, cluster-scoped objects, multi-namespace apps, and resources not listed in `status.resources` may be missing or wrong; UI shows **degraded topology** |
| **RBAC** | Additional get/list on implicated kinds in destination namespaces — see [authorization.md](./authorization.md) |

### Topology and refresh merge

- **Stable node id**: deterministic string from `(group/,)kind/namespace/name` (and Application root id from app metadata).
- **Incremental refresh**: new `resourceGraph` messages merge by node id; layout cache is a data/runtime concern but graph payloads must be complete snapshots for the host→webview contract.
- **Caps**: when node count exceeds product limit, host sets `truncated: true` and omits or collapses nodes per data contract; never silently drop Application root.

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
| `resource.navigateTree` | All graph nodes with tree mapping | Existing `navigateToResource` / tree reveal |
| `resource.openDescribe` | Kinds with describe support | Route to describe webview command surface |

Unknown `actionId` → `resourceActionResult` with `success: false` and clear message. Unsupported kind for a known id → same, without host crash.

## Argo CD application webview protocol

JSON messages over `webview.postMessage` / `onDidReceiveMessage`. Types are string discriminators on `type`.

### Webview → extension

| `type` | Payload | Host behavior |
|--------|---------|---------------|
| `ready` | — | Idempotent; initial load already triggered on open |
| `sync` | — | Patch Application, track operation, refresh data + graph |
| `refresh` | — | Refresh annotation path, reload data + graph |
| `hardRefresh` | — | Confirm, patch hard refresh, reload |
| `viewInTree` | — | Focus cluster tree, refresh |
| `navigateToResource` | `kind`, `name`, `namespace` | Focus tree / reveal resource (best effort) |
| `graphRefresh` | optional `bypassCache?: boolean` | Reload Application and rebuild `ApplicationResourceGraph` |
| `resourceAction` | `actionId`, `kind`, `name`, `namespace`, optional `group`, `version` | Run registry action; emit progress/result |

### Extension → webview

| `type` | Payload | Purpose |
|--------|---------|---------|
| `applicationData` | `data: ArgoCDApplication` | Full CRD parse (existing) |
| `updateStatus` | `syncStatus`, `healthStatus` | Partial status update |
| `operationProgress` | `phase`, `message?` | Application-level sync/refresh |
| `resourceGraph` | `graph`, `topologySource`, `refreshedAt`, optional `truncated` | Graph snapshot for React Flow |
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
| `operator_snapshot` | Reserved for future operator-normalized tree DTO |

## Operator cross-read (informative)

kube9-operator Argo CD module:

- HTTP client: `GET /api/v1/applications` → normalized `ApplicationSnapshot` (sync/health/revision, optional `resourcesOutOfSyncCount` from list payload).
- Does **not** expose resource-tree to kube9-vscode.

Extension continues to use operator status for **detection** only unless a future operator contract adds graph snapshots.

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
| Network / timeout on CRD get | `error` | Warning or error per severity |
