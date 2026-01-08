---
session_id: cluster-dashboard-shows-all-zeros-on-first-load-ra
start_time: '2026-01-08T15:38:06.908Z'
status: development
problem_statement: >-
  Cluster Dashboard Shows All Zeros on First Load - Race Condition in Message
  Handler Registration
changed_files:
  - path: ai/features/navigation/dashboard/free-dashboard.feature.md
    change_type: modified
    scenarios_added:
      - Webview message handler registers before HTML is set
      - Dashboard receives initial data without manual request
      - Dashboard initialization completes within timeout
  - path: ai/features/navigation/dashboard/operated-dashboard.feature.md
    change_type: modified
    scenarios_added:
      - Webview message handler registers before HTML is set
      - Dashboard receives initial data without manual request
      - Dashboard initialization completes within timeout
start_commit: 901c4786a485fe48181f69adb350638a465dacab
end_time: '2026-01-08T15:45:51.716Z'
---
## Problem Statement

Cluster Dashboard Shows All Zeros on First Load - Race Condition in Message Handler Registration

## Goals

1. Document the proper webview initialization sequence to prevent race conditions
2. Add feature scenarios that specify handler registration before HTML setting
3. Update specs to include timing guarantees and initialization best practices
4. Create visual diagrams showing both incorrect and correct initialization flows
5. Provide clear implementation guidance to prevent this issue in all webview implementations

## Approach

### Root Cause Analysis

The dashboard displays all zeros on first load due to a race condition:
- **Current Flow**: HTML is set → Webview loads → JavaScript sends `requestData` → Handler registers (too late)
- **Problem**: The initial `requestData` message arrives before the handler is registered and is lost
- **Result**: Dashboard never receives data, shows zeros until manual refresh

### Documentation Strategy

1. **Feature Updates**: Added three new scenarios to both dashboard features:
   - Handler registration sequence (must happen before HTML)
   - Proactive data sending (don't wait for requests)
   - Initialization timing requirements (< 5 seconds total)

2. **Spec Enhancements**: Expanded dashboard-webview-spec with:
   - Complete "Webview Initialization Sequence" section
   - Side-by-side comparison of incorrect vs correct patterns
   - Detailed code examples with comments
   - Timing guarantees for each step
   - Proactive data sending implementation

3. **Visual Diagrams**: Created comprehensive flow diagrams showing:
   - Incorrect initialization with race condition
   - Correct initialization without race condition
   - Timing comparison highlighting the 100-200ms race window

## Key Decisions

### 1. Handler Registration Must Come First
**Decision**: Message handler MUST be registered before setting webview HTML.

**Rationale**: When HTML is set, webview immediately loads and executes JavaScript. If handler isn't registered, initialization messages are lost.

**Impact**: Critical constraint for ALL webview implementations, not just dashboards.

### 2. Proactive Data Sending Pattern
**Decision**: Extension should proactively send initial data, not wait for webview requests.

**Rationale**: 
- Eliminates race condition dependency
- Faster data display (better UX)
- More predictable initialization
- Simpler debugging

**Implementation**:
```typescript
// After setting HTML
await sendInitialDashboardData(panel, clusterContext);
```

### 3. Timing Guarantees
**Decision**: Established measurable requirements:
- Handler registration: < 100ms
- HTML set: < 200ms after handler
- Initial data display: < 5 seconds total

**Rationale**: Provides success criteria and performance benchmarks.

### 4. Consistent Pattern Across Dashboards
**Decision**: Both Free and Operated dashboards follow identical initialization sequence.

**Rationale**: Consistency reduces errors, improves maintainability, ensures both benefit from the fix.

### 5. Keep Optional requestData Handler
**Decision**: Don't remove the `requestData` message handler from webview code.

**Rationale**: 
- Allows webview to request refresh
- Maintains backward compatibility
- Provides fallback if proactive send fails
- Minimal overhead

## Notes

### Affected Files in Implementation

The following source files need updates:
- `src/dashboard/FreeDashboardPanel.ts` (lines 89-100)
- `src/dashboard/OperatedDashboardPanel.ts` (lines 99-110)
- Potentially: `src/dashboard/dashboardHtml.ts` and `operatedDashboardHtml.ts`

### Implementation Pattern

```typescript
// ✅ CORRECT ORDER
async function loadDashboard(panel, clusterContext) {
  // 1. Register handler FIRST
  panel.webview.onDidReceiveMessage(async (message) => {
    await handleMessage(message, panel, clusterContext);
  }, undefined, context.subscriptions);
  
  // 2. Set HTML SECOND
  panel.webview.html = getDashboardHtml(panel.webview, clusterName);
  
  // 3. Send data THIRD (proactively)
  await sendInitialDashboardData(panel, clusterContext);
  
  // 4. Start auto-refresh
  startAutoRefresh(panel, clusterContext);
}
```

### Other Affected Webviews

This race condition pattern may affect other webviews:
- Event Viewer panel
- Pod Logs viewer  
- YAML editor
- Describe webviews (pod, deployment, namespace, node)

**Recommendation**: Audit all webview implementations to ensure correct initialization order.

### Testing Checklist

After implementation:
- [ ] Open Free Dashboard - verify data shows on first load
- [ ] Open Operated Dashboard - verify data shows on first load
- [ ] Test with multiple clusters simultaneously
- [ ] Verify auto-refresh (30s) still works
- [ ] Test refresh button functionality
- [ ] Check browser console for any lost messages

### Performance Considerations

Proactive data sending may cause duplicate fetches if webview also requests data:
- **Impact**: Minimal - data is cached for 30s
- **Frequency**: Only on initial load
- **Tradeoff**: Better UX worth the minimal overhead

### General Webview Initialization Pattern

Created `webview-initialization-pattern.spec.md` as a comprehensive guide for ALL webview implementations in the extension. This spec:

- Documents the standard initialization sequence to prevent race conditions
- Provides implementation templates (including `BaseWebviewPanel` abstract class)
- Defines timing requirements and performance targets
- Includes testing guidelines and migration checklist
- Lists all webview implementations that should adopt this pattern

This spec transforms a dashboard-specific bug fix into a systemic improvement that benefits all webviews and prevents future race conditions.

### Future Enhancement

The `webview-initialization-pattern.spec.md` includes a `BaseWebviewPanel` abstract class design that enforces correct initialization by design:

```typescript
abstract class BaseWebviewPanel {
  constructor(panel: vscode.WebviewPanel) {
    // Force correct order
    this.registerHandlers(panel);
    this.setHtml(panel);
    this.sendInitialData(panel);
  }
  
  protected abstract registerHandlers(panel): void;
  protected abstract setHtml(panel): void;
  protected abstract sendInitialData(panel): Promise<void>;
}
```

Implementing this base class would prevent the race condition structurally rather than relying on developer discipline. All webview panels would inherit the correct initialization sequence automatically.
