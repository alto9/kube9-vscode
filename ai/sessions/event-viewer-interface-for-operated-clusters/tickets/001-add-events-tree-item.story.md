---
session_id: event-viewer-interface-for-operated-clusters
feature_id:
  - event-viewer
spec_id:
  - event-viewer-webview-spec
story_type: code
estimated_minutes: 20
---

# Add Events Tree Item to Cluster View

## Objective

Add an "Events" tree item under each cluster context in the tree view, positioned after the Dashboard item. This tree item will be the entry point to open the Event Viewer webview.

## Acceptance Criteria

- [ ] Events tree item appears under each cluster context
- [ ] Events item is positioned after Dashboard item
- [ ] Events item uses calendar icon (`calendar` ThemeIcon)
- [ ] Events item has tooltip "View cluster events"
- [ ] Events item is clickable (non-collapsible)
- [ ] Events item has command `kube9.openEventViewer` attached
- [ ] Events item passes cluster context data as command argument

## Implementation Steps

### 1. Add factory method in TreeItemFactory

**File**: `src/tree/TreeItemFactory.ts`

Add new static method after `createDashboardCategory`:

```typescript
/**
 * Creates the Events category tree item.
 * Provides access to cluster events from the operator.
 * 
 * @param resourceData Cluster context and cluster information
 * @returns Configured Events category tree item
 */
static createEventsCategory(resourceData: TreeItemData): ClusterTreeItem {
    const item = new ClusterTreeItem(
        'Events',
        'events',
        vscode.TreeItemCollapsibleState.None,
        resourceData
    );
    item.iconPath = new vscode.ThemeIcon('calendar');
    item.tooltip = 'View cluster events';
    
    // Add command to open Event Viewer when clicked
    item.command = {
        command: 'kube9.openEventViewer',
        title: 'Open Event Viewer',
        arguments: [item]
    };
    
    return item;
}
```

### 2. Add Events item to ClusterTreeProvider

**File**: `src/tree/ClusterTreeProvider.ts`

Find the section where Dashboard is added to cluster children (search for `createDashboardCategory`). Add Events item immediately after Dashboard:

```typescript
// Add Dashboard
children.push(TreeItemFactory.createDashboardCategory(resourceData));

// Add Events
children.push(TreeItemFactory.createEventsCategory(resourceData));
```

## Files to Modify

- `src/tree/TreeItemFactory.ts` - Add `createEventsCategory` method
- `src/tree/ClusterTreeProvider.ts` - Add Events item to cluster children

## Testing

Manual test:
1. Open VS Code with extension
2. Expand a cluster in the tree view
3. Verify "Events" item appears after "Dashboard"
4. Verify calendar icon is displayed
5. Hover over Events item and verify tooltip
6. Click Events item (will fail until command is registered - that's expected)

## Dependencies

None - this can be implemented immediately.

## Notes

- The command `kube9.openEventViewer` doesn't exist yet and will be registered in a subsequent story
- Until the command is registered, clicking Events will show an error - this is expected
- The Events item should appear for ALL clusters (both operated and non-operated)

