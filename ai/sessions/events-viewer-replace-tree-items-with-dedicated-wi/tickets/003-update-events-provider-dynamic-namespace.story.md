---
story_id: 003-update-events-provider-dynamic-namespace
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: completed
feature_id:
  - dynamic-namespace-discovery
  - event-viewer-panel
spec_id:
  - events-provider-updates-spec
  - namespace-discovery-spec
---

# Update EventsProvider to Use Dynamic Namespace

## Objective

Update `EventsProvider` to use `OperatorNamespaceResolver` instead of hardcoded `'kube9-system'` references.

## Context

EventsProvider currently has two hardcoded namespace references:
- Line 190: `exec.exec('kube9-system', ...)`
- Line 234: `await apiClient.core.listNamespacedPod({ namespace: 'kube9-system' })`

## Acceptance Criteria

- [ ] Add import for `getOperatorNamespaceResolver`
- [ ] Update `executeOperatorCLI()` method:
  - [ ] Resolve namespace using resolver
  - [ ] Pass namespace to `exec.exec()` instead of hardcoded value
  - [ ] Pass namespace to `getOperatorPodName()`
- [ ] Update `getOperatorPodName()` method signature:
  - [ ] Add `namespace: string` parameter
  - [ ] Use parameter instead of hardcoded value
  - [ ] Update error message to include namespace
- [ ] Ensure no breaking changes to public API
- [ ] Add error handling for namespace resolution failures

## Files Affected

- **Modify**: `src/services/EventsProvider.ts`

## Implementation Notes

**Before (executeOperatorCLI)**:
```typescript
exec.exec(
    'kube9-system',  // ❌ HARDCODED
    podName,
    'kube9-operator',
    commandArgs,
    ...
);
```

**After (executeOperatorCLI)**:
```typescript
const resolver = getOperatorNamespaceResolver();
const namespace = await resolver.resolveNamespace(clusterContext);

exec.exec(
    namespace,  // ✅ DYNAMIC
    podName,
    'kube9-operator',
    commandArgs,
    ...
);
```

**Before (getOperatorPodName)**:
```typescript
private async getOperatorPodName(apiClient: KubernetesApiClient): Promise<string> {
    const pods = await apiClient.core.listNamespacedPod({
        namespace: 'kube9-system'  // ❌ HARDCODED
    });
```

**After (getOperatorPodName)**:
```typescript
private async getOperatorPodName(
    apiClient: KubernetesApiClient,
    namespace: string  // ✅ PARAMETER
): Promise<string> {
    const pods = await apiClient.core.listNamespacedPod({
        namespace: namespace  // ✅ DYNAMIC
    });
```

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/events-provider-updates-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/dynamic-namespace-discovery.feature.md`

## Estimated Time

20 minutes

