---
story_id: 002-rename-compliance-to-operator-subcategory
session_id: replace-compliance-section-with-kube9-operator-sec
feature_id:
  - reports-menu
spec_id:
  - tree-view-spec
  - operator-health-report-spec
status: pending
---

# Rename ComplianceSubcategory to OperatorSubcategory

## Objective

Rename the ComplianceSubcategory class and file to OperatorSubcategory, updating its implementation to display "Kube9 Operator" with a "Health" report item instead of "Data Collection".

## Dependencies

- Story 001 must be complete (types updated)

## Files to Modify

- Rename: `src/tree/categories/reports/ComplianceSubcategory.ts` → `OperatorSubcategory.ts`
- Update imports in: `src/tree/ClusterTreeProvider.ts`

## Changes

### Rename and Update OperatorSubcategory.ts

1. Rename class from `ComplianceSubcategory` to `OperatorSubcategory`
2. Update JSDoc comments to reference "Kube9 Operator"
3. Rename method: `getComplianceReportItems()` → `getOperatorReportItems()`
4. Rename private method: `createDataCollectionReport()` → `createHealthReport()`
5. Update the Health report item:
   - Label: 'Health'
   - Type: 'operatorHealth' (use updated type from story 001)
   - Icon: `new vscode.ThemeIcon('pulse')`
   - Tooltip: 'View Kube9 Operator health and status'
   - Command: 'kube9.openOperatorHealthReport' (will be registered in story 004)

### ClusterTreeProvider.ts

1. Update import statement:
   ```typescript
   import { OperatorSubcategory } from './categories/reports/OperatorSubcategory';
   ```

2. Update case statement (around line 643):
   - Change `case 'compliance':` to `case 'operatorSubcategory':`
   - Change method call to: `OperatorSubcategory.getOperatorReportItems(element.data)`

3. Update type check (around line 387):
   - Change `type === 'compliance'` to `type === 'operatorSubcategory'`

## Acceptance Criteria

- [ ] File renamed to `OperatorSubcategory.ts`
- [ ] Class renamed to `OperatorSubcategory`
- [ ] Method `getOperatorReportItems()` returns array with Health report item
- [ ] Health report item uses 'pulse' icon
- [ ] Health report item type is 'operatorHealth'
- [ ] ClusterTreeProvider imports and uses OperatorSubcategory correctly
- [ ] TypeScript compiles without errors
- [ ] No references to old ComplianceSubcategory remain

## Estimated Time

20 minutes

## Notes

The command registration for 'kube9.openOperatorHealthReport' will be added in story 004, so clicking the Health item won't work yet.

