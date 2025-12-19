---
story_id: 004-update-operator-status-client-dynamic-namespace
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: completed
feature_id:
  - dynamic-namespace-discovery
spec_id:
  - namespace-discovery-spec
---

# Update OperatorStatusClient to Use Dynamic Namespace

## Objective

Update `OperatorStatusClient` to use `OperatorNamespaceResolver` instead of hardcoded `'kube9-system'` reference at line 90.

## Context

OperatorStatusClient reads the operator status ConfigMap using hardcoded namespace. Must use dynamic resolution.

## Acceptance Criteria

- [ ] Add import for `getOperatorNamespaceResolver`
- [ ] Update `getOperatorStatus()` method to resolve namespace dynamically
- [ ] Use resolved namespace for ConfigMap read operation
- [ ] Update any other methods with hardcoded namespace references
- [ ] Ensure error messages include resolved namespace
- [ ] No breaking changes to public API

## Files Affected

- **Modify**: `src/services/OperatorStatusClient.ts`

## Implementation Notes

**Before**:
```typescript
const STATUS_NAMESPACE = 'kube9-system'; // Hardcoded

async getOperatorStatus(clusterContext: string): Promise<OperatorStatus> {
    const configMap = await this.apiClient.core.readNamespacedConfigMap({
        name: 'kube9-operator-status',
        namespace: STATUS_NAMESPACE // ❌ HARDCODED
    });
}
```

**After**:
```typescript
import { getOperatorNamespaceResolver } from './OperatorNamespaceResolver';

async getOperatorStatus(clusterContext: string): Promise<OperatorStatus> {
    const resolver = getOperatorNamespaceResolver();
    const namespace = await resolver.resolveNamespace(clusterContext);
    
    const configMap = await this.apiClient.core.readNamespacedConfigMap({
        name: 'kube9-operator-status',
        namespace: namespace // ✅ DYNAMIC
    });
}
```

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/namespace-discovery-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/dynamic-namespace-discovery.feature.md`

## Estimated Time

15 minutes

