---
spec_id: port-forwarding-tree-spec
name: Port Forwarding Tree View Integration
description: Tree view components for displaying and managing active port forwards under Networking category
feature_id:
  - pod-port-forwarding
diagram_id:
  - port-forwarding-architecture
  - port-forwarding-ui
---

# Port Forwarding Tree View Integration

## Overview

This specification defines how port forwarding is integrated into the VS Code tree view, including the Port Forwarding subcategory under Networking, forward items, and interaction patterns.

See [port-forwarding-ui](../../diagrams/cluster/port-forwarding-ui.diagram.md) for UI component details.

## Tree Structure

```
Networking (category)
  ├── Services (subcategory)
  │   └── [service items]
  └── Port Forwarding (subcategory) ← NEW
      ├── localhost:8080 → default/nginx-pod:80
      ├── localhost:3000 → prod/api-service:3000
      └── localhost:5432 → staging/postgres-0:5432
```

## Tree Item Types

### Add to TreeItemTypes.ts

```typescript
export type TreeItemType = 
  // Existing types...
  | 'networking'           // Networking category (already exists)
  | 'portForwarding'       // Port Forwarding subcategory (NEW)
  | 'portForward';         // Individual forward item (NEW)
```

## NetworkingCategory Extension

### File: src/tree/categories/networking/NetworkingCategory.ts

The NetworkingCategory already exists for Services. Extend it to include Port Forwarding.

### Get Networking Subcategories

```typescript
export class NetworkingCategory {
  /**
   * Returns subcategories under Networking
   * - Services (existing)
   * - Port Forwarding (NEW)
   */
  public static getNetworkingSubcategories(resourceData: TreeItemData): ClusterTreeItem[] {
    const subcategories: ClusterTreeItem[] = [];
    
    // Services subcategory (existing)
    subcategories.push(
      TreeItemFactory.createServicesSubcategory(resourceData)
    );
    
    // Port Forwarding subcategory (NEW)
    subcategories.push(
      TreeItemFactory.createPortForwardingSubcategory(resourceData)
    );
    
    return subcategories;
  }
}
```

## PortForwardingSubcategory Implementation

### File: src/tree/categories/networking/PortForwardingSubcategory.ts

```typescript
import * as vscode from 'vscode';
import { ClusterTreeItem } from '../../ClusterTreeItem';
import { TreeItemData } from '../../TreeItemTypes';
import { PortForwardManager } from '../../../services/PortForwardManager';
import { TreeItemFactory } from '../../TreeItemFactory';

export class PortForwardingSubcategory {
  /**
   * Get children of Port Forwarding subcategory
   * Returns list of active port forward items
   */
  public static getPortForwardItems(resourceData: TreeItemData): ClusterTreeItem[] {
    const manager = PortForwardManager.getInstance();
    const forwards = manager.getAllForwards();
    
    // Filter forwards for current context
    const contextForwards = forwards.filter(
      fw => fw.context === resourceData.context
    );
    
    if (contextForwards.length === 0) {
      // Return empty state item
      return [this.createEmptyStateItem(resourceData)];
    }
    
    // Create tree items for each forward
    return contextForwards.map(forward =>
      TreeItemFactory.createPortForwardItem(forward, resourceData)
    );
  }
  
  /**
   * Create empty state item when no forwards are active
   */
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
}
```

## TreeItemFactory Extensions

### File: src/tree/TreeItemFactory.ts

### Create Port Forwarding Subcategory

