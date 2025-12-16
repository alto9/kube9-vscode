---
story_id: 025-add-keyboard-accessibility
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-manager-webview
spec_id:
  - cluster-manager-webview-spec
status: pending
---

# Add Keyboard Accessibility

## Objective

Add keyboard navigation support to Cluster Manager webview with proper tab order, focus indicators, and keyboard shortcuts.

## Context

Users should be able to navigate the entire Cluster Manager with keyboard. This adds ARIA labels and keyboard event handlers.

See:
- `ai/features/studio/cluster-manager-webview.feature.md` - Keyboard navigation scenario
- `ai/specs/studio/cluster-manager-webview-spec.spec.md` - Accessibility section

## Acceptance Criteria

1. Add ARIA labels to all interactive elements
2. Implement proper tab order: Toolbar → Search → Folders → Clusters
3. Add visible focus indicators (2px outline)
4. Keyboard shortcuts:
   - Enter on folder: toggle expand/collapse
   - Enter on cluster: start alias edit
   - Delete on folder: open delete dialog
   - Escape: cancel inline edits
5. Add role="tree" and role="treeitem" to folder/cluster structure
6. Test keyboard-only navigation works end-to-end

## Files to Modify

- `media/cluster-manager/components/FolderItem.tsx`
- `media/cluster-manager/components/ClusterItem.tsx`
- `media/cluster-manager/styles.css` (focus styles)

## Implementation Notes

```tsx
<div
  role="tree"
  aria-label="Cluster organization tree"
>
  <div
    role="treeitem"
    aria-expanded={expanded}
    aria-label={folder.name}
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter') toggleExpand();
      if (e.key === 'Delete') openDeleteDialog();
    }}
  >
```

Focus styles:
```css
*:focus {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 2px;
}
```

## Estimated Time

25 minutes

