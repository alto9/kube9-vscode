---
story_id: 005-create-event-tree-item-class
session_id: add-events-category-to-tree-view-for-cluster-troub
feature_id:
  - cluster-events-tree
spec_id:
  - events-tree-spec
status: completed
---

# Create EventTreeItem Class

## Objective

Create the `EventTreeItem` class that displays individual events in the tree with color coding, tooltips, and click command to show details.

## Context

Each event becomes a tree item with color-coded icon based on type (Normal, Warning, Error). Clicking shows full details in Output Panel.

## Files to Create/Modify

- `src/tree/items/EventTreeItem.ts` (new file)

## Implementation

Create EventTreeItem class:

```typescript
import * as vscode from 'vscode';
import { KubernetesEvent } from '../../types/Events';

export class EventTreeItem extends vscode.TreeItem {
    constructor(public readonly event: KubernetesEvent) {
        super(event.reason, vscode.TreeItemCollapsibleState.None);
        
        this.contextValue = 'kube9.event';
        this.description = `${event.involvedObject.namespace}/${event.involvedObject.kind}/${event.involvedObject.name}`;
        this.tooltip = this.buildTooltip();
        this.iconPath = this.getIconForEventType();
        this.command = {
            command: 'kube9.events.showDetails',
            title: 'Show Event Details',
            arguments: [event]
        };
    }

    private getIconForEventType(): vscode.ThemeIcon {
        switch (this.event.type) {
            case 'Normal':
                return new vscode.ThemeIcon('pass', 
                    new vscode.ThemeColor('terminal.ansiGreen'));
            case 'Warning':
                return new vscode.ThemeIcon('warning', 
                    new vscode.ThemeColor('editorWarning.foreground'));
            case 'Error':
                return new vscode.ThemeIcon('error', 
                    new vscode.ThemeColor('editorError.foreground'));
            default:
                return new vscode.ThemeIcon('info');
        }
    }

    private buildTooltip(): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${this.event.reason}**\n\n`);
        md.appendMarkdown(`Type: ${this.event.type}\n\n`);
        md.appendMarkdown(`Resource: ${this.event.involvedObject.kind}/${this.event.involvedObject.name}\n\n`);
        md.appendMarkdown(`Namespace: ${this.event.involvedObject.namespace}\n\n`);
        md.appendMarkdown(`Message: ${this.event.message}\n\n`);
        md.appendMarkdown(`Count: ${this.event.count}\n\n`);
        md.appendMarkdown(`Age: ${this.formatAge(this.event.lastTimestamp)}\n\n`);
        return md;
    }

    private formatAge(timestamp: string): string {
        const eventTime = new Date(timestamp).getTime();
        const now = Date.now();
        const ageMs = now - eventTime;
        
        const minutes = Math.floor(ageMs / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d`;
        } else if (hours > 0) {
            return `${hours}h`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return 'just now';
        }
    }
}
```

## Acceptance Criteria

- [ ] EventTreeItem class created extending `vscode.TreeItem`
- [ ] Label shows event reason
- [ ] Description shows namespace/kind/name
- [ ] Icon color-coded by type (Normal=green, Warning=yellow, Error=red)
- [ ] Tooltip shows full event details in Markdown
- [ ] Click command configured to show details
- [ ] Age formatted as human-readable (e.g., "5m", "2h", "3d")
- [ ] contextValue set to `'kube9.event'`

## Related Files

- Spec: `ai/specs/tree/events-tree-spec.spec.md` (EventTreeItem section)
- Types: `src/types/Events.ts`
- Feature: `ai/features/cluster/cluster-events-tree.feature.md`

## Estimated Time

< 25 minutes

