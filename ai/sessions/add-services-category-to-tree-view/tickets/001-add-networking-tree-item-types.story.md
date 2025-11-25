---
story_id: add-networking-tree-item-types
session_id: add-services-category-to-tree-view
feature_id: [tree-view-navigation]
spec_id: [tree-view-spec, services-spec]
status: pending
priority: high
estimated_minutes: 15
---

## Objective

Add new tree item types for Networking category, Services subcategory, and individual service items to `TreeItemTypes.ts`.

## Context

This is the foundation story that adds the type definitions needed for the Networking category structure. All subsequent stories depend on these types being available.

## Implementation Steps

1. Open `src/tree/TreeItemTypes.ts`
2. Add three new types to the `TreeItemType` union:
   - `'networking'` - Networking category (root-level)
   - `'services'` - Services subcategory (under Networking)
   - `'service'` - Individual service item (under Services)
3. Update the documentation comments to include these new types in the appropriate sections:
   - Add `networking` to "Category types" section
   - Add `services` to "Category types" section (as a subcategory)
   - Add `service` to "Individual resource types" section

## Files Affected

- `src/tree/TreeItemTypes.ts` - Add new types to TreeItemType union

## Acceptance Criteria

- [ ] `'networking'` type added to TreeItemType union
- [ ] `'services'` type added to TreeItemType union
- [ ] `'service'` type added to TreeItemType union
- [ ] Documentation comments updated to reflect new types
- [ ] TypeScript compilation succeeds without errors

## Dependencies

None - this is the foundation story

