---
session_id: replace-kubectl-process-spawning-with-kubernetescl
start_time: '2025-12-16T14:52:21.883Z'
status: completed
problem_statement: >-
  Replace kubectl process spawning with @kubernetes/client-node for faster tree
  view
changed_files:
  - path: ai/features/cluster/api-client-performance.feature.md
    change_type: added
    scenarios_added:
      - Tree view loads cluster resources faster
      - Parallel resource loading improves initial load time
      - Connection pooling reduces latency for repeated operations
      - Cached cluster-level resources reduce redundant API calls
      - Large clusters remain responsive with lazy loading
      - Error handling provides clear feedback for API failures
      - Context switching is fast with direct API client
      - Authentication methods are supported transparently
start_commit: e9fcb29fd251db898bbcdb6fdab3af5e0498b67e
end_time: '2025-12-16T14:59:14.413Z'
---
## Problem Statement

Replace kubectl process spawning with @kubernetes/client-node for faster tree view

## Goals

1. **Performance**: Reduce tree view load time by 50-80% through elimination of process spawning overhead
2. **Connection Efficiency**: Implement connection pooling to reuse TCP connections across operations
3. **Parallelization**: Enable simultaneous fetching of multiple resource types
4. **Caching**: Implement intelligent TTL-based caching to reduce redundant API calls
5. **User Experience**: Provide smoother, more responsive UI comparable to Microsoft Kubernetes extension
6. **Compatibility**: Maintain full compatibility with all kubectl authentication methods
7. **Maintainability**: Create clean architecture that's easier to extend than spawning kubectl

## Approach

### Phase 1: Core Resources (Week 1)
- Add `@kubernetes/client-node` dependency (^0.21.0)
- Create `src/kubernetes/apiClient.ts` with singleton API client
- Create `src/kubernetes/resourceFetchers.ts` with fetch methods for nodes, namespaces, pods
- Implement parallel resource fetching with `Promise.all()`
- Update `ClusterTreeProvider` to use new API client
- Keep kubectl as fallback for unsupported operations

### Phase 2: Caching Layer (Week 1-2)
- Create `src/kubernetes/cache.ts` with TTL-based caching
- Implement context-aware cache keys
- Configure appropriate TTLs per resource type (nodes: 30s, pods: 5s, etc.)
- Add cache invalidation on refresh and resource mutations
- Implement LRU eviction for memory management

### Phase 3: Additional Resources (Week 2-3)
- Migrate deployment, service, statefulset, daemonset fetching
- Update remaining command files (`DeploymentCommands.ts`, `ServiceCommands.ts`, etc.)
- Extend caching to all resource types

### Phase 4: Optimization (Week 3-4)
- Fine-tune cache TTL values based on usage patterns
- Implement cache warming on extension activation
- Add predictive prefetching for likely-to-be-accessed resources
- Add performance monitoring and cache statistics
- Implement size limits and eviction strategies

## Key Decisions

### 1. Library Selection
**Decision**: Use `@kubernetes/client-node` (official JavaScript client)

**Rationale**:
- Official Kubernetes client library
- Full kubeconfig compatibility (all auth methods)
- Active maintenance and community support
- Native TypeScript types
- Connection pooling built-in

**Alternatives Considered**:
- Building custom API client: Too much maintenance burden
- Other third-party libraries: Less official support

### 2. Caching Strategy
**Decision**: Implement TTL-based caching with resource-specific TTLs

**Rationale**:
- Different resources have different volatility (nodes stable, pods dynamic)
- TTL-based expiration is simple and predictable
- Context-aware keys prevent cross-contamination
- Automatic expiration reduces stale data risk

**TTL Configuration**:
- Cluster-level resources (nodes, namespaces): 30s
- Workload resources (deployments, services): 10-30s
- Dynamic resources (pods, replica counts): 5s
- Never cache: logs, events, metrics

### 3. Migration Strategy
**Decision**: Phased migration with kubectl fallback

**Rationale**:
- Minimize risk by migrating high-impact areas first
- Keep kubectl for operations not yet migrated
- Allow rollback if issues discovered
- Enable feature flag for gradual rollout

### 4. Connection Pooling
**Decision**: Use default Node.js HTTP Agent with keep-alive

**Rationale**:
- `@kubernetes/client-node` uses this by default
- No additional configuration needed
- Proven performance benefits
- Automatic connection lifecycle management

### 5. Parallel Operations
**Decision**: Use `Promise.all()` for independent resource fetches

**Rationale**:
- Significant performance improvement (3 serial calls → 1 parallel batch)
- Simple to implement
- No race condition concerns for read operations
- Connection pool handles concurrency

### 6. Error Handling
**Decision**: Map HTTP status codes to user-friendly messages

**Rationale**:
- Kubernetes API returns standard HTTP status codes
- Users understand messages like "Permission denied" better than "403 Forbidden"
- Provide actionable guidance (e.g., "Check RBAC permissions")

### 7. Backward Compatibility
**Decision**: Keep existing kubectl-based commands for write operations initially

**Rationale**:
- Minimize scope of Phase 1 changes
- Write operations (exec, port-forward, logs) are complex
- Read operations provide most performance benefit
- Can migrate write operations in future phases

## Notes

### Performance Expectations
Based on comparison with Microsoft Kubernetes extension and kubectl overhead analysis:
- **Process spawning**: 50-200ms eliminated per operation
- **TCP handshake**: 20-100ms saved via connection reuse
- **Parallel fetching**: 3 sequential operations (900-1500ms) → parallel (300-500ms)
- **Caching**: Cache hits reduce response time from 200-500ms to 1-5ms

### Testing Strategy
- Unit tests for API client and cache operations
- Integration tests with real test cluster
- Performance benchmarks comparing before/after
- E2E tests for tree view loading and navigation

### Success Metrics
- Tree view load time <100ms (currently 1000-2000ms)
- Cache hit rate >60% during typical usage
- No regression in functionality
- User-perceivable performance improvement

### Risk Mitigation
- Feature flag for gradual rollout: `kube9.useApiClient` setting
- Keep kubectl fallback for all operations initially
- Extensive testing before removing kubectl dependency
- Monitor error rates in telemetry (if available)

### Future Enhancements
- Watch API for real-time resource updates
- WebSocket connections for live pod logs
- Predictive prefetching based on user patterns
- Cluster health monitoring dashboard
