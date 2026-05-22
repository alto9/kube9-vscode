# Persistence Abstractions

kube9-vscode does not persist application or graph data to disk. Persistence boundaries are **remote cluster state**, **extension memory**, and **webview session state**.

## Remote sources of truth

| Source | Content | Access |
|--------|---------|--------|
| Application CRD | `spec`, `status.sync`, `status.health`, `status.resources`, `status.operationState` | kubectl / Kubernetes client |
| Optional Argo CD HTTP API | Resource-tree topology (`parentRefs`, extended node metadata) | Integration path when enabled |
| Optional kube9-operator status | Argo CD detection, bounded application summaries | ConfigMap read in operated mode |

The extension reads and parses remote state; it does not write graph structures back to the cluster.

## Extension host memory

### ArgoCDService application cache

- Holds recently fetched `ArgoCDApplication` objects per cluster context.
- TTL aligns with product constants (application data cache on the order of tens of seconds).
- Invalidated or bypassed on explicit sync, refresh, hard refresh, and post-operation polling.

### Derived graph assembly

- `ApplicationResourceGraph` may be built in the extension host or webview from `ArgoCDApplication` plus optional topology fetch.
- If built in the extension, the derived graph is **ephemeral**: recomputed on each fetch, not stored in a separate long-lived cache unless implementation adds a short-lived memo keyed by `ApplicationKey` + revision.
- Prefer recomputing topology from the latest Application snapshot rather than retaining stale edge sets across CRD revisions.

### Panel registry

- Open Application webview panels keyed by `ApplicationKey` (`context:namespace:name`).
- Panel map lifetime follows VS Code panel disposal; no cross-session restore.

## Webview session state

Held only while the Application detail panel is open:

| State | Owner | Survives refresh push? |
|-------|-------|-------------------------|
| React Flow nodes/edges (render model) | Webview | Yes — merged per [consistency.md](./consistency.md) |
| Layout positions (`GraphNodeId` → position) | Webview | Yes — for stable ids until `structureVersion` changes ([consistency.md](./consistency.md)) |
| Viewport (pan/zoom) | Webview | Yes — unless user triggers fit-view or structural invalidation applies |
| Selected node, open menus | Webview | Best-effort preserve when node still exists |
| Tab selection (graph vs overview) | Webview | Yes |

## What is not persisted

- Graph layout across VS Code restarts or panel close/reopen (unless a future feature adds `globalState` / `workspaceState` explicitly).
- Historical graph snapshots or edge diffs.
- Resource-tree responses independent of the current Application revision.

## Abstraction summary

```
Cluster (CRD [+ optional API])
        ↓ read / parse
Extension host: ArgoCDApplication (+ optional topology DTO)
        ↓ serialize (see serialization.md)
Webview: ApplicationResourceGraph render + layout cache
```

No ORM, file store, or extension-local database participates in the graph feature.
