# Execution Model

## Main Model

- VS Code hosts extension code in the extension runtime process.
- Commands dispatch into handlers that coordinate services and Kubernetes calls.
- Tree refreshes are event-driven via provider emitters and targeted cache invalidation.
- Webviews run browser bundles and communicate with the host through the message contracts below.

## Concurrency Pattern

- Async Kubernetes queries and process calls run concurrently where safe.
- TTL caches reduce repeated API pressure while maintaining acceptable freshness.

## Host vs Webview

| Concern | Extension host | Webview |
|---------|----------------|---------|
| kubectl / K8s API | yes | no |
| Argo CD CRD patch (sync, refresh) | yes | no |
| Operator status ConfigMap read | yes | no |
| Graph layout (dagre) | optional pre-layout in host, or in webview | primary candidate |
| User input / rendering | forwards actions | React UI |

Webviews use `acquireVsCodeApi()` once; messages are JSON-serializable objects with a `type` discriminator.

## Argo CD Application Webview Identity

Each detail panel is keyed by **`context:namespace:applicationName`**. That key is fixed for the lifetime of the panel: if the user changes the active kube context in VS Code, **the same logical app in another cluster is a different key** (a new panel or an existing panel for that tuple), not an in-place retarget of an open panel.

Revealing an already-open panel runs a **fresh load** for that tuple so actions and refreshes stay consistent with the stored context.

## Initial Load Ordering

See [Startup and bootstrap](startup_bootstrap.md): the extension may send `applicationData` (or `error`) **before or after** the webview posts `ready`. The webview must apply the first snapshot either way without requiring a panel close.

## Message Protocol

### Webview → extension (shipped)

| type | Purpose |
|------|---------|
| `ready` | Webview mounted |
| `sync` | Application-level sync (CRD patch) |
| `refresh` | Normal refresh |
| `hardRefresh` | Hard refresh (confirmation in host) |
| `navigateToResource` | `kind`, `name`, `namespace` — reveal matching cluster-tree resource when kind is in `NAVIGATE_TREE_SUPPORTED_KINDS` |

### Webview → extension (resource graph extension)

| type | Purpose |
|------|---------|
| `graphRefresh` | Explicit graph refresh request; host reloads Application CRD and optional topology inputs, then emits `resourceGraph` |
| `resourceAction` | Kind-scoped action from a node menu; payload includes `actionId`, `kind`, `name`, `namespace`, and optional `group` / `version` (maps from `ManagedResourceKey.apiGroup` at the webview boundary). `GraphNodeId` stays on the graph DTO only. |

Application-level actions stay on the root node or header; tile menus use `resourceAction`.

### Extension → webview (shipped)

| type | Purpose |
|------|---------|
| `applicationData` | Full `ArgoCDApplication` DTO |
| `operationProgress` | `phase`, `message` — host-reported in-flight work (sync path uses `Running` today) |
| `error` | Load or action failure for inline display |

The webview **listens** for `updateStatus` (application-level sync/health patch) but the host does not emit it from `ArgoCDApplicationWebviewProvider` today.

### Extension → webview (resource graph extension)

| type | Purpose |
|------|---------|
| `resourceGraph` | Complete `ApplicationResourceGraph` snapshot with stable ids, topology metadata, structure version, and optional layout hints |
| `updateStatus` | Narrow application-level sync/health-only updates (optional complement on the root when a full graph snapshot is not needed) |
| `resourceActionProgress` | In-flight state for a `resourceAction` |
| `resourceActionResult` | Outcome of a `resourceAction` for tile or toast feedback |

Integration SME owns DTO field shapes. Runtime requires **stable node ids** across refreshes so React Flow state and selection survive merge-style updates.

**Peer note (today):** `ArgoCDService.trackOperation` implements **2 s** polling and **5 min** default timeout for operation phase; graph and sync UX should **wire** that (or equivalent) when driving long-running operations instead of relying on a single post-patch `getApplication` only.

### Kubernetes AI Conformance report messages

The conformance report follows the operator-report command style:

| Direction | Message | Purpose |
|-----------|---------|---------|
| Webview → extension | `{ command: 'refresh' }` | Force a fresh `OperatorStatusClient.getStatus(..., true)` read. |
| Extension → webview | `{ command: 'update', data }` | Send bounded conformance report payload and cache metadata. |
| Extension → webview | `{ command: 'error', message }` | Safe load, permission, parse, or validation error. |

The extension host owns ConfigMap access, cache invalidation, JSON validation, and status normalization. The webview owns rendering, filtering/group expansion if added, and accessible disclosure state only.

## Polling And Refresh Merge

Long-running work is owned by the **extension host**; webviews must not poll the cluster.

### Contract (resource graph and long operations)

After triggering sync, refresh, hard refresh, or a graph action (e.g. rollout restart), the host should:

1. Post `operationProgress` with `phase: 'Running'` and a clear `message`.
2. Poll application (and graph DTO inputs) on a bounded interval with timeout and optional `CancellationToken` (service default: **2 s** interval, **300 s** timeout unless overridden).
3. Push **`resourceGraph` or `applicationData`** when state changes so the graph updates **without** disposing the `WebviewPanel`.
4. On terminal phase (`Succeeded`, `Failed`, `Error`), post a matching `operationProgress`, then a final consistency push (`applicationData` and/or `resourceGraph` as needed).

Prefer merge-style handling of `resourceGraph` snapshots for status-only deltas to limit layout thrash; reserve full relayout for topology changes, `structureVersion` changes, or initial load.

### Concurrent operations

**Application-level busy:** While `operationProgress.phase === 'Running'` for sync, refresh, or hard refresh, the host sets `operationInProgress` on the panel. Duplicate sync requests receive an `error` message. The webview sets `menusDisabled` from the same progress stream and disables all tile overflow menus until a terminal phase.

**Per-node busy:** `resourceActionProgress` with `phase: 'Running'` and a `nodeRef` adds that resource key (`namespace/kind/name`) to webview `busyNodeKeys`, disabling only that tile's overflow (optional in-menu copy: "Action in progress…"). Terminal progress or `resourceActionResult` clears the key.

**Cross-layer rule (v1):** The webview is the primary guard against conflicting menu clicks during app-level or per-node busy states. Host handlers remain safe when invoked; navigate is idempotent. No host-side queue for overlapping `resourceAction` messages is required in v1.

## Open Implementation Decisions

Implementation-level items not yet fully specified. `/refine-issue` resolves these into timeless contract prose and removes or collapses bullets when done.

### ArgoCD diagram protocol cleanup

**Resolved (canonical names, issue #223):**

- Shipped host/webview protocol uses only `resourceGraph`, `resourceAction`, `resourceActionProgress`, and `resourceActionResult` for graph snapshots and tile actions. Legacy names (`graphData`, `graphPatch`, `graphAction`, `actionResult`) are rejected by validators; no runtime alias shim in v1.

**Deferred:**

- **Patch-style graph message:** Introduce only after complete `resourceGraph` snapshot merging is implemented and measured (#227). Until then, the host posts complete snapshots only.
