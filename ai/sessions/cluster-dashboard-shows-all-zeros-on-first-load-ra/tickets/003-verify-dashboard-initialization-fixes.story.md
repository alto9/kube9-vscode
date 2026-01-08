---
story_id: verify-dashboard-initialization-fixes
session_id: cluster-dashboard-shows-all-zeros-on-first-load-ra
feature_id:
  - free-dashboard
  - operated-dashboard
spec_id:
  - dashboard-webview-spec
status: pending
created_at: '2026-01-08T15:45:51.716Z'
estimated_time: 15 minutes
---

# Verify Dashboard Initialization Fixes

## Objective

Thoroughly test both Free and Operated dashboard fixes to ensure the race condition is resolved and dashboards display data correctly on first load without requiring manual refresh.

## Testing Checklist

### Free Dashboard Testing

- [ ] **First Load Test**: Open Free Dashboard on a non-operated cluster
  - Data should display immediately (no zeros)
  - No manual refresh required
  - All stats cards show actual values
  - Charts render with real data
  
- [ ] **Multiple Clusters Test**: Open Free Dashboards for multiple clusters simultaneously
  - Each shows correct data for its cluster
  - No cross-contamination between dashboards
  - All dashboards maintain separate state

- [ ] **Auto-Refresh Test**: Keep Free Dashboard open for 35+ seconds
  - Auto-refresh triggers at 30s mark
  - Data updates without user interaction
  - No errors in console

- [ ] **Manual Refresh Test**: Click refresh button
  - Loading indicator appears
  - Data updates correctly
  - No duplicate requests

### Operated Dashboard Testing

- [ ] **First Load Test**: Open Operated Dashboard on an operated cluster
  - Data should display immediately (no zeros)
  - Operator status displays correctly
  - Conditional content renders (AI recommendations OR upsell CTA)
  - No manual refresh required

- [ ] **Operator Modes Test**: Test with different operator configurations
  - Operated mode (no API key): Upsell CTA displays
  - Enabled mode (with API key): AI recommendations display (if available)
  - Degraded mode: Warning panel displays

- [ ] **Multiple Clusters Test**: Open Operated Dashboards for multiple clusters
  - Each shows correct operator status
  - Conditional content appropriate for each cluster
  - No cross-contamination

- [ ] **Auto-Refresh Test**: Keep Operated Dashboard open for 35+ seconds
  - Auto-refresh triggers at 30s mark
  - Operator data and conditional content update
  - No errors in console

- [ ] **Manual Refresh Test**: Click refresh button
  - Loading indicator appears
  - All data updates (stats + operator info + conditional content)
  - No duplicate requests

### Performance Testing

- [ ] **Timing Verification**: Check initialization timing
  - Handler registers within 100ms
  - HTML sets within 200ms total
  - Initial data arrives within 5 seconds
  - Total time to interactive < 6 seconds

- [ ] **Browser Console Check**: No errors or warnings during initialization

### Regression Testing

- [ ] **Dashboard Close Test**: Close dashboard
  - Auto-refresh timer stops
  - No memory leaks
  - Resources properly disposed

- [ ] **Context Switch Test**: Switch kubectl context with dashboard open
  - Open dashboard maintains its cluster data
  - Dashboard title shows correct cluster name
  - No unexpected behavior

## Test Environments

Test on:
- [ ] Local development cluster (minikube/kind)
- [ ] Cluster without operator (Free Dashboard)
- [ ] Cluster with operator, no API key (Operated Dashboard - upsell)
- [ ] Cluster with operator and API key (Operated Dashboard - AI recommendations)

## Success Criteria

All test cases pass:
- ✅ No dashboards show zeros on first load
- ✅ No manual refresh required for any dashboard
- ✅ Auto-refresh continues working as expected
- ✅ Multiple simultaneous dashboards work correctly
- ✅ No console errors
- ✅ Timing requirements met

## If Tests Fail

Document:
- Which dashboard type (Free or Operated)
- Which test case failed
- Console errors (if any)
- Steps to reproduce
- Expected vs actual behavior

Then revisit stories 001 or 002 to fix issues.

## Related Files

- `src/dashboard/FreeDashboardPanel.ts`
- `src/dashboard/OperatedDashboardPanel.ts`
- `src/dashboard/dashboardHtml.ts`
- `src/dashboard/operatedDashboardHtml.ts`

## GitHub Issue Reference

Closes: https://github.com/alto9/kube9-vscode/issues/73
