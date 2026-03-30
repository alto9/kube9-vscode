# Error Handling

## Handling Strategy

- Normalize Kubernetes and process errors into typed categories.
- Show concise notifications in-product and send detailed diagnostics to output channels.
- Preserve user flow by failing feature-locally (for example, ArgoCD not detected does not fail tree rendering).

## UX Rules

1. Use warning severity for degraded optional capabilities.
2. Use error severity for failed requested actions.
3. Include context, namespace, and resource identifiers whenever available.
4. Offer retries or alternatives when deterministic (for example, suggest alternate local port).
