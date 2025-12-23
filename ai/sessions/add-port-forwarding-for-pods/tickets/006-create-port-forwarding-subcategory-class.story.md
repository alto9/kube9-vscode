---
story_id: 006-create-port-forwarding-subcategory-class
session_id: add-port-forwarding-for-pods
feature_id:
  - pod-port-forwarding
spec_id:
  - port-forwarding-tree-spec
status: pending
---

# Create PortForwardingSubcategory Class

## Objective

Create the PortForwardingSubcategory class that queries PortForwardManager and creates tree items for active port forwards.

## Context

This class is responsible for:
- Querying PortForwardManager for active forwards
- Filtering forwards by current context
- Creating tree items for each forward
- Showing empty state when no forwards active

## Implementation

### File: src/tree/categories/networking/PortForwardingSubcategory.ts (NEW)

```typescript
export class PortForwardingSubcategory {
  public static getPortForwardItems(resourceData: TreeItemData): ClusterTreeItem[] {
    const manager = PortForwardManager.getInstance();
    const forwards = manager.getAllForwards();
    
    // Filter forwards for current context
    const contextForwards = forwards.filter(
      fw => fw.context === resourceData.context
    );
    
    if (contextForwards.length === 0) {
      return [this.createEmptyStateItem(resourceData)];
    }
    
    // Sort forwards by namespace, pod name, local port
    const sorted = this.sortForwards(contextForwards);
    
    // Create tree items
    return sorted.map(forward =>
      TreeItemFactory.createPortForwardItem(forward, resourceData)
    );
  }
  
  private static createEmptyStateItem(resourceData: TreeItemData): ClusterTreeItem {
    const item = new ClusterTreeItem(
      'No active port forwards',
      vscode.TreeItemCollapsibleState.None,
      'emptyState',
      resourceData
    );
    item.iconPath = new vscode.ThemeIcon('info');
    item.description = 'Right-click a running pod to start forwarding';
    item.contextValue = undefined; // No context menu
    return item;
  }
  
  private static sortForwards(forwards: PortForwardInfo[]): PortForwardInfo[] {
    return forwards.sort((a, b) => {
      // Sort by: namespace → pod name → local port
      const nsCompare = a.namespace.localeCompare(b.namespace);
      if (nsCompare !== 0) return nsCompare;
      
      const podCompare = a.podName.localeCompare(b.podName);
      if (podCompare !== 0) return podCompare;
      
      return a.localPort - b.localPort;
    });
  }
}
```

## Acceptance Criteria

- [ ] Class created with `getPortForwardItems()` method
- [ ] Queries PortForwardManager for active forwards
- [ ] Filters forwards by current context
- [ ] Sorts forwards (namespace, pod, port)
- [ ] Shows empty state when no forwards
- [ ] No TypeScript errors

## Files Created

- `src/tree/categories/networking/PortForwardingSubcategory.ts`

## Dependencies

- 002-create-port-forward-manager-singleton
- 005-extend-networking-category

## Estimated Time

20 minutes

