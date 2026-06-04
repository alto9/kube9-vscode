# Startup And Bootstrap

## Activation

The extension activates on VS Code startup events defined in `package.json` (commands, views, etc.). Core services (tree provider, kubectl client factory, Argo CD service) register during activation.

## Webview Bootstrap

Webviews are **not** started at extension activation. Each panel is created on demand when the user opens a resource or Argo CD application from the cluster tree.

### HTML shell families

| Family | Bootstrap | Header contract |
|--------|-----------|-----------------|
| **React + bundled script** | Host sets `webview.html` with `#root`, shipped header CSS, feature `main.js` under `media/` or `dist/media/` | `WebviewHeader` in bundle; layout rules in **interface** `presentation.md` |
| **Legacy inline HTML** | `*DescribeWebview.ts` generators emit full documents with shared header shell markup and shipped CSS | Same tokens and overflow behavior via shared shell; `{ command }` messages until optional React migration |

**Multiple bundles** per feature remain normal; there is no single global webview bundle.

**CSS:** Every shell loads **`media/styles/webview-header.css`** (link or inline from shipped path). See **operations** `build_packaging.md` for copy and VSIX rules.

**`acquireVsCodeApi()`:** Called once per document. `WebviewHeader` does not acquire the API; Help and actions use `window.vscode` / `window.vscodeApi` (or feature helpers such as Helm's vscode API module). Panels with **`helpContext`** must register **`WebviewHelpHandler`** on the host and expose the API on `window` for the header module.

**Panel reuse:** Assigning new `webview.html` when reusing a shared Describe panel reloads the document and resets webview state. Full reload on navigation is **acceptable** for this initiative unless a later story adopts a persistent shell with `postMessage`-only updates.

### Argo CD application webview sequence

1. Extension creates or reveals `WebviewPanel` (`retainContextWhenHidden: true`). If the panel already exists for the same `context:namespace:applicationName`, it is **revealed** and data is **reloaded** for that tuple.
2. HTML loads shipped header CSS, React Flow base CSS, application CSS, then `main.js`.
3. React app mounts and posts `{ type: 'ready' }` to the extension.
4. Extension loads application (and graph) data and posts initial DTO messages (`applicationData`, `graphData` when active).

Data may arrive before or after `ready`; the webview must handle both orderings.

Header layout, primary cap, overflow, and sub-header slots are defined in **interface** `presentation.md` and **interaction_flow.md`; this document covers **how** shells deliver CSS, scripts, and Help wiring so that contract renders reliably in dev and packaged VSIX installs.
