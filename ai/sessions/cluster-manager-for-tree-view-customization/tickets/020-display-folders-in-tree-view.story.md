---
story_id: 020-display-folders-in-tree-view
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-folder-organization
spec_id:
  - cluster-customization-storage-spec
status: completed
---

# Display Folders in Tree View

## Objective

Update ClusterTreeProvider to display folders as expandable tree items containing clusters, matching the folder hierarchy from customizations.

## Context

The tree view needs to show the folder organization users created in Cluster Organizer. This completes the folder feature by reflecting folders in main navigation.

See:
- `ai/features/studio/cluster-folder-organization.feature.md` - Tree view displays folders with clusters
- `ai/specs/studio/cluster-customization-storage-spec.spec.md` - Folder hierarchy structure

## Acceptance Criteria

1. Load folders from customization service
2. Build folder hierarchy (nested folders)
3. Create folder tree items with:
   - Folder icon
   - Collapsible state
   - Children: nested folders + clusters in folder
4. Place clusters in their respective folders
5. Root-level clusters appear without folder
6. Respect cluster order within folders
7. Test that creating folder in Cluster Organizer updates tree

## Files to Modify

- `src/providers/ClusterTreeProvider.ts`

## Implementation Notes

```typescript
getChildren(element?: TreeItem): TreeItem[] {
  if (!element) {
    // Root level: folders + ungrouped clusters
    return [...this.buildFolderItems(null), ...this.buildClustersWithoutFolder()];
  }
  
  if (element.type === 'folder') {
    // Folder contents: child folders + clusters in folder
    return [
      ...this.buildFolderItems(element.folderId),
      ...this.buildClustersInFolder(element.folderId)
    ];
  }
}
```

Folder tree item:
```typescript
const folderItem = new vscode.TreeItem(
  folder.name,
  folder.expanded 
    ? vscode.TreeItemCollapsibleState.Expanded 
    : vscode.TreeItemCollapsibleState.Collapsed
);
folderItem.iconPath = new vscode.ThemeIcon('folder');
```

## Estimated Time

30 minutes

