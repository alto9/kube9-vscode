---
story_id: 007-display-cluster-list-in-webview
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-manager-webview
spec_id:
  - cluster-manager-webview-spec
status: pending
---

# Display Cluster List in Webview

## Objective

Render the cluster list in the React webview, displaying cluster names (context names for now), active badges, and basic styling.

## Context

Users need to see their clusters displayed in the Cluster Manager. This implements the basic cluster list UI without customizations yet.

See:
- `ai/features/studio/cluster-manager-webview.feature.md` - Cluster Manager displays all clusters, shows current active cluster

## Acceptance Criteria

1. Handle `initialize` message in React app
2. Store clusters array and customizations in React state
3. Render cluster list with:
   - Cluster context name
   - "Active" badge if `isActive === true`
   - Basic list styling
4. Display empty state if no clusters: "No clusters found in kubeconfig"
5. Show cluster count in footer (e.g., "10 clusters")

## Files to Modify

- `media/cluster-manager/index.tsx`
- `media/cluster-manager/components/ClusterList.tsx` (new)
- `media/cluster-manager/components/ClusterItem.tsx` (new)

## Implementation Notes

```tsx
<div className="cluster-list">
  {clusters.map(cluster => (
    <ClusterItem 
      key={cluster.contextName}
      cluster={cluster}
      customization={customizations.clusters[cluster.contextName]}
    />
  ))}
</div>
```

Active badge styling should use accent color to stand out.

## Estimated Time

25 minutes

