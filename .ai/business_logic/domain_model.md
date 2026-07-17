# Domain Model

## Core Entities

- **Cluster Context**: active kubeconfig context selected by user.
- **Namespace Scope**: active namespace for scoped resource actions.
- **Kubernetes Resource**: tree-addressable built-in or custom workload/config/storage/network object.
- **Resource Detail Surface**: read-only inspection model for a resource, presenting structured metadata, status, relationships, and events according to kind and scope. **View YAML** hands off to a **YAML Session** for the same resource identity; describe does not embed editable YAML as primary content.
- **YAML Session**: editable or read-only document bound to a resource identifier; cluster writes use editor save (validate → apply) or separate apply flows where defined.
- **Port Forward Session**: managed kubectl port-forward process with lifecycle state.
- **ArgoCD Application**: GitOps application surfaced from the cluster tree with application-level sync and health state, Git source metadata, and managed-resource inventory.
- **ArgoCD Managed Resource**: a Kubernetes object tracked in an Application's managed set, with resource-level sync and health signals distinct from the Application root.
- **Application Resource Graph**: primary detail surface for an ArgoCD Application; a directed dependency graph whose root is the Application and whose child nodes are managed resources linked by parent/child relationships.
- **Resource Graph Node**: one tile in the Application Resource Graph representing either the Application root or a single managed resource; carries kind, name, scope, sync status, health status, and eligible actions.
- **Kind Capability**: declarative rule that maps a resource kind (and optionally API group) to the user actions allowed on matching graph nodes.
- **Operator Status**: optional in-cluster signal indicating operated capabilities.
- **AI Conformance Report**: bounded readiness report parsed from operator status, showing Kubernetes AI workload readiness checks without claiming official Kubernetes or CNCF conformance.
- **AI Conformance Category Rollup**: summary row for one checklist category, including MUST/SHOULD totals and status counts.
- **AI Conformance Requirement Row**: one checklist requirement with stable id, category, level, status, message, and optional remediation guidance.

## Kubernetes AI Conformance Report

The VS Code extension presents Kubernetes AI Conformance as a **readiness report** under operated-cluster reports. It is not an attestation, certification, or official conformance result. Copy must use readiness language such as "AI workload readiness" and "Kubernetes AI Conformance readiness" rather than implying vendor, CNCF, or Kubernetes project approval.

The report is sourced from the existing operator status ConfigMap. The extension consumes a bounded summary only: checklist version, Kubernetes minor, run metadata, totals, category rollups, and requirement rows. Raw evidence, policy documents, vendor attestations, and user-provided proof are not rendered as accepted facts by the client. When the operator cannot evaluate a requirement from observed cluster state, the row uses `needs-evidence` or `not-evaluated`.

### Status vocabulary

Requirement and rollup status uses this closed client vocabulary:

| Value | Meaning |
|-------|---------|
| `passed` | Observed signal satisfies the requirement for the current checklist version. |
| `failed` | Observed signal does not satisfy a MUST-level or SHOULD-level requirement. |
| `warning` | Observed signal is incomplete or concerning but not a direct failure. |
| `not-applicable` | Requirement does not apply to the detected cluster or Kubernetes minor. |
| `not-evaluated` | Operator did not run or could not evaluate this requirement. |
| `needs-evidence` | Requirement requires vendor, policy, user, or attestation evidence outside cluster observation. |

The extension must not invent pass/fail conclusions for `needs-evidence` or `not-evaluated` rows.

## ArgoCD Application Detail Model

Opening an ArgoCD Application from the cluster tree presents the **Application Resource Graph** as the **default** detail tab. **Details** is the **secondary tab**, consolidating former Overview metadata (project, Git source, revision, destination, app-level sync and health) and the tabular drift resource list. The graph stays the primary exploratory surface; Details does not replace topology.

### Topology source (tiered)

Dependency accuracy follows a **tiered topology** model:

- **Full topology** uses Argo CD **resource-tree** responses when the API server is reachable and authorized: nodes and **parentRefs** determine edges, matching native Argo CD UI behavior.
- **Limited topology** applies when resource-tree is unavailable or denied: nodes come from the Application custom resource (**`status.resources`**) with best-effort edges (logical grouping under the Application root, optional Kubernetes owner-reference enrichment when cluster reads are allowed). The product surfaces **limited topology** so users are not misled into treating shallow layout as full dependency truth.
- RBAC and connectivity needs for resource-tree are **additional** to CRD read/list permissions; blocked resource-tree still permits limited topology when the Application CR is readable.

### Graph structure

