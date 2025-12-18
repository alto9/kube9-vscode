---
story_id: 006-add-events-to-tree-provider
session_id: add-events-category-to-tree-view-for-cluster-troub
feature_id:
  - cluster-events-tree
spec_id:
  - events-tree-spec
  - operator-status-api-spec
status: pending
---

# Add Events Category to ClusterTreeProvider

## Objective

Integrate Events category into ClusterTreeProvider with conditional visibility based on operator status. Events appears after Reports when operator is installed.

## Context

Events category should only appear for clusters with operator status "operated", "enabled", or "degraded". Uses existing OperatorStatusClient to check status.

## Files to Create/Modify

- `src/tree/ClusterTreeProvider.ts` (modify)

## Implementation

1. Import EventsCategory:
```typescript
import { EventsCategory } from './categories/EventsCategory';
import { EventsProvider } from '../services/EventsProvider';
import { EventTreeItem } from './items/EventTreeItem';
import { OperatorStatusMode } from '../kubernetes/OperatorStatusTypes';
```

2. Add EventsProvider as class member:
```typescript
export class ClusterTreeProvider implements vscode.TreeDataProvider<ClusterTreeItem> {
    private eventsProvider: EventsProvider;
    
    constructor(...) {
        // ... existing code ...
        this.eventsProvider = new EventsProvider();
    }
}
```

3. Update `getCategories()` method to conditionally include Events:
```typescript
private async getCategories(clusterElement: ClusterTreeItem): Promise<ClusterTreeItem[]> {
    const categories: ClusterTreeItem[] = [];
    
    // Dashboard (always first)
    categories.push(createDashboardCategory());
    
    // Reports (conditional - when operator present)
    if (clusterElement.operatorStatus !== OperatorStatusMode.Basic) {
        categories.push(createReportsCategory());
        
        // Events (conditional - when operator present)
        const eventsCategory = new EventsCategory(clusterElement);
        categories.push(eventsCategory);
    }
    
    // Other categories...
    categories.push(createNodesCategory());
    // ... etc
    
    return categories;
}
```

4. Update `getCategoryChildren()` to handle Events expansion:
```typescript
private async getCategoryChildren(categoryElement: ClusterTreeItem): Promise<ClusterTreeItem[]> {
    switch (categoryElement.type) {
        // ... existing cases ...
        
        case 'events':
            return await this.getEventItems(categoryElement);
        
        // ... rest of cases ...
    }
}

private async getEventItems(eventsCategory: ClusterTreeItem): Promise<ClusterTreeItem[]> {
    try {
        const clusterContext = eventsCategory.resourceData.cluster;
        const events = await this.eventsProvider.getEvents(clusterContext);
        
        return events.map(event => new EventTreeItem(event) as any);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorItem = new vscode.TreeItem(`Error: ${errorMessage}`);
        errorItem.iconPath = new vscode.ThemeIcon('error');
        errorItem.tooltip = 'Failed to retrieve events. Check operator health.';
        return [errorItem as any];
    }
}
```

5. Update EventsCategory to set type:
```typescript
// In src/tree/categories/EventsCategory.ts
export class EventsCategory extends vscode.TreeItem {
    public type = 'events'; // Add this
    // ... rest of implementation
}
```

## Acceptance Criteria

- [ ] EventsCategory added to ClusterTreeProvider
- [ ] Events appears after Reports category
- [ ] Events only visible when operator status is not "basic"
- [ ] Expanding Events calls `eventsProvider.getEvents()`
- [ ] Event items rendered using EventTreeItem
- [ ] Error handling shows error message in tree
- [ ] Events category positioned correctly in tree

## Related Files

- Spec: `ai/specs/tree/events-tree-spec.spec.md`
- Diagram: `ai/diagrams/cluster/events-architecture.diagram.md`
- Feature: `ai/features/cluster/cluster-events-tree.feature.md`

## Estimated Time

< 30 minutes

