---
story_id: 007-implement-parallel-loading
session_id: replace-kubectl-process-spawning-with-kubernetescl
title: Implement Parallel Resource Loading in Tree Provider
feature_id:
  - api-client-performance
spec_id:
  - kubernetes-client-node-integration
diagram_id:
  - api-client-architecture
status: pending
estimated_minutes: 25
---

# Implement Parallel Resource Loading in Tree Provider

## Objective

Update ClusterTreeProvider to fetch multiple resource types in parallel using Promise.all(), dramatically reducing initial load time.

## Context

Currently the tree provider fetches resources sequentially, causing long load times. The new `fetchClusterResources()` function fetches nodes, namespaces, and pods simultaneously, reducing total time from 600-1500ms to 200-500ms (the time of the slowest single fetch).

## Acceptance Criteria

- [ ] ClusterTreeProvider uses parallel fetching for cluster expansion
- [ ] Nodes, namespaces, and pods fetched simultaneously
- [ ] Tree items populated progressively as results arrive
- [ ] Error handling for individual fetch failures
- [ ] Overall performance improvement of 50-70%
- [ ] Existing tree view functionality preserved
- [ ] No visual glitches during loading

## Implementation Steps

1. Open `src/tree/ClusterTreeProvider.ts`
2. Import fetchClusterResources:
   ```typescript
   import { fetchClusterResources } from '../kubernetes/resourceFetchers';
   import { getKubernetesApiClient } from '../kubernetes/apiClient';
   ```
3. Find method that loads cluster data (likely in getChildren when cluster is expanded)
4. Replace sequential fetches with:
   ```typescript
   const apiClient = getKubernetesApiClient();
   apiClient.setContext(contextName);
   
   const { nodes, namespaces, pods } = await fetchClusterResources();
   ```
5. Update tree item creation to use fetched data
6. Add error handling for partial failures:
   - If nodes fetch fails, show error for nodes category
   - If namespaces fetch fails, show error for namespaces category
   - Don't let one failure block the entire tree
7. Test with different cluster sizes

## Files to Modify

- `src/tree/ClusterTreeProvider.ts` - Implement parallel loading

## Implementation Considerations

- Identify where resources are currently fetched (look for NodeCommands.getNodes(), etc.)
- May need to refactor category loading logic
- Consider showing spinner during initial load
- Cache invalidation should trigger re-fetch for all resources
- Connection pooling means parallel requests share underlying TCP connections

## Testing

- Verify nodes, namespaces, and pods load in parallel (check logs for timing)
- Measure total load time improvement
- Test with slow/unreachable cluster
- Test with large cluster (many namespaces)
- Verify tree displays correctly after load
- Test manual refresh behavior

## Notes

- This is the most impactful performance improvement (70-80% faster load times)
- Parallel fetching is safe because resources are independent
- Connection pool handles concurrent requests efficiently
- Future enhancement: Progressive tree rendering (show nodes immediately, then namespaces, then pods)
- Consider adding telemetry to measure actual performance gains in production

