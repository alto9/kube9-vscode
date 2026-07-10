# Data Model

## Client-side data boundaries

| Layer | Holds | Lifetime |
|-------|-------|----------|
| Kubernetes / Argo CD | Application CRD, `status.resources`, optional resource-tree API | Cluster truth |
| Extension host | Parsed `ArgoCDApplication`, service caches, derived graph topology | Process + TTL |
| Webview | Rendered graph, React Flow layout state, UI selection | Panel session |

No durable graph or layout store is required for the resource graph initiative.

## Core entities (existing)

### AIConformanceSummary

Parsed from `OperatorStatus.aiConformance` in the operator status ConfigMap. It is a bounded report DTO for VS Code display, not a durable local model and not a raw evidence archive.

| Field | Role |
|-------|------|
| `checklistVersion` | Version of the Kubernetes AI Conformance readiness checklist used by the operator. |
| `kubernetesMinor` | Kubernetes minor version evaluated, when reported by the operator. |
| `runId` | Stable id for the last conformance run, when present. |
| `observedAt` | ISO 8601 timestamp for the report snapshot or run completion. |
| `status` | Overall readiness status derived by the operator from row and rollup statuses. |
| `totals` | Aggregate counts across all included requirements. |
| `categoryRollups` | One `AIConformanceCategoryRollup` per checklist category. |
| `requirements` | Bounded `AIConformanceRequirementRow[]`; raw evidence is excluded. |

### AIConformanceCategoryRollup

| Field | Role |
|-------|------|
| `categoryId`, `categoryLabel` | Stable category identity and display label. |
| `must`, `should` | Totals and status counts split by requirement level. |
| `status` | Category readiness status using the shared conformance status vocabulary. |

### AIConformanceRequirementRow

| Field | Role |
|-------|------|
| `id` | Stable checklist requirement id. |
| `categoryId`, `categoryLabel` | Category grouping for the report. |
| `level` | `MUST` or `SHOULD`. |
| `title` | Human-readable requirement name. |
| `status` | One of `passed`, `failed`, `warning`, `not-applicable`, `not-evaluated`, `needs-evidence`. |
| `message` | Optional status explanation. |
| `remediation` | Optional readiness guidance. |

The webview groups rows by `categoryId`, shows MUST and SHOULD rollups separately, and preserves row order from the operator when provided. Unknown optional fields are ignored by the client; unknown statuses render as `not-evaluated` with muted styling rather than as passed.

### ArgoCDApplication

Parsed from the Application CRD. Carries application metadata, sync/health, source/destination, operation state, and a **flat** managed-resource list.

### ArgoCDResource

One row in `ArgoCDApplication.resources`, sourced from CRD `status.resources`. Authoritative for **per-resource sync and health** in CRD-only mode.

| Field | Role |
|-------|------|
| `kind`, `name`, `namespace` | Resource identity (namespaced scope) |
| `syncStatus` | Argo CD sync phase for this resource |
| `healthStatus` | Argo CD health phase when present |
| `message`, `requiresPruning` | Optional drift and pruning hints |

The drift table and graph tiles both consume the same logical resource; they differ only in presentation.

## Stable resource identity

Resource identity must stay consistent across the cluster tree, webview actions (`navigateToResource`), describe/YAML routing, and graph nodes (see [../business_logic/domain_model.md](../business_logic/domain_model.md) invariant 5).

### ManagedResourceKey

Canonical key for a managed Kubernetes object referenced by an Application:

| Property | Required | Notes |
|----------|----------|-------|
| `namespace` | yes | Empty string only for cluster-scoped kinds when CRD omits namespace |
| `kind` | yes | Kubernetes kind string (e.g. `Deployment`, `Service`) |
| `name` | yes | Resource name |
| `apiGroup` | no | Include when known (CRDs, multi-version ambiguity); omit or empty for core group |