- The **root node** is always the Application itself.
- **Child nodes** represent every returned managed resource for the Application. When full topology is available they reflect dependency topology; when only CRD data is available they still render as complete managed-resource nodes with limited edge accuracy.
- **Edges** express parent/child or dependency relationships between nodes; direction flows left to right in the layout.
- Each node has a **stable identity** within an Application (kind, API group/version, namespace when namespaced, name) so status refreshes and in-flight operations can merge updates without reordering unrelated nodes.

### Status on nodes

Each Resource Graph Node exposes two Argo CD status dimensions on its tile:

| Dimension | Meaning | Typical values |
|-----------|---------|----------------|
| **Sync status** | Whether live cluster state matches desired Git/manifest state for that node | Synced, OutOfSync, Unknown |
| **Health status** | Argo CD health assessment for that node | Healthy, Degraded, Progressing, Suspended, Missing, Unknown |

The Application root node uses **application-level** sync and health. Managed-resource nodes use **resource-level** sync and health from the Application's managed set.

**ReadyState clarification:** User-facing readiness on graph tiles is **Argo CD sync and health** only for the initial capability set. **Kubernetes Ready** replica counts or pod-ready conditions **do not** appear on tiles until a later workload drill-down story expressly adds them.

### Kind capabilities (initial registry)

Actions are resolved through **Kind Capability** rules (the **Kind Capability Registry**), not ad hoc per-tile logic.

| Node role / kind | Allowed actions |
|------------------|-----------------|
| **Application (root)** | Sync, refresh, hard refresh (existing application-level flows) |
| **Deployment** | Restart rollout (rollout restart of managed pods) |
| **Service, ConfigMap, and other supported kinds** | Navigate to cluster tree resource; open describe/detail where the extension supports that kind |
| **Unsupported or read-only kinds** | View status only; no destructive or mutating actions |

The registry is extensible: new kinds add capability entries without changing the graph interaction model.

### Action scope and safety

- Graph actions execute against the **currently selected cluster context**.
- Mutating actions (sync, restart rollout) require **explicit user intent** via menu or command invocation.
- Actions target the **specific node** the user selected; they do not implicitly cascade to unrelated nodes unless the underlying operation naturally affects dependents (for example, sync at Application root).
- Read-only or insufficient RBAC must block write actions while preserving read-only graph inspection where permitted.
- **View In Tree** from a managed-resource graph node resolves that node's `ManagedResourceKey` to the existing Kubernetes tree navigation path when a tree item can be mapped. Failure to map a node is a navigation limitation, not permission to mutate or invent resource identity.

## Webview page-level actions

Page-level commands on webview panels (header, **Actions** overflow, documented sub-header rows) follow a frozen semantics rule: **handlers and message payloads do not change** for this initiative; only placement, grouping, and chrome change.

### Global header rules

- **Primary cap:** At most **three** labeled primary header buttons per panel (excluding Help and the overflow control). Additional page-level operations use the **Actions** overflow menu.
- **Help:** Only where **`helpContext`** or an equivalent help link exists; Help posts `openHelp` with that context and is **trailing**, outside overflow. Help failures must not break the panel.
- **No capability removal:** Every action reachable before header unification remains reachable (primary, overflow, or documented sub-header/toolbar slot).

### Action tiers (placement)

| Tier | Placement | Examples |
|------|-----------|----------|
| **A — primary header** | Up to three labeled primaries | Refresh; View YAML on describe surfaces; Argo CD **Sync** and **Refresh**; Events **Refresh** |
| **B — overflow or sub-header** | **Actions** menu when over cap, or sub-header when standardized | Argo **Hard refresh** (sub-header); Events **Auto-refresh**, **Clear Filters** (primary or overflow per cap) |
| **C — sub-header or toolbar** | Below primary header or in-panel toolbar | Events **Export**, **Search**; Pod Logs stream controls; Helm section actions |
| **D — never page header** | In-content or graph/tree only | Row actions, graph node overflow, graph canvas zoom/fit |

**Helm Package Manager** keeps **zero** global header actions plus Help only; repo/release operations stay section-scoped.

**Legacy workload describe parity:** Deployment and peer legacy describes that lacked **View YAML** gain it in the unified header where React describe panels already expose YAML for that kind.

**Namespace explorer:** In-webview header title is **namespace name only**; View YAML and set-default-namespace actions remain available per existing behavior.

**Disabled actions:** Remain **visible** when inapplicable (for example Clear Filters with no active filters) unless a future story chooses hide-when-inapplicable.

Argo CD application-level **sync**, **refresh**, and **hard refresh** stay **page-level** (header/sub-header), not on the graph canvas toolbar. Graph node overflow, canvas zoom/fit toolbar, and **graph filter controls** remain separate surfaces. Application-level **View In Tree** is demoted or removed from page-level chrome; managed-resource **Navigate to resource in tree** remains on tile overflow.

