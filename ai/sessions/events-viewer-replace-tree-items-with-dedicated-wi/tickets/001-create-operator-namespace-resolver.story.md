---
story_id: 001-create-operator-namespace-resolver
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: completed
feature_id:
  - dynamic-namespace-discovery
spec_id:
  - namespace-discovery-spec
---

# Create OperatorNamespaceResolver Service

## Objective

Create the `OperatorNamespaceResolver` service that implements three-tier namespace discovery (ConfigMap → Settings → Default) with caching.

## Context

Current code has hardcoded `'kube9-system'` references. This service provides dynamic namespace resolution to support operator installations in custom namespaces.

## Acceptance Criteria

- [ ] Create `src/services/OperatorNamespaceResolver.ts`
- [ ] Implement `resolveNamespace(clusterContext)` with three-tier strategy:
  1. Check cache
  2. Try ConfigMap (bootstrap with settings namespace, then default)
  3. Try VS Code settings
  4. Fall back to default 'kube9-system'
- [ ] Implement `discoverFromConfigMap()` private method
- [ ] Implement `getNamespaceFromSettings()` private method for string/object config
- [ ] Implement `invalidateCache(clusterContext)` method
- [ ] Implement `getCachedNamespace(clusterContext)` method
- [ ] Implement `clearCache()` method
- [ ] Implement `validateNamespace()` method (optional validation)
- [ ] Export `getOperatorNamespaceResolver()` singleton function
- [ ] Add proper TypeScript types and JSDoc comments
- [ ] Add error handling for API calls
- [ ] Add logging for debugging namespace resolution

## Files Affected

- **Create**: `src/services/OperatorNamespaceResolver.ts`

## Implementation Notes

**Bootstrap Strategy**: To find ConfigMap without knowing namespace:
1. Try settings namespace first (if configured)
2. Fall back to 'kube9-system'
3. Look for ConfigMap in those namespaces
4. Extract namespace field from ConfigMap if present

**ConfigMap Structure Expected**:
```yaml
data:
  namespace: kube9-custom
  status: enabled
```

**Settings Support**:
- String: applies to all clusters
- Object: per-cluster mapping

**Caching**: Store per cluster context in Map for performance.

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/namespace-discovery-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/dynamic-namespace-discovery.feature.md`
- Diagram: `ai/diagrams/webview/events-viewer/namespace-discovery-flow.diagram.md`

## Estimated Time

25 minutes