```typescript
export class TreeItemFactory {
  /**
   * Create Port Forwarding subcategory tree item
   */
  public static createPortForwardingSubcategory(resourceData: TreeItemData): ClusterTreeItem {
    const item = new ClusterTreeItem(
      'Port Forwarding',
      vscode.TreeItemCollapsibleState.Collapsed,
      'portForwarding',
      resourceData
    );
    
    item.iconPath = new vscode.ThemeIcon('zap');
    item.tooltip = 'Manage active port forwards';
    
    // Show badge with count when collapsed
    const manager = PortForwardManager.getInstance();
    const forwards = manager.getAllForwards();
    const contextForwards = forwards.filter(fw => fw.context === resourceData.context);
    
    if (contextForwards.length > 0) {
      item.description = `${contextForwards.length} active`;
    }
    
    return item;
  }
  
  /**
   * Create individual port forward tree item
   */
  public static createPortForwardItem(
    forward: PortForwardInfo,
    resourceData: TreeItemData
  ): ClusterTreeItem {
    // Label format: localhost:8080 → default/nginx-pod:80
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
    
    // Status icon
    item.iconPath = this.getForwardStatusIcon(forward.status);
    
    // Tooltip with detailed information
    item.tooltip = this.buildForwardTooltip(forward);
    
    // Context value for context menu
    item.contextValue = 'portForward';
    
    // Description shows status and uptime
    item.description = this.buildForwardDescription(forward);
    
    // Store forward ID for commands
    (item as any).forwardId = forward.id;
    
    return item;
  }
  
  /**
   * Get icon based on forward status
   */
  private static getForwardStatusIcon(status: PortForwardStatus): vscode.ThemeIcon {
    switch (status) {
      case PortForwardStatus.Connected:
        return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
      case PortForwardStatus.Connecting:
        return new vscode.ThemeIcon('loading~spin');
      case PortForwardStatus.Disconnected:
      case PortForwardStatus.Error:
        return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));
      case PortForwardStatus.Stopped:
        return new vscode.ThemeIcon('circle-outline');
      default:
        return new vscode.ThemeIcon('circle-outline');
    }
  }
  
  /**
   * Build tooltip with detailed forward information
   */
  private static buildForwardTooltip(forward: PortForwardInfo): string {
    const lines = [
      'Port Forward',
      `Pod: ${forward.namespace}/${forward.podName}`,
      `Local: localhost:${forward.localPort}`,
      `Remote: ${forward.remotePort}`,
      `Status: ${forward.status}`,
      `Uptime: ${this.formatUptime(forward.uptime)}`,
      `Started: ${forward.startTime.toLocaleString()}`
    ];
    return lines.join('\n');
  }
  
  /**
   * Build description showing status and uptime
   */
  private static buildForwardDescription(forward: PortForwardInfo): string {
    const uptimeStr = this.formatUptime(forward.uptime);
    return `${forward.status} • ${uptimeStr}`;
  }
  
  /**
   * Format uptime duration
   */
  private static formatUptime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
  }
}
```

## ClusterTreeProvider Integration

### File: src/tree/ClusterTreeProvider.ts

### Handle Port Forwarding in getCategoryChildren

```typescript
export class ClusterTreeProvider implements vscode.TreeDataProvider<ClusterTreeItem> {
  // Existing code...
  
  private getCategoryChildren(element: ClusterTreeItem): ClusterTreeItem[] {
    const type = element.type;
    
    switch (type) {
      // Existing cases...
      
      case 'networking':
        return NetworkingCategory.getNetworkingSubcategories(element.resourceData);
      
      case 'portForwarding': // NEW
        return PortForwardingSubcategory.getPortForwardItems(element.resourceData);
      
      // Other cases...
    }
  }
  
  /**
   * Check if type is a category (expandable)
   */
  private isCategoryType(type: string): boolean {
    return (
      // Existing types...
      type === 'networking' ||
      type === 'portForwarding' || // NEW
      type === 'services'
      // Other types...
    );
  }
}
```

### Port Forward Manager Integration (No Auto-Refresh)

```typescript
export class ClusterTreeProvider implements vscode.TreeDataProvider<ClusterTreeItem> {
  private portForwardManager: PortForwardManager;
  
  constructor() {
    // Existing initialization...
    
    // Get manager reference for queries (no event subscription)
    this.portForwardManager = PortForwardManager.getInstance();
    
    // NO automatic tree refresh on forward changes
    // Tree updates only when user views it (on-demand)
  }
  
  /**
   * Standard refresh method (called by manual refresh button)
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
  
  /**
   * Get children queries manager for latest state
   */
  private getCategoryChildren(element: ClusterTreeItem): ClusterTreeItem[] {
    // When Port Forwarding is expanded, query current state
    if (element.type === 'portForwarding') {
      return PortForwardingSubcategory.getPortForwardItems(element.resourceData);
    }
    // ... other cases
  }
}
```

