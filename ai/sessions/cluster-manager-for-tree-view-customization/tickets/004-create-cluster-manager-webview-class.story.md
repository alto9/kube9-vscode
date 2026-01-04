---
story_id: 004-create-cluster-manager-webview-class
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-manager-webview
spec_id:
  - cluster-manager-webview-spec
status: completed
---

# Create ClusterManagerWebview Class

## Objective

Create the `ClusterManagerWebview` class that manages the webview panel with singleton pattern, HTML scaffolding, and basic message protocol setup.

## Context

The ClusterManagerWebview wraps VS Code's webview panel and handles message passing between the extension and the React UI. This establishes the foundation for all webview interactions.

See:
- `ai/specs/studio/cluster-manager-webview-spec.spec.md` - Webview Panel Configuration, Singleton Pattern
- `ai/features/studio/cluster-manager-webview.feature.md` - Only one Cluster Organizer can be open

## Acceptance Criteria

1. Create `src/webviews/ClusterManagerWebview.ts` file
2. Implement singleton pattern with static `currentPanel` property
3. Implement `createOrShow()` static method (reveal if exists, create if not)
4. Create webview panel with:
   - viewType: `kube9.clusterManager`
   - title: "Cluster Organizer"
   - enableScripts: true
   - retainContextWhenHidden: true
5. Load basic HTML with placeholder content ("Cluster Organizer - Under Construction")
6. Set up message handler (listener only, no messages yet)
7. Update command handler in extension.ts to call `ClusterManagerWebview.createOrShow()`

## Files to Create/Modify

- `src/webviews/ClusterManagerWebview.ts` (new)
- `src/webviews/index.ts` (export)
- `src/extension.ts` (update command handler)

## Implementation Notes

```typescript
class ClusterManagerWebview {
  private static currentPanel: ClusterManagerWebview | undefined;
  
  public static createOrShow(extensionUri: vscode.Uri): ClusterManagerWebview {
    if (ClusterManagerWebview.currentPanel) {
      ClusterManagerWebview.currentPanel.panel.reveal();
      return ClusterManagerWebview.currentPanel;
    }
    return new ClusterManagerWebview(extensionUri);
  }
  
  private constructor(extensionUri: vscode.Uri) {
    // Create panel
    // Set up dispose handler to clear currentPanel
  }
}
```

## Estimated Time

30 minutes








