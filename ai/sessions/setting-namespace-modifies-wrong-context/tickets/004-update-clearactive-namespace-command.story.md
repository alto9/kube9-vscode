---
story_id: 004-update-clearactive-namespace-command
session_id: setting-namespace-modifies-wrong-context
feature_id: [context-aware-namespace-management]
spec_id: [kubectl-context-operations-spec]
status: pending
---

# Update clearActiveNamespaceCommand() to Extract and Pass Context

## Objective

Modify `clearActiveNamespaceCommand()` in `src/commands/namespaceCommands.ts` to extract the context name from the tree item and pass it to `clearNamespace()`, ensuring the namespace is cleared from the correct cluster's context.

## Current State

**Location**: `src/commands/namespaceCommands.ts`

Current implementation likely:
- Receives `ClusterTreeItem` parameter
- Does NOT extract context name
- Calls `clearNamespace()` without context

## Changes Required

### 1. Extract Context Name from Tree Item

```typescript
const contextName = item.resourceData?.context?.name;
```

### 2. Add Validation

```typescript
if (!contextName) {
  vscode.window.showErrorMessage(
    'Failed to clear namespace: missing context information'
  );
  return;
}
```

### 3. Pass Context to clearNamespace

```typescript
const success = await vscode.window.withProgress(
  {
    location: vscode.ProgressLocation.Notification,
    title: `Clearing namespace on context '${contextName}'...`,
    cancellable: false
  },
  async () => {
    return await clearNamespace(contextName);
  }
);
```

### 4. Update Success/Error Messages

```typescript
if (success) {
  vscode.window.showInformationMessage(
    `Namespace cleared on context '${contextName}'`
  );
  // Existing tree refresh and status bar update
} else {
  vscode.window.showErrorMessage(
    `Failed to clear namespace on context '${contextName}'`
  );
}
```

## Acceptance Criteria

- [ ] Function extracts `contextName` from `item.resourceData?.context?.name`
- [ ] Function validates `contextName` is present
- [ ] Function displays error if context is missing
- [ ] Function passes `contextName` to `clearNamespace()`
- [ ] Progress notification mentions context
- [ ] Success message mentions context
- [ ] Error message mentions context
- [ ] Tree refresh and status bar update still occur on success

## Files Modified

- `src/commands/namespaceCommands.ts`

## Dependencies

- Story 002 must be completed (clearNamespace signature updated)

## Testing Notes

- Test with multiple contexts to ensure correct context is cleared
- Verify checkmark is removed from correct cluster's namespace
- Verify error handling when context information is missing

## Estimated Time

15-20 minutes

