---
story_id: 008-integrate-port-forwarding-in-tree-provider
session_id: add-port-forwarding-for-pods
feature_id:
  - pod-port-forwarding
spec_id:
  - port-forwarding-tree-spec
status: pending
---

# Integrate Port Forwarding in ClusterTreeProvider

## Objective

Update ClusterTreeProvider to handle the Port Forwarding subcategory and render port forward items when the category is expanded.

## Context

ClusterTreeProvider's `getCategoryChildren()` needs to handle the `portForwarding` type and return port forward items. The tree uses on-demand refresh - NO automatic refresh events.

## Implementation

### File: src/tree/ClusterTreeProvider.ts

**Update `getCategoryChildren()` method**:
```typescript
private getCategoryChildren(element: ClusterTreeItem): ClusterTreeItem[] {
  const type = element.type;
  
  switch (type) {
    // Existing cases...
    
    case 'networking':
      return NetworkingCategory.getNetworkingSubcategories(element.resourceData);
    
    case 'portForwarding': // NEW
      return PortForwardingSubcategory.getPortForwardItems(element.resourceData);
    
    // Other cases...
  }
}
```

**Update `isCategoryType()` method**:
```typescript
private isCategoryType(type: string): boolean {
  return (
    // Existing types...
    type === 'networking' ||
    type === 'portForwarding' || // NEW
    type === 'services'
    // Other types...
  );
}
```

**Add imports**:
```typescript
import { PortForwardingSubcategory } from './categories/networking/PortForwardingSubcategory';
```

## Acceptance Criteria

- [ ] `portForwarding` case added to getCategoryChildren
- [ ] Returns result from PortForwardingSubcategory.getPortForwardItems()
- [ ] `portForwarding` added to isCategoryType check
- [ ] Port Forwarding category expandable in tree
- [ ] Forward items display when category expanded
- [ ] Empty state shows when no forwards
- [ ] NO automatic tree refresh (on-demand only)
- [ ] Tree queries manager fresh each time category expanded

## Files Modified

- `src/tree/ClusterTreeProvider.ts`

## Dependencies

- 006-create-port-forwarding-subcategory-class
- 007-add-tree-item-factory-methods

## Estimated Time

10 minutes

