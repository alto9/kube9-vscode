---
story_id: 007-register-step3-fallback-command
session_id: add-first-time-user-interactive-tutorial
feature_id:
  - interactive-tutorial
spec_id:
  - vscode-walkthroughs
status: completed
estimated_time: 15 minutes
---

# Register Step 3 Fallback Command

## Objective

Register the `kube9.internal.completeStep3` command that provides manual completion for Step 3 when users don't have clusters configured.

## Context

Step 3 (Navigate Resources) requires expanding a namespace, which isn't possible without clusters. This fallback command allows users to mark the step complete and continue the tutorial.

## Implementation

### File: `src/extension.ts`

Add to the `activate` function:

```typescript
// Step 3 fallback - Navigate Resources
const completeStep3 = vscode.commands.registerCommand(
  'kube9.internal.completeStep3',
  async () => {
    // Fire the completion event that Step 3 expects
    await vscode.commands.executeCommand(
      'workbench.action.fireWalkthroughCompletionEvent',
      'kube9.onNamespaceExpanded'
    );
    
    // Helpful message for users without clusters
    vscode.window.showInformationMessage(
      'Great! When you connect a cluster, you can expand namespaces to explore resources.'
    );
  }
);

context.subscriptions.push(completeStep3);
```

## Acceptance Criteria

- [x] Command `kube9.internal.completeStep3` registered
- [x] Command fires walkthrough completion event `kube9.onNamespaceExpanded`
- [x] Helpful message shown to user after completion
- [x] Command added to context.subscriptions
- [x] Step 3 marks as complete when command executed
- [x] Tutorial can progress to Step 4 after using fallback

## Testing

1. Open walkthrough, navigate to Step 3
2. Click "Mark Complete" button in step description
3. Verify completion event fires
4. Verify informational message appears
5. Verify Step 3 marked as complete
6. Verify Step 4 becomes accessible
7. Test with and without actual clusters configured

## Files Involved

- `src/extension.ts` (register fallback command)

## Dependencies

- Story 002 (Step 3 must exist in walkthrough)

## Notes

- This is an internal command not exposed in package.json commands section
- The command is referenced in Step 3's description as a markdown link
- The completion event name must match what Step 3 expects: `kube9.onNamespaceExpanded`
- This provides the "instructional-first" experience for users without resources
- The natural completion path (actual namespace expansion) will be implemented in story 009

