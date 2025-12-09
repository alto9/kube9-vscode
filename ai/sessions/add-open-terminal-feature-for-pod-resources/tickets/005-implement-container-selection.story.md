---
story_id: 005-implement-container-selection
session_id: add-open-terminal-feature-for-pod-resources
feature_id: [pod-terminal]
spec_id: [pod-terminal-spec]
status: completed
priority: high
estimated_minutes: 20
---

## Objective

Implement container selection logic for multi-container pods using VS Code quick pick dialog.

## Context

When a pod has multiple containers, we need to prompt the user to select which container they want to open a terminal in. Single-container pods skip this step automatically.

## Implementation Steps

1. Open `src/commands/openTerminal.ts`
2. Create `selectContainer` helper function:
   - Takes array of container names as parameter
   - If array has only 1 container, return it immediately (no prompt)
   - If array has multiple containers, show quick pick dialog:
     ```typescript
     vscode.window.showQuickPick(containerNames, {
       title: 'Select Container',
       placeHolder: 'Choose a container to open terminal in'
     })
     ```
   - Return selected container name or undefined if cancelled
3. In main command handler, after getting container list:
   - Call `selectContainer(containerNames)`
   - If result is undefined (user cancelled), return without opening terminal
   - Store selected container name for next step
4. Handle edge case: If no containers found, show error and return

## Files Affected

- `src/commands/openTerminal.ts` - Add container selection logic

## Acceptance Criteria

- [x] Single-container pods automatically use the only container (no prompt shown)
- [x] Multi-container pods show quick pick dialog with container names
- [x] Dialog title is "Select Container"
- [x] Placeholder text provides clear instruction
- [x] User can cancel selection (returns undefined)
- [x] If cancelled, no terminal is opened
- [x] Handles empty container list gracefully

## Dependencies

- Story 004 must be completed (container list extracted from pod status)

