---
story_id: 009-migrate-pod-commands
session_id: replace-kubectl-process-spawning-with-kubernetescl
title: Migrate Pod Commands to Use API Client
feature_id:
  - api-client-performance
spec_id:
  - kubernetes-client-node-integration
status: pending
estimated_minutes: 25
---

# Migrate Pod Commands to Use API Client

## Objective

Replace kubectl process spawning in pod-related commands (WorkloadCommands.getPodsForDeployment, PodHealthAnalyzer.getPodsForWorkload) with direct API client calls.

## Context

Multiple locations fetch pods using kubectl. Pods change frequently (restarts, scaling) so they use shorter 5-second cache TTL. This migration needs to handle namespace-specific and label-selector-based pod queries.

## Acceptance Criteria

- [ ] `WorkloadCommands.getPodsForDeployment()` uses `fetchPods()` instead of kubectl
- [ ] `PodHealthAnalyzer.getPodsForWorkload()` uses `fetchPods()` instead of kubectl
- [ ] Caching integrated with 5-second TTL
- [ ] Label selector filtering supported
- [ ] Namespace filtering supported
- [ ] Function signatures unchanged
- [ ] Error handling compatible with existing patterns

## Implementation Steps

1. Open `src/kubectl/WorkloadCommands.ts`
2. Add imports for API client and cache
3. Modify `getPodsForDeployment()`:
   - Set API client context
   - Generate cache key including namespace and label selector
   - Check cache with 5-second TTL
   - Call `fetchPods({ namespace, labelSelector, timeout: 10 })`
   - Transform to PodInfo format
   - Cache result with CACHE_TTL.PODS
4. Open `src/kubernetes/PodHealthAnalyzer.ts`
5. Modify `getPodsForWorkload()` similarly:
   - Set context
   - Cache key with namespace and selector
   - Use fetchPods with label selector
   - Cache with 5-second TTL

## Files to Modify

- `src/kubectl/WorkloadCommands.ts` - Update getPodsForDeployment()
- `src/kubernetes/PodHealthAnalyzer.ts` - Update getPodsForWorkload()

## Cache Key Pattern

```typescript
// For pods with label selector
const cacheKey = `${contextName}:pods:${namespace}:${labelSelector}`;

// For all pods in namespace
const cacheKey = `${contextName}:pods:${namespace}`;

// For all pods in all namespaces
const cacheKey = `${contextName}:pods`;
```

## Testing

- Verify pods fetched for specific deployment
- Verify label selector filtering works
- Verify namespace filtering works
- Verify cache expires after 5 seconds (short TTL)
- Test with pod scaling operations
- Test with pod restarts
- Confirm health analysis still works correctly

## Notes

- Pods have shortest TTL (5s) due to high volatility
- Label selector support is critical for deployment → pod relationship
- Cache keys must include label selector to avoid false hits
- Consider invalidating pod cache on deployment scale operations (future enhancement)

