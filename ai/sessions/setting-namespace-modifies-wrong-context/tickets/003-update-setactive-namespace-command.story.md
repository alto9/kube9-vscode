---
story_id: 003-update-setactive-namespace-command
session_id: setting-namespace-modifies-wrong-context
feature_id: [context-aware-namespace-management]
spec_id: [kubectl-context-operations-spec]
status: completed
---

# Update setActiveNamespaceCommand() to Extract and Pass Context

## Objective

Modify `setActiveNamespaceCommand()` in `src/commands/namespaceCommands.ts` to extract the context name from the tree item and pass it to `setNamespace()`, ensuring namespace is set on the clicked cluster's context.

## Current State

**Location**: `src/commands/namespaceCommands.ts` lines 11-38

Current implementation:
- Receives `ClusterTreeItem` parameter
- Extracts namespace name from `item.label`
- Does NOT extract context name
- Calls `setNamespace(namespaceName)` without context

## Changes Required

### 1. Extract Context Name from Tree Item

Add after namespace extraction:

```typescript
const namespaceName = typeof item.label === 'string' 
  ? item.label 
  : item.label?.toString();
const contextName = item.resourceData?.context?.name;
```

### 2. Add Validation

```typescript
if (!namespaceName || !contextName) {
  vscode.window.showErrorMessage(
    'Failed to set namespace: missing namespace name or context information'
  );
  return;
}
```

### 3. Pass Context to setNamespace

Update the function call:

```typescript
const success = await vscode.window.withProgress(
  {
    location: vscode.ProgressLocation.Notification,
    title: `Setting namespace '${namespaceName}' on context '${contextName}'...`,
    cancellable: false
  },
  async () => {
    return await setNamespace(namespaceName, contextName);
  }
);
```

### 4. Update Success/Error Messages

```typescript
if (success) {
  vscode.window.showInformationMessage(
    `Namespace '${namespaceName}' set on context '${contextName}'`
  );
  // Existing tree refresh and status bar update
} else {
  vscode.window.showErrorMessage(
    `Failed to set namespace '${namespaceName}' on context '${contextName}'`
  );
}
```

## Acceptance Criteria

- [x] Function extracts `contextName` from `item.resourceData?.context?.name`
- [x] Function validates both `namespaceName` and `contextName` are present
- [x] Function displays error if either is missing
- [x] Function passes both `namespaceName` and `contextName` to `setNamespace()`
- [x] Progress notification mentions both namespace and context
- [x] Success message mentions both namespace and context
- [x] Error message mentions both namespace and context
- [x] Tree refresh and status bar update still occur on success

## Files Modified

- `src/commands/namespaceCommands.ts` (lines 11-38 approximately)

## Dependencies

- Story 001 must be completed (setNamespace signature updated)

## Testing Notes

- Verify tree item structure includes `resourceData.context.name`
- Test with multiple contexts to ensure correct context is targeted
- Verify error handling when context information is missing

## Estimated Time

20-25 minutes

