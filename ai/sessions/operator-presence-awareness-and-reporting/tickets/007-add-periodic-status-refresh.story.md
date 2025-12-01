---
story_id: add-periodic-status-refresh
session_id: operator-presence-awareness-and-reporting
feature_id: [operator-presence-awareness]
spec_id: [operator-status-api-spec]
status: completed
priority: medium
estimated_minutes: 20
---

## Objective

Add periodic operator status refresh that checks status every 5 minutes (when cache expires) for all displayed clusters.

## Context

Operator status should be refreshed periodically to reflect changes in operator state. The cache TTL is 5 minutes, so we should check status when cache expires. This should integrate with the existing periodic connectivity check mechanism.

## Implementation Steps

1. Open `src/tree/ClusterTreeProvider.ts`
2. Review existing `refreshInterval` mechanism (checks connectivity every 60 seconds)
3. Modify the periodic refresh logic to also check operator status:
   - In the refresh callback, iterate through all displayed cluster items
   - For each cluster item, call `checkOperatorStatus()` with `forceRefresh=false`
   - The OperatorStatusClient will check cache TTL and refresh if needed
   - Update tree item appearance if status changed
4. Ensure operator status refresh doesn't interfere with connectivity checks
5. Consider consolidating refresh logic to avoid duplicate work
6. Ensure refresh happens asynchronously and doesn't block UI

## Files Affected

- `src/tree/ClusterTreeProvider.ts` - Add operator status refresh to periodic checks

## Acceptance Criteria

- [ ] Operator status is refreshed periodically (when cache expires)
- [ ] Refresh happens for all displayed clusters
- [ ] Refresh doesn't interfere with connectivity checks
- [ ] Tree view updates when operator status changes
- [ ] Refresh happens asynchronously without blocking UI
- [ ] Cache TTL (5 minutes) is respected

## Dependencies

- 001-create-operator-status-client (needs OperatorStatusClient with caching)
- 004-integrate-status-check-on-connection (needs checkOperatorStatus method)

## Historical Note

**December 2025**: The periodic refresh functionality implemented in this story was later removed to align with standard Kubernetes extension behavior (like ms-kubernetes-tools). The extension now relies solely on manual refresh triggered by the user. Operator status is still checked during initial cluster connection and manual refreshes, with caching still in place to avoid excessive API calls.
