---
story_id: implement-cache-invalidation
session_id: argocd-integration-phase-1-basic-drift-detection
feature_id: [argocd-tree-view, argocd-actions]
spec_id: [argocd-service-spec]
status: pending
priority: medium
estimated_minutes: 20
---

# Implement Cache Invalidation on Sync and Refresh

## Objective

Add logic to invalidate application cache when sync operations complete, ensuring tree view and webview show updated status.

## Context

After sync/refresh actions, the cached application data needs to be invalidated so users see the latest status. Manual refresh should also bypass cache.

## Implementation Steps

1. Open `src/services/ArgoCDService.ts`
2. Add `invalidateCache(context: string)` method
3. Clear detection cache and application list cache for context
4. Call `invalidateCache()` after sync operations complete
5. Call `invalidateCache()` after refresh operations complete
6. Update tree refresh command to pass bypassCache=true flag
7. Ensure webview reloads data after actions

## Files Affected

- `src/services/ArgoCDService.ts` - Add cache invalidation
- `src/tree/categories/ArgoCDCategory.ts` - Use bypassCache on refresh

## Acceptance Criteria

- [ ] Cache is invalidated after successful sync
- [ ] Cache is invalidated after successful refresh
- [ ] Manual tree refresh bypasses cache
- [ ] Tree view updates after sync completes
- [ ] Webview updates after sync completes
- [ ] Detection cache and application cache both cleared

## Dependencies

- 009-add-tree-context-menu-commands (needs commands that trigger sync)

