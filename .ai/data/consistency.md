# Consistency

Rules for keeping application data, the resource graph, and the flat `ArgoCDResource` list aligned during refresh, sync, and polling.

## Authority hierarchy

1. **Application CRD** — ultimate source for application sync/health, flat `status.resources`, and operation phase.
2. **Optional topology fetch** — adds or refines edges and supplemental nodes; must not contradict CRD sync/health for resources that appear in both when both are present.
3. **ApplicationResourceGraph (webview render)** — derived; refreshed from (1) and (2).
4. **Layout cache** — webview-only; preserved across (3) updates when node ids are stable.

## Refresh triggers

Graph-relevant data updates on:

- Initial panel open and webview `ready`
- User sync, refresh, or hard refresh
- Post-operation polling until terminal phase
- Background re-fetch when application cache TTL expires and panel is visible (if implemented)

Each trigger produces a new `observedAt` on the graph DTO or application payload.

## Merge on refresh (two layers)

Goal: update sync/health and topology without resetting pan/zoom, tile selection, or known React Flow positions when `ApplicationKey` and stable `GraphNodeId` values survive.

Refresh merge runs in **two layers**:

1. **Host DTO merge** (`mergeApplicationResourceGraphSnapshots`) before posting `resourceGraph`. Shallow-merges attribute fields on unchanged topology; posts a full incoming snapshot when structure changes.
2. **Webview layout merge** (`mergeGraphFlowState`) when applying each `resourceGraph` message. Maps DTO nodes to React Flow nodes, decides relayout vs position retention, and updates session layout cache, viewport, and selection refs.

Both layers use the same **`structureVersion`** fingerprint (see [serialization.md](./serialization.md)). Attribute-only ticks keep the same version; node-id or edge-endpoint changes bump it.

### Host DTO merge (`ApplicationKey` unchanged)

Given `previous` (last posted graph for the panel) and `incoming` (newly assembled graph):

| Condition | Result |
|-----------|--------|
| No `previous`, or `applicationKey` differs | Return `incoming` unchanged; `structureChanged: true` |
| `structureVersion` differs | Return `incoming` unchanged; `structureChanged: true` |
| Node id set differs | Return `incoming` unchanged; `structureChanged: true` |
| `structureVersion` matches but recomputed fingerprint from `incoming.nodes` / `incoming.edges` differs | Treat as structural mismatch; return `incoming` unchanged; `structureChanged: true` |
| Otherwise (attribute-only tick) | For each incoming node id, replace `status`, `label`, and `kindLabel` from incoming; keep incoming `edges`, `topologySource`, `topologyMode`, `observedAt`, and metadata; `structureChanged: false` |

The host stores the merged graph on the panel (`lastGraph`) and posts it as `resourceGraph`. The webview never receives stale nodes after a structural change.

### Webview layout merge (`ApplicationKey` unchanged)

When `applicationKey` on the incoming graph differs from the panel session key, discard layout cache, viewport cache, and selection. Equivalent to opening a different Application.

Otherwise:

1. Map incoming DTO to React Flow nodes and edges.
2. **Relayout** when any of: initial load (no prior `structureVersion` in cache), user **fit view**, incoming `structureVersion` differs from cache, `topologySource` differs from cache, or managed node count delta exceeds `NODE_COUNT_RELAYOUT_THRESHOLD` (currently `0`, so any add/remove relayouts).
3. **Retain positions** from the layout cache for matching node ids when relayout is false.
4. Replace the edge set from incoming data (stable edge ids prevent duplicate-key issues).
5. **Viewport**: after merge, auto-fit only on initial load or explicit fit-view. Otherwise restore the cached pan/zoom from `onMoveEnd` when available.
6. **Selection**: keep `selectedNodeId` when it exists in the post-merge node id set; clear selection when the id is absent (resource removed or identity changed). Do not clear on attribute-only status updates.

### When topologySource upgrades (e.g. crd_flat → argocd_resource_tree)

- Host posts a new graph with updated edges and possibly supplemental nodes; `structureVersion` and/or node ids typically change → structural path above.
- Webview relayouts because `topologySource` changed.
- Preserve positions for nodes whose `GraphNodeId` survives (same `ManagedResourceKey`) when relayout runs; new ids receive layout defaults.
- Do not auto-fit viewport unless initial load or user invokes fit-view.

