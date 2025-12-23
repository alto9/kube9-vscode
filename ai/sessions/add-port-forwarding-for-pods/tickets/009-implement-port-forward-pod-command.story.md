---
story_id: 009-implement-port-forward-pod-command
session_id: add-port-forwarding-for-pods
feature_id:
  - pod-port-forwarding
spec_id:
  - port-forwarding-command-spec
status: pending
---

# Implement Port Forward Pod Command

## Objective

Create the `portForwardPod` command that initiates port forwarding from a pod's context menu, including port selection dialogs and validation.

## Context

This command handles the complete workflow:
1. Validate pod is Running
2. Query pod for container ports
3. Show remote port selection dialog
4. Show local port selection dialog with intelligent suggestions
5. Start the port forward via PortForwardManager
6. Show success/error notifications

## Implementation

### File: src/commands/portForwardPod.ts (NEW)

**Command structure**:
```typescript
export async function portForwardPodCommand(treeItem: ClusterTreeItem): Promise<void> {
  // 1. Validate tree item is a Pod
  // 2. Extract pod metadata (name, namespace, context, status)
  // 3. Validate pod status is 'Running'
  // 4. Query pod for container ports
  // 5. Show remote port selection (dropdown + custom option)
  // 6. Show local port selection (with availability check)
  // 7. Call PortForwardManager.startForward()
  // 8. Show success notification with "Open Browser" and "Show Forwards" buttons
  // 9. Handle errors (kubectl not found, RBAC, port conflicts)
}
```

**Port selection dialogs**:
- Remote port: `showQuickPick` with container ports + "Custom port..." option
- Local port: `showInputBox` with validation and auto-suggestion
- Validate ports in range (1024-65535 for local, 1-65535 for remote)

**Error handling**:
- Pod not running → Show error, exit
- kubectl not found → Show error with installation link
- Port conflict → Show error with suggestion to try alternative port
- RBAC permission → Show error with RBAC docs link
- Connection timeout → Show error with retry option

**Success actions**:
```typescript
const action = await vscode.window.showInformationMessage(
  `✅ Port forward established: localhost:${localPort} → ${namespace}/${podName}:${remotePort}`,
  'Open Browser',
  'Show Forwards'
);

if (action === 'Open Browser') {
  vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${localPort}`));
} else if (action === 'Show Forwards') {
  vscode.commands.executeCommand('kube9.showPortForwards');
}
```

## Acceptance Criteria

- [ ] Command file created
- [ ] Tree item validation works
- [ ] Pod status check (must be Running)
- [ ] Container ports queried from pod spec
- [ ] Remote port selection dialog shows ports + custom option
- [ ] Local port selection with intelligent default
- [ ] Port availability check before starting
- [ ] Calls PortForwardManager.startForward()
- [ ] Success notification with action buttons
- [ ] Error handling for all scenarios
- [ ] Progress indication during start

## Files Created

- `src/commands/portForwardPod.ts`

## Dependencies

- 003-implement-port-forward-manager-start-logic

## Estimated Time

30 minutes

