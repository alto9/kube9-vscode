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

## Extension ↔ webview messages (graph)

Graph delivery should use **JSON-safe DTOs** derived from [data_model.md](./data_model.md), not live React Flow class instances.

### Recommended payload shape

Either extend the existing application message or add a dedicated graph message. Minimal contract:

**Option A — bundled (preferred for single refresh tick):**

```json
{
  "type": "applicationGraph",
  "application": { "...": "ArgoCDApplication" },
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

**Option B — graph-only delta after initial load:**

- Initial open: full `application` + `graph` as above.
- Subsequent polls: `graph` with the same node ids where entities unchanged; webview merges status fields and layout.

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

Actions that target a resource continue to send `kind`, `name`, `namespace` (and add `apiGroup` only when product requires it). Graph node selection resolves to `ManagedResourceKey` before posting messages such as `navigateToResource`.

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
