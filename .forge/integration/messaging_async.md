# Messaging And Async Patterns

## Async Channels

- VS Code command dispatch and async handlers.
- Tree provider refresh events.
- Webview `postMessage` request/response patterns.
- Child process stdout/stderr streams for kubectl/helm operations.
- Polling loops for operation progress (for example ArgoCD track operation).

## Rules

1. Async workflows must support timeout/error paths.
2. Long-running operations should provide progress or status visibility.
