---
story_id: 019-implement-drag-drop-cluster-to-folder
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-folder-organization
spec_id:
  - cluster-manager-webview-spec
status: completed
---

# Implement Drag-Drop Cluster to Folder

## Objective

Add drag-and-drop functionality to move clusters into folders with visual feedback (highlights, cursors).

## Context

Drag-and-drop is the primary interaction for organizing clusters. This implements the dragging UI with visual indicators.

See:
- `ai/features/studio/cluster-folder-organization.feature.md` - Drag and drop scenarios, visual feedback
- `ai/specs/studio/cluster-manager-webview-spec.spec.md` - Drag-and-Drop Visual Feedback section

## Acceptance Criteria

1. Make cluster items draggable
2. Show ghost cursor (50% opacity) while dragging
3. Folders highlight with blue border when hovering valid drop target
4. Show invalid drop cursor (no-drop) for invalid targets
5. Drop cluster on folder → send `moveCluster` message
6. Update order to append to folder
7. Handle message in extension

## Files to Modify

- `media/cluster-manager/components/ClusterItem.tsx` (draggable)
- `media/cluster-manager/components/FolderItem.tsx` (drop target)
- `media/cluster-manager/styles.css` (drag feedback styles)
- `src/webviews/ClusterManagerWebview.ts` (moveCluster handler)

## Implementation Notes

Use HTML5 Drag and Drop API:
```tsx
<div
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData('cluster', cluster.contextName);
  }}
>

<div
  onDragOver={(e) => {
    e.preventDefault(); // Allow drop
  }}
  onDrop={(e) => {
    const contextName = e.dataTransfer.getData('cluster');
    // Send moveCluster message
  }}
>
```

## Estimated Time

30 minutes








