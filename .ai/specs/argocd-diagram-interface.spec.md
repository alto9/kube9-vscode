# ArgoCD Diagram Interface

## Introduction

The ArgoCD Diagram Interface is the default Argo CD Application detail surface in kube9-vscode. It turns an Application's managed-resource inventory into an interactive graph inside VS Code so GitOps users can inspect every returned resource, understand topology when it is available, select resources, invoke kind-appropriate actions, and reveal matching Kubernetes tree items without leaving the IDE.

The capability is owned by kube9-vscode. **CRD-flat baseline** graph rendering does not require kube9-operator, kube9-api, kube9-web, kube9-desktop, or the native Argo CD UI. In **operated clusters**, kube9-operator supplies on-demand Argo CD resource-tree JSON so users reach full topology without extension bearer-token setup. The native Argo CD UI is prior art for graph density, overflow affordances, resource-tree topology, and graph-side filtering, while kube9-vscode contracts remain authoritative for local-first trust, webview accessibility, and VS Code theme behavior.

## Functional Specification

Opening an Argo CD Application from the cluster tree presents Graph as the default view and Details as the secondary view. Graph shows the Application root and every returned managed resource from the Application's resource inventory. When full Argo CD resource-tree topology is available, edges reflect parent/child relationships. When only the Application CRD is available, the graph still renders the complete managed-resource set with limited topology disclosure.

Each graph tile shows kind, name, Argo CD sync status, Argo CD health status, and an overflow control for eligible actions. Tile selection is a visible, keyboard-operable state that scopes resource-aware actions. Selection does not mutate cluster state by itself; mutating actions require explicit menu or command intent and host-side validation.

Application-level sync, refresh, and hard refresh remain available from the webview header and sub-header. **Application-level View In Tree is removed** from sub-header, Application root overflow, Details Overview action buttons, and all other Application panel chrome. The webview→host `viewInTree` message is not part of the accepted protocol. **Managed-resource** "Navigate to resource in tree" (`resource.navigateTree`) is the only in-panel graph-to-tree path. Managed-resource tiles support tree reveal and open describe/detail where resource identity can be mapped into the existing Kubernetes tree and describe surfaces. Deployment tiles may expose rollout restart through the Kind Capability Registry when RBAC and action eligibility allow it.

The graph toolbar exposes **presentation-only filters** for resource name search, kind, and sync status (minimum parity with native Argo CD resource graph filtering). Active filters use **AND** semantics across dimensions. The host continues posting the **complete** `resourceGraph` DTO; filters **hide** non-matching managed-resource tiles without mutating cluster state or trimming the host payload.

Large Applications must remain usable. Grouping, collapse, capped initial render, or progressive disclosure may be used, but the experience must preserve a path to every returned managed resource through the graph, Details, tree navigation, or explicit expansion. Empty, partial, permission-denied, and limited-topology states use explicit user-facing messaging instead of blank canvases or silent graph degradation.

## Technical Specification

The capability runs in the existing VS Code extension model: Node.js extension host plus isolated browser webview. Repository metadata requires VS Code engine `^1.80.0`, Node `>=22.0.0`, and `.nvmrc` pins local Node `v22.14.0`. The Argo CD webview is bundled by esbuild from `src/webview/argocd-application/index.tsx` into `media/argocd-application/main.js`. Browser-side graph rendering uses React 18, `@xyflow/react`, and a layout engine such as `@dagrejs/dagre`; these stay in the webview bundle and not in the extension host bundle.

Kubernetes and Argo CD I/O happen only in the extension host. The required baseline source is the Argo CD Application CRD, including `status.resources`. **Topology enrichment** follows strict precedence (see `.ai/integration/api_contracts.md`):

```text
Operated mode (kube9-operator installed, Argo CD detected):
  1. Extension REST resource-tree — when kube9.argocd.restEnabled and authorized (wins over operator)
  2. Operator CLI resource-tree — on-demand fetch via kubectl exec; raw JSON → buildResourceTreeApplicationResourceGraph
  3. kubernetes_owner_ref — optional inferred edges
  4. crd_flat — required baseline

Basic mode (no operator):
  1. Extension REST resource-tree — when restEnabled and authorized
  2. kubernetes_owner_ref
  3. crd_flat
```

