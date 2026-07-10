# Serialization

Data crosses three boundaries: Kubernetes CRD JSON → extension types → webview JSON messages.

## CRD to extension types

`ArgoCDService` maps Application CR `status.resources[]` into `ArgoCDResource[]` on `ArgoCDApplication`. Field mapping:

| CRD field | `ArgoCDResource` field |
|-----------|------------------------|
| `kind` | `kind` |
| `name` | `name` |
| `namespace` | `namespace` |
| `status` | `syncStatus` |
| `health.status` | `healthStatus` |
| `message` | `message` |
| `requiresPruning` | `requiresPruning` |

Optional CRD fields such as `group` / `version` are not yet modeled on `ArgoCDResource`; when topology sources require them, extend `ManagedResourceKey` and parsing together (integration SME owns API shape).

## Extension ↔ webview messages (today)

Extension → webview payloads include full `ArgoCDApplication` on `applicationData` and partial status on `updateStatus`. Types are plain JSON-serializable objects (no `Date`, no class instances).

## Operator status → extension types (AI Conformance)

`OperatorStatusClient` parses `OperatorStatus.aiConformance` from the JSON string stored under the `status` key in the `kube9-operator-status` ConfigMap. The extension type mirrors the bounded summary in [data_model.md](./data_model.md):

| ConfigMap JSON field | Extension field |
|----------------------|-----------------|
| `aiConformance.checklistVersion` | `AIConformanceSummary.checklistVersion` |
| `aiConformance.kubernetesMinor` | `AIConformanceSummary.kubernetesMinor` |
| `aiConformance.runId` | `AIConformanceSummary.runId` |
| `aiConformance.observedAt` | `AIConformanceSummary.observedAt` |
| `aiConformance.status` | `AIConformanceSummary.status` |
| `aiConformance.totals` | `AIConformanceSummary.totals` |
| `aiConformance.categoryRollups[]` | `AIConformanceSummary.categoryRollups[]` |
| `aiConformance.requirements[]` | `AIConformanceSummary.requirements[]` |

Status strings are normalized to `passed`, `failed`, `warning`, `not-applicable`, `not-evaluated`, or `needs-evidence`. Unknown status strings must be treated as `not-evaluated` for rendering and must be logged for diagnostics.

## Extension ↔ webview messages (AI Conformance)

The conformance webview receives JSON-safe report payloads from the extension host. Minimal payload:

```json
{
  "command": "update",
  "data": {
    "clusterContext": "...",
    "reportTitle": "Kubernetes AI Conformance",
    "operatorStatus": { "...": "bounded operator status or null" },
    "aiConformance": {
      "checklistVersion": "...",
      "kubernetesMinor": "...",
      "totals": {},
      "categoryRollups": [],
      "requirements": []
    },
    "timestamp": 0,
    "cacheAge": 0
  }
}
```

The webview posts `{ "command": "refresh" }` for explicit refresh. The host handles Kubernetes access and cache invalidation; the webview never reads kubeconfig paths, namespaces for the ConfigMap, or raw kubectl output.

## Extension ↔ webview messages (graph)

Graph delivery should use **JSON-safe DTOs** derived from [data_model.md](./data_model.md), not live React Flow class instances.

### Canonical graph message

The canonical host-to-webview graph update is `resourceGraph`. It may be emitted in the same refresh tick as `applicationData`, but it remains a graph-specific message so selection, layout, and action state can be merged independently.

```json
{
  "type": "resourceGraph",
  "graph": {
    "applicationKey": { "context": "...", "namespace": "...", "name": "..." },
    "nodes": [ "..." ],
    "edges": [ "..." ],
    "topologySource": "crd_flat",
    "topologyMode": "limited",
    "structureVersion": "sha256-or-sorted-ids-summary",
    "layoutHint": { "algorithm": "dagre-lr", "version": "1" },
    "observedAt": "2026-05-21T12:00:00.000Z"
  }
}
```

`topologyMode`, `structureVersion`, and `layoutHint` follow [data_model.md](./data_model.md). Omit `layoutHint` when absent. Webviews MUST tolerate missing `structureVersion` (treat whole snapshot as structural) until producers always send it.

