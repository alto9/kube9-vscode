---
story_id: 008-implement-refresh-commands
session_id: add-events-category-to-tree-view-for-cluster-troub
feature_id:
  - cluster-events-tree
spec_id:
  - events-tree-spec
status: pending
---

# Implement Refresh Commands

## Objective

Implement manual refresh and auto-refresh toggle commands for Events category.

## Context

Users need to manually refresh events and toggle auto-refresh on/off. Auto-refresh queries operator CLI every 30 seconds when enabled.

## Files to Create/Modify

- `src/commands/EventsCommands.ts` (modify)
- `src/extension.ts` (modify - register commands)

## Implementation

Add to `EventsCommands` class:

```typescript
// Add to EventsCommands class

refresh(eventsCategory: EventsCategory): void {
    const clusterContext = eventsCategory.clusterElement.resourceData.cluster;
    this.eventsProvider.clearCache(clusterContext);
    this.treeView.reveal(eventsCategory, { select: false, focus: false, expand: true });
}

toggleAutoRefresh(eventsCategory: EventsCategory): void {
    const clusterContext = eventsCategory.clusterElement.resourceData.cluster;
    const isEnabled = this.eventsProvider.isAutoRefreshEnabled(clusterContext);
    
    if (isEnabled) {
        this.eventsProvider.stopAutoRefresh(clusterContext);
        vscode.window.showInformationMessage('Auto-refresh disabled for Events');
    } else {
        this.eventsProvider.startAutoRefresh(clusterContext, () => {
            this.treeView.reveal(eventsCategory, { select: false, focus: false, expand: true });
        });
        vscode.window.showInformationMessage('Auto-refresh enabled for Events (30 seconds)');
    }
}

showDetails(event: any): void {
    const outputChannel = vscode.window.createOutputChannel('Kube9 Events');
    outputChannel.clear();
    outputChannel.appendLine('=== Event Details ===');
    outputChannel.appendLine('');
    outputChannel.appendLine(`Reason: ${event.reason}`);
    outputChannel.appendLine(`Type: ${event.type}`);
    outputChannel.appendLine(`Message: ${event.message}`);
    outputChannel.appendLine('');
    outputChannel.appendLine('=== Involved Object ===');
    outputChannel.appendLine(`Kind: ${event.involvedObject.kind}`);
    outputChannel.appendLine(`Namespace: ${event.involvedObject.namespace}`);
    outputChannel.appendLine(`Name: ${event.involvedObject.name}`);
    outputChannel.appendLine('');
    outputChannel.appendLine('=== Timestamps ===');
    outputChannel.appendLine(`First Occurred: ${event.firstTimestamp}`);
    outputChannel.appendLine(`Last Occurred: ${event.lastTimestamp}`);
    outputChannel.appendLine(`Count: ${event.count}`);
    outputChannel.show();
}
```

Register in `src/extension.ts`:

```typescript
context.subscriptions.push(
    vscode.commands.registerCommand('kube9.events.refresh', 
        (category) => eventsCommands.refresh(category)),
    vscode.commands.registerCommand('kube9.events.toggleAutoRefresh', 
        (category) => eventsCommands.toggleAutoRefresh(category)),
    vscode.commands.registerCommand('kube9.events.showDetails', 
        (event) => eventsCommands.showDetails(event))
);
```

## Acceptance Criteria

- [ ] `refresh()` command clears cache and refreshes tree
- [ ] `toggleAutoRefresh()` toggles auto-refresh state
- [ ] Auto-refresh shows notification when enabled/disabled
- [ ] `showDetails()` displays event in Output Panel
- [ ] All commands registered in extension.ts
- [ ] Output Panel formatted for readability

## Related Files

- Spec: `ai/specs/tree/events-tree-spec.spec.md` (Commands section)
- Feature: `ai/features/cluster/cluster-events-tree.feature.md`

## Estimated Time

< 20 minutes

