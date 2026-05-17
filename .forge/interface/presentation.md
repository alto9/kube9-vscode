# Presentation

## Presentation Surfaces

- **Tree View**: clusters -> categories -> resources.
- **Webviews**: structured resource detail/describe views, events viewer, pod logs, operator report, Helm package manager, tutorial/help.
- **Status Bar**: current context and namespace.
- **Notifications/Output**: operation outcomes and diagnostic details.

## Presentation Principles

- Keep high-frequency operations one click from tree context.
- Show health/sync/severity signals with recognizable iconography.
- Keep technical details available but not forced in primary success paths.
- Resource detail views are the primary inspection surface: supported built-in workloads and custom resources should expose status, related objects, events, and YAML through resource-appropriate sections while preserving a generic fallback only for unsupported kinds.
