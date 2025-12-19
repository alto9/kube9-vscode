---
story_id: 006-update-ai-recommendations-query-dynamic-namespace
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
feature_id:
  - dynamic-namespace-discovery
spec_id:
  - namespace-discovery-spec
---

# Update AIRecommendationsQuery to Use Dynamic Namespace

## Objective

Update `AIRecommendationsQuery` to use `OperatorNamespaceResolver` instead of hardcoded `'kube9-system'` reference at line 46.

## Context

AIRecommendationsQuery reads recommendations ConfigMap using hardcoded namespace.

## Acceptance Criteria

- [ ] Add import for `getOperatorNamespaceResolver`
- [ ] Locate hardcoded namespace reference at line 46
- [ ] Replace with dynamic namespace resolution
- [ ] Update any other methods with hardcoded namespace references
- [ ] Ensure no breaking changes to public API

## Files Affected

- **Modify**: `src/services/AIRecommendationsQuery.ts`

## Implementation Notes

**Before (line 46)**:
```typescript
const configMap = await apiClient.core.readNamespacedConfigMap({
    name: 'kube9-ai-recommendations',
    namespace: 'kube9-system' // ❌ HARDCODED
});
```

**After**:
```typescript
const resolver = getOperatorNamespaceResolver();
const namespace = await resolver.resolveNamespace(clusterContext);

const configMap = await apiClient.core.readNamespacedConfigMap({
    name: 'kube9-ai-recommendations',
    namespace: namespace // ✅ DYNAMIC
});
```

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/namespace-discovery-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/dynamic-namespace-discovery.feature.md`

## Estimated Time

15 minutes

