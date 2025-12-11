---
story_id: 002-update-clearnamespace-function-signature
session_id: setting-namespace-modifies-wrong-context
feature_id: [context-aware-namespace-management]
spec_id: [kubectl-context-operations-spec]
status: completed
---

# Update clearNamespace() Function Signature and Implementation

## Objective

Modify the `clearNamespace()` function in `src/utils/kubectlContext.ts` to accept an optional `contextName` parameter and build the kubectl command accordingly, mirroring the changes made to `setNamespace()`.

## Current State

**Location**: `src/utils/kubectlContext.ts` around line 241

Current implementation likely uses `--current` flag similar to setNamespace().

## Changes Required

### 1. Update Function Signature

```typescript
export async function clearNamespace(contextName?: string): Promise<boolean>
```

### 2. Update kubectl Command Construction

Use conditional logic matching setNamespace():

```typescript
const args = ['config', 'set-context'];

if (contextName) {
  args.push(contextName);
} else {
  args.push('--current');
}

args.push('--namespace=');  // Empty string clears namespace
```

### 3. Maintain Existing Logic

- Keep timeout: KUBECTL_TIMEOUT_MS
- Keep cache invalidation after success
- Keep existing error handling

## Acceptance Criteria

- [x] Function signature includes optional `contextName?: string` parameter
- [x] When `contextName` is provided, command uses specific context: `kubectl config set-context <contextName> --namespace=`
- [x] When `contextName` is NOT provided, command uses `--current`: `kubectl config set-context --current --namespace=`
- [x] Empty namespace value (`--namespace=`) properly clears the namespace
- [x] Cache invalidation still called after successful execution
- [x] Function still returns `true` on success, `false` on failure
- [x] Backward compatibility maintained

## Files Modified

- `src/utils/kubectlContext.ts` (function around line 250)
- `src/test/suite/utils/kubectlContext.test.ts` (added tests for contextName parameter)

## Dependencies

- Story 001 should be completed first for consistency

## Testing Notes

Test backward compatibility:
- Call `clearNamespace()` without contextName → should use `--current`
- Call `clearNamespace('minikube')` with contextName → should target 'minikube'

## Estimated Time

10-15 minutes