Initial open sends full `applicationData` plus full `resourceGraph`. Subsequent polls send complete `resourceGraph` snapshots with the same node ids where entities are unchanged; the webview merges status fields, selection, viewport, and layout.

### ResourceGraphNode JSON

| Field | JSON type |
|-------|-----------|
| `id` | string |
| `role` | string enum |
| `resourceKey` | object or `null` |
| `status.syncStatus` | string |
| `status.healthStatus` | string or omitted |
| `status.message` | string or omitted |
| `label` | string |
| `kindLabel` | string |

Do not serialize React Flow internal fields (`position`, `data.measured`, handle ids) in extension-originated graph DTOs. The webview attaches those when building React Flow `Node` / `Edge` objects.

### Webview → extension (unchanged identifiers)

Actions that target a resource continue to send `kind`, `name`, `namespace` (and add `apiGroup` only when product requires it). Graph node selection resolves to `ManagedResourceKey` before posting messages such as `navigateToResource` or `resourceAction`.

## Topology from non-CRD sources

When Argo CD resource-tree or operator snapshots are integrated:

1. Normalize external nodes to `ManagedResourceKey` + optional extended status.
2. Normalize parent links to `ResourceGraphEdge` with stable ids.
3. Set `topologySource` accordingly before serialization.

Raw upstream JSON must not leak into the webview bundle; normalize in the extension host (or a shared pure module) first.

## Versioning

- Adding optional fields to `ResourceGraphNode` or `ApplicationResourceGraph` is backward compatible.
- **`topologyMode`**, **`layoutHint`**, and **`structureVersion`** are additive; older webviews SHOULD ignore unknown fields and degrade merge behavior when `structureVersion` is absent.
- Changing `GraphNodeId` derivation is **breaking** for layout cache merge; avoid without migration logic.
- Webview should tolerate unknown `topologySource` values by rendering nodes and ignoring unrecognized edge semantics while still honoring `topologyMode` when present.

## `structureVersion` derivation

`structureVersion` fingerprints **graph structure**, not tile status. Attribute-only sync/health updates must not change it.

Algorithm (implementation may hash the canonical string; SHA-256 is acceptable):

1. Collect all node `id` values; sort lexicographically.
2. Collect all edges as `{source}\t{target}` pairs; sort lexicographically.
3. Build payload: `nodes:{ids joined by newline}\nedges:{pairs joined by newline}`.
4. Set `structureVersion` to a stable digest of that payload (for example SHA-256 hex).

Bump `structureVersion` when node ids are added/removed or when any edge source/target pair changes. Do not bump for sync/health/message/label-only updates on existing ids. Edge **relationship** or edge **id** string changes do not bump the fingerprint when source/target pairs are unchanged.

Producers MUST set `structureVersion` on every `resourceGraph` post. Consumers MUST treat a missing `structureVersion` as a structural update (full relayout, no position merge).

## Open Implementation Decisions

Implementation-level items not yet fully specified. `/refine-issue` resolves these into timeless contract prose and removes or collapses bullets when done.

### ArgoCD graph DTO details

**Resolved (tree reveal v1, issue #221):**

- **`apiGroup` for tree navigation:** Not required for v1 reveal of core kinds in `NAVIGATE_TREE_SUPPORTED_KINDS`. Host reveal uses `kind`, `name`, and trimmed `namespace` from `ManagedResourceKey`. When `apiGroup` is present on the key, forward it for future CRD-kind routing; omitting it must not block core-kind reveal.
- **`group` vs `apiGroup` on the wire (issue #223):** DTO field `apiGroup`; webview protocol field `group` on `resourceAction` and `ResourceNodeRef`. Map at the webview boundary (`buildResourceActionPayload` / `buildResourceNodeRef`). Validators reject `apiGroup` on webview messages. Do not emit both fields on the same message.

- **Large-application grouping (issue #222):** Remains an **interface-only transform** over the complete flat DTO node set in v1. Kind group tiles are synthetic webview nodes; they are not serialized in `ApplicationResourceGraph.nodes`. The host does not set `truncated: true` to omit managed-resource nodes.
