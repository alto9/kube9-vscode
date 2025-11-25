---
story_id: register-delete-resource-command
session_id: add-ability-to-delete-kubernetes-resources-from-tr
feature_id: [tree-view-navigation]
spec_id: [tree-view-spec]
diagram_id: []
status: completed
priority: high
estimated_minutes: 20
---

## Objective

Register the `kube9.deleteResource` command and add it to the tree view context menu for all resource items.

## Context

This is the foundation for the delete functionality. Users need to see "Delete Resource" in the context menu when right-clicking on any resource in the tree view. This story establishes the command registration and context menu integration without implementing the actual deletion logic.

## Implementation Steps

1. Open `package.json` and add the delete resource command to the `contributes.commands` section
2. Add context menu registration in `contributes.menus.view/item/context` with condition `viewItem =~ /^resource/` and group `kube9@2`
3. Open `src/extension.ts` and register the command handler in the `activate()` function using `vscode.commands.registerCommand`
4. Create a placeholder command handler that shows an info message "Delete functionality will be implemented"
5. Ensure the command receives the tree item with resource metadata (type, name, namespace)

## Files Affected

- `package.json` - Add command and context menu contributions
- `src/extension.ts` - Register command handler in activate()

## Acceptance Criteria

- [x] Right-clicking on any resource in the tree view shows "Delete Resource" option
- [x] Context menu item appears for Pods, Deployments, Services, ConfigMaps, Secrets, and all other resources
- [x] Clicking "Delete Resource" shows placeholder message
- [x] Command receives correct tree item data including resourceType, resourceName, and namespace
- [x] No errors in VS Code extension host console

## Dependencies

None - this is the foundation story

