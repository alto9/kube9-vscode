# Accessibility

Accessibility expectations for Kube9 VS Code **webview** surfaces, with emphasis on the Argo CD Application **resource graph**.

## Theme and visual baseline

- All webview UI, including graph tiles, toolbar, tabs, and **Details** content, uses **VS Code CSS variables** for color, type, and borders so contrast tracks the active editor theme.
- Status must not rely on color alone: sync and health badges pair **icon + text label** (or text exposed to assistive APIs) using the same codicon + label patterns as the drift table and tree.

## Resource graph

### Keyboard and focus

- **Tab order:** Webview header actions -> graph toolbar zoom controls (zoom in, zoom out, fit view) -> graph filter controls (name search, kind chips, sync chips, clear filters when visible) -> graph canvas tiles -> **Graph | Details** tabs -> panel content for the active tab.
- **Nodes:** Each graph tile is a single focus stop; **Enter** or **Space** activates the tile (selection/focus ring). Focus order among nodes follows a **stable, predictable** sequence (layout order left-to-right, then top-to-bottom within a column) so repeated visits do not jump arbitrarily after data refresh.
- **Overflow menu (⋮):** Opens with keyboard from the focused tile; menu items are standard focusable actions; **Escape** closes the menu and returns focus to the tile.
- **Canvas pan/zoom:** Pointer-first for pan; toolbar buttons are fully keyboard-operable with visible focus. Do not require drag-only gestures for essential information.

### Names and status

- Each tile exposes an accessible name combining **kind**, **resource name**, **sync status**, and **health status** (e.g. "Deployment frontend OutOfSync Degraded").
- Toolbar buttons have concise **accessible names** ("Zoom in", "Zoom out", "Fit graph to view").
- **Filter controls:** Name field labeled **Filter resources by name**; kind and sync chips use `aria-pressed` for toggle state; **Clear filters** is a standard button. A polite **`aria-live="polite"`** region announces result summaries when filters change (for example "Showing 3 of 12 resources" or "No resources match filters").
- Dashed edges are decorative for screen readers unless they encode unique information; parent/child relationships should be inferable from node names and optional **Details** table, or from explicit accessible descriptions when edge semantics become critical.

### Motion and density

- Respect **`prefers-reduced-motion`**: minimize or disable non-essential layout animation when the user prefers reduced motion; instant relayout on data refresh is acceptable.
- Truncated visible names must not truncate the **accessible** name.

## Tabs, header, and Details

- **Graph | Details** tabs use native `button` semantics or equivalent with `aria-selected` / roving tabindex so screen readers announce the active view.
- **Details** drift table: preserve header/row associations (`th`/`scope` or grid roles), expandable row state announced on toggle, and keyboard activation for navigate-to-tree links.
- Header operation buttons expose **disabled** state and in-progress labels ("Syncing...", "Refreshing...") to assistive tech when operations run.
- **Actions overflow menu:** The overflow trigger and menu items are keyboard operable with visible focus; **Escape** closes the menu and returns focus to the trigger. Menu items use the same accessible names as visible primary buttons would. Overflow must not trap focus.
- **Sub-header row** controls (Events export/search, Argo hard refresh) follow the same button semantics and disabled/in-progress labeling as primary header actions.
- **Graph filter controls** use standard button/combobox semantics with visible `:focus-visible` rings consistent with toolbar rules. Live-region match-count announcements are optional TW (`/refine-issue`).

## Kubernetes AI Conformance report

- Status badges include text labels for `passed`, `failed`, `warning`, `not-applicable`, `not-evaluated`, and `needs-evidence`; color is not the only signal.
- Category rollups use headings or labelled regions so keyboard and screen-reader users can move between sections.
- Requirement detail disclosure controls expose expanded/collapsed state and keep focus on the invoking row when toggled.
- `needs-evidence` and `not-evaluated` rows are announced as neutral evidence states, not as passed or failed.

## Operations and safety

- Destructive or cluster-mutating tile actions (e.g. rollout restart) require the same **confirmation or progress feedback** patterns as tree/context commands; errors are announced via existing notification channels, not only inline color change.
- Overflow menus must not trap focus; closing returns to the invoking tile.

## Testing expectations

