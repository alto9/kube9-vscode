# Execution Model

## Main Model

- VS Code hosts extension code in the extension runtime process.
- User commands dispatch into command handlers that coordinate services and Kubernetes calls.
- Tree refreshes are event-driven via provider emitters and targeted cache invalidation.
- Webviews run browser-side bundles and communicate through message contracts to extension handlers.

## Concurrency Pattern

- Async Kubernetes queries and process calls run concurrently where safe.
- TTL caches reduce repeated API pressure while maintaining acceptable freshness.
