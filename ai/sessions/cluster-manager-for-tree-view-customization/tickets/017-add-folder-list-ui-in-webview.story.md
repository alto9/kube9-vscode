---
story_id: 017-add-folder-list-ui-in-webview
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-folder-organization
spec_id:
  - cluster-manager-webview-spec
status: pending
---

# Add Folder List UI in Webview

## Objective

Display folders in the webview with expand/collapse functionality, nesting indicators (indentation), and folder icons.

## Context

Users need to see folders in the Cluster Manager. This adds the folder display UI with hierarchical visualization.

See:
- `ai/features/studio/cluster-folder-organization.feature.md` - Expanding/collapsing folders, creating nested structure
- `ai/specs/studio/cluster-manager-webview-spec.spec.md` - FolderItem component

## Acceptance Criteria

1. Create `FolderItem` component
2. Display folders from customizations
3. Show expand/collapse arrow icons (▶ collapsed, ▼ expanded)
4. Indent nested folders visually (e.g., 20px per level)
5. Show clusters within folders (indented under folder)
6. Click folder name to toggle expand/collapse
7. Persist expansion state (already in config)

## Files to Create/Modify

- `media/cluster-manager/components/FolderItem.tsx` (new)
- `media/cluster-manager/components/ClusterList.tsx` (reorganize to show folders + clusters)
- `media/cluster-manager/styles.css`

## Implementation Notes

Build folder hierarchy from flat array:
```typescript
const buildFolderTree = (folders: FolderConfig[]) => {
  const rootFolders = folders.filter(f => f.parentId === null);
  const getChildren = (parentId: string) => 
    folders.filter(f => f.parentId === parentId);
  
  // Recursive rendering
};
```

Apply indentation:
```tsx
<div style={{ paddingLeft: `${level * 20}px` }}>
```

## Estimated Time

30 minutes

