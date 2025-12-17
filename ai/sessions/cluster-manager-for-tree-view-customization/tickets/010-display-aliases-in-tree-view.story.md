---
story_id: 010-display-aliases-in-tree-view
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-alias-management
spec_id:
  - cluster-customization-storage-spec
status: completed
---

# Display Aliases in Tree View

## Objective

Update ClusterTreeProvider to display cluster aliases instead of context names when aliases exist, with tooltip showing original context name.

## Context

The tree view needs to show aliases so users see their friendly names. This completes the alias management feature by reflecting aliases in the main navigation.

See:
- `ai/features/studio/cluster-alias-management.feature.md` - Viewing original context name in tree view
- `ai/specs/studio/cluster-customization-storage-spec.spec.md` - getClusterConfig()

## Acceptance Criteria

1. Inject ClusterCustomizationService into ClusterTreeProvider
2. Subscribe to `onDidChangeCustomizations` event
3. When building cluster tree items, call `getClusterConfig(contextName)`
4. Display alias if present, otherwise use context name
5. Set tooltip to show original context name when alias exists
6. Refresh tree view when customizations change
7. Test that setting alias in Cluster Organizer updates tree immediately

## Files to Modify

- `src/providers/ClusterTreeProvider.ts`
- Update constructor to accept ClusterCustomizationService
- `src/extension.ts` (wire up service to tree provider)

## Implementation Notes

```typescript
const customization = this.customizationService.getClusterConfig(contextName);
const displayName = customization.alias || contextName;
const tooltip = customization.alias 
  ? `Context: ${contextName}` 
  : undefined;

treeItem.label = displayName;
treeItem.tooltip = tooltip;
```

Subscribe to changes:
```typescript
this.customizationService.onDidChangeCustomizations(() => {
  this.refresh();
});
```

## Estimated Time

25 minutes

