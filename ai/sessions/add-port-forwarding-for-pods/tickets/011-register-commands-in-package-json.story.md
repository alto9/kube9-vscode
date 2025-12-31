---
story_id: 011-register-commands-in-package-json
session_id: add-port-forwarding-for-pods
feature_id:
  - pod-port-forwarding
spec_id:
  - port-forwarding-command-spec
status: completed
---

# Register Commands in package.json

## Objective

Register all port forwarding commands in package.json with appropriate context menus and command palette visibility.

## Context

Need to register 4 commands with proper visibility conditions:
- `kube9.portForwardPod`: Pod context menu only
- `kube9.stopPortForward`: Port forward item context menu only
- `kube9.stopAllPortForwards`: Command palette
- `kube9.showPortForwards`: Command palette and status bar

## Implementation

### File: package.json

**Add to `contributes.commands`**:
```json
{
  "command": "kube9.portForwardPod",
  "title": "Port Forward",
  "category": "kube9"
},
{
  "command": "kube9.stopPortForward",
  "title": "Stop Port Forward",
  "category": "kube9"
},
{
  "command": "kube9.stopAllPortForwards",
  "title": "Stop All Port Forwards",
  "category": "kube9"
},
{
  "command": "kube9.showPortForwards",
  "title": "Show Port Forwards",
  "category": "kube9"
}
```

**Add to `contributes.menus.view/item/context`**:
```json
{
  "command": "kube9.portForwardPod",
  "when": "view == kube9ClusterView && viewItem == resource:Pod",
  "group": "kube9-networking@1"
},
{
  "command": "kube9.stopPortForward",
  "when": "view == kube9ClusterView && viewItem == portForward",
  "group": "kube9@1"
}
```

**Add to `contributes.menus.commandPalette`**:
```json
{
  "command": "kube9.portForwardPod",
  "when": "false"
},
{
  "command": "kube9.stopPortForward",
  "when": "false"
},
{
  "command": "kube9.showPortForwards",
  "when": "true"
},
{
  "command": "kube9.stopAllPortForwards",
  "when": "true"
}
```

## Acceptance Criteria

- [x] All 4 commands registered in commands array
- [x] portForwardPod shows in Pod context menu only
- [x] stopPortForward shows in port forward item context menu only
- [x] stopAllPortForwards visible in command palette
- [x] showPortForwards visible in command palette
- [x] portForwardPod hidden from command palette
- [x] stopPortForward hidden from command palette
- [x] No JSON syntax errors

## Files Modified

- `package.json`

## Dependencies

- 009-implement-port-forward-pod-command
- 010-implement-stop-forward-commands

## Estimated Time

10 minutes

