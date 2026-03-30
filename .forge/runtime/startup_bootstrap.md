# Startup And Bootstrap

## Activation Flow

1. Extension activates from startup/view event.
2. Global state and tutorial completion context are initialized.
3. Kubeconfig parsing runs and discovers contexts.
4. Core managers are created (tree provider, status bars, YAML/editor services, port-forward manager).
5. Commands are registered before tree interactions are expected.
6. Optional dependency checks (for example Helm CLI) run non-blocking.

## Startup Requirements

- Activation must be resilient to missing kubeconfig or unavailable clusters.
- Partial feature readiness is acceptable; extension should stay usable for available flows.
