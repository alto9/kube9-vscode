---
story_id: 006-add-context-not-found-error-handling
session_id: setting-namespace-modifies-wrong-context
feature_id: [context-aware-namespace-management]
spec_id: [kubectl-context-operations-spec]
status: pending
---

# Add Error Handling for Context Not Found Scenarios

## Objective

Enhance error handling in `setNamespace()` and `clearNamespace()` functions to detect and display user-friendly error messages when a specified context does not exist in kubeconfig.

## Current State

**Location**: `src/utils/kubectlContext.ts`

Current implementation:
- Has generic error handling for kubectl failures
- Logs errors to console
- Returns false on failure

## Changes Required

### 1. Parse kubectl Error Output

In both `setNamespace()` and `clearNamespace()`, enhance error handling:

```typescript
try {
  await execFileAsync('kubectl', args, {
    timeout: KUBECTL_TIMEOUT_MS,
    env: { ...process.env }
  });
  
  namespaceCache.invalidateCache();
  return true;
  
} catch (error: unknown) {
  // Extract stderr
  const stderr = error instanceof Error && 'stderr' in error 
    ? (error as any).stderr 
    : '';
  
  // Check for context not found
  if (stderr.includes('not found')) {
    console.error(`Context '${contextName}' not found in kubeconfig`);
    return false;
  }
  
  // Check for permission denied
  if (stderr.includes('unable to write') || stderr.includes('permission denied')) {
    console.error('Permission denied to modify kubeconfig');
    return false;
  }
  
  // Generic error
  console.error('Failed to set namespace:', error);
  return false;
}
```

### 2. Update Command Handlers

In `setActiveNamespaceCommand()` and `clearActiveNamespaceCommand()`, provide context-specific error messages:

```typescript
if (!success) {
  // Check if context exists (could query kubectl contexts)
  vscode.window.showErrorMessage(
    `Failed to set namespace on context '${contextName}'. The context may not exist in your kubeconfig.`
  );
  return;
}
```

## Acceptance Criteria

- [ ] Functions detect "not found" errors from kubectl stderr
- [ ] Functions detect "permission denied" errors from kubectl stderr
- [ ] Specific error messages logged for each error type
- [ ] Command handlers display user-friendly error messages
- [ ] Error message suggests context may not exist in kubeconfig
- [ ] Tree view does NOT update checkmark on error

## Files Modified

- `src/utils/kubectlContext.ts` (setNamespace and clearNamespace error handling)
- `src/commands/namespaceCommands.ts` (error messages in command handlers)

## Dependencies

- Stories 001-004 should be completed first

## Testing Notes

- Test with a non-existent context name
- Verify appropriate error message is displayed
- Verify tree view does not show checkmark on failed operation

## Estimated Time

15-20 minutes

