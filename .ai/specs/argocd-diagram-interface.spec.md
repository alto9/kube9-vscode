# ArgoCD Diagram Interface

## Introduction

The ArgoCD Diagram Interface is the default Argo CD Application detail surface in kube9-vscode. It turns an Application's managed-resource inventory into an interactive graph inside VS Code so GitOps users can inspect every returned resource, understand topology when it is available, select resources, invoke kind-appropriate actions, and reveal matching Kubernetes tree items without leaving the IDE.

The capability is owned by kube9-vscode. It does not require kube9-operator, kube9-api, kube9-web, kube9-desktop, or the native Argo CD UI for baseline behavior. The native Argo CD UI is prior art for graph density, overflow affordances, and resource-tree topology, while kube9-vscode contracts remain authoritative for local-first trust, webview accessibility, and VS Code theme behavior.

## Functional Specification

Opening an Argo CD Application from the cluster tree presents Graph as the default view and Details as the secondary view. Graph shows the Application root and every returned managed resource from the Application's resource inventory. When full Argo CD resource-tree topology is available, edges reflect parent/child relationships. When only the Application CRD is available, the graph still renders the complete managed-resource set with limited topology disclosure.

Each graph tile shows kind, name, Argo CD sync status, Argo CD health status, and an overflow control for eligible actions. Tile selection is a visible, keyboard-operable state that scopes resource-aware actions. Selection does not mutate cluster state by itself; mutating actions require explicit menu or command intent and host-side validation.

Application-level sync, refresh, hard refresh, and View In Tree remain available from the webview header, sub-header, or Application root affordances. Managed-resource tiles support View In Tree and open describe/detail where resource identity can be mapped into the existing Kubernetes tree and describe surfaces. Deployment tiles may expose rollout restart through the Kind Capability Registry when RBAC and action eligibility allow it.

Large Applications must remain usable. Grouping, collapse, capped initial render, or progressive disclosure may be used, but the experience must preserve a path to every returned managed resource through the graph, Details, tree navigation, or explicit expansion. Empty, partial, permission-denied, and limited-topology states use explicit user-facing messaging instead of blank canvases or silent graph degradation.

## Technical Specification

The capability runs in the existing VS Code extension model: Node.js extension host plus isolated browser webview. Repository metadata requires VS Code engine `^1.80.0`, Node `>=22.0.0`, and `.nvmrc` pins local Node `v22.14.0`. The Argo CD webview is bundled by esbuild from `src/webview/argocd-application/index.tsx` into `media/argocd-application/main.js`. Browser-side graph rendering uses React 18, `@xyflow/react`, and a layout engine such as `@dagrejs/dagre`; these stay in the webview bundle and not in the extension host bundle.

Kubernetes and Argo CD I/O happen only in the extension host. The required baseline source is the Argo CD Application CRD, including `status.resources`. Optional enrichment may use Argo CD REST `resource-tree` when explicitly configured and authorized, or Kubernetes owner references when enabled and permitted. Optional enrichment failure falls back to CRD-flat graph rendering without failing the whole panel when the Application CRD remains readable.

The graph data contract is `ApplicationResourceGraph`, a derived JSON-safe DTO with `applicationKey`, `nodes`, `edges`, `topologySource`, `topologyMode`, `structureVersion`, optional `layoutHint`, `observedAt`, and optional `truncated`. Stable identity is based on `ManagedResourceKey` and `GraphNodeId`, not visible labels or React Flow internals. `ArgoCDApplication.resources` remains the sync and health authority for CRD-backed resources.

**CRD-flat baseline assembly (`topologySource: crd_flat`):**

- Parse each `ArgoCDResource` to `ManagedResourceKey` (namespace trimmed; kind and name required).
- Emit one Application root node plus one managed-resource node per valid row.
- Emit one `manages` edge per managed node from root to resource.
- Set `topologyMode: limited` and show the limited-topology affordance when managed nodes are visible.
- Skip invalid rows (missing kind/name) and duplicate keys (keep first); log assembly warnings to the output channel and show a non-blocking graph banner when invalid rows were skipped.
- Managed-resource node count must equal valid `application.resources` row count after assembly.

The canonical webview protocol uses `resourceGraph` for complete graph snapshots and `resourceAction` for tile actions. `resourceActionProgress` and `resourceActionResult` communicate action progress and terminal state. Legacy naming such as `graphData`, `graphPatch`, and `graphAction` is treated as implementation cleanup, not the durable contract. The host preserves panel identity by `context:namespace:applicationName`, owns polling and cancellation, and pushes graph refreshes without disposing the panel.

The webview owns rendering, selection, viewport, focus, menu state, and layout cache for the panel session. Refresh merges preserve selection, viewport, and positions when stable node ids survive; structural changes use `structureVersion` to determine when relayout or selection clearing is needed.

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

Interface validation should include graph layout readability, selectable tiles, overflow menu behavior, View In Tree from a selected resource, Details fallback, limited-topology messaging, and large-application grouping or expansion. Accessibility review must include keyboard traversal through header, toolbar, tiles, overflow menus, Graph/Details tabs, high-contrast status badges, reduced-motion behavior, and focus preservation across refresh.

**Graph tile and overflow test matrix (issue #224):**

| Area | Module / suite | Must prove |
|------|----------------|------------|
| Overflow registry | `argocdGraphNodeCapabilities.test.ts` | Deployment exposes restart + navigate; application root exposes view-in-tree only; unknown kinds return empty actions; webview navigate kinds match host `NAVIGATE_TREE_SUPPORTED_KINDS` |
| Host dispatch | `kindCapabilityRegistry.test.ts` | Unknown `actionId` and unsupported kind post `resourceActionResult` with explicit messages; restart progress/result sequence; cancelled restart does not throw |
| Protocol | `argocdApplicationProtocol.test.ts` | `resourceAction` / progress / result shapes validate |
| Accessibility helpers | `argocdGraphAccessibility.test.ts` | Accessible name format; focus order sort; overflow roving index; reduced-motion zoom duration |
| Manual (pre-#225) | Argo CD cluster or Extension Development Host | Keyboard path in `.ai/interface/accessibility.md` **Resolved (graph tile manual pass)**; dismissible action-notice on failure |

**Implementation polish (#224):** Add tile `:hover` and `argocd-graph-node--overflow-open` styling; wire overflow-open class from `ResourceGraphNodeTile` when menu is open; suppress action-notice banner when result message is `Cancelled`.

Build and packaging checks should run the existing repository commands for the affected scope: `npm run compile`, `npm run build`, `npm run test:unit`, and `npm run package` as appropriate for implementation changes. Packaging review should confirm Argo CD webview scripts, CSS, React Flow styles, and shared webview header CSS are present in the VSIX, and bundle-size changes to `media/argocd-application/main.js` remain within the documented target or are explicitly justified.

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
