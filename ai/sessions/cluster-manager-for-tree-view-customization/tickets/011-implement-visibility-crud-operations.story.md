---
story_id: 011-implement-visibility-crud-operations
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-visibility-control
spec_id:
  - cluster-customization-storage-spec
status: completed
---

# Implement Visibility CRUD Operations in Service

## Objective

Add `setVisibility()` method to ClusterCustomizationService for hiding and showing clusters with automatic persistence.

## Context

Users need to hide unused clusters from the tree view. The service layer handles visibility persistence logic.

See:
- `ai/specs/studio/cluster-customization-storage-spec.spec.md` - setVisibility() method
- `ai/features/studio/cluster-visibility-control.feature.md` - Hiding/showing clusters

## Acceptance Criteria

1. Add `setVisibility(contextName: string, hidden: boolean)` method
2. Get or create cluster config for the context
3. Update `hidden` field
4. Save to Global State
5. Emit customization change event
6. Add unit tests

## Files to Modify

- `src/services/ClusterCustomizationService.ts`
- `tests/unit/services/ClusterCustomizationService.test.ts`

## Implementation Notes

```typescript
async setVisibility(contextName: string, hidden: boolean): Promise<void> {
  const config = await this.getConfiguration();
  
  if (!config.clusters[contextName]) {
    config.clusters[contextName] = { 
      alias: null, 
      hidden: false, 
      folderId: null, 
      order: 0 
    };
  }
  
  config.clusters[contextName].hidden = hidden;
  await this.updateConfiguration(config);
}
```

Simple method, should be quick to implement.

## Estimated Time

15 minutes









