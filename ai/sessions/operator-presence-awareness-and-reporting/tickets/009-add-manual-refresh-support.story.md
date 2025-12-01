---
story_id: add-manual-refresh-support
session_id: operator-presence-awareness-and-reporting
feature_id: [operator-presence-awareness]
spec_id: [operator-status-api-spec]
status: completed
priority: medium
estimated_minutes: 15
---

## Objective

Add support for manual operator status refresh when user manually refreshes the clusters view.

## Context

When users manually refresh the clusters view (e.g., via refresh button or command), the extension should force refresh operator status, bypassing the cache.

## Implementation Steps

1. Open `src/tree/ClusterTreeProvider.ts`
2. Find the `refresh()` method (or equivalent method called on manual refresh)
3. Modify refresh logic to:
   - Clear operator status cache for all clusters (or let cache expire naturally)
   - Call `checkOperatorStatus()` for each displayed cluster with `forceRefresh=true`
   - Ensure status is updated immediately after refresh
4. Ensure manual refresh bypasses cache by passing `forceRefresh=true` to `operatorStatusClient.getStatus()`
5. Update tree view after status checks complete

## Files Affected

- `src/tree/ClusterTreeProvider.ts` - Add operator status refresh to manual refresh flow

## Acceptance Criteria

- [ ] Manual refresh triggers operator status check for all clusters
- [ ] Manual refresh bypasses cache (forceRefresh=true)
- [ ] Operator status is updated immediately after manual refresh
- [ ] Tree view refreshes to show updated operator status
- [ ] Manual refresh works correctly

## Dependencies

- 001-create-operator-status-client (needs OperatorStatusClient with forceRefresh support)
- 004-integrate-status-check-on-connection (needs checkOperatorStatus method)

