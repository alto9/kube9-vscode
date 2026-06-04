# Interaction Flow

## Typical Flows

1. **Inspect**: choose context -> expand namespace/resource -> open describe or YAML/logs.
2. **Operate**: select resource -> execute scale/restart/delete/apply action -> refresh affected tree nodes.
3. **Debug**: open events/logs -> correlate with resource health/status -> iterate on YAML or workload commands.
4. **GitOps (application detail):** select Argo CD Application in the **tree** (unchanged list/category) -> webview opens on the **resource graph** -> scan topology and per-tile sync/health -> use tile overflow or header for sync/refresh/hard-refresh/view-in-tree -> optional **Details** tab for metadata and drift table -> graph refreshes after operations without closing the panel.

## Argo CD Application Detail Flow

### Open and default focus

1. User opens an application from the tree (same entry points as today: tree click, context menu, commands).
2. Webview loads; **Graph** is active immediately.
3. User sees the Application root and dependency nodes laid out left to right; may pan/zoom or **fit view** from the graph toolbar.

The tree **does not** embed the graph; it continues to list applications with status icons only.

### Inspect on the graph

- **Glance:** Read sync and health from each tile and from the Application root without opening menus.
- **Topology:** Follow dashed edges from parent to dependent resources.
- **Deeper metadata or drift scan:** Switch to **Details** for overview sections and the filterable resource table (same navigate-to-tree behavior as the former drift tab).

### Operate from tiles and header

- **Application-level:** **Sync** and **Refresh** on the **primary webview header**; **Hard refresh** and **View in tree** on the **sub-header row** directly below (disabled while an operation is in progress, same semantics as today). The Application root tile may expose the same actions in its overflow menu.
- **Per-resource overflow (⋮):** Actions are **kind-driven** via a capability registry (not ad hoc per screen). Initial set:
  - **Deployment:** restart rollout (pods), with progress/error feedback through existing extension notification patterns.
  - **Supported workload/kinds:** navigate to resource in tree; open describe where the extension already supports that kind.
  - **Kinds without operations:** menu hidden or shows only navigate when navigation is valid.
- **Selection:** Activating a tile (primary click) focuses the node for keyboard users; overflow opens on explicit menu control to avoid accidental operations.

### Operate from Details tab

- Resource name / navigate affordances in the drift table behave as today.
- Overview action buttons remain available in **Details** for users who prefer tabular workflows; header actions are authoritative and stay enabled whenever the application payload is loaded.

### Refresh and live updates

- After sync, refresh, or hard refresh completes, **graph nodes and edges** reconcile from the latest application payload without requiring the user to close the webview.
- While syncing or refreshing, header actions and in-progress tile actions respect disabled/loading semantics; graph may show stale topology until the next data push, but must not flash to an erroneous empty state mid-operation.

### Failure and degradation

- Missing permissions, unreachable application, or empty resource set: show dedicated empty/error presentation on the graph or full-panel error (consistent with other webviews).
- If topology cannot be built (integration provides a flat list only), graph still renders nodes with **no inferred edges** and surfaces a non-blocking hint that relationships are unavailable; **Details** drift table remains usable.

## Webview header and overflow flows

### Page-level actions (all in-scope webviews)

1. User opens a webview panel; the host supplies HTML with shipped header CSS and the shared header contract (React `WebviewHeader` or legacy shared shell).
2. User scans **title left**, **primary actions right** (at most three labeled primaries before overflow).
3. When more page-level operations exist than the primary cap allows, user opens **Actions** overflow for the rest; **Help** (when present) stays trailing outside overflow.
4. Panels with a **sub-header row** (Events, Argo CD Application) expose secondary controls one row below without breaking the single primary header row at default widths.

### Events Viewer

1. User opens Events from tree or command; primary header offers refresh and filter affordances within the global primary cap.
2. **Export** and **Search** live on the **sub-header row** (not a third ad hoc toolbar band with unrelated styling).
3. Command semantics (export, search, auto-refresh, clear filters) are unchanged; only placement and chrome unify.

### Legacy workload describe

1. User opens Deployment, StatefulSet, DaemonSet, CronJob, Node, or generic describe HTML; header uses the shared shell and tokens.
2. **View YAML** is available on legacy Deployment and peer describes that lacked it, matching React describe parity where the extension already supports YAML for that kind.
3. Messages remain the panel's existing `{ command }` or `{ type }` protocol until a future migration story normalizes them.

## Flow Constraints

- Opening an Argo CD Application from the tree lands on **Graph** by default; **Details** is one tab switch away for metadata and drift table review.
- Flows should remain functional when operator-powered enhancements are absent.
- Namespace/context switches must be reflected across tree and status indicators promptly.
- Left-click and context-menu Describe entry points for the same resource kind must route to the same detail surface and preserve context, namespace, name, and scope.
- Structured detail pages should degrade to missing-permission, missing-resource, or unsupported-kind states instead of showing placeholder content for resources the extension claims to support.
