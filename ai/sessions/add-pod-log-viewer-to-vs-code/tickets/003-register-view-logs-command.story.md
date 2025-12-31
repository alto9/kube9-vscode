---
story_id: 003-register-view-logs-command
session_id: add-pod-log-viewer-to-vs-code
feature_id:
  - pod-logs-panel
spec_id:
  - pod-logs-panel-spec
status: completed
---

# Register "View Logs" Context Menu Command

## Objective

Register the "View Logs" command in the pod context menu and wire it to open the PodLogsViewerPanel.

## Context

Users access the log viewer by right-clicking a pod in the tree view and selecting "View Logs". This command extracts pod information and opens the appropriate cluster-specific panel.

See:
- `ai/features/webview/pod-logs-viewer/pod-logs-panel.feature.md` - Opening log viewer scenario
- `src/extension.ts` - Command registration pattern

## Files to Create/Modify

- `src/extension.ts` (modify)
- `package.json` (modify)

## Implementation Steps

1. Add command to `package.json`:
   ```json
   {
     "command": "kube9.viewPodLogs",
     "title": "View Logs",
     "category": "Kube9"
   }
   ```
2. Add to pod context menu in `package.json`:
   ```json
   {
     "command": "kube9.viewPodLogs",
     "when": "viewItem =~ /^resource:Pod/",
     "group": "kube9@2"
   }
   ```
3. Register command in `extension.ts`:
   ```typescript
   context.subscriptions.push(
     vscode.commands.registerCommand(
       'kube9.viewPodLogs',
       async (treeItem: ClusterTreeItem) => {
         const { resourceName, namespace, context: clusterContext } = treeItem.resourceData;
         const clusterName = clusterContext.name; // or alias if available
         
         PodLogsViewerPanel.show(
           context,
           clusterContext.name,
           clusterName,
           resourceName,
           namespace
         );
       }
     )
   );
   ```
4. Import `PodLogsViewerPanel` at top of extension.ts

## Acceptance Criteria

- [ ] "View Logs" appears in pod context menu
- [ ] Right-clicking pod and selecting "View Logs" opens panel
- [ ] Correct pod name, namespace, cluster context passed to panel
- [ ] Panel title shows cluster name
- [ ] Command works for pods in different clusters

## Estimated Time

15 minutes

