# Data

How data is modeled, held in memory, serialized across the extension boundary, and kept consistent during refresh.

## Scope

kube9-vscode is a client-side extension. Persistent product data lives in Kubernetes (CRDs, API objects) and optional operator status ConfigMaps. The extension maintains **in-memory caches** and **webview session state** only; it does not operate a durable application database.

## Documents

| Doc | Purpose |
|-----|---------|
| [data_model.md](./data_model.md) | Entities at rest and in transit, including the Argo CD application resource graph view model |
| [persistence_abstractions.md](./persistence_abstractions.md) | Where graph and application data lives between fetches |
| [serialization.md](./serialization.md) | Extension ↔ webview payloads for application detail and graph |
| [consistency.md](./consistency.md) | Refresh, polling, and merge rules for graph updates |

## Related contracts

- [../business_logic/domain_model.md](../business_logic/domain_model.md) — domain entities and invariants (resource identity, Argo CD Application)
- [../integration/api_contracts.md](../integration/api_contracts.md) — Kubernetes and Argo CD CRD integration boundaries
- Application and resource field shapes align with `ArgoCDApplication` and `ArgoCDResource` in the extension type layer
