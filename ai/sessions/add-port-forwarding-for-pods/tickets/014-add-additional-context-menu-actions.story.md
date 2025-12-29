---
story_id: 014-add-additional-context-menu-actions
session_id: add-port-forwarding-for-pods
feature_id:
  - pod-port-forwarding
spec_id:
  - port-forwarding-command-spec
status: completed
---

# Add Additional Context Menu Actions

## Objective

Implement additional convenience actions for port forward items: Copy Local URL, Copy Address, View Pod, and Restart Forward.

## Context

Port forward items should have helpful context menu actions beyond just stopping. These actions improve user experience and productivity.

## Implementation

### File: src/commands/copyPortForwardURL.ts (NEW)

```typescript
export async function copyPortForwardURLCommand(treeItem: PortForwardTreeItem): Promise<void> {
  const manager = PortForwardManager.getInstance();
  const forward = manager.getForward(treeItem.forwardId);
  
  if (forward) {
    const url = `http://localhost:${forward.localPort}`;
    await vscode.env.clipboard.writeText(url);
    vscode.window.showInformationMessage(`Copied: ${url}`);
  }
}
```

### File: src/commands/viewPortForwardPod.ts (NEW)

```typescript
export async function viewPortForwardPodCommand(treeItem: PortForwardTreeItem): Promise<void> {
  const manager = PortForwardManager.getInstance();
  const forward = manager.getForward(treeItem.forwardId);
  
  if (forward) {
    // Focus tree on the pod (implementation depends on tree provider)
    // This might need coordination with tree provider to expand and focus
  }
}
```

### File: src/commands/restartPortForward.ts (NEW)

```typescript
export async function restartPortForwardCommand(treeItem: PortForwardTreeItem): Promise<void> {
  const manager = PortForwardManager.getInstance();
  const forward = manager.getForward(treeItem.forwardId);
  
  if (forward) {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Restarting port forward...`
    }, async () => {
      const config = {
        podName: forward.podName,
        namespace: forward.namespace,
        context: forward.context,
        localPort: forward.localPort,
        remotePort: forward.remotePort
      };
      
      await manager.stopForward(forward.id);
      await manager.startForward(config);
    });
  }
}
```

### Update package.json

Add commands and menu entries:

```json
"commands": [
  {
    "command": "kube9.copyPortForwardURL",
    "title": "Copy Local URL"
  },
  {
    "command": "kube9.viewPortForwardPod",
    "title": "View Pod"
  },
  {
    "command": "kube9.restartPortForward",
    "title": "Restart Forward"
  }
],
"menus": {
  "view/item/context": [
    {
      "command": "kube9.copyPortForwardURL",
      "when": "view == kube9ClusterView && viewItem == portForward",
      "group": "kube9@2"
    },
    {
      "command": "kube9.viewPortForwardPod",
      "when": "view == kube9ClusterView && viewItem == portForward",
      "group": "kube9@3"
    },
    {
      "command": "kube9.restartPortForward",
      "when": "view == kube9ClusterView && viewItem == portForward",
      "group": "kube9@4"
    }
  ]
}
```

## Acceptance Criteria

- [ ] Copy Local URL command created
- [ ] Copies `http://localhost:PORT` to clipboard
- [ ] View Pod command created
- [ ] Focuses tree on associated pod
- [ ] Restart Forward command created
- [ ] Stops and restarts forward with same config
- [ ] All commands registered in package.json
- [ ] Context menu shows all actions
- [ ] Commands work without errors

## Files Created

- `src/commands/copyPortForwardURL.ts`
- `src/commands/viewPortForwardPod.ts`
- `src/commands/restartPortForward.ts`

## Files Modified

- `package.json`
- `src/extension.ts` (register commands)

## Dependencies

- 010-implement-stop-forward-commands
- 011-register-commands-in-package-json
- 012-register-commands-in-extension

## Estimated Time

20 minutes