- Manual keyboard pass: open application from tree, traverse toolbar and at least two tiles, open overflow and cancel with Escape, switch to **Details** and activate a navigate action.
- Verify badge/icon pairs have non-empty accessible names in high-contrast themes.
- Graph changes should be reviewed for focus loss after polling updates (focus should remain on the current tile when possible).
- AI Conformance report changes should include a keyboard pass through Refresh, category headings, expandable requirement rows, and high-contrast badge review.

## Argo CD diagram manual acceptance

### Graph tile keyboard pass (issue #224)

1. Open an Application graph from the tree with at least two managed-resource tiles.
2. Tab through header actions → graph toolbar (Zoom in, Zoom out, Fit) → first tile → second tile. Confirm visible `:focus-visible` rings.
3. Press **Enter** on a tile; confirm selected styling (`argocd-graph-node--selected`) without triggering a cluster mutation.
4. On a Deployment tile, press **Shift+F10** (or Context Menu); confirm overflow opens, **ArrowDown** moves between items, **Escape** closes and focus returns to the tile.
5. Activate **Navigate to resource in tree** from overflow; confirm focus moves to cluster tree when reveal succeeds (failure copy per #221 / #242).
6. Trigger a denied action (for example restart without permission in a test cluster) or use unit-tested unknown `actionId` path; confirm the dismissible action-notice banner exposes non-empty text to assistive APIs (`role="status"`).
7. Switch **Graph | Details** tabs with keyboard; confirm `aria-selected` on the active tab.
8. In a high-contrast theme, confirm sync/health badges are not color-only (icon + visible label in accessible name on the tile group).

### Application View In Tree removal (issue #243)

- Sub-header and Details Overview must not expose Application View In Tree; Application root overflow is empty/hidden.
- Tab order through header/sub-header must not include an Application-reveal control.
- In-panel keyboard tree navigation is managed-resource overflow only (Context Menu / Shift+F10 → **Navigate to resource in tree**) plus Details drift navigate links. There is no dedicated Application View In Tree shortcut.
- Empty selection or Application-root-only selection has no Application-reveal fallback in the panel.

**Edge semantics:** Parent/child relationships do not require per-edge accessible descriptions in v1; tile accessible names plus **Details** drift table navigation are sufficient.

### Graph toolbar filters (issue #244)

1. Tab from Fit control into name search and at least one kind/sync chip; confirm `:focus-visible` rings.
2. Toggle a sync chip with **Space**; confirm `aria-pressed` updates and live region announces the result summary.
3. Apply filters that hide the selected tile; confirm selection clears without moving focus off the filter control unexpectedly.
4. Activate **Clear filters** by keyboard; confirm full managed-resource visibility returns and live region updates.

### M16 close-out sweep (issue #225)

Before the M16 Argo CD Application diagram is release-ready, run the full manual sweep below in the Extension Development Host against a running Argo CD Application (or a fixture cluster). This sweep supersedes the #224 tile pass as the release gate; it repeats the #224 steps and adds the packaging-era extras that only exist once graph filters, large-application grouping, and the packaged VSIX are in place:

1. Repeat all eight #224 steps above (tab order through toolbar and tiles, Enter selection, overflow keyboard open/close, tree navigation, denied-action notice, tab switching, high-contrast badges).
2. **Filter controls (when shipped):** Tab from the zoom controls into the filter toolbar (name search, kind, sync status). Confirm each control is reachable by keyboard, has a visible `:focus-visible` ring, and that applying a filter does not trap focus or require pointer interaction.
3. **Large-application grouping (when shipped):** For an Application above the grouping threshold, confirm a collapsed kind group is keyboard-reachable, **Enter**/**Space** expands it, focus lands on a member tile after expand, and collapsing a group does not strand focus on a now-hidden tile.
4. **Reduced motion:** With `prefers-reduced-motion: reduce` set in the OS/browser, trigger a data refresh that changes graph structure; confirm relayout is instant (no animated transition) per the Motion and density rule above.
5. **High-contrast:** In a VS Code high-contrast theme, confirm sync/health badges on graph tiles and the Details table remain legible with visible icon + text label, and that filter/toolbar controls keep visible focus rings.
6. Record sweep completion (steps 1-5, noting which of the conditional steps applied) as a checklist in the #225 PR description or issue comment; this is manual evidence, not a new automated suite.
