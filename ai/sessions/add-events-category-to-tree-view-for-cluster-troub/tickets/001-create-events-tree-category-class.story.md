---
story_id: 001-create-events-tree-category-class
session_id: add-events-category-to-tree-view-for-cluster-troub
feature_id:
  - cluster-events-tree
spec_id:
  - events-tree-spec
status: completed
---

# Create EventsTreeCategory Class

## Objective

Create the `EventsTreeCategory` class that represents the Events category node in the tree view. This is a basic tree item class with proper icon, tooltip, and context value.

## Context

Events category is a new top-level category that appears after Reports when operator is installed. This story creates the tree item class only - conditional visibility will be added in a later story.

## Files to Create/Modify

- `src/tree/categories/EventsCategory.ts` (new file)

## Implementation

Create `EventsTreeCategory` class extending `vscode.TreeItem`:

```typescript
import * as vscode from 'vscode';
import { ClusterTreeItem } from '../ClusterTreeItem';

export class EventsCategory extends vscode.TreeItem {
    constructor(public readonly clusterElement: ClusterTreeItem) {
        super('Events', vscode.TreeItemCollapsibleState.Collapsed);
        
        this.contextValue = 'kube9.events.category';
        this.iconPath = new vscode.ThemeIcon('output');
        this.description = 'Cluster Events';
        this.tooltip = 'Kubernetes events for troubleshooting';
    }
}
```

## Acceptance Criteria

- [ ] EventsCategory class created in `src/tree/categories/EventsCategory.ts`
- [ ] Extends `vscode.TreeItem`
- [ ] Has correct contextValue: `'kube9.events.category'`
- [ ] Uses `'output'` ThemeIcon
- [ ] Has tooltip explaining purpose
- [ ] Accepts clusterElement in constructor
- [ ] Collapsible state is Collapsed

## Related Files

- Spec: `ai/specs/tree/events-tree-spec.spec.md` (EventsTreeCategory section)
- Feature: `ai/features/cluster/cluster-events-tree.feature.md`

## Estimated Time

< 15 minutes

