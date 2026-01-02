---
story_id: 001-update-tree-types-and-interfaces
session_id: replace-compliance-section-with-kube9-operator-sec
feature_id:
  - reports-menu
spec_id:
  - tree-view-spec
status: completed
---

# Update Tree Types and Interfaces for Kube9 Operator Section

## Objective

Update TypeScript types and interfaces to replace 'compliance' with 'operatorSubcategory' and 'dataCollection' with 'operatorHealth' in tree item types.

## Why This First

This establishes the type system foundation that all subsequent stories depend on. Changing types first prevents cascading type errors.

## Files to Modify

- `src/tree/TreeItemTypes.ts`
- `src/tree/ClusterTreeItem.ts`

## Changes

### TreeItemTypes.ts

1. Update the `TreeItemType` union type:
   - Replace `'compliance'` with `'operatorSubcategory'`
   - Replace `'dataCollection'` with `'operatorHealth'`

2. Update JSDoc comments:
   - Change "Compliance subcategory" references to "Kube9 Operator subcategory"
   - Change "data collection report" references to "operator health report"

### ClusterTreeItem.ts

1. Update the `validTypes` array (around line 142):
   - Replace `'compliance'` with `'operatorSubcategory'`
   - Replace `'dataCollection'` with `'operatorHealth'`

## Acceptance Criteria

- [ ] TypeScript compiles without errors
- [ ] `TreeItemType` union includes `'operatorSubcategory'` and `'operatorHealth'`
- [ ] `TreeItemType` no longer includes `'compliance'` or `'dataCollection'`
- [ ] `validTypes` array in ClusterTreeItem updated accordingly
- [ ] All JSDoc comments updated to reflect new naming

## Estimated Time

15 minutes

## Notes

This is a pure refactoring change focused on type definitions. No runtime behavior changes expected.

