---
story_id: 007-register-filter-commands
session_id: add-events-category-to-tree-view-for-cluster-troub
feature_id:
  - cluster-events-tree
spec_id:
  - events-tree-spec
status: completed
---

# Register Filter Commands

## Objective

Register and implement all filter commands: filterNamespace, filterType, filterTimeRange, filterResourceType, search, and clearFilters.

## Context

Users need to filter events by various criteria. Each filter shows a QuickPick with options, updates the filter state, and refreshes the tree.

## Files to Create/Modify

- `src/extension.ts` (modify - register commands)
- `src/commands/EventsCommands.ts` (new file)

## Implementation

Create `src/commands/EventsCommands.ts`:

```typescript
import * as vscode from 'vscode';
import { EventsCategory } from '../tree/categories/EventsCategory';
import { EventsProvider } from '../services/EventsProvider';
import { fetchNamespaces } from '../kubernetes/resourceFetchers';

export class EventsCommands {
    constructor(
        private eventsProvider: EventsProvider,
        private treeView: vscode.TreeView<any>
    ) {}

    async filterNamespace(eventsCategory: EventsCategory): Promise<void> {
        const namespaces = await fetchNamespaces();
        const namespaceNames = namespaces.map(ns => ns.metadata?.name || '');
        const items = ['All Namespaces', ...namespaceNames];
        
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Filter events by namespace'
        });
        
        if (selected) {
            const namespace = selected === 'All Namespaces' ? 'all' : selected;
            const clusterContext = eventsCategory.clusterElement.resourceData.cluster;
            this.eventsProvider.setFilter(clusterContext, { namespace });
            this.treeView.reveal(eventsCategory, { select: false, focus: false, expand: true });
        }
    }

    async filterType(eventsCategory: EventsCategory): Promise<void> {
        const types = ['All', 'Normal', 'Warning', 'Error'];
        
        const selected = await vscode.window.showQuickPick(types, {
            placeHolder: 'Filter events by type'
        });
        
        if (selected) {
            const type = selected === 'All' ? 'all' : selected;
            const clusterContext = eventsCategory.clusterElement.resourceData.cluster;
            this.eventsProvider.setFilter(clusterContext, { type });
            this.treeView.reveal(eventsCategory, { select: false, focus: false, expand: true });
        }
    }

    async filterTimeRange(eventsCategory: EventsCategory): Promise<void> {
        const ranges = [
            { label: 'Last 1 hour', value: '1h' },
            { label: 'Last 6 hours', value: '6h' },
            { label: 'Last 24 hours', value: '24h' },
            { label: 'All', value: 'all' }
        ];
        
        const selected = await vscode.window.showQuickPick(ranges, {
            placeHolder: 'Filter events by time range'
        });
        
        if (selected) {
            const clusterContext = eventsCategory.clusterElement.resourceData.cluster;
            this.eventsProvider.setFilter(clusterContext, { since: selected.value });
            this.treeView.reveal(eventsCategory, { select: false, focus: false, expand: true });
        }
    }

    async filterResourceType(eventsCategory: EventsCategory): Promise<void> {
        const types = ['All', 'Pod', 'Deployment', 'Service', 'StatefulSet', 
                       'DaemonSet', 'Job', 'CronJob', 'ReplicaSet'];
        
        const selected = await vscode.window.showQuickPick(types, {
            placeHolder: 'Filter events by resource type'
        });
        
        if (selected) {
            const resourceType = selected === 'All' ? 'all' : selected;
            const clusterContext = eventsCategory.clusterElement.resourceData.cluster;
            this.eventsProvider.setFilter(clusterContext, { resourceType });
            this.treeView.reveal(eventsCategory, { select: false, focus: false, expand: true });
        }
    }

    async search(eventsCategory: EventsCategory): Promise<void> {
        const searchText = await vscode.window.showInputBox({
            prompt: 'Search events by message text',
            placeHolder: 'Enter search term...'
        });
        
        if (searchText !== undefined) {
            const clusterContext = eventsCategory.clusterElement.resourceData.cluster;
            this.eventsProvider.setFilter(clusterContext, { searchText });
            this.treeView.reveal(eventsCategory, { select: false, focus: false, expand: true });
        }
    }

    clearFilters(eventsCategory: EventsCategory): void {
        const clusterContext = eventsCategory.clusterElement.resourceData.cluster;
        this.eventsProvider.clearFilters(clusterContext);
        this.treeView.reveal(eventsCategory, { select: false, focus: false, expand: true });
    }
}
```

Register in `src/extension.ts`:

```typescript
// Add to activate function
const eventsCommands = new EventsCommands(eventsProvider, clusterTreeView);

context.subscriptions.push(
    vscode.commands.registerCommand('kube9.events.filterNamespace', 
        (category) => eventsCommands.filterNamespace(category)),
    vscode.commands.registerCommand('kube9.events.filterType', 
        (category) => eventsCommands.filterType(category)),
    vscode.commands.registerCommand('kube9.events.filterTimeRange', 
        (category) => eventsCommands.filterTimeRange(category)),
    vscode.commands.registerCommand('kube9.events.filterResourceType', 
        (category) => eventsCommands.filterResourceType(category)),
    vscode.commands.registerCommand('kube9.events.search', 
        (category) => eventsCommands.search(category)),
    vscode.commands.registerCommand('kube9.events.clearFilters', 
        (category) => eventsCommands.clearFilters(category))
);
```

## Acceptance Criteria

- [ ] EventsCommands class created with all filter methods
- [ ] Each filter shows appropriate QuickPick
- [ ] Filters update EventsProvider state
- [ ] Tree refreshes after filter change
- [ ] All commands registered in extension.ts
- [ ] Search command shows input box
- [ ] clearFilters resets to defaults

## Related Files

- Spec: `ai/specs/tree/events-tree-spec.spec.md` (Commands section)
- Feature: `ai/features/cluster/cluster-events-tree.feature.md`

## Estimated Time

< 30 minutes

