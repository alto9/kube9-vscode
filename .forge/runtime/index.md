# Runtime

How kube9-vscode starts, executes work, and shuts down.

## Process Model

The extension runs in the **VS Code extension host** (Node). User-facing panels are **isolated webviews** (browser context) that communicate with the host over `postMessage`. Kubernetes and Argo CD I/O happen only in the extension host; webviews receive DTOs and dispatch action requests.

## Documents

- [Configuration](configuration.md) — settings and kubeconfig context selection
- [Startup and bootstrap](startup_bootstrap.md) — activation and service wiring
- [Execution model](execution_model.md) — webview messaging, Argo CD graph protocol, operation polling
- [Lifecycle and shutdown](lifecycle_shutdown.md) — webview panel reuse, disposal, in-flight operation cleanup
