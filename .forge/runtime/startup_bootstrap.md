# Startup And Bootstrap

## Activation

The extension activates on VS Code startup events defined in `package.json` (commands, views, etc.). Core services (tree provider, kubectl client factory, Argo CD service) register during activation.

## Webview Bootstrap

Webviews are **not** started at extension activation. Each panel is created on demand when the user opens a resource or Argo CD application from the cluster tree.

Argo CD application webview bootstrap sequence:

1. Extension creates or reveals `WebviewPanel` (`retainContextWhenHidden: true`). If the panel already exists for the same `context:namespace:applicationName`, it is **revealed** and data is **reloaded** for that tuple.
2. HTML loads shared header CSS, React Flow base CSS, application CSS, then `main.js`.
3. React app mounts and posts `{ type: 'ready' }` to the extension.
4. Extension loads application (and, when implemented, graph) data and posts initial DTO messages (`applicationData`, and `graphData` when the resource graph is active).

Data may arrive before or after `ready`; the webview must handle both orderings.
