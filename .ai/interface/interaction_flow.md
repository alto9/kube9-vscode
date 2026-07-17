# Interaction Flow

## Typical Flows

1. **Inspect**: choose context -> expand namespace/resource -> open describe or YAML/logs.
2. **Operate**: select resource -> execute scale/restart/delete/apply action -> refresh affected tree nodes.
3. **Debug**: open events/logs -> correlate with resource health/status -> iterate on YAML or workload commands.
4. **GitOps (application detail):** select Argo CD Application in the **tree** (unchanged list/category) -> webview opens on the **resource graph** -> scan topology and per-tile sync/health -> use header/sub-header for sync/refresh/hard-refresh and managed-resource tile overflow for **Navigate to resource in tree** -> optional **Details** tab for metadata and drift table -> graph refreshes after operations without closing the panel.
5. **AI conformance readiness:** select operated cluster -> Reports -> Kubernetes AI Conformance -> webview opens with summary rollups and grouped requirements -> expand non-passing or evidence-needed rows -> refresh when operator status changes.

## Resource describe and YAML flows (reference for kube9-desktop)

### Open from tree

1. User selects context and expands the cluster tree to a resource leaf.
2. **Primary activation** (left-click or equivalent) opens or focuses **describe** for that kind when implemented; YAML is not the default inspect path.
3. **Context menu** lists **Describe** and **View YAML**; both preserve context, namespace, name, and scope and converge on the same surfaces as left-click describe and YAML Session routing.

### View YAML handoff

1. User chooses **View YAML** from describe header or tree context menu.
2. Host opens or focuses **YAML Session** (`YAMLEditorManager`) for the same resource identity; save/apply, read-only RBAC, and conflict detection follow YAML Session rules.
3. Describe and YAML remain **separate surfaces**; describe headers do not become editor chrome.

### Mutations (tree and YAML)

1. **Scale**, **restart** (Deployment, StatefulSet, DaemonSet where supported), and **delete** run from **tree context menu** commands, not from describe headers.
2. **Save** and **apply** run on YAML Session after validation; describe **Refresh** re-fetches read models only (manual refresh; no always-on watches on describe in v1).

### Degrade paths

- Missing permission, missing resource, or unsupported kind: describe shows recoverable error/empty states, not placeholder content for kinds the product claims to support.
- Generic describe stub: title-only header, **Coming soon** body, no Refresh/View YAML. Not the kube9-desktop acceptance target for ReplicaSet, Job, Ingress, NetworkPolicy, or IngressClass (see `presentation.md` cross-product reference).

## Argo CD Application Detail Flow

### Open and default focus

1. User opens an application from the tree (same entry points as today: tree click, context menu, commands).
2. Webview loads; **Graph** is active immediately.
3. User sees the Application root and dependency nodes laid out left to right; may pan/zoom or **fit view** from the graph toolbar.

The tree **does not** embed the graph; it continues to list applications with status icons only.

### Inspect on the graph

- **Glance:** Read sync and health from each tile and from the Application root without opening menus.
- **Topology:** Follow dashed edges from parent to dependent resources.
- **Selection:** Activate a tile to select it. Selection scopes resource-aware actions and should persist across refresh when the same `GraphNodeId` survives.
- **Deeper metadata or drift scan:** Switch to **Details** for overview sections and the filterable resource table (same navigate-to-tree behavior as the former drift tab).

### Operate from tiles and header

