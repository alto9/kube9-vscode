# Observability

## Signals

- Output channels for feature-specific diagnostics (for example ArgoCD, port-forward, error logging).
- User notifications for operation outcomes.
- Cache stats command for runtime cache inspection.
- Test suite coverage across services, tree provider logic, YAML tooling, and command handlers.

## Product Telemetry Intent (Kube9 Desktop / VS Code Extension)

Purpose: Understand **which IDE features are used**, **successful vs failed workflows at a coarse grain**, and **error bucketing**, so we can prioritize stability and onboarding—without transmitting cluster payloads or customer-identifying content.

Contracts:

- **Allowlisted semantic events**: command IDs / feature areas, webview/dashboard opens, coarse success/failure for operations where safe to derive without logging arguments. The **`main` enumeration of record** is **[`docs/telemetry-event-catalog.md`](../../docs/telemetry-event-catalog.md)** (maintainer-maintained catalog and review workflow). Planned instrumentation façade work ([M1.2 (#133)](https://github.com/alto9/kube9-vscode/issues/133)) MUST only emit cataloged entries from that document alongside their allowed payload shapes.
- **Error signals**: enumerated error categories (aligned with extension error taxonomy), not raw stack traces with paths unless redacted upstream.
- **Never send**: kubeconfig paths, cluster/context/namespace/resource names or UIDs, manifest/YAML/spec content, log lines from clusters, kube API response bodies, or free-form strings from user workspaces.

Operational expectations:

- Participate where practical in **VS Code / marketplace telemetry conventions** so users’ global consent settings remain authoritative.
- **Google Analytics (GA4)** is the planned **shared backend** for product analytics across IDE extension and desktop surfaces; dashboards and funnel analysis live there subject to `.ai/integration/external_systems.md`—still only allowlisted, non-identifying fields.
- **Local diagnostics** remain the default for troubleshooting; product telemetry complements aggregate product insight, not per-user debugging.

Argo CD graph telemetry, when added, follows the same allowlist: event names may describe coarse feature use or outcome categories such as graph opened, topology fallback shown, resource action succeeded, or resource action failed. Payloads must not include cluster context, namespace, Application name, resource kind/name, manifest content, kubeconfig data, Argo CD URLs, tokens, or raw API payloads.

## Operational Principle

Diagnostics should be rich enough for troubleshooting while keeping end-user messaging concise and action-oriented.

Product telemetry (when shipped) must stay **minimal, enumerated, and reviewable**, consistent with `.ai/operations/security.md`.

## ArgoCD Diagram Telemetry (issue #225)

Graph-specific product telemetry is **optional** and not required for the Argo CD diagram to be release-ready. The existing `kube9.product.feature_usage.webview_open` event with `webviewSurface: argocd_application` (see `docs/telemetry-event-catalog.md`) already provides the open-panel signal for this surface.

If a graph implementation PR adds **new** telemetry event keys or payload fields (for example a coarse "topology fallback shown" or "resource action outcome" event), the same PR must add the corresponding row(s) to `docs/telemetry-event-catalog.md` under **Proposed** or **Shipped** before the emitting code merges, following the existing catalog review workflow (author adds/updates rows, maintainer confirms allowlisted-only payload shapes, no cluster identifiers). Validation for #225 is a catalog review plus a negative check: confirm graph action/navigation/topology code paths do not emit raw resource names, namespaces, Application names, kind/name pairs beyond the enumerated event keys, Argo CD URLs, kubeconfig data, or tokens via product telemetry, consistent with the **Never send** list above.
