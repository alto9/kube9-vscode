---
story_id: 004-implement-rollout-watch
session_id: add-restartrollout-restart-for-deployments-and-sta
feature_id: [workload-restart]
spec_id: [workload-restart-spec]
diagram_id: [workload-restart-flow]
status: pending
priority: high
estimated_minutes: 30
---

# Implement Rollout Watch Functionality

## Objective
Implement logic to watch rollout status when user checks "Wait for rollout to complete" option, with progress updates and 5-minute timeout.

## Context
When users choose to wait for rollout completion, the extension should poll the workload status every 2 seconds, update the progress notification with replica counts, and complete when all replicas are ready. Must timeout after 5 minutes to prevent indefinite waiting.

## Implementation Steps

1. Create function `watchRolloutStatus(name, namespace, kind, progress)`
2. Set constants:
   - `maxWaitTime = 300000` (5 minutes in ms)
   - `pollInterval = 2000` (2 seconds in ms)
3. Implement polling loop:
   - Start timer with `Date.now()`
   - While elapsed time < maxWaitTime:
     - Get workload status (desiredReplicas, readyReplicas, updatedReplicas, availableReplicas)
     - Check if rollout complete (all counts match desired)
     - Update progress notification: `Rolling update in progress (X/Y ready)...`
     - Sleep for pollInterval
4. Create function `isRolloutComplete(status)`:
   - Returns true when readyReplicas === desiredReplicas && updatedReplicas === desiredReplicas && availableReplicas === desiredReplicas
5. Throw timeout error if loop exits without completion
6. Integrate into command handler:
   - Only call watchRolloutStatus if `waitForRollout` is true
   - Skip watch if checkbox unchecked (show success immediately)

## Files Affected
- `src/commands/restartWorkload.ts` - Add rollout watch logic
- `src/kubernetes/client.ts` - Add workload status query function

## Acceptance Criteria
- [ ] Polls workload status every 2 seconds
- [ ] Updates progress notification with replica counts
- [ ] Completes successfully when all replicas ready
- [ ] Throws timeout error after 5 minutes
- [ ] Only watches when "Wait for rollout" is checked
- [ ] Shows success immediately if watch is skipped
- [ ] Works for Deployments, StatefulSets, and DaemonSets
- [ ] Progress messages are clear and informative

## Dependencies
- 003-implement-restart-annotation-logic (watch starts after annotation applied)