- **Application-level:** **Sync** and **Refresh** on the **primary webview header**; **Hard refresh** on the **sub-header row** directly below (disabled while an operation is in progress). Application-level View In Tree is **removed** from the Application panel (issue #243).
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

## Open Implementation Decisions

Implementation-level items not yet fully specified. `/refine-issue` resolves these into timeless contract prose and removes or collapses bullets when done.

### ArgoCD diagram interaction

**Resolved (graph tiles and overflow, issue #224):**

- **Pointer:** Primary click on a tile selects it (`stopPropagation` on overflow controls). Canvas **pan** uses drag on the graph background (React Flow `panOnDrag`); dragging a tile does not move nodes (`nodesDraggable: false`). Overflow ⋮ click toggles the menu without selecting a different node.
- **Keyboard:** Each tile is one tab stop (`tabIndex={0}`, `role="group"`). **Enter** or **Space** on a focused tile mirrors primary click (selection). **Context Menu** or **Shift+F10** on a focused tile with eligible actions opens the overflow menu. Menu items support **ArrowUp** / **ArrowDown** roving focus; **Escape** closes the menu and returns focus to the tile. Overflow trigger is not in the tab order (`tabIndex={-1}`); keyboard users open the menu from the tile shortcuts above.
- **Tile overflow contents (v1):**

| Node role | Kind | Menu items | Message path |
|-----------|------|------------|--------------|
| Application root | Application | _(overflow hidden or empty in M17)_ | — |
| Managed resource | Deployment | Restart rollout; Navigate to resource in tree | `resourceAction` (`deployment.restartRollout`, `resource.navigateTree`) |
| Managed resource | StatefulSet, DaemonSet, CronJob, Pod, Service, ConfigMap, Secret | Navigate to resource in tree | `resourceAction` (`resource.navigateTree`) |
| Managed resource | Other kinds (Job, Ingress, CRD, unknown) | _(overflow hidden)_ | — |

- **Hidden vs disabled:** When no rows apply, the overflow control is not rendered. During application-level sync/refresh (`operationProgress` Running or webview `menusDisabled`), all tile overflow menus disable. During a per-node in-flight `resourceAction` (`resourceActionProgress` Running with `nodeRef`), only that tile's overflow disables (optional in-menu copy: "Action in progress…"). The webview is the primary guard; the host does not queue overlapping `resourceAction` messages in v1.
- **Action results:** Terminal `resourceActionResult` with `success: false` shows a dismissible graph action-notice banner. User-cancelled restart confirmation does not show the banner. Unknown `actionId` or unsupported kind for a known id returns explicit host messages without crashing the panel.

### Tree navigation and reveal (M17)

Managed-resource tree reveal is the only in-panel graph-to-tree path. Application-level `viewInTree` is **removed** from sub-header, Application root overflow, Details Overview action buttons, and the accepted webview→host protocol (issue #243). Empty selection, Application-root-only selection, and non-navigable kinds do not offer an Application-reveal fallback in the panel. Users locate the Application in the cluster tree outside this panel.

**Keyboard (in-panel tree navigation):** Select a navigable managed-resource tile → Context Menu or Shift+F10 → **Navigate to resource in tree**. Details drift navigate links remain keyboard-activable. There is no dedicated Application View In Tree shortcut and no Application-reveal control in the tab order.

| Source | Message / action | Host behavior | User feedback |
|--------|------------------|---------------|---------------|
| Managed-resource tile overflow | `resourceAction` with `actionId: resource.navigateTree` | Kubeconfig available, active context matches panel context; run **refresh-before-reveal** then `revealTreeResource(kind, name, namespace)` with **resolved reveal namespace** | `resourceActionProgress` then terminal `resourceActionResult`; failures show dismissible graph action-notice banner |
| Details tab navigate affordance | `navigateToResource` with `kind`, `name`, `namespace` | Delegate to the same reveal helper as `resource.navigateTree` for kinds in `NAVIGATE_TREE_SUPPORTED_KINDS` | Same messages as `resource.navigateTree` result text |

#### Namespace resolution for reveal

Reveal identity uses `kind`, `name`, and a **resolved reveal namespace** derived as follows (issue #242):

1. Start from the managed resource's `ManagedResourceKey.namespace` (from the tile key / `resourceAction` / `navigateToResource` payload). Trim whitespace.
2. **Never** substitute `ApplicationKey.namespace` (Application CR location, often `argocd`) for managed-resource reveal.
3. When the trimmed resource namespace is **non-empty**, use it as-is. Do **not** override it with Application `spec.destination.namespace` (multi-namespace / multi-destination apps keep per-row namespaces).
4. When the trimmed resource namespace is **empty** and the kind is namespaced and in `NAVIGATE_TREE_SUPPORTED_KINDS`, fall back to Application `spec.destination.namespace` when that field is non-empty after trim; otherwise leave empty and allow not-found.
5. Cluster-scoped kinds keep empty namespace; match tree items whose namespace is empty. Do not apply destination fallback for cluster-scoped kinds.
6. Optional `apiGroup` / wire `group` is forwarded when present; omitting it must not block core-kind reveal.

#### Refresh before reveal

User-initiated managed-resource navigate runs this **single async chain** (no debounce):

1. Focus `kube9ClusterView`.
2. Invalidate caches that feed category children for the current context: the shared resource cache pattern **and** any tree prefetch / category children cache used by `getCategoryChildren` (or equivalent).
3. Fire tree data change so the visible tree stays consistent.
4. Await `revealTreeResource(kind, name, resolvedNamespace)`, which loads children through provider APIs **after** invalidation.

Correctness is provider-side fresh children after invalidation. The host must not require waiting for TreeView UI re-render, and must not look up against stale prefetch data from before the invalidate step.

**Failure copy (managed resource, terminal result message):**

| Condition | `success` | Message pattern |
|-----------|-----------|-----------------|
| Kubeconfig / tree unavailable | false | `resource.navigateTree failed for {kind} {name}: tree view is unavailable` |
| Active cluster context ≠ panel context | false | `resource.navigateTree failed for {kind} {name}: active cluster context does not match this application` |
| Supported kind, no matching tree item | false | `resource.navigateTree failed for {kind} {name}: resource not found in cluster tree` |
| Reveal succeeded | true | `Focused {kind} {name} in cluster tree` |

Mapping failure is a navigation limitation: the host must not fabricate tree items or resource identity. List RBAC gaps that prevent category expansion may surface as "not found in cluster tree" when no item can be resolved. False not-found for a supported kind that exists under the resolved reveal namespace is a defect (issue #242).

## Kubernetes AI Conformance Flow

### Open and scan

1. User expands an operated cluster; Reports is available only when operator status is not Basic.
2. User opens **Kubernetes AI Conformance** from the reports tree or matching command.
3. Webview loads from cached operator status, then supports explicit **Refresh** for a forced ConfigMap read.
4. User scans overall status, checklist version, Kubernetes minor, and MUST/SHOULD rollups.

### Inspect requirements

- Categories render in the order supplied by the operator summary.
- Failed, warning, `needs-evidence`, and `not-evaluated` rows expose message/remediation detail without requiring a separate terminal command.
- The report keeps `needs-evidence` distinct from failed checks so users know which items require external proof or policy review.

### Degraded states

- Missing operator status shows an operator-required empty state.
- Missing conformance summary shows a no-run-published empty state.
- Permission denied, stale status, degraded operator, and invalid payload use the same safe disclosure patterns as other operator report webviews.

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
- Kubernetes AI Conformance report flows require operated mode but must degrade to explicit empty/error states when the operator or conformance summary is absent.
