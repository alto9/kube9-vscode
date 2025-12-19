---
story_id: 005-update-dashboard-data-provider-dynamic-namespace
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
feature_id:
  - dynamic-namespace-discovery
spec_id:
  - namespace-discovery-spec
---

# Update DashboardDataProvider to Use Dynamic Namespace

## Objective

Update `DashboardDataProvider` to use `OperatorNamespaceResolver` instead of hardcoded `'kube9-system'` reference at line 313.

## Context

DashboardDataProvider reads operator status ConfigMap using hardcoded namespace.

## Acceptance Criteria

- [ ] Add import for `getOperatorNamespaceResolver`
- [ ] Locate hardcoded namespace reference at line 313
- [ ] Replace with dynamic namespace resolution
- [ ] Update any other methods with hardcoded namespace references
- [ ] Ensure no breaking changes to public API

## Files Affected

- **Modify**: `src/services/DashboardDataProvider.ts`

## Implementation Notes

**Before (line 313)**:
```typescript
const configMap = await apiClient.core.readNamespacedConfigMap({
    name: 'kube9-operator-status',
    namespace: 'kube9-system' // ❌ HARDCODED
});
```

**After**:
```typescript
const resolver = getOperatorNamespaceResolver();
const namespace = await resolver.resolveNamespace(clusterContext);

const configMap = await apiClient.core.readNamespacedConfigMap({
    name: 'kube9-operator-status',
    namespace: namespace // ✅ DYNAMIC
});
```

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/namespace-discovery-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/dynamic-namespace-discovery.feature.md`

## Estimated Time

15 minutes

