# Operations

How kube9-vscode is built, distributed, observed, and secured.

## Documents

- [Build and packaging](build_packaging.md) — toolchain, webview build split, Argo CD webview esbuild entry, graph dependencies, CSS order, bundle size
- [Deployment environments](deployment_environments.md) — extension host, marketplaces, CI release

Observability and security contracts are not yet authored in this repo; telemetry flows through `@vscode/extension-telemetry` in the extension host.
