# Configuration

## Extension Settings

User-facing settings live in `package.json` `contributes.configuration` (errors, telemetry, feature toggles). Changes apply without restart where VS Code supports it.

## Kubernetes Context

The active kubeconfig context drives all cluster-scoped operations. Webview panels store the context they were opened with (`context:namespace:applicationName` key) so actions and refreshes target the correct cluster even if the user switches context elsewhere in the IDE.

## Argo CD Application Webview

No separate webview-local configuration file. Graph layout defaults (direction, spacing) are code constants unless a future setting is added under `kube9.argocd.*`.
