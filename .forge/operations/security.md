# Security

## Security Posture

- Local-first model: kubeconfig and command execution remain on the user machine.
- Kubernetes API authn/authz relies on existing kubeconfig credentials and RBAC.
- No required external telemetry pipeline for core features.
- Sensitive operations are gated by explicit command intent and permission checks.

## Supply Chain And Release

- CI-managed release flow with repository secrets for marketplace publishing.
- Dependabot/lockfile hygiene and dependency updates should remain part of normal maintenance.
