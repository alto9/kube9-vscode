# Interaction Flow

## Typical Flows

1. **Inspect**: choose context -> expand namespace/resource -> open describe or YAML/logs.
2. **Operate**: select resource -> execute scale/restart/delete/apply action -> refresh affected tree nodes.
3. **Debug**: open events/logs -> correlate with resource health/status -> iterate on YAML or workload commands.
4. **GitOps**: open ArgoCD application -> inspect sync/health -> run sync/refresh/hard-refresh as needed.

## Flow Constraints

- Flows should remain functional when operator-powered enhancements are absent.
- Namespace/context switches must be reflected across tree and status indicators promptly.
- Left-click and context-menu Describe entry points for the same resource kind must route to the same detail surface and preserve context, namespace, name, and scope.
- Structured detail pages should degrade to missing-permission, missing-resource, or unsupported-kind states instead of showing placeholder content for resources the extension claims to support.
