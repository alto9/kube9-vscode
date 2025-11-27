---
story_id: integrate-networking-in-tree-provider
session_id: add-services-category-to-tree-view
feature_id: [tree-view-navigation]
spec_id: [tree-view-spec, services-spec]
status: completed
priority: high
estimated_minutes: 20
---

## Objective

Integrate Networking category into `ClusterTreeProvider.ts` by adding it to the categories list and handling it in `getCategoryChildren()` and `isCategoryType()` methods.

## Context

This story wires up the Networking category to appear in the tree view and handles expansion to show Services subcategory and individual services.

## Implementation Steps

1. Open `src/tree/ClusterTreeProvider.ts`
2. Import `NetworkingCategory` and `ServicesSubcategory`:
   - `import { NetworkingCategory } from './categories/networking/NetworkingCategory';`
   - `import { ServicesSubcategory } from './categories/networking/ServicesSubcategory';`
3. Update `getCategories()` method:
   - Add `TreeItemFactory.createNetworkingCategory(resourceData)` to the categories array
   - Position it after Storage and before Helm (as specified in spec)
4. Update `getCategoryChildren()` method:
   - Add case for `'networking'`:
     ```typescript
     case 'networking':
       return NetworkingCategory.getNetworkingSubcategories(
         categoryElement.resourceData
       );
     ```
   - Add case for `'services'`:
     ```typescript
     case 'services':
       return ServicesSubcategory.getServiceItems(
         categoryElement.resourceData,
         this.kubeconfig.filePath,
         (error, clusterName) => this.handleKubectlError(error, clusterName)
       );
     ```
5. Update `isCategoryType()` method:
   - Add `type === 'networking'` check
   - Add `type === 'services'` check

## Files Affected

- `src/tree/ClusterTreeProvider.ts` - Add Networking category integration

## Acceptance Criteria

- [ ] Networking category appears in tree view after Storage and before Helm
- [ ] Expanding Networking category shows Services subcategory
- [ ] Expanding Services subcategory shows list of services
- [ ] Services are displayed in "namespace/name" format with type in description
- [ ] Error handling works correctly for kubectl failures
- [ ] TypeScript compilation succeeds without errors

## Dependencies

- 001-add-networking-tree-item-types
- 003-create-networking-category
- 004-create-services-subcategory
- 005-add-networking-factory-method

