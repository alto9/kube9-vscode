---
story_id: 021-add-folder-context-menu-and-rename-delete
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-folder-organization
spec_id:
  - cluster-manager-webview-spec
status: pending
---

# Add Folder Context Menu and Rename/Delete

## Objective

Add right-click context menu to folders in webview with rename and delete operations including confirmation dialogs.

## Context

Users need to rename and delete folders. This adds the context menu UI and wires it to the service operations.

See:
- `ai/features/studio/cluster-folder-organization.feature.md` - Renaming folder, deleting folder scenarios
- `ai/specs/studio/cluster-manager-webview-spec.spec.md` - FolderItem interactions

## Acceptance Criteria

1. Right-click folder → show context menu:
   - Rename Folder
   - New Subfolder
   - Delete Folder
2. Rename Folder → inline edit mode (similar to alias editing)
3. Delete Folder → confirmation dialog if contains clusters:
   - "Move to Root" button
   - "Delete All" button (removes cluster customizations)
4. Send `renameFolder` and `deleteFolder` messages
5. Handle messages in extension

## Files to Modify

- `media/cluster-manager/components/FolderItem.tsx`
- `media/cluster-manager/components/DeleteFolderDialog.tsx` (new)
- `src/webviews/ClusterManagerWebview.ts` (add message handlers)

## Implementation Notes

```typescript
// Messages
{ type: 'renameFolder', data: { folderId: string, newName: string } }
{ type: 'deleteFolder', data: { folderId: string, moveToRoot: boolean } }

// Context menu can use simple HTML context menu or custom component
```

Delete confirmation should count clusters in folder for display.

## Estimated Time

30 minutes

