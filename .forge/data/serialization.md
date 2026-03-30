# Serialization

## Formats In Use

- JSON for API responses, cached structures, and webview message payloads.
- YAML for Kubernetes manifests and editor-backed resources.
- CLI stdout/stderr text streams for kubectl/helm process-backed operations.

## Rules

1. Parse untrusted cluster/process payloads defensively.
2. Validate required fields before mapping to typed domain objects.
3. Preserve raw detail for diagnostics while exposing safe user-facing summaries.
