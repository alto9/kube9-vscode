---
spec_id: api-client-caching-strategy
name: API Client Caching Strategy
description: Intelligent caching strategy for Kubernetes resources to minimize API calls and improve responsiveness
feature_id:
  - api-client-performance
---

# API Client Caching Strategy

## Overview

Implement an intelligent caching layer for Kubernetes resources to reduce redundant API calls, improve tree view responsiveness, and minimize cluster load. The caching strategy balances freshness requirements with performance gains, using different TTL values based on resource volatility.

## Cache Architecture

### Cache Structure

```typescript
interface CacheEntry<T> {
  data: T;                  // The cached data
  timestamp: number;        // When it was cached (milliseconds since epoch)
  ttl: number;              // Time-to-live in milliseconds
  contextName: string;      // Which kubectl context this belongs to
  namespace?: string;       // Optional namespace filter
}

interface CacheKey {
  resourceType: string;     // e.g., "nodes", "pods", "deployments"
  contextName: string;      // Context name from kubeconfig
  namespace?: string;       // Optional namespace qualifier
  filter?: string;          // Optional label/field selector
}
```

### Cache Key Generation

**Format**: `{contextName}:{resourceType}[:namespace][:filter]`

**Examples**:
- `minikube:nodes` - All nodes in minikube context
- `prod-cluster:pods:default` - Pods in default namespace
- `staging:deployments:kube-system` - Deployments in kube-system
- `dev:services::app=nginx` - Services with label selector

**Implementation**:
```typescript
function generateCacheKey(options: {
  resourceType: string;
  contextName: string;
  namespace?: string;
  labelSelector?: string;
  fieldSelector?: string;
}): string {
  const parts = [options.contextName, options.resourceType];
  
  if (options.namespace) {
    parts.push(options.namespace);
  }
  
  const filters: string[] = [];
  if (options.labelSelector) {
    filters.push(`label=${options.labelSelector}`);
  }
  if (options.fieldSelector) {
    filters.push(`field=${options.fieldSelector}`);
  }
  
  if (filters.length > 0) {
    parts.push(filters.join(','));
  }
  
  return parts.join(':');
}
```

## TTL Configuration by Resource Type

### Cluster-Level Resources (Long TTL)

These resources change infrequently and can be cached longer:

| Resource | TTL | Rationale |
|----------|-----|-----------|
| Nodes | 30s | Node topology rarely changes |
| Namespaces | 30s | Namespaces created/deleted infrequently |
| StorageClasses | 60s | Storage configuration is stable |
| PersistentVolumes | 30s | Volume lifecycle is relatively slow |
| ClusterRoles | 60s | RBAC rarely changes during active work |
| CustomResourceDefinitions | 60s | CRDs rarely change |

### Namespace-Level Resources (Medium TTL)

Moderate change frequency:

| Resource | TTL | Rationale |
|----------|-----|-----------|
| Services | 30s | Service endpoints relatively stable |
| ConfigMaps | 20s | Config changes moderately frequent |
| Secrets | 20s | Credential rotation is periodic |
| PersistentVolumeClaims | 20s | PVC lifecycle is moderate |
| ServiceAccounts | 30s | Service accounts rarely change |
| Ingresses | 30s | Ingress rules relatively stable |

### Workload Resources (Short TTL)

High change frequency during development:

| Resource | TTL | Rationale |
|----------|-----|-----------|
| Pods | 5s | Pods restart frequently |
| Deployments | 10s | Scale/update operations common |
| StatefulSets | 10s | Scale operations moderately common |
| DaemonSets | 20s | Rarely change but should stay fresh |
| Jobs | 5s | Short-lived, status changes rapidly |
| CronJobs | 30s | Schedule rarely changes |
| ReplicaSets | 10s | Scale with deployments |

### Metadata Resources (Very Short TTL)

Rapidly changing status information:

| Resource | TTL | Rationale |
|----------|-----|-----------|
| Pod Logs | 0s | Never cache - always fetch fresh |
| Events | 0s | Events are time-sensitive |
| Pod Metrics | 3s | Resource usage changes rapidly |
| Node Metrics | 5s | Cluster metrics need frequent updates |

## Cache Invalidation Strategies

### Manual Refresh

**Trigger**: User clicks refresh button or runs refresh command

**Action**: Clear all cache entries for current context

```typescript
function handleManualRefresh(contextName: string): void {
  const cache = getResourceCache();
  cache.invalidatePattern(new RegExp(`^${contextName}:`));
  
  // Trigger tree view refresh
  treeProvider.refresh();
}
```

### Resource-Specific Invalidation

**Trigger**: User performs create/update/delete operation

**Action**: Invalidate related cache entries

