---
story_id: 022-implement-import-export-configuration
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-manager-webview
spec_id:
  - cluster-customization-storage-spec
status: completed
---

# Implement Import/Export Configuration

## Objective

Add export and import methods to ClusterCustomizationService, and add Import/Export buttons to webview toolbar with file dialogs.

## Context

Users need to backup configurations and share with team. This adds the import/export functionality with JSON file handling.

See:
- `ai/specs/studio/cluster-customization-storage-spec.spec.md` - exportConfiguration(), importConfiguration()
- `ai/features/studio/cluster-alias-management.feature.md` - Importing/exporting scenarios

## Acceptance Criteria

1. Add `exportConfiguration()` method to service:
   - Return pretty-printed JSON string
2. Add `importConfiguration(jsonString)` method:
   - Parse JSON
   - Validate schema
   - Merge with existing config (imported takes precedence)
   - Save and notify
3. Add "Export" button to toolbar → trigger file save dialog
4. Add "Import" button to toolbar → trigger file open dialog
5. Handle parse/validation errors gracefully

## Files to Modify

- `src/services/ClusterCustomizationService.ts`
- `media/cluster-manager/components/Toolbar.tsx`
- `src/webviews/ClusterManagerWebview.ts` (add message handlers)

## Implementation Notes

```typescript
// Export
async exportConfiguration(): Promise<string> {
  const config = await this.getConfiguration();
  return JSON.stringify(config, null, 2);
}

// In webview - use VS Code save/open dialog via extension
vscode.postMessage({ type: 'exportConfiguration' });

// Extension uses:
const uri = await vscode.window.showSaveDialog({
  filters: { 'JSON': ['json'] }
});
```

## Estimated Time

30 minutes









