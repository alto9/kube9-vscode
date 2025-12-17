---
session_id: event-viewer-interface-for-operated-clusters
feature_id:
  - event-viewer
spec_id:
  - event-viewer-webview-spec
story_type: code
estimated_minutes: 15
---

# Register kube9.openEventViewer Command

## Objective

Register the `kube9.openEventViewer` command in extension.ts that opens the Event Viewer webview panel when the Events tree item is clicked.

## Acceptance Criteria

- [ ] Command `kube9.openEventViewer` is registered
- [ ] Command extracts cluster information from tree item
- [ ] Command queries operator status
- [ ] Command calls EventViewerPanel.show() with correct parameters
- [ ] Command handles errors gracefully
- [ ] Command is added to subscriptions for proper disposal

## Implementation Steps

### 1. Add command registration in extension.ts

**File**: `src/extension.ts`

Find the section where `kube9.openDashboard` is registered (around line 678). Add the new command registration after it:

```typescript
// Register open Event Viewer command
const openEventViewerCmd = vscode.commands.registerCommand(
    'kube9.openEventViewer',
    async (treeItem: ClusterTreeItem) => {
        try {
            // Extract cluster information from tree item
            if (!treeItem || !treeItem.resourceData) {
                throw new Error('Invalid tree item: missing resource data');
            }
            
            const clusterName = treeItem.resourceData.cluster.name;
            const contextName = treeItem.resourceData.context.name;
            const kubeconfigPath = treeItem.resourceData.kubeconfigPath || '';
            
            // Get operator status for this cluster
            const operatorStatusClient = new OperatorStatusClient();
            const operatorStatus = await operatorStatusClient.getStatus(
                kubeconfigPath,
                contextName,
                false // don't force refresh
            );
            
            // Show Event Viewer panel
            EventViewerPanel.show(
                context,
                kubeconfigPath,
                contextName,
                clusterName,
                operatorStatus.mode
            );
        } catch (error: any) {
            vscode.window.showErrorMessage(
                `Failed to open Event Viewer: ${error.message}`
            );
            console.error('Error opening Event Viewer:', error);
        }
    }
);
context.subscriptions.push(openEventViewerCmd);
disposables.push(openEventViewerCmd);
```

### 2. Add import statement

**File**: `src/extension.ts`

Add import at the top of the file with other webview imports:

```typescript
import { EventViewerPanel } from './webview/EventViewerPanel';
```

## Files to Modify

- `src/extension.ts` - Register command and add import

## Testing

Manual test:
1. Restart extension
2. Expand a cluster in tree view
3. Click "Events" tree item
4. Verify Event Viewer webview panel opens
5. Verify panel title shows "Events - {cluster-name}"
6. Close panel and click Events again - verify panel opens again

## Dependencies

- Depends on Story 001 (Events tree item)
- Depends on Story 003 (EventViewerPanel)
- Depends on existing OperatorStatusClient

## Notes

- This completes the basic wiring from tree item to webview panel
- The operator status check enables the webview to show appropriate content (CTA vs event table)
- Error handling ensures failures don't crash the extension
- Pattern follows openDashboard command for consistency

