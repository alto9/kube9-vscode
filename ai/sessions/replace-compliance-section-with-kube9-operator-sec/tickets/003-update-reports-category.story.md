---
story_id: 003-update-reports-category
session_id: replace-compliance-section-with-kube9-operator-sec
feature_id:
  - reports-menu
spec_id:
  - tree-view-spec
status: completed
---

# Update ReportsCategory to Use Kube9 Operator Subcategory

## Objective

Update ReportsCategory.ts to create "Kube9 Operator" subcategory instead of "Compliance", using updated types and method names.

## Dependencies

- Story 001 must be complete (types updated)
- Story 002 must be complete (OperatorSubcategory exists)

## Files to Modify

- `src/tree/categories/ReportsCategory.ts`

## Changes

### ReportsCategory.ts

1. Update method name:
   - Rename: `createComplianceSubcategory()` → `createOperatorSubcategory()`

2. Update the tree item creation:
   - Label: 'Kube9 Operator'
   - Type: 'operatorSubcategory' (use updated type from story 001)
   - Icon: `new vscode.ThemeIcon('shield')` (keep existing)
   - Tooltip: 'View Kube9 Operator reports'

3. Update JSDoc comments:
   - Replace "Compliance" references with "Kube9 Operator"

4. Update array return:
   ```typescript
   return [
       this.createOperatorSubcategory(resourceData)
   ];
   ```

## Acceptance Criteria

- [ ] Method renamed to `createOperatorSubcategory()`
- [ ] Tree item label is "Kube9 Operator"
- [ ] Tree item type is 'operatorSubcategory'
- [ ] Icon is 'shield'
- [ ] Tooltip references "Kube9 Operator"
- [ ] JSDoc comments updated
- [ ] TypeScript compiles without errors

## Estimated Time

10 minutes

## Notes

This is a straightforward rename and update. The method is called by ClusterTreeProvider which was already updated in story 002.