### Grouping and progressive disclosure (presentation layer)

Large-application grouping (#222) is a **webview presentation transform** over the complete DTO node set. The host always posts every valid managed-resource node; it does not omit nodes to meet a render cap.

**Kind-based grouping (v1):**

- When managed-resource count exceeds **40** (`LARGE_APP_KIND_GROUP_THRESHOLD`), the webview initially renders **kind group** summary tiles (synthetic React Flow nodes, not DTO entities) collapsed by default.
- Each kind group aggregates managed resources sharing the same `kind` (case-sensitive Kubernetes kind string). The Application root tile is always visible.
- Expanding a kind group reveals the member leaf tiles using stable `GraphNodeId` values from the incoming DTO. Collapsing a group hides leaf tiles in the canvas only; DTO identity is unchanged.
- **Reachability:** every returned managed resource remains reachable through at least one of: expand its kind group on the canvas, the **Details** drift table, or **Navigate to resource in tree** for supported kinds.
- **Selection** is keyed by `GraphNodeId` on the DTO. A selected resource stays selected across refresh while that id remains in `resourceGraph.nodes`.
- **Clear selection** when the selected id disappears from the incoming DTO (removed resource, renamed resource, or `ApplicationKey` change).
- Collapsing a kind group must not clear selection if the underlying id is still present in the DTO; re-expanding restores selected styling on that leaf tile.
- Grouped presentation does not change `structureVersion` or host merge behavior; only the webview render layer maps DTO nodes to visible React Flow nodes.

## Flat list vs graph consistency

After every successful application fetch:

| Check | Rule |
|-------|------|
| Managed resource count (crd_flat) | `graph.nodes.filter(managed)` count equals `application.resources.length` |
| Sync/health on shared keys | Node `status` matches matching `ArgoCDResource` for the same `ManagedResourceKey` |
| Drift tab filters | `outOfSyncResources` / `syncedResources` derived from the same `resources[]` as graph status |
| Root node | Reflects `application.syncStatus` and `application.healthStatus`, not an aggregate of children |

If a resource appears in `status.resources` but fails graph node construction (missing name/kind), omit the node and surface a non-fatal warning in the UI layer; do not invent placeholder keys.

**Invalid-row surfacing (CRD-flat):**

1. Assembler records `assemblyWarnings` (see [api_contracts.md](../integration/api_contracts.md) Tier A).
2. Host logs each warning to the **`kube9 ArgoCD Service`** output channel.
3. When at least one invalid row was skipped, the graph viewport shows a non-blocking info banner (for example: "Some managed resources could not be shown because Argo CD returned incomplete resource rows."). The banner must not include raw CRD JSON or cluster credentials.
4. The Details drift table still lists all parsed `ArgoCDResource` rows from `parseResources`; graph omission affects canvas nodes only.

## Operation in progress

While `operationState.phase` is `Running` or `Terminating`:

- Continue merge-on-refresh; tiles may show transitioning sync/health.
- Do not block graph rendering on operation completion.
- On terminal phase, force a fresh application fetch before final merge so `resources[]` and operation result align.

## Stale and partial data

| Condition | Behavior |
|-----------|----------|
| Application cache hit within TTL | May serve cached `ArgoCDApplication`; graph reflects cached snapshot |
| Topology fetch fails, CRD succeeds | Render `crd_flat` graph; set or retain `topologySource: crd_flat` |
| CRD fetch fails | Show error; retain last successful graph optionally with stale indicator (interface concern) |
| Resource-tree node without CRD row | Show node with topology status; mark sync unknown if no CRD match |

## Performance consistency

- Avoid full graph object replacement when a shallow status patch on existing node ids suffices (same topology, same node set).
- Cap layout recomputation: run dagre (or equivalent) on initial load, topology change, and explicit user re-layout — not on every 30s status tick.
- Large applications: node count limits and grouping are presentation/runtime concerns; data layer still treats each included node as a distinct `GraphNodeId`.

## Open Implementation Decisions

Implementation-level items not yet fully specified. `/refine-issue` resolves these into timeless contract prose and removes or collapses bullets when done.

_(No open bullets for ArgoCD large graph consistency — resolved in **Grouping and progressive disclosure** above, issue #222.)_