**Key Points**:
- No event subscription to PortForwardManager
- Tree data is fresh when user expands Port Forwarding
- Status bar updates in real-time (handled separately by manager)
- User sees current state when they look, without automatic refresh churn

## Pod Badge for Active Forwards

### Extend Pod Tree Items

When displaying pods, check if they have active forwards and add badge:

```typescript
// In method that creates pod tree items
public static createPodItem(pod: any, resourceData: TreeItemData): ClusterTreeItem {
  const item = new ClusterTreeItem(
    pod.metadata.name,
    vscode.TreeItemCollapsibleState.None,
    'resource:Pod',
    resourceData
  );
  
  // Existing pod configuration...
  
  // Check for active forwards
  const manager = PortForwardManager.getInstance();
  const forwards = manager.getAllForwards();
  const podForwards = forwards.filter(
    fw => fw.podName === pod.metadata.name &&
          fw.namespace === pod.metadata.namespace &&
          fw.context === resourceData.context
  );
  
  if (podForwards.length > 0) {
    // Add lightning bolt badge to label
    item.label = `${pod.metadata.name} $(zap)`;
    
    // Update tooltip to mention active forwards
    const originalTooltip = item.tooltip || '';
    item.tooltip = `${originalTooltip}\n\nActive Port Forwards: ${podForwards.length}`;
  }
  
  return item;
}
```

## Context Menu Configuration

### package.json

```json
{
  "menus": {
    "view/item/context": [
      {
        "command": "kube9.stopPortForward",
        "when": "view == kube9ClusterView && viewItem == portForward",
        "group": "kube9@1"
      },
      {
        "command": "kube9.copyPortForwardURL",
        "when": "view == kube9ClusterView && viewItem == portForward",
        "group": "kube9@2"
      },
      {
        "command": "kube9.viewPortForwardPod",
        "when": "view == kube9ClusterView && viewItem == portForward",
        "group": "kube9@3"
      },
      {
        "command": "kube9.restartPortForward",
        "when": "view == kube9ClusterView && viewItem == portForward",
        "group": "kube9@4"
      }
    ]
  }
}
```

## Tree Item Data Structure

### Extended TreeItemData

```typescript
interface TreeItemData {
  // Existing fields...
  
  // New field for port forward items
  forwardId?: string;  // UUID of port forward
}
```

### PortForwardTreeItem Type

For type safety, define a specific type:

```typescript
export interface PortForwardTreeItem extends ClusterTreeItem {
  forwardId: string;
  contextValue: 'portForward';
}

// Type guard
export function isPortForwardTreeItem(item: ClusterTreeItem): item is PortForwardTreeItem {
  return item.contextValue === 'portForward' && 'forwardId' in item;
}
```

## Update Frequency

### On-Demand Refresh Strategy

Port forward items refresh only when:
- User expands the Port Forwarding subcategory (VS Code calls getChildren)
- User manually clicks "Refresh" on the tree
- User clicks status bar item (expands and focuses Port Forwarding)

**No Automatic Tree Refresh**: The tree does NOT automatically refresh when forwards start/stop. This avoids unnecessary refresh overhead and potential flicker.

### Status Bar Updates (Real-Time)

The status bar updates immediately when forwards change:
- Forward starts → Count increments
- Forward stops → Count decrements
- Last forward stops → Status bar hides

This provides user awareness without tree refresh overhead.

### Uptime Calculation (On-Demand)

Uptime is calculated fresh each time getChildren is called:

```typescript
export class TreeItemFactory {
  private static buildForwardDescription(forward: PortForwardInfo): string {
    // Calculate uptime from startTime (no need to store/update)
    const uptimeSeconds = Math.floor((Date.now() - forward.startTime.getTime()) / 1000);
    const uptimeStr = this.formatUptime(uptimeSeconds);
    return `${forward.status} • ${uptimeStr}`;
  }
}
```

**Benefits**:
- Uptime is always accurate when viewed
- No periodic polling/timers needed
- No unnecessary tree refreshes

### Manual Refresh

