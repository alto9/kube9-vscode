---
story_id: fix-free-dashboard-initialization-race-condition
session_id: cluster-dashboard-shows-all-zeros-on-first-load-ra
feature_id:
  - free-dashboard
spec_id:
  - dashboard-webview-spec
  - free-nonoperated-dashboard-spec
status: pending
created_at: '2026-01-08T15:45:51.716Z'
estimated_time: 20 minutes
---

# Fix Free Dashboard Initialization Race Condition

## Objective

Fix the race condition in `FreeDashboardPanel.ts` where the webview HTML is set before the message handler is registered, causing initial data requests to be lost and the dashboard to display all zeros on first load.

## Problem

Currently in `FreeDashboardPanel.ts` (lines 89-100):
- Line 89: `panel.webview.html = getDashboardHtml(...)` - HTML set FIRST
- Line 100: `panel.webview.onDidReceiveMessage(...)` - Handler registered SECOND (too late!)

When HTML loads, it immediately sends `requestData` message, but the handler isn't registered yet, so the message is lost.

## Solution

Reorder the initialization sequence to register the handler BEFORE setting HTML, then proactively send initial data.

## Implementation Steps

### 1. Move Handler Registration Before HTML Setting

In `src/dashboard/FreeDashboardPanel.ts`, move the `onDidReceiveMessage` registration (currently lines 100-109) to occur BEFORE the HTML is set (currently line 89).

**New correct order:**
```typescript
// Step 1: Register message handler FIRST (move to line 88)
panel.webview.onDidReceiveMessage(
    async (message) => {
        await FreeDashboardPanel.handleWebviewMessage(
            message,
            panel,
            kubeconfigPath,
            contextName
        );
    },
    undefined,
    context.subscriptions
);

// Step 2: Set HTML SECOND (after handler)
panel.webview.html = getDashboardHtml(panel.webview, clusterName);

// Step 3: Start auto-refresh (keep as is)
refreshManager.startAutoRefresh(...);
```

### 2. Add Proactive Initial Data Send

After setting the HTML, proactively send initial data instead of waiting for the webview to request it:

```typescript
// Step 4: Proactively send initial data (NEW - add after HTML set)
await FreeDashboardPanel.sendDashboardData(
    panel,
    kubeconfigPath,
    contextName,
    true  // isInitialLoad = true
);
```

## Files to Modify

- `src/dashboard/FreeDashboardPanel.ts` - Reorder initialization sequence (lines 88-110)

## Acceptance Criteria

- [ ] Message handler registration occurs BEFORE `panel.webview.html` is set
- [ ] HTML setting occurs AFTER handler registration
- [ ] Proactive `sendDashboardData()` call added after HTML is set
- [ ] Order is: handler → HTML → send data → auto-refresh
- [ ] No compilation errors
- [ ] Existing auto-refresh functionality still works

## Testing Notes

After implementation:
- Open a Free Dashboard (cluster without operator)
- Verify data displays on first load without showing zeros
- No manual refresh should be required
- Auto-refresh (30s) should continue working

## Related Scenarios

From `free-dashboard.feature.md`:
- Webview message handler registers before HTML is set
- Dashboard receives initial data without manual request
- Dashboard initialization completes within timeout

## Timing Requirements

Per spec requirements:
- Handler registration: < 100ms
- HTML set: < 200ms after handler
- Initial data sent: < 5 seconds after HTML
