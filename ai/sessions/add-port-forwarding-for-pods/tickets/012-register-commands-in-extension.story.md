---
story_id: 012-register-commands-in-extension
session_id: add-port-forwarding-for-pods
feature_id:
  - pod-port-forwarding
spec_id:
  - port-forwarding-command-spec
  - port-forwarding-manager-spec
status: completed
---

# Register Commands and Manager in Extension

## Objective

Register all port forwarding commands in extension.ts and ensure PortForwardManager is properly initialized and disposed.

## Context

The extension activation needs to:
1. Initialize PortForwardManager singleton
2. Register all commands
3. Register manager for cleanup on deactivate

## Implementation

### File: src/extension.ts

**In `activate()` function**:
```typescript
// Initialize PortForwardManager
const portForwardManager = PortForwardManager.getInstance();

// Register for cleanup
context.subscriptions.push({
  dispose: () => portForwardManager.dispose()
});

// Register port forward commands
context.subscriptions.push(
  vscode.commands.registerCommand('kube9.portForwardPod', portForwardPodCommand),
  vscode.commands.registerCommand('kube9.stopPortForward', stopPortForwardCommand),
  vscode.commands.registerCommand('kube9.stopAllPortForwards', stopAllPortForwardsCommand),
  vscode.commands.registerCommand('kube9.showPortForwards', showPortForwardsCommand)
);

// Register status bar command
context.subscriptions.push(
  vscode.commands.registerCommand('kube9.showPortForwards', () => {
    vscode.commands.executeCommand('kube9ClusterView.focus');
  })
);
```

**Add imports**:
```typescript
import { PortForwardManager } from './services/PortForwardManager';
import { portForwardPodCommand } from './commands/portForwardPod';
import { stopPortForwardCommand } from './commands/stopPortForward';
import { stopAllPortForwardsCommand } from './commands/stopAllPortForwards';
import { showPortForwardsCommand } from './commands/showPortForwards';
```

## Acceptance Criteria

- [x] PortForwardManager initialized in activate()
- [x] Manager registered for disposal on deactivate
- [x] All 4 commands registered
- [x] Commands properly imported
- [x] Extension activates without errors
- [x] Manager cleaned up properly on deactivate (all forwards stopped)
- [x] No orphaned kubectl processes

## Files Modified

- `src/extension.ts`

## Dependencies

- 002-create-port-forward-manager-singleton
- 009-implement-port-forward-pod-command
- 010-implement-stop-forward-commands
- 011-register-commands-in-package-json

## Estimated Time

10 minutes

