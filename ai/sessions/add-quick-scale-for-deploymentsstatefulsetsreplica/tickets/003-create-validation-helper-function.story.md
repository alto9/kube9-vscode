---
story_id: create-validation-helper-function
session_id: add-quick-scale-for-deploymentsstatefulsetsreplica
feature_id: [workload-scaling]
spec_id: [workload-scaling-spec]
status: completed
priority: high
estimated_minutes: 15
---

## Objective

Create a validation helper function for replica count input that will be used by the VSCode input dialog.

## Context

The validation function needs to check:
- Input is not empty
- Input is numeric
- Value is >= 0 (allow zero for shutdown scenarios)
- Value is <= 1000 (reasonable maximum)

The function will be used in `showInputBox`'s `validateInput` callback.

## Implementation Steps

1. Create new file `src/commands/scaleWorkload.ts`

2. Add imports:
```typescript
import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { WorkloadCommands } from '../kubectl/WorkloadCommands';
```

3. Add validation result interface:
```typescript
interface ValidationResult {
    valid: boolean;
    error?: string;
}
```

4. Add `validateReplicaCount` function:
```typescript
function validateReplicaCount(input: string): string | undefined {
    // Check if empty
    if (!input || input.trim() === '') {
        return 'Replica count is required';
    }
    
    // Check if numeric
    const count = parseInt(input, 10);
    if (isNaN(count)) {
        return 'Replica count must be a number';
    }
    
    // Check minimum (allow 0)
    if (count < 0) {
        return 'Replica count must be a positive number (0 or greater)';
    }
    
    // Check maximum
    if (count > 1000) {
        return 'Replica count must not exceed 1000';
    }
    
    // Valid input
    return undefined;
}
```

**Note**: Return `undefined` for valid input, error string for invalid input (VSCode pattern)

5. Export function for testing:
```typescript
export { validateReplicaCount };
```

## Files Affected

- `src/commands/scaleWorkload.ts` - New file with validation function

## Acceptance Criteria

- [x] Function returns error for empty input
- [x] Function returns error for non-numeric input ("abc")
- [x] Function returns error for negative values ("-5")
- [x] Function returns error for values > 1000 ("10000")
- [x] Function returns undefined for valid values (0, 1, 500, 1000)
- [x] Function returns undefined for "0" (zero is valid)
- [x] Function follows VSCode validation pattern (undefined = valid)

## Dependencies

- None (can be done in parallel with stories 001, 002)

## Technical Notes

- VSCode's `validateInput` expects `string | undefined`
- Return `undefined` for valid input
- Return error message string for invalid input
- Use `parseInt` with base 10
- Check `isNaN` for non-numeric detection

