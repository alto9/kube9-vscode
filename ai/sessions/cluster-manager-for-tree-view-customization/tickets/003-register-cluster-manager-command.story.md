---
story_id: 003-register-cluster-manager-command
session_id: cluster-manager-for-tree-view-customization
feature_id:
  - cluster-manager-webview
spec_id:
  - cluster-manager-webview-spec
status: completed
---

# Register Cluster Organizer Command

## Objective

Register the `kube9.openClusterManager` command in VS Code and add it to package.json so it appears in Command Palette.

## Context

Users need a way to open the Cluster Organizer. This command will be the entry point that creates and shows the webview panel.

See:
- `ai/specs/studio/cluster-manager-webview-spec.spec.md` - Command Registration section
- `ai/features/studio/cluster-manager-webview.feature.md` - Opening Cluster Organizer scenario

## Acceptance Criteria

1. Add command to `package.json`:
   - Command ID: `kube9.openClusterManager`
   - Title: "Kube9: Cluster Organizer"
   - Category: "Kube9"
2. Register command in `src/extension.ts` `activate()` function
3. Command handler should log "Cluster Organizer opening..." (webview comes later)
4. Test command appears in Command Palette after extension loads

## Files to Modify

- `package.json` (commands and menus sections)
- `src/extension.ts`

## Implementation Notes

```typescript
// In extension.ts
context.subscriptions.push(
  vscode.commands.registerCommand('kube9.openClusterManager', async () => {
    console.log('Cluster Organizer opening...');
    // Webview creation comes in next story
  })
);
```

Add to package.json commands array:
```json
{
  "command": "kube9.openClusterManager",
  "title": "Cluster Organizer",
  "category": "Kube9"
}
```

## Estimated Time

15 minutes