On operator or REST success, the host emits `topologySource: argocd_resource_tree` and `topologyMode: full` (operator is transport only; do not emit `operator_snapshot`). Enrichment failure falls back to lower tiers without failing the whole panel when the Application CRD remains readable.

**Managed-resource tree reveal (issue #242):** `resource.navigateTree` / `ClusterTreeProvider.revealTreeResource` must:

- Resolve reveal namespace from the managed resource key per `.ai/interface/interaction_flow.md` (**Namespace resolution for reveal**): trimmed `ManagedResourceKey.namespace` is authoritative; never `ApplicationKey.namespace`; do not override a non-empty resource namespace with Application `spec.destination.namespace`; empty namespaced-kind namespace may fall back to destination namespace; cluster-scoped stays empty.
- Run **refresh-before-reveal** in one async chain (focus → invalidate resource + prefetch/category caches → fire tree change → await reveal). No debounce. Lookup must use provider children loaded after invalidation, not stale prefetch data.
- Surface existing failure copy for context mismatch, tree unavailable, and true not-found; do not emit false "resource not found in cluster tree" when a supported kind exists under the resolved reveal namespace.
- Keep `NAVIGATE_TREE_SUPPORTED_KINDS` unchanged unless a reported failure requires a registry fix; kind expansion is out of scope for #242.

**Operator CLI path (issue #241):**

- Host module `OperatorResourceTreeClient` runs `kubectl exec` → `kube9-operator query argocd resource-tree get <appName> --namespace=<appNamespace> [--format=json]` only when operated mode, Argo CD detected, extension REST is not available for this load, and `status.argocd.resourceTreeCapable === true`.
- Hard-skip (no exec) when capability is false or omitted; set `limitedTopologyReason: operator_not_capable` if the resulting graph is limited.
- Parse unmodified Argo CD JSON from stdout; on structured stderr failure, log `[INFO] Argo CD resource-tree enrichment unavailable` with the `code`, then fall through to owner-ref / CRD-flat with `limitedTopologyReason: enrichment_failed` (or `rest_unavailable` when REST was never an option and operator path is unavailable).
- Cancel in-flight exec on Application panel dispose. Host wait aligns with operator default timeout **30000** ms.
- Optional same-panel memo keyed by `ApplicationKey` + fetch timestamp; invalidate on `bypassCache` refresh, panel dispose, and terminal sync/refresh before final rebuild.
- While enrichment is in flight, do not show an enrichment-pending banner; keep existing panel loading or prior graph until the next `resourceGraph` post.
- Affordance copy tiers and exact strings are defined in `.ai/interface/presentation.md` (`operator_not_capable`, `rest_unavailable`, `enrichment_failed`, owner-ref).

The graph data contract is `ApplicationResourceGraph`, a derived JSON-safe DTO with `applicationKey`, `nodes`, `edges`, `topologySource`, `topologyMode`, optional `limitedTopologyReason`, `structureVersion`, optional `layoutHint`, `observedAt`, and optional `truncated` (reserved; host omits in v1 — see [data_model.md](../data/data_model.md)). Stable identity is based on `ManagedResourceKey` and `GraphNodeId`, not visible labels or React Flow internals. `ArgoCDApplication.resources` remains the sync and health authority for CRD-backed resources. When the resource-tree includes a duplicate Application node matching the panel Application, keep a single Application root from CRD metadata and do not emit a second managed Application node.

**CRD-flat baseline assembly (`topologySource: crd_flat`):**

- Parse each `ArgoCDResource` to `ManagedResourceKey` (namespace trimmed; kind and name required).
- Emit one Application root node plus one managed-resource node per valid row.
- Emit one `manages` edge per managed node from root to resource.
- Set `topologyMode: limited` and show the limited-topology affordance when managed nodes are visible.
- Skip invalid rows (missing kind/name) and duplicate keys (keep first); log assembly warnings to the output channel and show a non-blocking graph banner when invalid rows were skipped.
- Managed-resource node count must equal valid `application.resources` row count after assembly.

The canonical webview protocol uses `resourceGraph` for complete graph snapshots and `resourceAction` for tile actions. `resourceActionProgress` and `resourceActionResult` communicate action progress and terminal state. Legacy naming such as `graphData`, `graphPatch`, and `graphAction` is treated as implementation cleanup, not the durable contract. The host preserves panel identity by `context:namespace:applicationName`, owns polling and cancellation, and pushes graph refreshes without disposing the panel.

The webview owns rendering, selection, viewport, focus, menu state, **graph filter state**, and layout cache for the panel session. Filter state is session-local to the open Application panel (same boundary as layout cache); no extension `globalState` in v1. Refresh merges preserve filter inputs, selection, viewport, and positions when stable node ids survive; structural changes use `structureVersion` to determine when relayout or selection clearing is needed. Filter changes do not bump `structureVersion`.

**Refresh merge (host + webview):**

- **Host:** `mergeApplicationResourceGraphSnapshots` shallow-merges status/labels when `structureVersion` and node id sets match; otherwise posts the full incoming snapshot. See `.ai/data/consistency.md`.
- **Webview:** `mergeGraphFlowState` retains React Flow positions and restores viewport on attribute-only ticks; relayouts on `structureVersion` change, `topologySource` change, node add/remove, initial load, or explicit fit-view. Selection clears only when the selected `GraphNodeId` is absent from the incoming DTO.
- **Terminal operations:** After sync/refresh/hard refresh polling reaches a terminal phase, the host invalidates application cache and posts fresh `applicationData` + `resourceGraph` before the panel considers the operation complete.

## Testing Strategy

Contract validation should prove the CRD-flat baseline first:

- Every **valid** `ArgoCDApplication.resources` row produces exactly one managed-resource node; invalid rows are omitted with warnings.
- `countManagedResourceNodes(graph) === validResourceRowCount` for `topologySource: crd_flat`.
- Application root exists with application-level sync/health.
- Managed tile sync/health matches the corresponding `ArgoCDResource` row.
- Star topology: one `manages` edge per managed node from Application root; `topologyMode: limited`.
- Limited-topology affordance visible when CRD-flat graph has managed nodes.
- Invalid-row path: assembly warnings logged; non-blocking graph banner when rows were skipped.

Resource-tree and owner-reference enrichment tests should verify that optional edges do not override CRD sync/health for matching resource keys.

Runtime and serialization tests should cover `resourceGraph`, `resourceAction`, `resourceActionProgress`, and `resourceActionResult` message handling, including stable node ids, `structureVersion` merge behavior, selected-node preservation, removed-node selection clearing, and host-owned polling after sync, refresh, hard refresh, or rollout restart.

**Canonical protocol alignment test matrix (issue #223):**

| Area | Module / suite | Must prove |
|------|----------------|------------|
| Webview validation | `argocdApplicationProtocol.test.ts` | Accepts `resourceAction` with required fields and optional `group`/`version`; rejects legacy types (`graphData`, `graphPatch`, `graphAction`); rejects `apiGroup` on webview messages |
| Extension validation | `argocdApplicationProtocol.test.ts` | Accepts `resourceGraph`, `resourceActionProgress`, `resourceActionResult`; rejects legacy extension types (`graphPatch`, `actionResult`, `graphData`) |
| Payload mapping | `argocdGraphNodeCapabilities.test.ts` | `buildResourceActionPayload` maps `ManagedResourceKey.apiGroup` to wire `group`; omits `group` when `apiGroup` absent |
| Host nodeRef | `kindCapabilityRegistry.test.ts` | Progress/result `nodeRef` mirrors incoming `group`/`version`; navigate and restart handlers emit progress then terminal result |
| Provider push | `ArgoCDApplicationWebviewProvider.graph.test.ts` | Open and refresh post `applicationData` then `resourceGraph` (not legacy graph message names) |
| Busy state (webview) | `useGraphInteractionState` or component tests | App-level `menusDisabled` during sync/refresh; per-node `busyNodeKeys` from `resourceActionProgress` Running and cleared on terminal phases |

**Refresh merge test matrix (unit):**

| Area | Module / suite | Must prove |
|------|----------------|------------|
| Fingerprint | `applicationResourceGraph.test.ts` → `computeStructureVersion` | Deterministic; unchanged on status/label-only edits; changes on node add/remove or edge endpoint change |
| Host merge | `ApplicationResourceGraphMerger.test.ts` | Attribute-only tick (`structureChanged: false`); structural add/remove/rename; `ApplicationKey` change; structureVersion mismatch guard |
| Webview layout | `argocdGraphLayout.test.ts` | Position retention on matching `structureVersion`; relayout on structural change without auto-fit; selection resolve/clear; viewport preserve rules |
| Provider push | `ArgoCDApplicationWebviewProvider.graph.test.ts` | Open and refresh post `applicationData` then `resourceGraph`; second load with same topology preserves `structureVersion` |
| Long operations | `ArgoCDApplicationWebviewProvider.trackOperation.test.ts` | Terminal sync posts fresh `applicationData` and `resourceGraph`; `operationProgress` sequence |

**Gap tests to add during #227 implementation:**

- Webview: `topologySource` change triggers relayout while preserving positions for surviving ids when feasible.
- Host: terminal operation path calls cache invalidation before final graph post (`reloadApplicationAfterTerminalOperation`).

Interface validation should include graph layout readability, selectable tiles, overflow menu behavior, **Navigate to resource in tree** from a managed-resource tile, graph toolbar filters (name, kind, sync status), Details fallback, limited-topology messaging (suppressed when `topologyMode: full`), and large-application grouping or expansion. Accessibility review must include keyboard traversal through header, toolbar (zoom controls then filter controls), tiles, overflow menus, Graph/Details tabs, high-contrast status badges, reduced-motion behavior, and focus preservation across refresh.

**Graph tile and overflow test matrix (issue #224):**

| Area | Module / suite | Must prove |
|------|----------------|------------|
| Overflow registry | `argocdGraphNodeCapabilities.test.ts` | Deployment exposes restart + navigate; application root returns empty actions (no View In Tree); unknown kinds return empty actions; webview navigate kinds match host `NAVIGATE_TREE_SUPPORTED_KINDS` |
| Host dispatch | `kindCapabilityRegistry.test.ts` | Unknown `actionId` and unsupported kind post `resourceActionResult` with explicit messages; restart progress/result sequence; cancelled restart does not throw |
| Protocol | `argocdApplicationProtocol.test.ts` | `resourceAction` / progress / result shapes validate |
| Accessibility helpers | `argocdGraphAccessibility.test.ts` | Accessible name format; focus order sort; overflow roving index; reduced-motion zoom duration |
| Manual (pre-#225) | Argo CD cluster or Extension Development Host | Keyboard path in `.ai/interface/accessibility.md` **Resolved (graph tile manual pass)**; dismissible action-notice on failure |

**Implementation polish (#224):** Add tile `:hover` and `argocd-graph-node--overflow-open` styling; wire overflow-open class from `ResourceGraphNodeTile` when menu is open; suppress action-notice banner when result message is `Cancelled`.

**Tree navigation test matrix (M17 / issue #242):**

| Area | Module / suite | Must prove |
|------|----------------|------------|
| Registry (existing) | `kindCapabilityRegistry.test.ts` | `resource.navigateTree` success when `revealTreeResource` returns true; failure when false; context mismatch and tree-unavailable paths; failure copy strings unchanged |
| Tree provider | `ClusterTreeProvider.reveal.test.ts` (or extend existing tree suite) | `revealTreeResource` maps Deployment/Pod/Service/ConfigMap to correct categories; lookup uses **resolved reveal namespace** (resource key, not Application CR namespace); returns false when item missing after refresh-before-reveal invalidation |
| Namespace resolution | `treeRevealHelper` tests or navigation suite | Non-empty resource namespace wins over Application CR namespace and over `spec.destination.namespace`; empty namespaced-kind namespace falls back to destination; Application CR namespace alone never used for Deployment reveal |
| Destination-namespace fixture | `ArgoCDApplicationWebviewProvider.navigation.test.ts` | Deployment **apisocial** (or equivalent) where Application CR namespace ≠ resource namespace reveals successfully via shared helper; wrong namespace (Application CR ns) must not be passed to `revealTreeResource` |
| Multi-namespace | Tree reveal or helper unit test | Two Deployments in different namespaces under one Application each reveal with their own resource namespace |
| Refresh before reveal | `treeRevealHelper` / provider unit test | Navigate path invalidates resource + prefetch/category caches before `revealTreeResource`; after seeding a stale miss, post-invalidate lookup finds the resource; no debounce timer |
| Provider stubs | `ArgoCDApplicationWebviewProvider.navigation.test.ts` | `navigateToResource` delegates to same reveal helper and namespace rules as `resource.navigateTree` |
| Parity | `argocdGraphNodeCapabilities.test.ts` | Webview navigate kinds still match host `NAVIGATE_TREE_SUPPORTED_KINDS`; Application root overflow no longer exposes `viewInTree` (covered by #243; #242 must not regress registry kinds) |
| Manual | Extension Development Host + Argo CD cluster | Open Application that manages Deployment `apisocial` in destination namespace ≠ Application CR namespace; tile **Navigate to resource in tree** selects that Deployment in the cluster tree (not "resource not found"); Job tile has no overflow; wrong-context cluster shows context-mismatch message |

**Application View In Tree removal test matrix (M17 / issue #243):**

| Area | Module / suite | Must prove |
|------|----------------|------------|
| Overflow registry | `argocdGraphNodeCapabilities.test.ts` | `getOverflowActions('application', …)` returns `[]`; no `viewInTree` messageType |
| Protocol | `argocdApplicationProtocol.test.ts` | `viewInTree` is **not** an accepted webview→host message |
| Host | `ArgoCDApplicationWebviewProvider.navigation.test.ts` | No `viewInTree` handler path; managed-resource / `navigateToResource` coverage unchanged |
| Chrome | Component or manual | Sub-header has Hard Refresh only (no View In Tree); Details Overview has no View In Tree link; primary header still has Sync and Refresh |
| Keyboard / no-selection | Manual | Empty or Application-only selection has no Application-reveal control; keyboard tree nav is managed-resource overflow (Context Menu / Shift+F10 → Navigate) plus Details drift links |

**Operator topology test matrix (issue #241):**

Acceptance for #241 is **mocked operator CLI / fixtures** against the kube9-operator#151 contract. Live operated-cluster E2E is optional and must not block #241 (tracked after #151 ships; #152 does not block #241).

| Area | Module / suite | Must prove |
|------|----------------|------------|
| Operator client | `OperatorResourceTreeClient.test.ts` (new) | Builds argv for `query argocd resource-tree get`; parses raw stdout JSON; maps structured stderr `code` to failure result; respects cancellation |
| Capability gate | `OperatorResourceTreeClient.test.ts` or builder tests | No exec when `resourceTreeCapable` is false/omitted |
| Assembler | `ApplicationResourceGraphAssembler.test.ts` | Operator-fed raw JSON → `topologySource: argocd_resource_tree`, `topologyMode: full`; pods/ReplicaSets under Deployment; duplicate Application node collapsed to single root |
| Precedence | `ApplicationResourceGraphBuilder.test.ts` | REST wins when `restEnabled` + authorized; operator path when REST not configured and capable; fallback ladder on operator fail; `limitedTopologyReason` set for skip/fail paths |
| Affordance | `graphTopologyAffordances.test.ts` | Limited-topology suppressed on full topology; distinct copy for `operator_not_capable`, `rest_unavailable`, `enrichment_failed`, and `owner_ref`; no enrichment-pending banner path |
| Lifecycle | Provider or client unit test | Panel dispose cancels in-flight operator fetch |

**Graph filter test matrix (M17):**

| Area | Module / suite | Must prove |
|------|----------------|------------|
| Filter state | `argocdGraphFilters.test.ts` (new) | AND semantics across name/kind/sync; topology-only nodes without CRD sync treated as Unknown |
| DTO completeness | `argocdGraphFilters.test.ts` | Host posts full `resourceGraph`; filters do not trim DTO or bump `structureVersion` |
| Selection | `useGraphInteractionState` or component tests | Selection **clears** (no fallback tile) when selected `GraphNodeId` is not in the visible set after filter change |
| Kind grouping | `argocdGraphFilters.test.ts` + `argocdGraphGrouping.test.ts` | Kind summary visible when any member matches; expanded group shows only matching members; zero-match kind groups hidden |
| Zero-match | `argocdGraphFilters.test.ts` | Filter-active zero managed visibility shows affordance copy; `GraphEmptyState` not used |
| Accessibility | `argocdGraphAccessibility.test.ts` | Filter controls keyboard-operable; tab order: header → zoom → filters → canvas; `aria-pressed` on chips; polite live region on filter change |

**Large-application layout and grouping test matrix (issue #222):**

| Area | Module / suite | Must prove |
|------|----------------|------------|
| Host completeness | `ApplicationResourceGraphAssembler.test.ts` | Assembler does not call `truncateApplicationResourceGraph` in production paths; managed node count equals valid `resources[]` rows for graphs above 40 managed resources |
| Layout constants | `argocdGraphLayout.test.ts` | Dagre uses 220×72 node box; left-to-right rank ordering; ranksep/nodesep constants match `constants.ts` |
| Kind grouping | `argocdGraphGrouping.test.ts` (new) | Above threshold, initial render shows collapsed kind groups; expand reveals all member `GraphNodeId` values; collapse hides leaves without clearing DTO selection |
| Reachability | `argocdGraphGrouping.test.ts` | `countManagedResourceNodes(dto)` unchanged by grouping transform; every DTO managed id reachable after expand or via Details row fixture |
| Fit-view | `argocdGraphLayout.test.ts` | Auto-fit on initial load only; explicit Fit triggers fit; structural tick and group expand/collapse do not set `shouldAutoFit` |
| Affordances | `graphTopologyAffordances.test.ts` | Large-app grouping message when grouped mode active; truncation omission message removed; limited-topology message unchanged |
| Refresh merge | `argocdGraphLayout.test.ts` + `mergeGraphFlowState` | Grouped presentation preserves positions on attribute-only ticks; relayout on `structureVersion` change; selection survives collapse when id remains in DTO (#227) |
| Manual | Extension Development Host + Application with 50+ managed resources | Initial grouped view readable; expand one kind group; Fit resets viewport; Details lists all resources; refresh preserves expanded group selection when possible |

Build and packaging checks should run the existing repository commands for the affected scope: `npm run compile`, `npm run build`, `npm run test:unit`, and `npm run package` as appropriate for implementation changes. Packaging review should confirm Argo CD webview scripts, CSS, React Flow styles, and shared webview header CSS are present in the VSIX, and bundle-size changes to `media/argocd-application/main.js` remain within the documented target or are explicitly justified.

**M16 close-out validation matrix (issue #225):**

| Area | Module / suite or command | Must prove |
|------|----------------------|------------|
| Automated suites | `npm run test:unit` | All existing graph unit/component suites pass (protocol, capabilities, accessibility helpers, layout, filters, grouping — see matrices above) |
| Build | `npm run compile`, `npm run build` | Both invoke `build:webview`; Argo CD webview bundle and CSS rebuild without errors |
| Packaging assets | `npm run package` then `scripts/verify-vsix-argocd-media.sh` (`npm run verify:vsix-argocd-media`) | VSIX contains `extension/media/argocd-application/main.js`, `style.css` (React Flow), and `styles.css` (application styles); CI runs this in the same job as `verify:vsix-header-css` |
| Bundle size | `ls -lh media/argocd-application/main.js` after `npm run build` | Recorded in PR description when graph deps/webview source change; target ≤ 450 KB minified per `.ai/operations/build_packaging.md`; overage justified in PR and release notes, not CI-blocked |
| Manual accessibility | Extension Development Host + Argo CD Application | Full sweep in `.ai/interface/accessibility.md` **Resolved (#225 M16 close-out sweep)**: #224 steps plus filters, large-app grouping keyboard path, reduced-motion, high-contrast |
| Telemetry (optional) | `docs/telemetry-event-catalog.md` review + code review of graph action/navigation paths | Any new graph event keys/payloads are cataloged before emit; no cluster-identifying payloads (namespace, Application name, resource name, URL, kubeconfig, token) leave the extension via product telemetry |

## References

- `.ai/business_logic/domain_model.md`
- `.ai/business_logic/user_stories.md`
- `.ai/business_logic/error_state.md`
- `.ai/business_logic/error_handling.md`
- `.ai/data/data_model.md`
- `.ai/data/serialization.md`
- `.ai/data/consistency.md`
- `.ai/integration/api_contracts.md`
- `.ai/integration/external_systems.md`
- `.ai/integration/messaging_async.md`
- `.ai/integration/authorization.md`
- `.ai/interface/presentation.md`
- `.ai/interface/interaction_flow.md`
- `.ai/interface/accessibility.md`
- `.ai/runtime/execution_model.md`
- `.ai/runtime/lifecycle_shutdown.md`
- `.ai/operations/build_packaging.md`
- `.ai/operations/observability.md`
- `.ai/operations/security.md`
- `kube9-operator/.ai/integration/api_contracts.md` (resource-tree CLI query; peer contract)
