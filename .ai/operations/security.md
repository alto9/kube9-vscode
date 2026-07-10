# Security

## Security Posture

- Local-first model: kubeconfig and command execution remain on the user machine.
- Kubernetes API authn/authz relies on existing kubeconfig credentials and RBAC.
- Optional product telemetry pipeline: **never required** for core cluster management tasks. Telemetry, when present, participates in IDE-aligned consent flows and observes the allowlisted-data rules in `.ai/operations/observability.md` (no cluster data, manifests, kubeconfig-derived identifiers, resource names as telemetry payloads).
- Sensitive operations are gated by explicit command intent and permission checks.

## Telemetry And Trust

Kube9 desktop IDE surfaces prioritize **explicit user control** consistent with VS Code settings. Telemetry is for **aggregate product insight**—not a substitute for support logs—and must remain guardrailed via code-reviewable event APIs so engineers cannot accidentally attach cluster context to payloads.

Argo CD diagram actions preserve the local-first trust model. The webview never receives kubeconfig paths, Argo CD bearer tokens, raw REST endpoints, or raw API responses; it sends selected-resource intent to the extension host, and the host validates context, RBAC, action eligibility, and optional Argo CD REST credentials before any cluster or server call.

## Supply Chain And Release

- CI-managed release flow with repository secrets for marketplace publishing.
- Dependabot/lockfile hygiene and dependency updates should remain part of normal maintenance.
