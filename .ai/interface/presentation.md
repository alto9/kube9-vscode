# Presentation

## Presentation Surfaces

- **Tree View**: clusters -> categories -> resources.
- **Webviews**: structured resource detail/describe views, events viewer, pod logs, operator report, Helm package manager, tutorial/help.
- **Argo CD Application detail (webview)**: When opened from the cluster tree, the default view is an interactive **resource graph** (left-to-right layout). **Details** is the secondary tab for app metadata and tabular drift review; see **Argo CD Application Detail (webview)** below.
- **Status Bar**: current context and namespace.
- **Notifications/Output**: operation outcomes and diagnostic details.

## Presentation Principles

- Keep high-frequency operations one click from tree context.
- Show health/sync/severity signals with recognizable iconography.
- Keep technical details available but not forced in primary success paths.
- Resource detail views are the primary inspection surface: supported built-in workloads and custom resources should expose status, related objects, events, and YAML through resource-appropriate sections while preserving a generic fallback only for unsupported kinds.

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

**Application root tile:** Mirrors application-level sync and health on the tile; application-level **sync**, **refresh**, **hard refresh**, and **view in tree** remain on the **webview header** as today (root tile overflow may duplicate subset actions for in-graph context).

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
