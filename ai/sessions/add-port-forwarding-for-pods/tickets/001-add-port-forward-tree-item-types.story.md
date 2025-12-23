---
story_id: 001-add-port-forward-tree-item-types
session_id: add-port-forwarding-for-pods
feature_id:
  - pod-port-forwarding
spec_id:
  - port-forwarding-tree-spec
status: pending
---

# Add Port Forward Tree Item Types

## Objective

Add new tree item types to support Port Forwarding subcategory and individual port forward items in the tree view.

## Context

The port forwarding feature requires two new tree item types:
- `portForwarding`: The subcategory under Networking that contains all active forwards
- `portForward`: Individual port forward items showing local:remote port mappings

## Implementation

### File: src/tree/TreeItemTypes.ts

Add two new types to the `TreeItemType` union:

```typescript
export type TreeItemType = 
  // Existing types...
  | 'networking'           // Already exists
  | 'portForwarding'       // NEW - Port Forwarding subcategory
  | 'portForward';         // NEW - Individual forward item
```

## Acceptance Criteria

- [ ] `portForwarding` type added to TreeItemType union
- [ ] `portForward` type added to TreeItemType union
- [ ] No TypeScript compilation errors
- [ ] File compiles successfully

## Files Modified

- `src/tree/TreeItemTypes.ts`

## Dependencies

None - this is the foundation for all other port forwarding stories.

## Estimated Time

5 minutes

