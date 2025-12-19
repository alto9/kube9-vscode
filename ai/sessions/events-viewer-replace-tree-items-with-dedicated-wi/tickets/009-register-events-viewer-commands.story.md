---
story_id: 009-register-events-viewer-commands
session_id: events-viewer-replace-tree-items-with-dedicated-wi
type: story
status: completed
feature_id:
  - event-viewer-panel
spec_id:
  - event-viewer-panel-spec
---

# Register Events Viewer Commands

## Objective

Register VS Code commands for opening Events Viewer from tree category click and command palette.

## Context

Need two commands: one for tree category click (with context), one for command palette (with cluster selection).

## Acceptance Criteria

- [x] Register `kube9.events.openViewer` command in `extension.ts`
- [x] Command handler accepts EventsCategory parameter
- [x] Extract cluster context from EventsCategory
- [x] Call `EventViewerPanel.show()` with context, clusterContext, eventsProvider
- [x] Register `kube9.openEventsViewer` command for command palette
- [x] Command palette version shows QuickPick for cluster selection if no context
- [x] Add commands to `package.json` contributions
- [x] Add command palette entry with title "Kube9: Open Events Viewer"
- [x] Ensure eventsProvider instance is accessible in extension.ts

## Files Affected

- **Modify**: `src/extension.ts`
- **Modify**: `package.json` (contributes.commands)

## Implementation Notes

**Command Registration in extension.ts**:
```typescript
import { EventViewerPanel } from './webview/EventViewerPanel';

// Register command from Events category click
context.subscriptions.push(
    vscode.commands.registerCommand('kube9.events.openViewer', (eventsCategory: EventsCategory) => {
        const clusterContext = eventsCategory.clusterElement.resourceData.context;
        EventViewerPanel.show(context, clusterContext, eventsProvider);
    })
);

// Register command from command palette
context.subscriptions.push(
    vscode.commands.registerCommand('kube9.openEventsViewer', async (clusterContext?: string) => {
        if (!clusterContext) {
            const clusters = await getConnectedClusters();
            const selected = await vscode.window.showQuickPick(
                clusters.map(c => ({ label: c.name, context: c.context })),
                { placeHolder: 'Select cluster to view events' }
            );
            if (!selected) {
                return;
            }
            clusterContext = selected.context;
        }
        EventViewerPanel.show(context, clusterContext, eventsProvider);
    })
);
```

**package.json commands**:
```json
{
  "command": "kube9.openEventsViewer",
  "title": "Kube9: Open Events Viewer",
  "category": "Kube9"
}
```

## Linked Resources

- Spec: `ai/specs/webview/events-viewer/event-viewer-panel-spec.spec.md`
- Feature: `ai/features/webview/events-viewer/event-viewer-panel.feature.md`

## Estimated Time

15 minutes

