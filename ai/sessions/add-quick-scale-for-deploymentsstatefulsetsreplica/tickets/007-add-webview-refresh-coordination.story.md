---
story_id: add-webview-refresh-coordination
session_id: add-quick-scale-for-deploymentsstatefulsetsreplica
feature_id: [workload-scaling]
spec_id: [workload-scaling-spec]
status: completed
priority: low
estimated_minutes: 20
---

## Objective

Coordinate namespace webview refresh when a workload is scaled, so the webview's workload table shows updated replica counts.

## Context

If a user has a namespace webview open while scaling a workload, the webview should refresh to show the new replica count in the workloads table. This is a nice-to-have enhancement for better UX.

## Implementation Steps

1. Investigate how the namespace webview is currently managed
   - Look for NamespaceWebview class or similar
   - Find how webviews receive refresh messages

2. Determine if webview instances are tracked/accessible from extension.ts

3. If webview refresh is feasible:
   - Modify the command registration wrapper in extension.ts
   - After `clusterTreeProvider.refresh()`, check if a namespace webview is open
   - If open and showing the workload's namespace, send refresh message to webview

4. If webview refresh is not easily accessible:
   - Add a comment explaining the limitation
   - Note for future enhancement

## Files Affected

- `src/extension.ts` - Add webview refresh coordination (if feasible)
- `src/commands/scaleWorkload.ts` - Possibly add webview manager parameter

## Acceptance Criteria

- [x] Investigate webview refresh mechanism
- [x] Implement refresh if feasible
- [x] Test that webview refreshes when open (if implemented)

## Dependencies

- Story 006 (tree view refresh)

## Technical Notes

- This is a lower priority enhancement
- Tree view refresh is more important than webview refresh
- If webview refresh is complex, document and defer to future enhancement
- The webview may auto-refresh based on tree view changes (check existing implementation)

