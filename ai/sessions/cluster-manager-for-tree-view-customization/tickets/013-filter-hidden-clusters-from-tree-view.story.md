---
story_id: 013-filter-hidden-clusters-from-tree-view
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-visibility-control
spec_id:
  - cluster-customization-storage-spec
status: completed
---

# Filter Hidden Clusters from Tree View

## Objective

Update ClusterTreeProvider to exclude hidden clusters from the tree view while keeping them accessible in the Cluster Organizer.

## Context

Hidden clusters should not appear in the tree view but remain accessible in the Cluster Organizer. This implements the core visibility filtering logic.

See:
- `ai/features/studio/cluster-visibility-control.feature.md` - Hiding a cluster from tree view
- `ai/specs/studio/cluster-customization-storage-spec.spec.md` - getClusterConfig()

## Acceptance Criteria

1. When building cluster list in tree provider, check customization for each cluster
2. Skip clusters where `customization.hidden === true`
3. Ensure tree refreshes when visibility changes
4. Test that toggling visibility in Cluster Organizer updates tree immediately

## Files to Modify

- `src/providers/ClusterTreeProvider.ts`

## Implementation Notes

```typescript
const clusters = await this.kubeconfigService.getClusters();
const visibleClusters = clusters.filter(cluster => {
  const customization = this.customizationService.getClusterConfig(cluster.contextName);
  return !customization.hidden;
});

return visibleClusters.map(cluster => this.createClusterTreeItem(cluster));
```

Simple filter logic. Tree already refreshes on customization events from previous story.

## Estimated Time

15 minutes







