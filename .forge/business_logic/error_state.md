# Error States

## Canonical Error Classes

- **Connectivity**: kubeconfig invalid, context unreachable, request timeout.
- **Authorization**: RBAC denies read/write or command execution.
- **Not Found**: resource/context/CRD missing.
- **Dependency Missing**: kubectl or helm CLI unavailable for feature path.
- **Conflict**: resource changed outside editor during YAML editing.
- **Operation Failure**: rollout/sync/port-forward runtime failure.

## State Rules

1. User-facing actions must return actionable messages, not opaque stack traces.
2. Recoverable errors should allow retry without full extension restart.
3. Error state in one feature should not block unrelated read-only workflows.
