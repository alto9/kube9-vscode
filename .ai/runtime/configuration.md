# Configuration

## Extension Settings

User-facing settings live in `package.json` `contributes.configuration` (errors, telemetry, feature toggles). Changes apply without restart where VS Code supports it.

## Kubernetes Context

The active kubeconfig context drives all cluster-scoped operations. Webview panels store the context they were opened with (`context:namespace:applicationName` key) so actions and refreshes target the correct cluster even if the user switches context elsewhere in the IDE.

## Argo CD Application Webview

No separate webview-local configuration file. Graph layout defaults (direction, spacing) are code constants unless a future setting is added under `kube9.argocd.*`.

## Argo CD REST API (Tier B topology, optional)

Separate from Kubernetes Application CRD RBAC. Credentials and base URL stay in the **extension host** only (never in webview HTML or `postMessage` payloads). See [integration/authorization.md](../integration/authorization.md).

| Setting | Type | Scope | Default | Purpose |
|---------|------|-------|---------|---------|
| `kube9.argocd.restEnabled` | boolean | application | `false` | Gate Tier B `resource-tree` HTTP calls (#166). When `false`, graph stays on CRD / owner-ref tiers only. |
| `kube9.argocd.serverUrl` | string or object | application | `null` | HTTPS API base (no trailing path). **Object** keys are kubeconfig **context names** (same pattern as `kube9.operatorNamespace`). |
| `kube9.argocd.accessMode` | string | application | `direct` | `direct` uses `serverUrl` as-is. `portForward` starts (or reuses) a host-managed `kubectl port-forward` to the detected `argocd-server` Service and uses `http://127.0.0.1:{localPort}` as the API base for that context. |
| `kube9.argocd.tlsInsecure` | boolean | application | `false` | Skip TLS verification for HTTPS bases. Labs / local port-forward only; must not be the default for production ingress URLs. |
| `kube9.argocd.portForwardLocalPort` | number | application | `0` | When `accessMode` is `portForward`, preferred local bind port; `0` means auto-select via existing port-forward manager. |

**Bearer token** is not a `settings.json` value. Store per context in VS Code **SecretStorage** (key pattern `kube9.argocd.bearerToken.{context}`). Expose **Kube9: Set Argo CD API Token** (and optional **Clear** / **Test connection**) commands; settings UI shows configured vs missing without echoing the secret.

**Resolution order** for a panel's kubeconfig context:

1. If `restEnabled` is false → REST path unavailable (Tier B skipped).
2. Resolve base URL from `accessMode`: `direct` → `serverUrl[context]`; `portForward` → active forward URL or start forward to `argocd-server` in the Argo CD namespace from detection (`ArgoCDService` / operator status).
3. Load bearer token from SecretStorage for that context; missing token → skip Tier B with host-side warning (no fatal Application panel error).

Timeouts for REST calls reuse `kube9.timeout.apiRequest` unless a dedicated Argo CD override is added later.
