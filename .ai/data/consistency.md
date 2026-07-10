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

## Merge on refresh (webview)

Goal: update sync/health and topology without resetting pan/zoom or discarding user-dragged positions.

### When ApplicationKey is unchanged

1. **Build incoming graph** from latest `ArgoCDApplication` (+ topology if available).
2. **Index existing layout** by `GraphNodeId`.
3. **For each incoming node** with an existing id:
   - Replace `status`, `label`, and `kindLabel` from incoming data.
   - Retain `position` (and optional `measured`) from layout cache.
4. **For new ids**: insert node with layout algorithm default position (or append column in dagre pass).
5. **For removed ids**: drop node, incident edges, and layout cache entries.
6. **Edges**: replace edge set from incoming graph; stable edge ids prevent React Flow duplicate-key issues. If only status changed, skip edge relayout unless `topologySource` or node count changed.

7. **Structural fingerprint**: when the incoming graph includes **`structureVersion`**, a change versus the prior snapshot forces the same posture as topology upgrade (new subgraph layout, optional fit). When **`structureVersion` matches**, treat the tick as attribute-only: apply shallow node status updates (steps 3–6) and preserve viewport/selection unless another rule contradicts.

8. **Viewport**: preserve unless node count changed dramatically, **`structureVersion` changed**, or user invokes fit-view.

9. **Selection**: clear selection if selected node was removed; otherwise keep.

### When ApplicationKey changes

Full replace: discard prior graph and layout cache. Equivalent to opening a different Application.

### When topologySource upgrades (e.g. crd_flat → argocd_resource_tree)

- Recompute edges and possibly add nodes.
- Preserve positions for nodes whose `GraphNodeId` survives the transition (same `ManagedResourceKey`).
- Run layout only for new nodes or when user requests fit-view / re-layout.

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

### ArgoCD large graph consistency
- Specify how grouping or progressive disclosure preserves access to every returned `ArgoCDResource` while keeping `crd_flat` count checks meaningful.
- Define the refresh behavior for selected nodes when grouping, expansion, or topology upgrades change the visible tile set.
