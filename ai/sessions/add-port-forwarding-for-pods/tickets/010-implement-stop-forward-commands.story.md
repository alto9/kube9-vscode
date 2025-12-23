---
story_id: 010-implement-stop-forward-commands
session_id: add-port-forwarding-for-pods
feature_id:
  - pod-port-forwarding
spec_id:
  - port-forwarding-command-spec
status: pending
---

# Implement Stop Forward Commands

## Objective

Implement commands for stopping port forwards: stop single forward, stop all forwards, and show forwards.

## Context

Three commands needed:
- `stopPortForward`: Stop individual forward (from context menu)
- `stopAllPortForwards`: Stop all active forwards (from command palette)
- `showPortForwards`: Focus tree on Port Forwarding category

## Implementation

### File: src/commands/stopPortForward.ts (NEW)

```typescript
export async function stopPortForwardCommand(treeItem: PortForwardTreeItem): Promise<void> {
  // 1. Validate tree item
  // 2. Get forward info from PortForwardManager
  // 3. Show confirmation dialog
  // 4. Call manager.stopForward(forwardId)
  // 5. Show success notification
}
```

### File: src/commands/stopAllPortForwards.ts (NEW)

```typescript
export async function stopAllPortForwardsCommand(): Promise<void> {
  const manager = PortForwardManager.getInstance();
  const forwards = manager.getAllForwards();
  
  if (forwards.length === 0) {
    vscode.window.showInformationMessage('No active port forwards');
    return;
  }
  
  const confirm = await vscode.window.showWarningMessage(
    `Stop all ${forwards.length} active port forward(s)?`,
    'Stop All',
    'Cancel'
  );
  
  if (confirm === 'Stop All') {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Stopping all port forwards...'
    }, async () => {
      await manager.stopAllForwards();
    });
    
    vscode.window.showInformationMessage('All port forwards stopped');
  }
}
```

### File: src/commands/showPortForwards.ts (NEW)

```typescript
export async function showPortForwardsCommand(): Promise<void> {
  // Focus tree view
  await vscode.commands.executeCommand('kube9ClusterView.focus');
  
  // Tree will naturally show Port Forwarding category
  // User can manually expand it if needed
}
```

## Acceptance Criteria

- [ ] stopPortForward command created
- [ ] Confirmation dialog before stopping
- [ ] Calls PortForwardManager.stopForward()
- [ ] Success notification on stop
- [ ] stopAllPortForwards command created
- [ ] Stops all forwards with progress indication
- [ ] showPortForwards focuses tree
- [ ] All commands handle edge cases (no forwards, errors)

## Files Created

- `src/commands/stopPortForward.ts`
- `src/commands/stopAllPortForwards.ts`
- `src/commands/showPortForwards.ts`

## Dependencies

- 004-implement-port-forward-manager-stop-logic
- 009-implement-port-forward-pod-command

## Estimated Time

20 minutes

