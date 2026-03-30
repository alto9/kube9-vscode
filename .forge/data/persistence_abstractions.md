# Persistence Abstractions

## Persistence Layers

- **VS Code global/workspace state** for extension preferences/tutorial progress.
- **In-memory maps** for ephemeral state (cache entries, tree snapshots, active forwards).
- **Kubernetes API** for durable resource persistence through apply/patch/delete operations.

## Boundary

The extension does not maintain an external application database for core workflows.
