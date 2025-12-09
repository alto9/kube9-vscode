---
story_id: 001-update-setnamespace-function-signature
session_id: setting-namespace-modifies-wrong-context
feature_id: [context-aware-namespace-management]
spec_id: [kubectl-context-operations-spec]
status: pending
---

# Update setNamespace() Function Signature and Implementation

## Objective

Modify the `setNamespace()` function in `src/utils/kubectlContext.ts` to accept an optional `contextName` parameter and build the kubectl command accordingly, targeting either a specific context or using `--current` for backward compatibility.

## Current State

**Location**: `src/utils/kubectlContext.ts` lines 193-214

Current signature:
```typescript
export async function setNamespace(namespace: string): Promise<boolean>
```

Current implementation always uses `--current` flag:
```typescript
await execFileAsync('kubectl', [
  'config',
  'set-context',
  '--current',
  `--namespace=${namespace}`
], ...);
```

## Changes Required

### 1. Update Function Signature

```typescript
export async function setNamespace(
  namespace: string, 
  contextName?: string
): Promise<boolean>
```

### 2. Update kubectl Command Construction

Replace hardcoded `--current` with conditional logic:

```typescript
const args = ['config', 'set-context'];

if (contextName) {
  args.push(contextName);
} else {
  args.push('--current');
}

args.push(`--namespace=${namespace}`);
```

### 3. Maintain Existing Logic

- Keep parameter validation (namespace is non-empty string)
- Keep timeout: KUBECTL_TIMEOUT_MS
- Keep cache invalidation after success
- Keep existing error handling

## Acceptance Criteria

- [ ] Function signature includes optional `contextName?: string` parameter
- [ ] When `contextName` is provided, command uses specific context: `kubectl config set-context <contextName> --namespace=<namespace>`
- [ ] When `contextName` is NOT provided, command uses `--current`: `kubectl config set-context --current --namespace=<namespace>`
- [ ] Parameter validation still checks namespace is non-empty
- [ ] Cache invalidation still called after successful execution
- [ ] Function still returns `true` on success, `false` on failure
- [ ] No existing functionality is broken (backward compatibility maintained)

## Files Modified

- `src/utils/kubectlContext.ts` (function around lines 193-214)

## Testing Notes

Test backward compatibility:
- Call `setNamespace('default')` without contextName → should use `--current`
- Call `setNamespace('default', 'minikube')` with contextName → should target 'minikube'

## Estimated Time

15-20 minutes

