---
story_id: 010-implement-pod-click-tracking
session_id: add-first-time-user-interactive-tutorial
feature_id:
  - interactive-tutorial
spec_id:
  - vscode-walkthroughs
status: pending
estimated_time: 25 minutes
---

# Implement Pod Click Tracking

## Objective

Implement custom completion event tracking that fires when users click on a pod in the tree view, automatically completing Step 4 of the tutorial.

## Context

Step 4 teaches users to view resource details by clicking on pods. When a user naturally clicks a pod (without using the fallback command), we want to automatically mark Step 4 as complete.

## Implementation

### File: `src/extension.ts` or tree view handler file

Add selection change event listener:

```typescript
// Assuming you have a tree view instance for the cluster view
// This should be in the same location as story 009's implementation

treeView.onDidChangeSelection((event) => {
  // Check if user selected anything
  if (event.selection.length > 0) {
    const selectedItem = event.selection[0];
    
    // Check if selected item is a pod
    if (selectedItem.contextValue === 'pod') {
      // Fire completion event for walkthrough Step 4
      vscode.commands.executeCommand(
        'workbench.action.fireWalkthroughCompletionEvent',
        'kube9.onPodClicked'
      );
    }
  }
});
```

### Alternative: In existing click handler

If pods already have a click handler, add the event there:

```typescript
// In the existing pod click/selection handler
async function handlePodSelection(pod: PodTreeItem) {
  // Fire tutorial completion event
  await vscode.commands.executeCommand(
    'workbench.action.fireWalkthroughCompletionEvent',
    'kube9.onPodClicked'
  );
  
  // ... existing pod viewing logic ...
}
```

## Acceptance Criteria

- [ ] Tree view selection event listener added
- [ ] Listener checks for pod context value
- [ ] Completion event `kube9.onPodClicked` fires when pod clicked
- [ ] Step 4 automatically completes when user clicks pod naturally
- [ ] Event only fires for pod items (not other resources)
- [ ] No errors when clicking non-pod items
- [ ] Works with pods across different namespaces
- [ ] Event fires even if describe view doesn't open (permissions, etc.)

## Testing

1. Open walkthrough and navigate to Step 4
2. Verify Step 4 is not yet complete
3. In tree view, click on a pod
4. Verify Step 4 automatically marks as complete
5. Test with multiple pods
6. Test with other resource types (should not trigger)
7. Verify event doesn't fire multiple times for same pod
8. Test scenario where pod click doesn't successfully open describe view

## Files Involved

- `src/extension.ts` or relevant tree view handler file
- May need to update pod click handler if it exists

## Dependencies

- Story 003 (Step 4 must exist in walkthrough)
- Story 008 (fallback command provides context for what event to fire)
- Story 009 (similar pattern for event tracking)
- Existing tree view implementation with pod nodes

## Notes

- The contextValue 'pod' must match what's used in your tree item provider
- If contextValue differs, adjust the condition accordingly
- This provides the natural completion path for Step 4
- The fallback command (story 008) provides an alternative for users without pods
- Event should fire silently without user notification (unlike fallback)
- Consider firing event BEFORE attempting to open describe view (more reliable)
- If pods can be selected but not clicked, adjust event listener accordingly

