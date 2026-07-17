# Lifecycle And Shutdown

## Argo CD Application Webview Panel

- **Identity:** One panel per `context:namespace:applicationName`, stored in `ArgoCDApplicationWebviewProvider.openPanels`. The captured **context string** is fixed for the panel; changing the IDE's active kube context does **not** retarget an open panel.
- **Reuse:** Opening the same application reveals the existing panel and reloads data for that tuple.
- **Retention:** `retainContextWhenHidden: true` preserves React state (tab, zoom, selection) when the user switches editors; `acquireVsCodeApi` state persists selected tab via `setState`.
- **HTML:** Generated per open; script URI points at built `media/argocd-application/main.js`.

## Disposal

When the panel fires `onDidDispose`:

- Remove entry from `openPanels`.
- Cancel in-flight polling tied to that panel (cancellation token or abort handle per operation).
- Cancel in-flight operator resource-tree `kubectl exec` (and REST enrichment) for that panel; clear any per-panel operator tree memo.
- Message handlers registered with `extensionContext.subscriptions` are disposed with the extension; per-panel timers must not outlive the panel.

## Extension-wide Teardown

- Dispose command subscriptions and view registrations through extension context subscriptions.
- Stop active port-forward processes through manager disposal.
- Stop background monitors and watchers used by YAML conflict detection and namespace or cache services.
- Clear transient caches as needed so dev reload loops do not reuse stale snapshots.

## Extension Deactivation

On extension deactivate, all open webviews are torn down by VS Code. Host code should not orphan timers or polling loops tied to webviews beyond disposal. Patches already sent to the cluster continue server-side under Argo CD control; there is no guaranteed flush of in-flight kubectl subprocesses beyond normal cancellation semantics.

## Graph-Specific Lifecycle

- **Initial load:** Full `resourceGraph` (or `applicationData` from which the webview derives graph) after `ready`.
- **Poll updates:** Prefer complete `resourceGraph` snapshots when sync, health, or topology changes; future patch-style messages must preserve the same stable node identity rules.
- **Structural change:** Full `resourceGraph` when the node or edge set changes (sync finished, hard refresh, resource added/removed).
- **Panel hidden:** Retained context keeps React Flow viewport, selected node, and layout cache when stable node ids survive. Polling continues only while an operation is active, not as a background watch on hidden panels unless explicitly started by user action.