## Resource inspection and mutation surfaces

Rules below are the **kube9-vscode reference baseline** for built-in Kubernetes resources opened from the cluster tree. **kube9-desktop** Resources work-area parity targets this split: structured describe as default inspection, mutations off the describe surface. Legacy workload describes and React describe apps share the same non-mutating header set (Refresh, View YAML, Help where defined).

### Surface × action matrix

| Action | Resource Detail Surface | YAML Session | Tree context menu |
|--------|-------------------------|--------------|-------------------|
| **Refresh / re-fetch** | Allowed (Tier A primary) | Not a page-level header action | — |
| **View YAML** | Allowed (Tier A primary); opens or focuses YAML Session for same identity | N/A (user is already in session) | Allowed |
| **Describe** | Default left-click / menu route to detail surface | — | Allowed (same surface as left-click) |
| **Save / update manifest** | Forbidden | Allowed via editor save → validation → apply; read-only when RBAC blocks writes | — |
| **Apply YAML (multi-document / arbitrary file)** | Forbidden | Allowed via separate apply command for generic `.yaml`/`.yml` editor files, not the primary bound-resource save path | — |
| **Delete** | Forbidden | Forbidden on YAML chrome | Allowed; requires explicit confirmation naming resource identity |
| **Scale** | Forbidden | Forbidden on YAML chrome | Allowed for **Deployment**, **StatefulSet**, **ReplicaSet** only; input dialog, not inline on detail surfaces |
| **Restart rollout** | Forbidden | Forbidden on YAML chrome | Allowed for **Deployment**, **StatefulSet**, **DaemonSet** only |
| **Navigate to related resource** | Allowed (in-content links only; not cluster writes) | — | — |
| **View Logs, Open Terminal, port forward** | Forbidden on describe header | — | Allowed where kind/context supports (separate from describe/YAML mutation set) |

**Kind notes:** Job and CronJob describe surfaces exist; scale and restart tree entries do not apply to them today. DaemonSet receives restart, not scale. In-content describe actions are navigational only (for example open related object detail), not cluster mutations.

**Desktop consumer note:** kube9-desktop may add YAML-tab affordances (for example inline replica controls or Apply manifest paste) while preserving **describe read-only**, **tree context-menu mutation parity** for scale/restart/delete, and **View YAML** hand-off from describe. Those extensions belong on the YAML Session surface or tree menu, not on describe headers.

### Open implementation decisions

- **Post-mutation refresh:** which surfaces (describe, YAML tab, tree) auto-refresh after save, delete, scale, or restart is a tier-TW coordination item between business_logic and runtime; vscode refreshes via existing tree/describe coordinators after mutations.
- **Confirmation copy:** delete and scale dialogs must name kind, namespace (when namespaced), and resource name; restart follows the same explicit-intent pattern as other tree-menu mutations.
- **Kinds without dedicated describe apps** (ReplicaSet, Job, Ingress, NetworkPolicy, IngressClass on Desktop): tree mutation eligibility follows the same kind rules as overlapping entries in this matrix; generic describe fallback remains read-only with Refresh and View YAML where implemented.

## Core Invariants

1. Commands execute against the currently selected context.
2. Destructive actions require explicit user intent.
3. Read-only permission states must block write operations.
4. Resource views should degrade gracefully when optional integrations are unavailable.
5. Resource identity and scope must remain consistent across tree items, command routing, detail providers, YAML views, and Resource Graph Nodes.
6. The Application Resource Graph must remain usable when dependency topology is partial; missing edges or unknown parentage must not prevent rendering available nodes and status.
7. Application-level sync, refresh, and hard refresh remain available from the webview header/sub-header; they are not replaced by the graph canvas toolbar. Application-level View In Tree is demoted or removed from sub-header and Application root overflow; managed-resource tree navigation via `resource.navigateTree` is the primary graph-first path.
8. Graph presentation and actions must not require the user to leave VS Code or open the native Argo CD server UI.
9. **Extension-owned graph assembly:** the extension owns `ApplicationResourceGraph` DTO assembly, webview rendering, graph filters, and tree reveal. In **operated clusters**, kube9-operator supplies on-demand Argo CD resource-tree JSON (raw passthrough); the extension normalizes via existing `buildResourceTreeApplicationResourceGraph` and emits `topologySource: argocd_resource_tree`. CRD-flat baseline remains when all enrichment tiers fail. Kind Capability Registry rules are unchanged by topology source or filters.

## Open Implementation Decisions

Implementation-level items not yet fully specified. `/refine-issue` resolves these into timeless contract prose and removes or collapses bullets when done.

### ArgoCD diagram interface