```typescript
function invalidateAfterResourceChange(options: {
  resourceType: string;
  contextName: string;
  namespace?: string;
}): void {
  const cache = getResourceCache();
  
  // Invalidate specific resource type
  const key = generateCacheKey({
    resourceType: options.resourceType,
    contextName: options.contextName,
    namespace: options.namespace
  });
  cache.invalidate(key);
  
  // Invalidate all-namespace variant if specific namespace was changed
  if (options.namespace) {
    const allKey = generateCacheKey({
      resourceType: options.resourceType,
      contextName: options.contextName
    });
    cache.invalidate(allKey);
  }
}
```

### Context Switch Invalidation

**Trigger**: User switches kubectl context

**Action**: Clear cache for old context (optional), no action for new context

```typescript
function handleContextSwitch(oldContext: string, newContext: string): void {
  // Option 1: Keep old context cache (faster switch back)
  // No action needed
  
  // Option 2: Clear old context cache (conserve memory)
  // const cache = getResourceCache();
  // cache.invalidatePattern(new RegExp(`^${oldContext}:`));
}
```

### Time-Based Expiration

**Trigger**: Cache entry exceeds TTL

**Action**: Automatically return `null` on cache lookup, trigger fresh fetch

```typescript
public get<T>(key: string): T | null {
  const entry = this.cache.get(key);
  
  if (!entry) {
    return null;
  }
  
  // Check if expired
  const age = Date.now() - entry.timestamp;
  if (age > entry.ttl) {
    this.cache.delete(key);
    return null; // Triggers fresh fetch
  }
  
  return entry.data as T;
}
```

### Cascade Invalidation

**Trigger**: Parent resource changes

**Action**: Invalidate dependent child resources

**Examples**:
- Deployment changes → Invalidate ReplicaSets and Pods
- Namespace deletion → Invalidate all resources in that namespace
- Service changes → Invalidate related Endpoints

```typescript
function cascadeInvalidation(options: {
  resourceType: string;
  contextName: string;
  namespace: string;
  resourceName: string;
}): void {
  const cache = getResourceCache();
  
  if (options.resourceType === 'Deployment') {
    // Invalidate related ReplicaSets
    cache.invalidate(generateCacheKey({
      resourceType: 'replicasets',
      contextName: options.contextName,
      namespace: options.namespace,
      labelSelector: `app=${options.resourceName}`
    }));
    
    // Invalidate related Pods
    cache.invalidate(generateCacheKey({
      resourceType: 'pods',
      contextName: options.contextName,
      namespace: options.namespace,
      labelSelector: `app=${options.resourceName}`
    }));
  }
  
  if (options.resourceType === 'Namespace') {
    // Invalidate all resources in the deleted namespace
    cache.invalidatePattern(
      new RegExp(`^${options.contextName}:[^:]+:${options.namespace}`)
    );
  }
}
```

## Cache Memory Management

### Size Limits

**Per-Entry Limits**:
- Maximum single entry size: 10 MB
- Reject cache storage if entry exceeds limit
- Log warning when large resources encountered

**Total Cache Limits**:
- Maximum total cache size: 100 MB
- Implement LRU eviction when limit reached
- Prioritize cluster-level resources over workload resources

```typescript
class ResourceCache {
  private maxTotalSize: number = 100 * 1024 * 1024; // 100 MB
  private maxEntrySize: number = 10 * 1024 * 1024;  // 10 MB
  private currentSize: number = 0;
  
  public set<T>(key: string, data: T, ttl: number): void {
    const dataSize = this.estimateSize(data);
    
    // Reject oversized entries
    if (dataSize > this.maxEntrySize) {
      console.warn(`Cache entry too large (${dataSize} bytes), skipping cache`);
      return;
    }
    
    // Evict LRU entries if needed
    while (this.currentSize + dataSize > this.maxTotalSize) {
      this.evictLRU();
    }
    
    // Store entry
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      size: dataSize
    });
    
    this.currentSize += dataSize;
  }
  
  private estimateSize(data: any): number {
    // Rough estimation using JSON.stringify
    return JSON.stringify(data).length * 2; // UTF-16 characters
  }
  
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      this.cache.delete(oldestKey);
      this.currentSize -= entry.size || 0;
    }
  }
}
```

### Context-Based Eviction

**Strategy**: When memory pressure occurs, prioritize current context

**Priority Order**:
1. Keep current context resources
2. Evict resources from inactive contexts
3. Within inactive contexts, evict oldest first

```typescript
private evictInactiveContext(): void {
  const currentContext = getKubernetesApiClient().getCurrentContext();
  
  // Find entries not belonging to current context
  for (const [key, entry] of this.cache.entries()) {
    if (!key.startsWith(`${currentContext}:`)) {
      this.cache.delete(key);
      this.currentSize -= entry.size || 0;
      
      // Stop if we've freed enough space
      if (this.currentSize < this.maxTotalSize * 0.8) {
        break;
      }
    }
  }
}
```

## Cache Warming

### Tree View Initialization

**Strategy**: Proactively fetch and cache common resources on extension activation

