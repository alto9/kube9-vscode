---
story_id: update-service-kind-mapping
session_id: add-services-category-to-tree-view
feature_id: [tree-view-navigation]
spec_id: [services-spec]
status: pending
priority: medium
estimated_minutes: 10
---

## Objective

Verify and update Service kind mapping in `extension.ts` helper functions to ensure context menu actions work correctly for Services.

## Context

The `extractKindFromContextValue()` and `getApiVersionForKind()` functions need to properly handle Service resources for context menu actions (View YAML, Edit, Delete, etc.) to work.

## Implementation Steps

1. Open `src/extension.ts`
2. Check `extractKindFromContextValue()` function:
   - Verify it correctly extracts 'Service' from 'resource:Service' context value
   - Current implementation should already handle this (splits on ':' and takes second part)
   - If needed, add explicit mapping for Service
3. Check `getApiVersionForKind()` function:
   - Verify 'Service' maps to 'v1' in the apiVersionMap
   - If not present, add: `'Service': 'v1'`
4. Test that Service resources can be opened in YAML editor:
   - Context menu "View YAML" should work
   - YAML editor should display Service resource correctly

## Files Affected

- `src/extension.ts` - Verify/update Service kind mappings

## Acceptance Criteria

- [ ] `extractKindFromContextValue()` correctly extracts 'Service' from 'resource:Service'
- [ ] `getApiVersionForKind('Service')` returns 'v1'
- [ ] Context menu "View YAML" works for Service resources
- [ ] YAML editor opens and displays Service YAML correctly
- [ ] TypeScript compilation succeeds without errors

## Dependencies

- 004-create-services-subcategory (services must exist with contextValue='resource:Service')
- Existing YAML editor implementation

## Notes

Based on code review, `getApiVersionForKind()` already includes `'Service': 'v1'` mapping. This story verifies it works correctly and adds explicit handling if needed.

