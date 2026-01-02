---
story_id: 009-update-tree-view-spec-documentation
session_id: replace-compliance-section-with-kube9-operator-sec
feature_id:
  - reports-menu
spec_id:
  - tree-view-spec
status: pending
---

# Update Tree View Spec Documentation

## Objective

Update the tree-view-spec.spec.md documentation to reflect the change from Compliance → Kube9 Operator and Data Collection → Health.

## Dependencies

- Stories 001-008 should be complete (all implementation done)

## Files to Modify

- `ai/specs/tree/tree-view-spec.spec.md`

## Changes

### tree-view-spec.spec.md

1. Update line 59 (Reports structure):
   - Change: "Reports subcategory: Compliance"
   - To: "Reports subcategory: Kube9 Operator"
   - Change: "Compliance report item: Data Collection (placeholder, non-functional)"
   - To: "Kube9 Operator report item: Health"

2. Update TreeItemData interface (around line 123):
   - Change type: `'compliance'` → `'operatorSubcategory'`
   - Change type: `'dataCollection'` → `'operatorHealth'`

3. Update Reports Menu Structure section (around line 150):
   - Change subcategory name from "Compliance" to "Kube9 Operator"
   - Change report item from "Data Collection" to "Health"

4. Update any JSDoc or comments that reference:
   - "Compliance" → "Kube9 Operator"
   - "Data Collection" → "Health Report"

5. Update tooltip examples:
   - Change: "View compliance reports"
   - To: "View Kube9 Operator reports"

## Acceptance Criteria

- [ ] All references to "Compliance" changed to "Kube9 Operator"
- [ ] All references to "Data Collection" changed to "Health"
- [ ] TreeItemData type union updated
- [ ] Reports menu structure diagram/text updated
- [ ] Tooltips and descriptions updated
- [ ] Document still valid markdown

## Estimated Time

15 minutes

## Notes

This is a documentation-only change to keep the spec in sync with implementation. No code changes required.

