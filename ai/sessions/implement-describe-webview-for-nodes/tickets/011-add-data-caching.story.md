---
story_id: add-data-caching
session_id: implement-describe-webview-for-nodes
feature_id:
  - node-describe-webview
spec_id:
  - node-describe-webview-spec
status: pending
---

# Add 30-Second Data Caching for Node Describe

## Objective

Implement 30-second caching for node describe data to reduce redundant kubectl API calls when users rapidly refresh or switch between nodes.

## Context

To improve performance and reduce API load, node data should be cached for 30 seconds. The existing codebase uses a resource cache pattern (see `src/kubernetes/cache.ts`).

## Files to Modify

- `src/webview/NodeDescribeWebview.ts` (add caching to refreshNodeData)

## Implementation Steps

1. Import cache utilities:
```typescript
import { getResourceCache, CACHE_TTL } from '../kubernetes/cache';
```

2. Update refreshNodeData() method to use cache:
```typescript
private static async refreshNodeData(...): Promise<void> {
  const cache = getResourceCache();
  const cacheKey = `node-describe:${contextName}:${nodeName}`;
  
  // Check cache first
  const cached = cache.get<NodeDescribeData>(cacheKey);
  if (cached) {
    this.panel?.webview.postMessage({
      command: 'updateNodeData',
      data: cached
    });
    return;
  }
  
  // Fetch data...
  // Transform data...
  const describeData = transformNodeData(nodeData, podsData);
  
  // Cache for 30 seconds
  cache.set(cacheKey, describeData, 30000);
  
  // Send to webview...
}
```

3. Add method to clear cache when needed:
```typescript
private static clearNodeCache(contextName: string, nodeName: string): void {
  const cache = getResourceCache();
  const cacheKey = `node-describe:${contextName}:${nodeName}`;
  cache.delete(cacheKey);
}
```

4. Update refresh handler to clear cache before fetching:
```typescript
case 'refresh':
  this.clearNodeCache(contextName, nodeName);
  await this.refreshNodeData(...);
  break;
```

## Acceptance Criteria

- [ ] Cache imported from kubernetes/cache module
- [ ] refreshNodeData() checks cache before fetching data
- [ ] Cache key includes context name and node name
- [ ] Cached data returned immediately if < 30 seconds old
- [ ] Fresh data cached after fetching with 30-second TTL
- [ ] clearNodeCache() method added
- [ ] Refresh button clears cache before fetching
- [ ] Rapid refreshes within 30 seconds use cached data
- [ ] After 30 seconds, new data is fetched
- [ ] Cache doesn't interfere with different nodes
- [ ] Performance improvement observable (reduced API calls)

## Estimated Time

< 15 minutes

## Dependencies

- Requires story 005 to be completed (need NodeDescribeWebview class)

