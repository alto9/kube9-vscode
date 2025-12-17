---
story_id: 018-add-new-folder-button-and-dialog
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-folder-organization
spec_id:
  - cluster-manager-webview-spec
status: completed
---

# Add New Folder Button and Dialog

## Objective

Add "New Folder" button to toolbar that opens a dialog for creating folders, with name validation and parent selection.

## Context

Users need UI to create folders. This adds the folder creation dialog with validation and messaging to the service.

See:
- `ai/features/studio/cluster-folder-organization.feature.md` - Creating folders, validation scenarios
- `ai/specs/studio/cluster-manager-webview-spec.spec.md` - Create Folder message

## Acceptance Criteria

1. Add "New Folder" button to toolbar
2. Click button → show folder creation dialog
3. Dialog fields:
   - Folder name input (required)
   - Parent folder selector (optional, defaults to root)
4. Validate name non-empty
5. Send `createFolder` message to extension
6. Handle validation errors from extension
7. Close dialog and refresh on success

## Files to Create/Modify

- `media/cluster-manager/components/NewFolderDialog.tsx` (new)
- `media/cluster-manager/components/Toolbar.tsx` (add button)
- `src/webviews/ClusterManagerWebview.ts` (add message handler)

## Implementation Notes

```typescript
// Message
{ 
  type: 'createFolder', 
  data: { name: string, parentId: string | null } 
}

// In webview handler
case 'createFolder':
  try {
    await this.customizationService.createFolder(
      message.data.name, 
      message.data.parentId
    );
    // Service emits event, triggers customizationsUpdated
  } catch (error) {
    // Send error back to webview
    this.panel.webview.postMessage({
      type: 'error',
      message: error.message
    });
  }
  break;
```

## Estimated Time

30 minutes







