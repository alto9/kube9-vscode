---
story_id: 023-add-status-footer-with-counts
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-manager-webview
  - cluster-visibility-control
spec_id:
  - cluster-manager-webview-spec
status: completed
---

# Add Status Footer with Counts

## Objective

Add footer to Cluster Organizer webview displaying cluster counts (visible/total, hidden count) with clickable hidden count to filter view.

## Context

Users need to see at a glance how many clusters are visible vs hidden. The footer provides this summary information.

See:
- `ai/features/studio/cluster-manager-webview.feature.md` - Cluster Organizer shows status footer
- `ai/features/studio/cluster-visibility-control.feature.md` - Hidden cluster count, filtering

## Acceptance Criteria

1. Add footer component below cluster list
2. Display counts:
   - "X visible / Y total clusters"
   - "Z hidden" (clickable)
3. Calculate counts from current cluster list and customizations
4. Click "Z hidden" → filter to show only hidden clusters
5. Show "Show All" button when filtered
6. Update counts when customizations change

## Files to Create/Modify

- `media/cluster-manager/components/Footer.tsx` (new)
- `media/cluster-manager/index.tsx` (add footer, filter state)

## Implementation Notes

```tsx
const visibleCount = clusters.filter(c => {
  const customization = customizations.clusters[c.contextName];
  return !customization?.hidden;
}).length;

const hiddenCount = clusters.filter(c => {
  const customization = customizations.clusters[c.contextName];
  return customization?.hidden === true;
}).length;

<footer>
  {visibleCount} visible / {clusters.length} total clusters
  {hiddenCount > 0 && (
    <span onClick={() => setShowHiddenOnly(true)}>
      {hiddenCount} hidden
    </span>
  )}
</footer>
```

## Estimated Time

20 minutes









