---
story_id: 004-implement-pod-status-query
session_id: add-open-terminal-feature-for-pod-resources
feature_id: [pod-terminal]
spec_id: [pod-terminal-spec]
status: pending
priority: high
estimated_minutes: 25
---

## Objective

Implement pod status query to verify the pod is running and extract the container list before attempting to open a terminal.

## Context

Before opening a terminal, we need to verify the pod exists and is in Running state. We also need to get the list of containers to handle multi-container pods. This is done with a single `kubectl get pod` command.

## Implementation Steps

1. Open `src/commands/openTerminal.ts`
2. Add import for execFile:
   ```typescript
   import { execFile } from 'child_process';
   import { promisify } from 'util';
   const execFileAsync = promisify(execFile);
   ```
3. Create interface for pod status response:
   ```typescript
   interface PodStatusResponse {
     metadata: { name: string; namespace: string };
     spec: {
       containers: Array<{ name: string; image: string }>;
       initContainers?: Array<{ name: string; image: string }>;
     };
     status: {
       phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown';
     };
   }
   ```
4. Implement `queryPodStatus` helper function:
   - Build kubectl command: `['get', 'pod', name, '-n', namespace, '--context', context, '-o', 'json']`
   - Execute kubectl command using execFileAsync
   - Parse JSON response
   - Return PodStatusResponse object
5. Add error handling for kubectl execution failures
6. In main command handler, call `queryPodStatus` after validation
7. Check if `status.phase === 'Running'`
8. If not Running, show error: `Cannot open terminal: Pod '<name>' is not in Running state (current: <phase>)`
9. Extract container names from `spec.containers` (exclude `initContainers`)
10. Store container list for next step

## Files Affected

- `src/commands/openTerminal.ts` - Add pod status query logic

## Acceptance Criteria

- [ ] Interface defined for pod status response structure
- [ ] Helper function queries pod using kubectl
- [ ] Parses JSON response correctly
- [ ] Validates pod is in Running state
- [ ] Extracts regular container names (excludes init containers)
- [ ] Shows appropriate error if pod not Running
- [ ] Handles kubectl errors gracefully
- [ ] Timeout set to 30 seconds (follow existing patterns)

## Dependencies

- Story 003 must be completed (validation logic exists)

