---
story_id: 009-implement-namespace-expansion-tracking
session_id: add-first-time-user-interactive-tutorial
feature_id:
  - interactive-tutorial
spec_id:
  - vscode-walkthroughs
status: pending
estimated_time: 25 minutes
---

# Implement Namespace Expansion Tracking

## Objective

Implement custom completion event tracking that fires when users expand a namespace in the tree view, automatically completing Step 3 of the tutorial.

## Context

Step 3 teaches users to navigate resources by expanding namespaces. When a user naturally expands a namespace (without using the fallback command), we want to automatically mark Step 3 as complete.

## Implementation

### File: `src/extension.ts`

Add tree view expansion event listener in the `activate` function:

```typescript
// Assuming you have a tree view instance for the cluster view
// Find where the tree view is created (likely near other tree view setup)

const treeView = vscode.window.createTreeView('kube9ClusterView', {
  treeDataProvider: clusterProvider, // Your existing provider
  showCollapseAll: true
});

// Add expansion event listener for tutorial Step 3 tracking
treeView.onDidExpandElement((event) => {
  // Check if expanded element is a namespace
  if (event.element.contextValue === 'namespace') {
    // Fire completion event for walkthrough Step 3
    vscode.commands.executeCommand(
      'workbench.action.fireWalkthroughCompletionEvent',
      'kube9.onNamespaceExpanded'
    );
  }
});

context.subscriptions.push(treeView);
```

### Alternative: If tree view already exists

If the tree view is already created elsewhere in the codebase, find that location and add the expansion listener there:

```typescript
// In the file where kube9ClusterView tree view is created
existingTreeView.onDidExpandElement((event) => {
  if (event.element.contextValue === 'namespace') {
    vscode.commands.executeCommand(
      'workbench.action.fireWalkthroughCompletionEvent',
      'kube9.onNamespaceExpanded'
    );
  }
});
```

## Acceptance Criteria

- [ ] Tree view expansion event listener added
- [ ] Listener checks for namespace context value
- [ ] Completion event `kube9.onNamespaceExpanded` fires when namespace expanded
- [ ] Step 3 automatically completes when user expands namespace naturally
- [ ] Event only fires for namespace items (not clusters or other resources)
- [ ] No errors when expanding non-namespace items
- [ ] Works with multiple namespaces in different clusters

## Testing

1. Open walkthrough and navigate to Step 3
2. Verify Step 3 is not yet complete
3. In tree view, expand a namespace
4. Verify Step 3 automatically marks as complete
5. Test with multiple namespaces
6. Test with clusters and other resource types (should not trigger)
7. Verify event doesn't fire multiple times for same namespace

## Files Involved

- `src/extension.ts` or relevant tree view setup file

## Dependencies

- Story 002 (Step 3 must exist in walkthrough)
- Story 007 (fallback command provides context for what event to fire)
- Existing tree view implementation with namespace nodes

## Notes

- The contextValue 'namespace' must match what's used in your tree item provider
- If contextValue differs, adjust the condition accordingly
- This provides the natural completion path for Step 3
- The fallback command (story 007) provides an alternative for users without clusters
- Event should fire silently without user notification (unlike fallback)
- Consider debouncing if multiple expansions happen rapidly

