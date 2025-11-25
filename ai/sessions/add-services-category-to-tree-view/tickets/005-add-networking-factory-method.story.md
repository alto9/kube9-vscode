---
story_id: add-networking-factory-method
session_id: add-services-category-to-tree-view
feature_id: [tree-view-navigation]
spec_id: [services-spec]
status: pending
priority: high
estimated_minutes: 10
---

## Objective

Add `createNetworkingCategory()` factory method to `TreeItemFactory.ts` to create the Networking category tree item.

## Context

This factory method follows the same pattern as other category factory methods (e.g., `createNodesCategory()`, `createWorkloadsCategory()`) and provides consistent configuration for the Networking category.

## Implementation Steps

1. Open `src/tree/TreeItemFactory.ts`
2. Add static method `createNetworkingCategory(resourceData: TreeItemData): ClusterTreeItem`:
   - Create `ClusterTreeItem` with:
     - Label: `'Networking'`
     - Type: `'networking'`
     - CollapsibleState: `Collapsed`
     - ResourceData: passed parameter
   - Set icon: `new vscode.ThemeIcon('globe')` or `'link'`
   - Set tooltip: `'View networking resources (Services, Ingress, etc.)'`
   - Return the configured tree item
3. Follow the same pattern as other category factory methods (e.g., `createNodesCategory()`)

## Files Affected

- `src/tree/TreeItemFactory.ts` - Add createNetworkingCategory method

## Acceptance Criteria

- [ ] `createNetworkingCategory()` method exists in `TreeItemFactory`
- [ ] Method returns properly configured `ClusterTreeItem` with type `'networking'`
- [ ] Networking category has appropriate icon and tooltip
- [ ] Code follows the same pattern as other category factory methods
- [ ] TypeScript compilation succeeds without errors

## Dependencies

- 001-add-networking-tree-item-types (requires 'networking' type)

