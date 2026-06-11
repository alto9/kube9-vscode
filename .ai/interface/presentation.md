# Presentation

## Presentation Surfaces

- **Tree View**: clusters -> categories -> resources.
- **Webviews**: structured resource detail/describe views, events viewer, pod logs, operator reports, Kubernetes AI Conformance report, Helm package manager, tutorial/help.
- **Argo CD Application detail (webview)**: When opened from the cluster tree, the default view is an interactive **resource graph** (left-to-right layout). **Details** is the secondary tab for app metadata and tabular drift review; see **Argo CD Application Detail (webview)** below.
- **Status Bar**: current context and namespace.
- **Notifications/Output**: operation outcomes and diagnostic details.

## Presentation Principles

- Keep high-frequency operations one click from tree context.
- Show health/sync/severity signals with recognizable iconography.
- Keep technical details available but not forced in primary success paths.
- Resource detail views are the primary inspection surface: supported built-in workloads and custom resources should expose status, related objects, events, and YAML through resource-appropriate sections while preserving a generic fallback only for unsupported kinds.

## Webview page header contract

Every **in-scope webview content panel** uses one shared header presentation contract. **Helm Package Manager** is the **chrome reference** for spacing, border, title typography, and VS Code-themed action buttons (`--vscode-button-*`); other panels keep their operational actions while matching that chrome.

### Primary header row

- **Layout:** One horizontal row at typical panel widths: **title left** (`h1`, ellipsis truncation), **actions right** (flex, shrink-0).
- **Primary actions:** At most **three** labeled primary header buttons per panel (excluding Help and the overflow control). Additional page-level operations belong in an **Actions** overflow menu (user-facing label **Actions**; entries keep existing action labels).
- **Help:** When the surface defines a **help link** or **`helpContext`**, **Help** is the **trailing** header control, **outside** the Actions overflow. Panels without help context do not add Help.
- **Layering:** **Status banners**, **tab bars** (for example Pod describe, Argo CD **Graph | Details**), and Events status chrome stay **below** the primary header; they are not folded into the header row.
- **Implementation paths:** **React bundles** use `WebviewHeader` (or equivalent) plus shipped `webview-header.css`. **Legacy inline-HTML** generators use a **shared header shell** (markup, classes, shipped CSS, shared overflow script) matching the same DOM and tokens until optional per-kind React migration. Visual parity does not require every legacy panel to become React in this initiative.

### Sub-header row (secondary controls)

Some panels need a **standardized sub-header row** directly under the primary header: shared border, padding, and button tokens (no ad hoc inline style rows).

| Surface | Primary header | Sub-header row |
|---------|----------------|----------------|
| **Events Viewer** | Refresh, Auto-refresh, Clear Filters (within primary cap; overflow if needed) | **Export**, **Search** |
| **Argo CD Application** | **Sync**, **Refresh** (within primary cap) | **Hard refresh**, **View in tree** |

Other dense tooling (Pod Logs stream controls, Helm section actions) stays in documented toolbar or body regions, not competing with Tier A header actions (see business logic **Webview page-level actions**).

### Titles

- **Resource describe (React and aligned legacy):** `{Kind} / {name}` unless a surface-specific rule applies.
- **Namespace explorer (in-webview header):** **namespace name only** (no breadcrumb in the header; cluster context remains in the VS Code panel title and body as today).
- **Argo CD Application:** application name (existing pattern).

### Non-goals for this contract

- kube9-desktop parity; redesign of Argo CD **graph canvas** zoom/fit toolbar; tree view chrome; backend or cluster API changes.
- Universal Help on panels that lack help context.

### Acceptance

- Header actions use VS Code button tokens on all in-scope panels; no default browser-styled button rows under titles.
- **Packaged VSIX** includes required header CSS; **CI fails** when that CSS is missing from the build artifact (operations packaging contract).
- Narrow panels prefer **Actions overflow** over wrapping primary buttons off-panel; responsive detail is refined per issue (`/refine-issue`).

## Argo CD Application Detail (webview)

The cluster **tree list** for Argo CD Applications is unchanged: sync and health iconography, category grouping, and open-from-tree behavior stay as today. Opening an application launches a **dedicated webview** whose **primary surface** is an interactive **resource dependency graph**, not a tab-first overview.

### Primary: resource graph

