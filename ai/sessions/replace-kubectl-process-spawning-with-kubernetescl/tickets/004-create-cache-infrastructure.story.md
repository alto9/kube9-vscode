---
story_id: 004-create-cache-infrastructure
session_id: replace-kubectl-process-spawning-with-kubernetescl
title: Create Cache Infrastructure
feature_id:
  - api-client-performance
spec_id:
  - api-client-caching-strategy
diagram_id:
  - api-client-architecture
status: pending
estimated_minutes: 30
---

# Create Cache Infrastructure

## Objective

Create a TTL-based caching layer for Kubernetes resources to minimize redundant API calls and improve tree view responsiveness.

## Context

Caching is critical for performance. Resources like nodes and namespaces change infrequently and can be cached for 30 seconds, while pods change frequently and need shorter 5-second TTL. The cache uses context-aware keys to prevent cross-contamination between clusters.

## Acceptance Criteria

- [ ] New file `src/kubernetes/cache.ts` created
- [ ] `ResourceCache` class implemented with TTL support
- [ ] `set<T>(key, data, ttl)` method for storing entries
- [ ] `get<T>(key)` method with automatic TTL expiration
- [ ] `invalidate(key)` method for single entry removal
- [ ] `invalidatePattern(pattern)` method for bulk invalidation
- [ ] `clear()` method for full cache reset
- [ ] `CACHE_TTL` constants exported with resource-specific values
- [ ] Singleton cache instance exported via `getResourceCache()`
- [ ] TypeScript generics properly implemented

## Implementation Steps

1. Create new file `src/kubernetes/cache.ts`
2. Define `CacheEntry<T>` interface:
   - data: T
   - timestamp: number
   - ttl: number
3. Implement `ResourceCache` class:
   - Private Map<string, CacheEntry<any>> for storage
   - set<T>() method that stores with timestamp
   - get<T>() method that checks TTL and returns null if expired
   - invalidate() method for single key deletion
   - invalidatePattern() method using RegExp
   - clear() method to reset entire cache
4. Export CACHE_TTL constants object:
   - NODES: 30000ms
   - NAMESPACES: 30000ms
   - PODS: 5000ms
   - DEPLOYMENTS: 10000ms
   - SERVICES: 30000ms
   - CLUSTER_INFO: 60000ms
5. Create singleton instance and export getter
6. Add JSDoc documentation

## Files to Create

- `src/kubernetes/cache.ts` - Caching infrastructure

## Implementation Reference

See spec `kubernetes-client-node-integration.spec.md` lines 354-444 for complete cache implementation including:
- CacheEntry interface
- ResourceCache class with all methods
- CACHE_TTL configuration constants
- Singleton pattern

Key behaviors:
- Expired entries automatically removed on get()
- Pattern invalidation supports RegExp for bulk operations
- TTL values balance freshness vs performance

## Testing

- Verify set() stores data with timestamp
- Verify get() returns data before TTL expires
- Verify get() returns null after TTL expires
- Verify invalidate() removes specific key
- Verify invalidatePattern() removes matching keys
- Verify clear() removes all entries
- Test with different data types using generics

## Notes

- This is a simple in-memory cache (no persistence)
- Cache entries are per-process (not shared across VS Code instances)
- TTL values can be tuned later based on real-world usage
- Memory management (size limits, LRU eviction) will be added in future story if needed
- Cache keys should include context name to prevent cross-cluster contamination

