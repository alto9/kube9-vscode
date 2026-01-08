---
story_id: 016-implement-move-cluster-operation
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-folder-organization
spec_id:
  - cluster-customization-storage-spec
status: completed
---

# Implement Move Cluster Operation in Service

## Objective

Add `moveCluster()` method to ClusterCustomizationService for moving clusters to different folders or changing display order.

## Context

Users drag clusters into folders or reorder them. The service layer handles the move logic with order recalculation.

See:
- `ai/specs/studio/cluster-customization-storage-spec.spec.md` - moveCluster() method
- `ai/features/studio/cluster-folder-organization.feature.md` - Drag and drop scenarios

## Acceptance Criteria

1. Add `moveCluster(contextName: string, folderId: string | null, order: number)` method
2. Get or create cluster config
3. Validate folder exists (if not null)
4. Update folderId and order
5. Reorder other clusters in folder if necessary
6. Save and emit event
7. Add unit tests

## Files to Modify

- `src/services/ClusterCustomizationService.ts`
- `tests/unit/services/ClusterCustomizationService.test.ts`

## Implementation Notes

```typescript
async moveCluster(
  contextName: string, 
  folderId: string | null, 
  order: number
): Promise<void> {
  const config = await this.getConfiguration();
  
  // Validate folder exists
  if (folderId && !config.folders.find(f => f.id === folderId)) {
    throw new Error(`Folder ${folderId} not found`);
  }
  
  // Update cluster config
  if (!config.clusters[contextName]) {
    config.clusters[contextName] = { 
      alias: null, 
      hidden: false, 
      folderId, 
      order 
    };
  } else {
    config.clusters[contextName].folderId = folderId;
    config.clusters[contextName].order = order;
  }
  
  await this.updateConfiguration(config);
}
```

## Estimated Time

20 minutes









