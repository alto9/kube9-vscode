---
story_id: implement-scale-command-handler
session_id: add-quick-scale-for-deploymentsstatefulsetsreplica
feature_id: [workload-scaling]
spec_id: [workload-scaling-spec]
status: completed
priority: high
estimated_minutes: 30
---

## Objective

Implement the main command handler function that orchestrates the scaling workflow: get current replicas, show input dialog, scale workload, show notifications.

## Context

This is the main command handler that will be called when the user clicks "Scale" in the context menu. It coordinates all the pieces: validation, kubectl calls, progress notifications, and success/error handling.

## Implementation Steps

1. Open `src/commands/scaleWorkload.ts`

2. Add `scaleWorkloadCommand` async function:
```typescript
export async function scaleWorkloadCommand(treeItem: ClusterTreeItem): Promise<void> {
    try {
        // 1. Validate tree item
        if (!treeItem || !treeItem.contextValue?.startsWith('resource:')) {
            vscode.window.showErrorMessage('Failed to scale: Invalid resource');
            return;
        }
        
        // 2. Extract resource information
        const kind = treeItem.contextValue.replace('resource:', '') as 'Deployment' | 'StatefulSet' | 'ReplicaSet';
        const name = typeof treeItem.label === 'string' ? treeItem.label : treeItem.label?.toString() || '';
        const namespace = treeItem.namespace || 'default';
        const kubeconfigPath = treeItem.kubeconfigPath || '';
        const contextName = treeItem.contextName || '';
        
        if (!name || !kubeconfigPath || !contextName) {
            vscode.window.showErrorMessage('Failed to scale: Missing resource information');
            return;
        }
        
        // 3. Get current replica count
        const currentReplicas = await WorkloadCommands.getCurrentReplicaCount(
            kubeconfigPath,
            contextName,
            kind,
            name,
            namespace
        );
        
        const currentReplicasText = currentReplicas !== null ? currentReplicas.toString() : 'unknown';
        const replicaWord = currentReplicas === 1 ? 'replica' : 'replicas';
        
        // 4. Show input dialog with validation
        const input = await vscode.window.showInputBox({
            title: `Scale ${name}`,
            prompt: 'Enter the desired number of replicas',
            placeHolder: `Current: ${currentReplicasText} ${replicaWord}`,
            validateInput: validateReplicaCount
        });
        
        // 5. Check if user cancelled
        if (input === undefined) {
            return; // User pressed Escape or clicked Cancel
        }
        
        const newReplicaCount = parseInt(input, 10);
        
        // 6. Perform scaling with progress notification
        const success = await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Scaling ${name}...`,
                cancellable: false
            },
            async () => {
                const result = await WorkloadCommands.scaleWorkload(
                    kubeconfigPath,
                    contextName,
                    kind,
                    name,
                    namespace,
                    newReplicaCount
                );
                return result.success;
            }
        );
        
        // 7. Show success notification
        if (success) {
            const newReplicaWord = newReplicaCount === 1 ? 'replica' : 'replicas';
            vscode.window.showInformationMessage(
                `Scaled ${name} to ${newReplicaCount} ${newReplicaWord}`
            );
            
            // Refresh tree view will be handled in next story
        }
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error in scaleWorkloadCommand:', errorMessage);
        vscode.window.showErrorMessage(
            `Failed to scale workload: ${errorMessage}`
        );
    }
}
```

3. Export function at end of file

## Files Affected

- `src/commands/scaleWorkload.ts` - Add main command handler function

## Acceptance Criteria

- [ ] Function extracts resource info from tree item correctly
- [ ] Function validates tree item has required properties
- [ ] Function calls getCurrentReplicaCount before showing dialog
- [ ] Input dialog shows with current replica count in placeholder
- [ ] Input dialog uses validateReplicaCount for real-time validation
- [ ] Function handles user cancellation gracefully (no error shown)
- [ ] Progress notification appears during scaling
- [ ] Success notification uses correct singular/plural ("1 replica" vs "2 replicas")
- [ ] Error notification appears on failure with error details
- [ ] Console logs errors for debugging

## Dependencies

- Story 001 (kubectl functions)
- Story 003 (validation function)

## Technical Notes

- Use `withProgress` for progress notification
- Check for `undefined` input (user cancelled) before calling `parseInt`
- Use proper singular/plural grammar for notifications
- Extract kind from contextValue by removing "resource:" prefix
- Tree refresh will be added in next story