- **Layout:** Directed graph flows **left to right**. The **Application** is the root node; child nodes represent managed resources and **dependency topology** (parent/child edges), not a flat list laid out as nodes without relationships.
- **Edges:** Dependency relationships use **dashed** connectors distinct from node chrome so topology reads at a glance.
- **Canvas toolbar:** A compact control strip on the graph viewport offers **zoom in**, **zoom out**, and **fit view** (re-center and scale to show all nodes). Pan is available on the canvas; toolbar actions are the primary zoom affordances for precision and reset.
- **Theme:** Graph background, nodes, edges, and controls use **VS Code theme CSS variables** (`--vscode-*`) so light/dark and contrast follow the host editor.

### Graph tiles (nodes)

Each node is a **tile** styled for quick scan (Argo CD UI–like density, adapted to webview width):

| Region | Content |
|--------|---------|
| Leading | **Kind icon** plus a **short kind label** (abbreviated where long kinds are common). |
| Title | **Resource name** (truncated with ellipsis when space is tight; full name available to assistive tech). |
| Status | **Sync badge** and **health badge** on every tile, including the Application root. |
| Trailing | **Overflow menu** (⋮) for kind-appropriate actions. |
| Optional | **Age** or **revision** chip when the data model supplies it; omit the chip when absent rather than showing placeholders. |

**Status semantics on tiles:** Tiles show Argo CD **sync** (`Synced`, `OutOfSync`, etc.) and **health** (`Healthy`, `Degraded`, `Progressing`, `Missing`, `Suspended`, `Unknown`, etc.) from the application/resource model. They do **not** by default show Kubernetes **Ready** replica counts or pod-level readiness; if workload readiness is surfaced later, it must be labeled distinctly from Argo health so users are not misled.

**Status iconography:** Sync and health badges reuse the **same visual language** as the tree and the existing drift table: codicon-based sync indicators, health-colored badge backgrounds mapped through `testing.iconPassed`, `testing.iconFailed`, `testing.iconQueued`, and related VS Code tokens. Unknown or missing health uses muted/description styling, not a false-positive green.

**Application root tile:** Mirrors application-level sync and health on the tile; application-level **sync** and **refresh** sit on the **primary webview header**; **hard refresh** and **view in tree** sit on the **sub-header row** under the primary header (root tile overflow may duplicate subset actions for in-graph context).

### Secondary: Details (overview and drift)

To keep the graph primary without losing metadata or tabular drift review:

- **Default view on open:** **Graph** (no extra navigation step).
- **Secondary tab:** **Details** consolidates former **Overview** sections (metadata, application sync/health summary, source) and **Drift Details** (out-of-sync summary, filter, resource table with navigate-to-tree). The tab bar is **Graph | Details** only.
- **Persistence:** Last-selected tab may be restored across webview reloads; **Graph** is the default when no prior selection exists.

Drift table presentation inside **Details** is unchanged in intent: filter for out-of-sync only, row-level sync/health badges, expandable rows for messages, and link-style navigation to tree resources.

### Large applications

When node count exceeds a practical layout threshold, the graph uses **progressive disclosure** (grouping, collapse, or capped initial render with explicit expand) so layout and polling updates stay responsive. Empty or single-node graphs show an explicit empty state, not a blank canvas.

### Loading and errors

Loading and error states for the webview remain **full-panel** (blocking graph until data is available or a recoverable error is shown). In-graph partial updates during sync/refresh should not dismiss the panel.

## Kubernetes AI Conformance Report (webview)

The report appears under the operated cluster **Reports** tree branch, alongside other operator-backed report surfaces. Opening it launches a dedicated webview panel for the active cluster context.

### Header and summary

- Header title: **Kubernetes AI Conformance** or equivalent readiness-safe title.
- Primary action: **Refresh**, which forces a fresh operator status ConfigMap read.
- Summary area: checklist version, Kubernetes minor when present, observed timestamp, overall readiness status, and MUST/SHOULD totals.
- Copy uses readiness language only. It must not say the cluster is officially certified, CNCF-conformant, or vendor-attested.

### Grouped requirements

Rows are grouped by conformance category, such as accelerators, networking, scheduling, storage, observability, or security when present in the operator payload. The UI does not hard-code category completeness; it renders categories supplied by the bounded summary.

Each category shows MUST and SHOULD rollups. Requirement rows show id/title, level, status, and expandable details for message and remediation text. `needs-evidence` and `not-evaluated` rows use neutral styling and explanatory copy rather than failure or success coloring.

### Empty, stale, and degraded states

- Operator not installed: show an empty state that the report requires kube9-operator.
- No `aiConformance` summary: show an empty state that no conformance run has been published.
- Stale cache or degraded operator: show a banner consistent with the Well-Architected assessment report pattern and keep any bounded summary clearly marked as stale when present.
- Invalid payload: show a safe error state without raw ConfigMap JSON.