```typescript
async function warmCache(): Promise<void> {
  const client = getKubernetesApiClient();
  const cache = getResourceCache();
  const contextName = client.getCurrentContext();
  
  try {
    // Fetch and cache cluster-level resources in parallel
    const [nodes, namespaces] = await Promise.all([
      fetchNodes(),
      fetchNamespaces()
    ]);
    
    // Cache results
    cache.set(
      generateCacheKey({ resourceType: 'nodes', contextName }),
      nodes,
      CACHE_TTL.NODES
    );
    
    cache.set(
      generateCacheKey({ resourceType: 'namespaces', contextName }),
      namespaces,
      CACHE_TTL.NAMESPACES
    );
  } catch (error) {
    console.error('Cache warming failed:', error);
    // Non-fatal - continue without cache
  }
}
```

### Predictive Caching

**Strategy**: Prefetch resources user is likely to access next

**Scenarios**:
- User expands cluster → Prefetch namespace list
- User expands "Workloads" → Prefetch deployments, pods, replicasets
- User views namespace → Prefetch services, configmaps, secrets

```typescript
async function prefetchWorkloadResources(
  contextName: string,
  namespace?: string
): Promise<void> {
  // Fire and forget - don't await
  Promise.all([
    fetchDeployments({ namespace }),
    fetchPods({ namespace }),
    fetchReplicaSets({ namespace })
  ]).catch(error => {
    console.debug('Prefetch failed:', error);
    // Non-fatal - user will fetch on demand
  });
}
```

## Cache Observability

### Metrics Collection

**Metrics to Track**:
- Cache hit rate (hits / total requests)
- Cache miss rate
- Average response time (cached vs uncached)
- Cache size and entry count
- Eviction rate

```typescript
class CacheMetrics {
  private hits: number = 0;
  private misses: number = 0;
  private totalResponseTime: number = 0;
  private cachedResponseTime: number = 0;
  private requestCount: number = 0;
  
  public recordHit(responseTime: number): void {
    this.hits++;
    this.cachedResponseTime += responseTime;
    this.requestCount++;
  }
  
  public recordMiss(responseTime: number): void {
    this.misses++;
    this.totalResponseTime += responseTime;
    this.requestCount++;
  }
  
  public getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }
  
  public getAverageResponseTime(): {
    cached: number;
    uncached: number;
  } {
    return {
      cached: this.hits === 0 ? 0 : this.cachedResponseTime / this.hits,
      uncached: this.misses === 0 ? 0 : this.totalResponseTime / this.misses
    };
  }
  
  public getSummary(): string {
    const hitRate = (this.getHitRate() * 100).toFixed(1);
    const avgTimes = this.getAverageResponseTime();
    
    return [
      `Cache Hit Rate: ${hitRate}%`,
      `Avg Cached Response: ${avgTimes.cached.toFixed(0)}ms`,
      `Avg Uncached Response: ${avgTimes.uncached.toFixed(0)}ms`,
      `Total Requests: ${this.requestCount}`
    ].join('\n');
  }
}
```

### Debug Commands

**VS Code Command**: `kube9.showCacheStats`

**Output**: Display cache statistics in output panel

```typescript
vscode.commands.registerCommand('kube9.showCacheStats', () => {
  const metrics = getCacheMetrics();
  const cache = getResourceCache();
  
  const output = vscode.window.createOutputChannel('Kube9 Cache Stats');
  output.clear();
  output.appendLine('=== Kube9 Cache Statistics ===\n');
  output.appendLine(metrics.getSummary());
  output.appendLine(`\nCache Entries: ${cache.size()}`);
  output.appendLine(`Cache Size: ${(cache.totalSize() / 1024 / 1024).toFixed(2)} MB`);
  output.show();
});
```

## Testing Strategy

### Unit Tests

**Cache Operations**:
- Set and get with valid TTL
- TTL expiration behavior
- Key generation consistency
- Invalidation patterns
- LRU eviction logic
- Size estimation accuracy

### Integration Tests

**Real API Calls**:
- Verify cache reduces API call count
- Measure performance improvement with cache
- Test cache invalidation after resource changes
- Verify context switching doesn't corrupt cache

### Performance Tests

**Benchmarks**:
- Tree view load time (cold cache vs warm cache)
- Cache hit rate under typical usage
- Memory usage with large clusters
- Cache eviction performance

## Best Practices

1. **Always check cache before API call** - Avoid redundant network requests
2. **Invalidate aggressively on writes** - Ensure cache consistency after mutations
3. **Use appropriate TTLs** - Balance freshness and performance
4. **Monitor cache hit rates** - Adjust strategy if hit rate is low (<60%)
5. **Implement size limits** - Prevent excessive memory usage
6. **Log cache events in debug mode** - Aid troubleshooting
7. **Test cache behavior** - Ensure invalidation works correctly
8. **Provide cache-bypass option** - Allow users to force fresh data (shift+refresh)

