---
story_id: 005-register-show-tutorial-command
session_id: add-first-time-user-interactive-tutorial
feature_id:
  - interactive-tutorial
spec_id:
  - vscode-walkthroughs
status: pending
estimated_time: 15 minutes
---

# Register Show Tutorial Command

## Objective

Register the `kube9.showTutorial` command that opens the walkthrough, allowing users to replay the tutorial at any time.

## Context

Users need a way to manually access the tutorial after their first time or after dismissing it. This command provides that replay capability through the Command Palette.

## Implementation

### File: `package.json`

Add to the `commands` section in `contributes`:

```json
{
  "command": "kube9.showTutorial",
  "title": "Show Getting Started Tutorial",
  "category": "Kube9"
}
```

### File: `src/extension.ts`

Add command registration in the `activate` function:

```typescript
// Register show tutorial command
const showTutorialCommand = vscode.commands.registerCommand(
  'kube9.showTutorial',
  async () => {
    // Open the walkthrough using VSCode API
    await vscode.commands.executeCommand(
      'workbench.action.openWalkthrough',
      'alto9.kube9#kube9.gettingStarted',
      false // Don't open in a new window
    );
  }
);

context.subscriptions.push(showTutorialCommand);
```

## Acceptance Criteria

- [ ] Command `kube9.showTutorial` registered in package.json
- [ ] Command appears in Command Palette as "Kube9: Show Getting Started Tutorial"
- [ ] Command implementation added to extension.ts activate function
- [ ] Command opens the kube9.gettingStarted walkthrough
- [ ] Command added to context.subscriptions for proper cleanup
- [ ] Command works from Command Palette
- [ ] Opening walkthrough doesn't create a new window

## Testing

1. Open Command Palette (Cmd/Ctrl+Shift+P)
2. Type "Kube9: Show Getting Started Tutorial"
3. Verify command appears
4. Execute command
5. Verify walkthrough opens correctly
6. Verify no new window is created
7. Test command multiple times to ensure reliability

## Files Involved

- `package.json` (add command contribution)
- `src/extension.ts` (register command handler)

## Dependencies

- Story 001 (walkthrough must exist in package.json)

## Notes

- The walkthrough ID must match the one defined in story 001: `kube9.gettingStarted`
- Publisher ID should be `alto9.kube9` (verify in package.json "publisher" field)
- This command is accessible regardless of tutorial completion status
- Command provides the "replay" functionality mentioned in the feature scenarios