Two `ArgoCDResource` rows match when `namespace`, `kind`, and `name` are equal and `apiGroup` matches when both sides provide it.

### ApplicationKey

| Property | Required |
|----------|----------|
| `context` | yes — active kubeconfig context |
| `namespace` | yes — Application CR namespace |
| `name` | yes — Application CR name |

Panel reuse and cache keys use `ApplicationKey` (today encoded as `context:namespace:name`).

### GraphNodeId

Stable string identifier for a node in the resource graph. Must not change across refreshes while the underlying entity is unchanged.

| Node role | Id derivation |
|-----------|---------------|
| Application root | `app:{applicationNamespace}/{applicationName}` |
| Managed resource | `res:{namespace}/{kind}/{name}` with optional `/{apiGroup}` suffix when `apiGroup` is set |

Graph node ids are scoped to a single open Application panel; they do not need the kubeconfig context prefix because the panel is already bound to one `ApplicationKey`.

## Application resource graph (view model)

The **Application resource graph** is a derived, directed view model for React Flow. It is not a separate persistence entity and does not replace the Application CR or `ArgoCDResource` list.

### ApplicationResourceGraph

| Property | Type | Description |
|----------|------|-------------|
| `applicationKey` | ApplicationKey | Which Application this graph represents |
| `nodes` | ResourceGraphNode[] | Application root and managed (or topology) nodes |
| `edges` | ResourceGraphEdge[] | Directed relationships for layout |
| `topologySource` | TopologySource | How edges were produced (see below) |
| `topologyMode` | `full` \| `limited` | **Full** Native Argo CD-style topology (resource-tree). **Limited** CRD-flat and best-effort edges; UI SHOULD show an affordance that topology may be incomplete. Derive consistently from `topologySource` (see below). |
| `structureVersion` | string | Fingerprint that changes when the **set of node ids** or **edge endpoints** changes. Used with polling merge (see [consistency.md](./consistency.md)). Attribute-only sync/health updates do not bump it. |
| `layoutHint` | optional object | Non-authoritative hints from the assembler (for example `{ "algorithm": "dagre-lr", "version": "1" }`). Webview ignores when `structureVersion` changes or may omit hints entirely. |
| `observedAt` | ISO 8601 string | When this graph snapshot was assembled |
| `truncated` | boolean (optional) | **Reserved; omit in v1.** Host must not use this flag to omit managed-resource nodes from `nodes[]`. Large-application kind grouping is a webview-only presentation transform (issue #222). If a future contract adds grouped DTO nodes, this field may signal presentation-limited delivery while preserving reachability through expansion, Details, or tree navigation. |

### ResourceGraphNode

| Property | Type | Description |
|----------|------|-------------|
| `id` | GraphNodeId | Stable React Flow node id |
| `role` | `application` \| `managed_resource` | Root tile vs managed resource tile |
| `resourceKey` | ManagedResourceKey \| null | Null only for `role: application` |
| `status` | ResourceGraphNodeStatus | Sync/health fields for tile badges |
| `label` | string | Display name (usually resource or application name) |
| `kindLabel` | string | Short kind label for tile chrome |

Exactly one node has `role: application`. That node reflects **application-level** sync and health from `ArgoCDApplication.syncStatus` and `ArgoCDApplication.healthStatus`, not an `ArgoCDResource` row.

### ResourceGraphNodeStatus

Normalized status surface for tiles. Primary fields mirror `ArgoCDResource` and Application status:

| Field | Source when CRD-only |
|-------|----------------------|
| `syncStatus` | `ArgoCDResource.syncStatus` or Application sync for root |
| `healthStatus` | `ArgoCDResource.healthStatus` or Application health for root |
| `message` | Optional, from resource or application health message |

Kubernetes **Ready** replica counts and condition summaries are **not** part of this data contract unless a future initiative extends `ResourceGraphNodeStatus`. Tile "ready" semantics for the graph remain Argo CD sync + health unless product explicitly adds workload readiness fields.

### ResourceGraphEdge

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Stable id, e.g. `{sourceId}->{targetId}:{relationship}` |
| `source` | GraphNodeId | Tail (upstream / parent side for left-to-right layout) |
| `target` | GraphNodeId | Head (downstream / child side) |
| `relationship` | EdgeRelationship | Semantic edge type |

### EdgeRelationship

| Value | Meaning |
|-------|---------|
| `manages` | Application root → managed resource (always present in CRD-only mode) |
| `owns` | Parent → child from owner references or Argo CD resource-tree parent |
| `depends_on` | Dependency edge when topology source supplies non-ownership links |

Initial delivery may emit only `manages` edges when topology is CRD-only; richer `owns` / `depends_on` edges appear when a resource-tree or owner-reference source is available.

### TopologySource

| Value | Edges | Node set |
|-------|-------|----------|
| `crd_flat` | Star: Application → each `status.resources` entry | Application root + one node per `ArgoCDResource` |
| `argocd_resource_tree` | From Argo CD resource-tree `parentRefs` | Tree nodes mapped to `ManagedResourceKey` where possible |
| `kubernetes_owner_ref` | Inferred ownerReference chain among known resources | Subset or superset of flat list |
| `operator_snapshot` | From operator-normalized tree DTO when available | Peer contract; not required for vscode-only path |

### TopologyMode (`full` vs `limited`)

| `topologyMode` | Typical `topologySource` values | Meaning |
|----------------|---------------------------------|--------|
| `full` | `argocd_resource_tree` | Matches native UI **resource-tree** topology when the API returns it. |
| `limited` | `crd_flat`, `kubernetes_owner_ref`, incomplete tree fetches | Best-effort or star layout; edges may omit true dependencies. Same mode if resource-tree fails and the assembler falls back. |

Implementations SHOULD set **`topologyMode` on every graph snapshot** so serialization and UI do not re-derive it ad hoc.

The graph consumer treats `topologySource` as diagnostics and assembler metadata; **`topologyMode`** drives user-facing honesty about completeness.

## Relationship to the ArgoCDResource flat list

```
ArgoCDApplication
├── syncStatus, healthStatus     → Application root node status
└── resources: ArgoCDResource[]  → flat authoritative list (CRD status.resources)
         │
         ├─► Drift / resource table views (filter by syncStatus)
         └─► ApplicationResourceGraph (derived)
                  ├── nodes: 1:1 with resources[] in crd_flat mode
                  └── edges: topology source adds structure beyond the flat list
```

Rules:

1. **`ArgoCDApplication.resources` remains the sync/health authority** for every managed resource that appears in `status.resources` when using CRD-only ingestion.
2. In **`crd_flat`** mode, graph nodes for managed resources are in **1:1 correspondence** with `resources[]`; edges are only Application → resource (`manages`). If the UI groups or collapses nodes for large applications, that grouping is a presentation layer over the same returned resources, not a data-layer reduction.
3. When a **topology source** adds nodes not present in `status.resources` (e.g. ReplicaSet from resource-tree), those nodes use status from the topology payload where available; sync/health may be partial or `Unknown` until reconciled with CRD rows sharing the same `ManagedResourceKey`.
4. **Matching** a graph node to a flat-list row uses `ManagedResourceKey` equality, not display label or React Flow internal id.
5. The flat list is **unordered**; graph layout order is computed (e.g. dagre) and is not stored in the Application CR.
6. Removing a resource from `status.resources` on refresh **removes** the corresponding graph node and any edges touching it.

## Layout cache (session)

Optional webview-held map keyed by `GraphNodeId`:

| Property | Purpose |
|----------|---------|
| `position` | `{ x, y }` after user drag or layout pass |
| `measured` | Optional width/height hints from React Flow |

Layout cache is presentation state, not domain data. See [consistency.md](./consistency.md) for merge behavior on refresh.
