# Observability

## Signals

- Output channels for feature-specific diagnostics (for example ArgoCD, port-forward, error logging).
- User notifications for operation outcomes.
- Cache stats command for runtime cache inspection.
- Test suite coverage across services, tree provider logic, YAML tooling, and command handlers.

## Product Telemetry Intent (Kube9 Desktop / VS Code Extension)

Purpose: Understand **which IDE features are used**, **successful vs failed workflows at a coarse grain**, and **error bucketing**, so we can prioritize stability and onboarding—without transmitting cluster payloads or customer-identifying content.

Contracts:

- **Allowlisted semantic events**: command IDs / feature areas, webview/dashboard opens, coarse success/failure for operations where safe to derive without logging arguments.
- **Error signals**: enumerated error categories (aligned with extension error taxonomy), not raw stack traces with paths unless redacted upstream.
- **Never send**: kubeconfig paths, cluster/context/namespace/resource names or UIDs, manifest/YAML/spec content, log lines from clusters, kube API response bodies, or free-form strings from user workspaces.

Operational expectations:

- Participate where practical in **VS Code / marketplace telemetry conventions** so users’ global consent settings remain authoritative.
- **Google Analytics (GA4)** is the planned **shared backend** for product analytics across IDE extension and desktop surfaces; dashboards and funnel analysis live there subject to `.forge/integration/external_systems.md`—still only allowlisted, non-identifying fields.
- **Local diagnostics** remain the default for troubleshooting; product telemetry complements aggregate product insight, not per-user debugging.

## Operational Principle

Diagnostics should be rich enough for troubleshooting while keeping end-user messaging concise and action-oriented.

Product telemetry (when shipped) must stay **minimal, enumerated, and reviewable**, consistent with `.forge/operations/security.md`.
