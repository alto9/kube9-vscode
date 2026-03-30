# Input Handling

## Input Sources

- Tree item context menus (resource actions, ArgoCD actions, port-forwarding).
- Command palette commands for global actions.
- Webview UI events (details panes, logs, Helm manager, events viewer).
- YAML text editors with save/apply behavior.

## Input Rules

1. Validate context/resource prerequisites before execution.
2. Require confirmation for destructive actions.
3. Surface explicit cancellation paths for long-running operations where supported.
