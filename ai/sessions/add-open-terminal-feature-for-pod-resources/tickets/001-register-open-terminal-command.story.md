---
story_id: 001-register-open-terminal-command
session_id: add-open-terminal-feature-for-pod-resources
feature_id: [pod-terminal]
spec_id: [pod-terminal-spec]
status: completed
priority: high
estimated_minutes: 10
---

## Objective

Register the `kube9.openTerminal` command in package.json with proper context menu configuration for Pod resources.

## Context

This is the first step in implementing the Pod Terminal feature. The command needs to be registered in the VS Code extension manifest so it appears in the context menu when right-clicking on Pod resources in the tree view.

## Implementation Steps

1. Open `package.json`
2. Add command definition to `contributes.commands` array:
   ```json
   {
     "command": "kube9.openTerminal",
     "title": "Open Terminal",
     "category": "kube9"
   }
   ```
3. Add context menu entry to `contributes.menus["view/item/context"]` array:
   ```json
   {
     "command": "kube9.openTerminal",
     "when": "view == kube9ClusterView && viewItem == resource:Pod",
     "group": "kube9@2"
   }
   ```
4. Verify JSON syntax is valid

## Files Affected

- `package.json` - Add command and menu registration

## Acceptance Criteria

- [x] Command is defined in `contributes.commands` with title "Open Terminal"
- [x] Context menu entry is added for Pod resources only (`viewItem == resource:Pod`)
- [x] Menu item is positioned in the `kube9@2` group (after Describe, before other actions)
- [x] JSON syntax is valid (no syntax errors)

## Dependencies

None - this is the first story in the sequence

