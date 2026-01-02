---
story_id: 006-implement-tutorial-state-management
session_id: add-first-time-user-interactive-tutorial
feature_id:
  - interactive-tutorial
spec_id:
  - vscode-walkthroughs
status: pending
estimated_time: 25 minutes
---

# Implement Tutorial State Management

## Objective

Implement global state management to track tutorial completion and set the VSCode context key that controls when the walkthrough appears.

## Context

The tutorial should only automatically suggest itself to users who haven't completed it. We use VSCode's globalState for persistence and a context key for the `when` clause in package.json.

## Implementation

### File: `src/extension.ts`

Add to the `activate` function:

```typescript
export async function activate(context: vscode.ExtensionContext) {
  // ... existing code ...

  // Check if tutorial has been completed
  const tutorialCompleted = context.globalState.get<boolean>(
    'kube9.tutorialCompleted',
    false
  );

  // Set context for 'when' clause in package.json
  await vscode.commands.executeCommand(
    'setContext',
    'kube9.tutorialCompleted',
    tutorialCompleted
  );

  // Register command to mark tutorial as complete
  const markTutorialComplete = vscode.commands.registerCommand(
    'kube9.internal.markTutorialComplete',
    async () => {
      await context.globalState.update('kube9.tutorialCompleted', true);
      await vscode.commands.executeCommand(
        'setContext',
        'kube9.tutorialCompleted',
        true
      );
      vscode.window.showInformationMessage(
        'Tutorial completed! You can replay it anytime from the Command Palette.'
      );
    }
  );

  context.subscriptions.push(markTutorialComplete);

  // ... rest of activation code ...
}
```

## Acceptance Criteria

- [ ] Tutorial completion status read from globalState on activation
- [ ] Context key `kube9.tutorialCompleted` set correctly
- [ ] Command `kube9.internal.markTutorialComplete` registered
- [ ] Marking complete updates both globalState and context key
- [ ] User receives confirmation message when tutorial marked complete
- [ ] State persists across VSCode restarts
- [ ] Walkthrough respects `when` clause (only shows when not completed)

## Testing

1. Fresh install: Verify tutorial is suggested (tutorialCompleted = false)
2. Run mark complete command manually
3. Verify globalState is updated
4. Verify context key is set to true
5. Restart VSCode
6. Verify tutorial is not auto-suggested
7. Verify tutorial still accessible via command palette

### Manual Testing of State

```typescript
// In debug console:
// Check current state
await vscode.commands.executeCommand('getContext', 'kube9.tutorialCompleted')

// Reset state for testing
await context.globalState.update('kube9.tutorialCompleted', false)
```

## Files Involved

- `src/extension.ts` (add state management logic)

## Dependencies

- Story 001 (walkthrough must exist with `when` clause)

## Notes

- The context key name must match the `when` clause in package.json
- globalState persists across sessions automatically (VSCode feature)
- The mark complete command is internal (not exposed in package.json commands)
- Tutorial completion can be reset by clearing globalState (useful for testing)
- VSCode's Getting Started may have its own tracking that's separate from ours

