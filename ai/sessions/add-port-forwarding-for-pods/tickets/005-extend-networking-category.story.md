---
story_id: 005-extend-networking-category
session_id: add-port-forwarding-for-pods
feature_id:
  - pod-port-forwarding
spec_id:
  - port-forwarding-tree-spec
status: pending
---

# Extend NetworkingCategory for Port Forwarding

## Objective

Update the NetworkingCategory class to include the Port Forwarding subcategory alongside the existing Services subcategory.

## Context

The Networking category currently shows only Services. We need to add Port Forwarding as a second subcategory that displays active port forwards.

## Implementation

### File: src/tree/categories/networking/NetworkingCategory.ts

Update `getNetworkingSubcategories()` method:

```typescript
public static getNetworkingSubcategories(resourceData: TreeItemData): ClusterTreeItem[] {
  const subcategories: ClusterTreeItem[] = [];
  
  // Services subcategory (existing)
  subcategories.push(
    TreeItemFactory.createServicesSubcategory(resourceData)
  );
  
  // Port Forwarding subcategory (NEW)
  subcategories.push(
    TreeItemFactory.createPortForwardingSubcategory(resourceData)
  );
  
  return subcategories;
}
```

## Acceptance Criteria

- [ ] Port Forwarding subcategory added after Services
- [ ] Networking category shows both Services and Port Forwarding when expanded
- [ ] No regression in existing Services functionality
- [ ] Tree compiles without errors

## Files Modified

- `src/tree/categories/networking/NetworkingCategory.ts`

## Dependencies

- 001-add-port-forward-tree-item-types
- 002-create-port-forward-manager-singleton

## Estimated Time

5 minutes