**Resolved (graph tiles and overflow, issue #224):**

- **Tile visual states** do not change action scope. **Focus** uses `:focus-visible` with a 2px `--vscode-focusBorder` outline on the tile group. **Selection** adds `argocd-graph-node--selected` (2px focus-border box shadow) from React Flow selection. **Hover** applies `--vscode-list-hoverBackground` on the tile when the pointer is over it and the tile is not selected. **Overflow-open** adds `argocd-graph-node--overflow-open` while the menu is open; the ⋮ trigger exposes `aria-expanded=true`. Primary tile activation (click, Enter, Space) selects only; it does not run menu actions or mutate cluster state.
- **Unsupported or non-navigable managed-resource nodes** hide the overflow control entirely when the Kind Capability Registry yields zero eligible actions. There is no disabled-only ⋮ affordance and no placeholder “No actions” menu.
- **Application root overflow** does not expose View In Tree in M17; sync, refresh, and hard refresh stay on the webview header and sub-header. Root overflow may be hidden when no eligible actions remain.
- **Managed-resource overflow labels (v1):** Deployment — **Restart rollout**, **Navigate to resource in tree**; other navigate-supported kinds — **Navigate to resource in tree** only. Labels match `graphNodeCapabilities.ts` and host `actionId` registry entries.
- **Progressive disclosure for very large Applications** — resolved in `.ai/interface/presentation.md` and `.ai/data/consistency.md` (issue #222): webview kind-based grouping over complete DTO; threshold 40 managed resources.

**Resolved (tree navigation, M17 / issue #242):**

- **Application-level View In Tree** (`viewInTree` message) is **removed or demoted** from sub-header, Application root overflow, and related page-level chrome. It does not receive selection-aware behavior.
- **Managed-resource navigation** routes through `resource.navigateTree` with the tile's `ManagedResourceKey`. The host maps supported kinds to cluster-tree categories via `ClusterTreeProvider.revealTreeResource`.
- **Reveal namespace:** trimmed `ManagedResourceKey.namespace` is authoritative. Never use `ApplicationKey.namespace`. Do not override a non-empty resource namespace with Application `spec.destination.namespace`. Empty namespaced-kind namespace may fall back to `spec.destination.namespace`; cluster-scoped stays empty. Full rules in `.ai/interface/interaction_flow.md`.
- **Refresh before reveal:** focus tree; invalidate resource cache and tree prefetch/category caches for the current context; fire tree data change; then await reveal lookup in the same async chain. No debounce. Do not depend on TreeView re-render for correctness.
- **Details tab parity:** `navigateToResource` from the Details view uses the same reveal helper and namespace rules as `resource.navigateTree` for supported kinds.
- **Failure is non-mutating:** When no tree item can be mapped, the extension reports navigation failure with user-facing copy; it must not create tree nodes or alter resource identity. False "not found in cluster tree" for a supported kind present under the resolved reveal namespace is a defect.

**Resolved (operator topology affordances, issue #241):**

- **Limited-topology affordance copy** uses four distinct short banners (exact strings in `.ai/interface/presentation.md`). Selection uses host `limitedTopologyReason` (or equivalent) plus `topologySource` / `topologyMode`:
  1. `operator_not_capable` — operated cluster but resource-tree capability false / token missing; platform-admin token onboarding first; extension REST as secondary optional path.
  2. `rest_unavailable` — REST disabled or unauthorized and operator path unavailable (basic mode or operator absent).
  3. `enrichment_failed` — generic CRD-flat after enrichment attempt failed or was skipped for a per-application reason.
  4. `owner_ref` / `topologySource: kubernetes_owner_ref` — keep inferred owner-reference copy.
- Affordance is **suppressed** when `topologyMode: full`. Raw operator stderr codes, endpoints, and credentials stay in the Output Channel only.
- **No enrichment-pending banner:** while operator/REST fetch is in flight, keep existing panel loading or the prior graph until the next `resourceGraph` post (success or fallback). Do not post an intermediate CRD-flat snapshot solely to show pending enrichment.

**Deferred (M17):**

- **Graph filter UX:** Widget shape (chips vs dropdown), zero-match empty state, selection-when-filtered behavior, filter visibility (hide vs de-emphasize), and a11y live-region announcements (sibling issue #244).
- **Supported reveal kinds expansion:** Whether resource-tree-only kinds (ReplicaSet, etc.) gain overflow navigate actions. **Out of scope for issue #242** (that issue fixes reveal for existing `NAVIGATE_TREE_SUPPORTED_KINDS` only). Defer until product expands the Kind Capability Registry.

- **`resource.openDescribe` on graph tiles** — registry entry exists for future direct describe routing from `ManagedResourceKey`; v1 graph overflow does not expose it. Users open describe via tree reveal or Details tab navigate affordances.
