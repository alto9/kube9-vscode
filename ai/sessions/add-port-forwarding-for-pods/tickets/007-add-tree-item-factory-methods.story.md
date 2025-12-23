---
story_id: 007-add-tree-item-factory-methods
session_id: add-port-forwarding-for-pods
feature_id:
  - pod-port-forwarding
spec_id:
  - port-forwarding-tree-spec
status: pending
---

# Add TreeItemFactory Methods for Port Forwarding

## Objective

Add factory methods to TreeItemFactory for creating Port Forwarding subcategory and individual port forward tree items.

## Context

TreeItemFactory needs two new methods:
- `createPortForwardingSubcategory()`: Creates the subcategory item
- `createPortForwardItem()`: Creates individual forward items

## Implementation

### File: src/tree/TreeItemFactory.ts

**Add `createPortForwardingSubcategory()`**:
```typescript
public static createPortForwardingSubcategory(resourceData: TreeItemData): ClusterTreeItem {
  const item = new ClusterTreeItem(
    'Port Forwarding',
    vscode.TreeItemCollapsibleState.Collapsed,
    'portForwarding',
    resourceData
  );
  
  item.iconPath = new vscode.ThemeIcon('zap');
  item.tooltip = 'Manage active port forwards';
  
  // Show badge with count
  const manager = PortForwardManager.getInstance();
  const forwards = manager.getAllForwards();
  const contextForwards = forwards.filter(fw => fw.context === resourceData.context);
  
  if (contextForwards.length > 0) {
    item.description = `${contextForwards.length} active`;
  }
  
  return item;
}
```

**Add `createPortForwardItem()`**:
```typescript
public static createPortForwardItem(
  forward: PortForwardInfo,
  resourceData: TreeItemData
): ClusterTreeItem {
  // Label: localhost:8080 → default/nginx-pod:80
  const label = `localhost:${forward.localPort} → ${forward.namespace}/${forward.podName}:${forward.remotePort}`;
  
  const item = new ClusterTreeItem(
    label,
    vscode.TreeItemCollapsibleState.None,
    'portForward',
    {
      ...resourceData,
      forwardId: forward.id
    }
  );
  
  // Status icon (green=connected, red=error, spinner=connecting)
  item.iconPath = this.getForwardStatusIcon(forward.status);
  
  // Tooltip with details
  item.tooltip = this.buildForwardTooltip(forward);
  
  // Context menu
  item.contextValue = 'portForward';
  
  // Description with status and uptime
  item.description = this.buildForwardDescription(forward);
  
  // Store forward ID
  (item as any).forwardId = forward.id;
  
  return item;
}
```

**Helper methods**:
- `getForwardStatusIcon(status)`: Returns appropriate ThemeIcon
- `buildForwardTooltip(forward)`: Multi-line tooltip with pod, ports, status, uptime
- `buildForwardDescription(forward)`: `"connected • 5m 32s"`
- `formatUptime(seconds)`: Format uptime (45s, 1m 15s, 1h 5m)

## Acceptance Criteria

- [ ] `createPortForwardingSubcategory()` creates subcategory item
- [ ] Badge shows active forward count
- [ ] `createPortForwardItem()` creates forward items
- [ ] Label format: `localhost:PORT → namespace/pod:PORT`
- [ ] Status icons reflect connection state
- [ ] Tooltip shows detailed information
- [ ] Description shows status and uptime
- [ ] Uptime calculated from startTime on-demand
- [ ] No TypeScript errors

## Files Modified

- `src/tree/TreeItemFactory.ts`

## Dependencies

- 002-create-port-forward-manager-singleton
- 006-create-port-forwarding-subcategory-class

## Estimated Time

25 minutes

