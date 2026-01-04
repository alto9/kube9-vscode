---
story_id: 008-register-step4-fallback-command
session_id: add-first-time-user-interactive-tutorial
feature_id:
  - interactive-tutorial
spec_id:
  - vscode-walkthroughs
status: completed
estimated_time: 15 minutes
---

# Register Step 4 Fallback Command

## Objective

Register the `kube9.internal.completeStep4` command that provides manual completion for Step 4 when users don't have resources available.

## Context

Step 4 (View Resources) requires clicking on a pod to view its details, which isn't possible without running pods. This fallback command allows users to complete the step and continue learning.

## Implementation

### File: `src/extension.ts`

Add to the `activate` function:

```typescript
// Step 4 fallback - View Resources
const completeStep4 = vscode.commands.registerCommand(
  'kube9.internal.completeStep4',
  async () => {
    // Fire the completion event that Step 4 expects
    await vscode.commands.executeCommand(
      'workbench.action.fireWalkthroughCompletionEvent',
      'kube9.onPodClicked'
    );
    
    // Helpful message for users without resources
    vscode.window.showInformationMessage(
      'Connect a cluster to view resource details. Click any pod to see its current status, conditions, and events.'
    );
  }
);

context.subscriptions.push(completeStep4);
```

## Acceptance Criteria

- [ ] Command `kube9.internal.completeStep4` registered
- [ ] Command fires walkthrough completion event `kube9.onPodClicked`
- [ ] Helpful message shown to user after completion
- [ ] Command added to context.subscriptions
- [ ] Step 4 marks as complete when command executed
- [ ] Tutorial can progress to Step 5 after using fallback

## Testing

1. Open walkthrough, navigate to Step 4
2. Click "Mark Complete" button in step description
3. Verify completion event fires
4. Verify informational message appears
5. Verify Step 4 marked as complete
6. Verify Step 5 becomes accessible
7. Test with and without actual pods available

## Files Involved

- `src/extension.ts` (register fallback command)

## Dependencies

- Story 003 (Step 4 must exist in walkthrough)

## Notes

- This is an internal command not exposed in package.json commands section
- The command is referenced in Step 4's description as a markdown link
- The completion event name must match what Step 4 expects: `kube9.onPodClicked`
- Provides graceful degradation for users without resources
- The natural completion path (actual pod clicking) will be implemented in story 010

