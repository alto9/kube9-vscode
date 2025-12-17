---
story_id: 008-add-cache-invalidation
session_id: replace-kubectl-process-spawning-with-kubernetescl
title: Add Cache Invalidation on Refresh
feature_id:
  - api-client-performance
spec_id:
  - api-client-caching-strategy
status: completed
estimated_minutes: 15
---

# Add Cache Invalidation on Refresh

## Objective

Implement cache invalidation when user manually refreshes the tree view, ensuring fresh data is fetched from the cluster.

## Context

The cache improves performance but users need a way to force fresh data. When the refresh button is clicked or refresh command is executed, the cache for the current context should be cleared so subsequent fetches bypass cache.

## Acceptance Criteria

- [ ] Tree refresh command invalidates cache for current context
- [ ] Cache invalidation uses pattern matching (RegExp)
- [ ] Only current context's cache is cleared (not all contexts)
- [ ] Tree view refetches data after invalidation
- [ ] Performance: Refresh still faster than old kubectl approach
- [ ] Status bar or notification indicates refresh is happening

## Implementation Steps

1. Open `src/tree/ClusterTreeProvider.ts`
2. Find the refresh() method
3. Add cache invalidation before triggering tree refresh:
   ```typescript
   import { getResourceCache } from '../kubernetes/cache';
   import { getKubernetesApiClient } from '../kubernetes/apiClient';
   
   public refresh(): void {
       // Get current context
       const apiClient = getKubernetesApiClient();
       const currentContext = apiClient.getCurrentContext();
       
       // Invalidate cache for this context
       const cache = getResourceCache();
       cache.invalidatePattern(new RegExp(`^${currentContext}:`));
       
       // Trigger tree refresh
       this._onDidChangeTreeData.fire();
   }
   ```
4. Test manual refresh behavior
5. Consider adding visual feedback (progress indicator)

## Files to Modify

- `src/tree/ClusterTreeProvider.ts` - Add cache invalidation to refresh()

## Testing

- Click refresh button in tree view
- Verify cache is cleared (subsequent fetch doesn't use cache)
- Verify tree reloads with fresh data
- Test with multiple contexts (only current context cache should clear)
- Measure refresh time (should still be faster than old kubectl approach due to parallel fetching and no process spawning)

## Notes

- Pattern `^${currentContext}:` matches all cache entries for the context
- Future enhancement: Selective invalidation (only invalidate specific resource types)
- Consider adding Shift+Refresh for force refresh bypassing all caches
- Refresh should feel snappy even without cache (due to parallel fetching)