Users can manually refresh to see latest state:
- Click "Refresh" icon in tree view title bar
- Tree provider's refresh() method re-queries PortForwardManager
- All forward items update with current status/uptime

## Empty State Handling

### No Forwards Active

When Port Forwarding subcategory is expanded but no forwards are active:

```
Port Forwarding
  └── No active port forwards
      Right-click a running pod to start forwarding
```

**Implementation**:
- Tree item with info icon
- Descriptive label and description
- No context menu (not clickable)
- Purely informational

### No Running Pods

If user attempts to start forward but no pods are running:
- Show error notification
- Guide user to start a pod first

## Sorting and Grouping

### Default Sorting

Port forward items are sorted by:
1. **Namespace** (alphabetically)
2. **Pod Name** (alphabetically)
3. **Local Port** (numerically)

```typescript
public static sortForwards(forwards: PortForwardInfo[]): PortForwardInfo[] {
  return forwards.sort((a, b) => {
    // Sort by namespace
    const nsCompare = a.namespace.localeCompare(b.namespace);
    if (nsCompare !== 0) return nsCompare;
    
    // Then by pod name
    const podCompare = a.podName.localeCompare(b.podName);
    if (podCompare !== 0) return podCompare;
    
    // Then by local port
    return a.localPort - b.localPort;
  });
}
```

### Optional Grouping

Future enhancement: Group by namespace or pod:

```
Port Forwarding
  ├── default
  │   ├── localhost:8080 → nginx-pod:80
  │   └── localhost:9000 → api-pod:9000
  └── production
      └── localhost:3000 → web-pod:3000
```

## Tree State Persistence

### Expansion State

Port Forwarding subcategory expansion state persists across:
- Tree refreshes
- VS Code window reloads
- Extension reloads

**Implementation**: Use VS Code's `TreeView` built-in state persistence.

### Forward State (Not Persisted)

Active forwards are NOT persisted:
- Fresh start on each extension activation
- User must manually restart forwards after reload
- Prevents stale forwards and port conflicts

**Rationale**:
- Pods may have changed or restarted
- Local ports may be in use by other processes
- User should explicitly start forwards each session

## Performance Considerations

### Efficient Refreshes

- Only refresh affected tree nodes when forwards change
- Batch uptime updates (10-second interval)
- Lazy loading of forward information

### Memory Management

- Minimal state in tree items
- Forward data stored in PortForwardManager, not duplicated in tree
- Tree items reference forward by ID only

### Rendering Performance

- No expensive operations in getChildren()
- Icon creation is cheap (ThemeIcon)
- Tooltip generation is lazy (only on hover)

## Accessibility

### Screen Reader Support

- Clear labels: "localhost 8080 to default nginx-pod port 80"
- Status announced: "connected" or "error"
- Actions announced: "Stop port forward"

### Keyboard Navigation

- Full keyboard navigation support
- Enter key on item shows quick actions
- Context menu accessible via keyboard

### High Contrast Mode

- Use VS Code ThemeIcon and ThemeColor for icons
- Ensure text remains readable
- Status colors adapt to theme

## Testing Requirements

### Unit Tests

- PortForwardingSubcategory.getPortForwardItems()
- TreeItemFactory.createPortForwardItem()
- Forward sorting logic
- Empty state creation
- Badge logic for pods with forwards

### Integration Tests

- Tree updates when forward starts
- Tree updates when forward stops
- Multiple forwards display correctly
- Context menu actions work
- Pod badge appears/disappears

### E2E Tests

- Expand Port Forwarding category
- View active forwards
- Right-click forward for context menu
- Stop forward from tree
- Pod badge appears for active forward
- Empty state displays when no forwards

## Future Enhancements

### Grouping Options

- Group by namespace
- Group by pod
- Flat list (current implementation)

### Inline Actions

- "Open Browser" button inline in tree item
- "Stop" button inline (like VS Code debugger)
- "Restart" button for errored forwards

### Status Indicators

- Bandwidth usage display
- Request count
- Last activity timestamp

### Persistence

- Optional: Save forward configurations
- Restore forwards on extension activation
- Per-workspace forward profiles

