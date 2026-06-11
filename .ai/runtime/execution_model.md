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
| `viewInTree` | Focus application in cluster tree |
| `navigateToResource` | `kind`, `name`, `namespace` — navigate to tree / describe where supported |

### Webview → extension (resource graph extension)

| type | Purpose |
|------|---------|
| `graphAction` | Kind-scoped action from a node menu; payload includes `action` (e.g. `restartRollout`), stable `nodeId`, `kind`, `name`, `namespace` |

Application-level actions stay on the root node or header; tile menus use `graphAction`.

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
| `graphData` | Nodes, edges, stable ids, optional pre-computed positions |
| `graphPatch` | Incremental node status updates without full graph replace (keeps panel open and preserves layout where possible) |
| `updateStatus` | Narrow application-level sync/health-only updates (optional complement to `graphPatch` on root) |
| `actionResult` | Outcome of a `graphAction` for tile or toast feedback |

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
3. Push **`graphPatch` or `applicationData`** when state changes so the graph updates **without** disposing the `WebviewPanel`.
4. On terminal phase (`Succeeded`, `Failed`, `Error`), post a matching `operationProgress`, then a final consistency push (`applicationData` and/or `graphData` as needed).

Prefer **`graphPatch`** for status-only deltas to limit layout thrash; reserve full `graphData` for topology changes or initial load.

### Concurrent operations

While `operationProgress.phase === 'Running'`, treat the application as busy: block conflicting header and node actions until terminal phase or `error`.
