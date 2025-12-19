---
story_id: 008-update-events-category-launch-webview
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: pending
feature_id:
  - event-viewer-panel
spec_id:
  - event-viewer-panel-spec
---

# Update EventsCategory to Launch Webview

## Objective

Update `EventsCategory` tree item to open Events Viewer webview instead of expanding tree with child nodes.

## Context

Currently EventsCategory is collapsible and shows EventTreeItem children. Should become a command that opens webview panel.

## Acceptance Criteria

- [ ] Change `TreeItemCollapsibleState` from `Collapsed` to `None`
- [ ] Add `command` property to execute `kube9.events.openViewer`
- [ ] Pass `this` as argument to command
- [ ] Keep icon, description, tooltip, contextValue unchanged
- [ ] No children should be shown (webview replaces tree display)

## Files Affected

- **Modify**: `src/tree/categories/EventsCategory.ts`

## Implementation Notes

**Before**:
```typescript
export class EventsCategory extends ClusterTreeItem {
    constructor(public readonly clusterElement: ClusterTreeItem) {
        super('Events', 'events', vscode.TreeItemCollapsibleState.Collapsed, clusterElement.resourceData);
        this.contextValue = 'kube9.events.category';
        this.iconPath = new vscode.ThemeIcon('output');
        // No command - expands to show children
    }
}
```

**After**:
```typescript
export class EventsCategory extends ClusterTreeItem {
    constructor(public readonly clusterElement: ClusterTreeItem) {
        super('Events', 'events', vscode.TreeItemCollapsibleState.None, clusterElement.resourceData);
        this.contextValue = 'kube9.events.category';
        this.iconPath = new vscode.ThemeIcon('output');
        this.description = 'Cluster Events';
        this.tooltip = 'Kubernetes events for troubleshooting';
        
        // Set command to open Events Viewer webview
        this.command = {
            command: 'kube9.events.openViewer',
            title: 'Open Events Viewer',
            arguments: [this]
        };
    }
}
```

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-panel-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/event-viewer-panel.feature.md`

## Estimated Time

10 minutes

