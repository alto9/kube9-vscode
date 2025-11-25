---
story_id: create-delete-confirmation-dialog
session_id: add-ability-to-delete-kubernetes-resources-from-tr
feature_id: [tree-view-navigation]
spec_id: [tree-view-spec]
diagram_id: []
status: completed
priority: high
estimated_minutes: 25
---

## Objective

Create a confirmation dialog that displays resource details and a force delete checkbox when users attempt to delete a resource.

## Context

Before deleting any resource, users must confirm their action. The dialog should show what they're deleting (type, name, namespace) and provide a force delete option for stuck resources. This story creates the dialog structure without warning messages or actual deletion.

## Implementation Steps

1. Create `src/commands/deleteResource.ts` file
2. Define `DeleteResourceOptions` interface with resourceType, resourceName, namespace, forceDelete properties
3. Implement `showDeleteConfirmation()` function using `vscode.window.showWarningMessage` with modal option
4. Add dialog title: "Delete {resourceType}?"
5. Add dialog message showing resource type, name, and namespace
6. Add "Delete" and "Cancel" buttons
7. Add checkbox using VS Code's QuickPick API for "Force delete (removes finalizers)" option
8. Return confirmed options including forceDelete boolean
9. Update command handler in `extension.ts` to call confirmation dialog

## Files Affected

- `src/commands/deleteResource.ts` - New file with confirmation dialog logic
- `src/extension.ts` - Update command handler to use confirmation dialog

## Acceptance Criteria

- [ ] Clicking "Delete Resource" opens a confirmation dialog
- [ ] Dialog displays resource type, name, and namespace
- [ ] Dialog has "Delete" and "Cancel" buttons
- [ ] Force delete checkbox is available and unchecked by default
- [ ] Clicking "Cancel" closes dialog without action
- [ ] Clicking "Delete" returns confirmation with forceDelete state
- [ ] Dialog is modal (blocks other actions until dismissed)

## Dependencies

- 001-register-delete-resource-command

