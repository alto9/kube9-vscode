# Accessibility

Accessibility expectations for Kube9 VS Code **webview** surfaces, with emphasis on the Argo CD Application **resource graph**.

## Theme and visual baseline

- All webview UI, including graph tiles, toolbar, tabs, and **Details** content, uses **VS Code CSS variables** for color, type, and borders so contrast tracks the active editor theme.
- Status must not rely on color alone: sync and health badges pair **icon + text label** (or text exposed to assistive APIs) using the same codicon + label patterns as the drift table and tree.

## Resource graph

### Keyboard and focus

- **Tab order:** Webview header actions -> graph toolbar (zoom in, zoom out, fit view) -> graph canvas -> **Graph | Details** tabs -> panel content for the active tab.
- **Nodes:** Each graph tile is a single focus stop; **Enter** or **Space** activates the tile (selection/focus ring). Focus order among nodes follows a **stable, predictable** sequence (layout order left-to-right, then top-to-bottom within a column) so repeated visits do not jump arbitrarily after data refresh.
- **Overflow menu (⋮):** Opens with keyboard from the focused tile; menu items are standard focusable actions; **Escape** closes the menu and returns focus to the tile.
- **Canvas pan/zoom:** Pointer-first for pan; toolbar buttons are fully keyboard-operable with visible focus. Do not require drag-only gestures for essential information.

### Names and status

- Each tile exposes an accessible name combining **kind**, **resource name**, **sync status**, and **health status** (e.g. "Deployment frontend OutOfSync Degraded").
- Toolbar buttons have concise **accessible names** ("Zoom in", "Zoom out", "Fit graph to view").
- Dashed edges are decorative for screen readers unless they encode unique information; parent/child relationships should be inferable from node names and optional **Details** table, or from explicit accessible descriptions when edge semantics become critical.

### Motion and density

- Respect **`prefers-reduced-motion`**: minimize or disable non-essential layout animation when the user prefers reduced motion; instant relayout on data refresh is acceptable.
- Truncated visible names must not truncate the **accessible** name.

## Tabs, header, and Details

- **Graph | Details** tabs use native `button` semantics or equivalent with `aria-selected` / roving tabindex so screen readers announce the active view.
- **Details** drift table: preserve header/row associations (`th`/`scope` or grid roles), expandable row state announced on toggle, and keyboard activation for navigate-to-tree links.
- Header operation buttons expose **disabled** state and in-progress labels ("Syncing...", "Refreshing...") to assistive tech when operations run.
- **Actions overflow menu:** The overflow trigger and menu items are keyboard operable with visible focus; **Escape** closes the menu and returns focus to the trigger. Menu items use the same accessible names as visible primary buttons would. Overflow must not trap focus.
- **Sub-header row** controls (Events export/search, Argo hard refresh/view in tree) follow the same button semantics and disabled/in-progress labeling as primary header actions.

## Operations and safety

- Destructive or cluster-mutating tile actions (e.g. rollout restart) require the same **confirmation or progress feedback** patterns as tree/context commands; errors are announced via existing notification channels, not only inline color change.
- Overflow menus must not trap focus; closing returns to the invoking tile.

## Testing expectations

- Manual keyboard pass: open application from tree, traverse toolbar and at least two tiles, open overflow and cancel with Escape, switch to **Details** and activate a navigate action.
- Verify badge/icon pairs have non-empty accessible names in high-contrast themes.
- Graph changes should be reviewed for focus loss after polling updates (focus should remain on the current tile when possible).
