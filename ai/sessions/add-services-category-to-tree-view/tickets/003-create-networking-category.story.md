---
story_id: create-networking-category
session_id: add-services-category-to-tree-view
feature_id: [tree-view-navigation]
spec_id: [services-spec]
status: completed
priority: high
estimated_minutes: 15
---

## Objective

Create `NetworkingCategory` class in `src/tree/categories/networking/NetworkingCategory.ts` following the pattern of `ConfigurationCategory.ts` to handle the parent Networking category structure.

## Context

This class provides the parent category handler that returns subcategories (currently just Services, but designed for future expansion with Ingress, NetworkPolicies, etc.).

## Implementation Steps

1. Create directory `src/tree/categories/networking/`
2. Create new file `src/tree/categories/networking/NetworkingCategory.ts`
3. Import required dependencies:
   - `vscode` from `vscode`
   - `ClusterTreeItem` from `../../ClusterTreeItem`
   - `TreeItemData` from `../../TreeItemTypes`
4. Create `NetworkingCategory` class with static method:
   - `getNetworkingSubcategories(resourceData: TreeItemData): ClusterTreeItem[]`
5. Implement `getNetworkingSubcategories()`:
   - Return array with single subcategory: Services
   - Call private method `createServicesSubcategory(resourceData)`
6. Create private method `createServicesSubcategory()`:
   - Create `ClusterTreeItem` with:
     - Label: `'Services'`
     - Type: `'services'`
     - CollapsibleState: `Collapsed`
     - Icon: `ThemeIcon('globe')` or `ThemeIcon('link')`
     - Tooltip: `'View all services across all namespaces'`
   - Return the configured tree item

## Files Affected

- `src/tree/categories/networking/NetworkingCategory.ts` - New file

## Acceptance Criteria

- [ ] `NetworkingCategory` class exists with `getNetworkingSubcategories()` method
- [ ] Method returns array with Services subcategory
- [ ] Services subcategory has correct label, type, icon, and tooltip
- [ ] Code follows same pattern as `ConfigurationCategory.ts`
- [ ] TypeScript compilation succeeds without errors

## Dependencies

- 001-add-networking-tree-item-types (requires 'services' type)

