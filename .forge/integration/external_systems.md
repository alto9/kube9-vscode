# External Systems

## Primary Systems

- **Kubernetes API servers** reachable through user kubeconfig contexts.
- **kubectl** local executable for command paths and process-backed operations.
- **helm** local executable for chart/release management.
- **ArgoCD** optional in-cluster CRDs/controllers.
- **kube9-operator** optional in-cluster status and reporting source.

## Optional Telemetry And Analytics Egress

- **VS Code / Microsoft extension telemetry machinery** where the extension adopts official APIs (`vscode-extension-telemetry` or successors), subject to Cursor/VS Code user telemetry settings—used only for allowlisted semantic events described in `.forge/operations/observability.md`. This path may coexist with GA4 below; duplication of the same semantic event should be minimized in implementation.
- **Google Analytics (GA4)** — **approved product-analytics backend** for cross-surface rollups (**kube9-vscode** and other **kube9-desktop** clients). Events use the same allowlisted schema and forbid-list as `.forge/operations/observability.md`; implementation may use GA4 client SDKs, **Measurement Protocol**, or platform-recommended integration per app type. Property ID, credentials, and consent UX are implementation details (not stored in Forge). If Google’s terms or regional requirements change materially, update this section.

## Boundary Statement

Core extension operations are local-first and cluster-native; no mandatory external SaaS dependency is required for baseline cluster management. Product telemetry egress is optional and supplementary to that core stance.
