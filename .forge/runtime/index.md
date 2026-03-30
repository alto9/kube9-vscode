# Runtime Overview

Kube9 VS Code is a VS Code extension runtime with activation-driven startup, command registration, tree provider orchestration, and managed disposal on deactivation.

## Runtime Shape

- **Entry**: `dist/extension.js` compiled from `src/extension.ts`
- **Activation events**: startup and kube9 cluster view opening
- **Core long-lived services**: tree provider, status bars, YAML manager, port-forward manager, caches, help controller

## Related Documents

- [configuration.md](./configuration.md)
- [startup_bootstrap.md](./startup_bootstrap.md)
- [lifecycle_shutdown.md](./lifecycle_shutdown.md)
- [execution_model.md](./execution_model.md)
