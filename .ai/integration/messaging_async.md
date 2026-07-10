# Messaging and Async Behavior

## Webview channel

Argo CD application detail uses a **bidirectional** `postMessage` channel between the React webview (`argocd-application` bundle) and `ArgoCDApplicationWebviewProvider` in the extension host.

- **Synchronous request/response is not used** — the webview sends intent messages; the host pushes state updates asynchronously.
- **Context is host-owned** — application name, Argo CD namespace, and kubeconfig context are bound when the panel opens; webview messages must not override cluster context.

## Application lifecycle messages (current)

See [api_contracts.md](./api_contracts.md#argo-cd-application-webview-protocol) for the full type list. Summary:

| Direction | Types | Purpose |
|-----------|-------|---------|
| Webview → host | `ready`, `sync`, `refresh`, `hardRefresh`, `viewInTree`, `navigateToResource` | Load signal, GitOps actions, tree navigation |
| Host → webview | `applicationData`, `updateStatus`, `operationProgress`, `error` | CRD snapshot, status deltas, sync/refresh progress |

`hardRefresh` requires host-side confirmation before patch.

## Resource graph extension (async)

| Direction | Type | Behavior |
|-----------|------|----------|
| Webview → host | `graphRefresh` | Host reloads Application CRD (and optional resource-tree / owner-ref pass), rebuilds graph DTO, posts `resourceGraph`. Optional `bypassCache` flag mirrors application list cache invalidation. |
| Host → webview | `resourceGraph` | Pushes `ApplicationResourceGraph` plus topology metadata, `structureVersion`, and `refreshedAt` ISO timestamp. |
| Webview → host | `resourceAction` | Host runs registered action by `actionId` (see api_contracts). |
| Host → webview | `resourceActionProgress`, `resourceActionResult` | Per-action progress and terminal outcome for tile menus. |

After successful `sync`, `refresh`, or `hardRefresh`, the host should **automatically** emit updated `applicationData` and `resourceGraph` so the graph reflects new sync/health without closing the panel.

**Product-facing names:** **`refreshGraph`** is the user-facing name for the same intent as **`graphRefresh`**; the host may accept either string and normalize internally. Deployment rollout restart is carried as **`resourceAction`** with `actionId` **`deployment.restartRollout`** (see action registry in [api_contracts.md](./api_contracts.md#argo-cd--resource-action-registry)). **`navigateToResource`** remains in the lifecycle set (kind, name, namespace); it is not renamed for the graph surface.

## Polling and long-running work

- **Application sync/refresh** — host may poll `status.operationState` on the Application CRD (existing `trackOperation` pattern) and emit `operationProgress` until terminal phase.
- **Resource actions** (for example rollout restart) — host polls workload status or waits for kubectl/API completion, emitting `resourceActionProgress` with phases such as `Running`, `Succeeded`, `Failed`.
- **Background graph refresh** — while a panel is visible, the host may poll on an interval aligned with `APPLICATION_CACHE_TTL` (30s) or on tree refresh events; polling must be cancellable on panel dispose and context switch (existing webview close-on-context-change behavior).

## Ordering guarantees

1. On open: host loads CRD → posts `applicationData` → builds graph → posts `resourceGraph`.
2. `ready` from webview does not block initial load; it is idempotent.
3. `error` supersedes optimistic UI state for the failed operation only; prior graph data may remain visible with a banner unless the error is total load failure.

## Cross-cutting

- Context switch closes Argo CD application panels (see runtime contracts); in-flight polls must abort.
- Telemetry hooks for major webview open remain host responsibility; graph actions may add discrete events at implementation time without changing message shapes.
