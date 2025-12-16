---
story_id: 005-migrate-node-commands
session_id: replace-kubectl-process-spawning-with-kubernetescl
title: Migrate NodeCommands to Use API Client
feature_id:
  - api-client-performance
spec_id:
  - kubernetes-client-node-integration
status: pending
estimated_minutes: 20
---

# Migrate NodeCommands to Use API Client

## Objective

Replace kubectl process spawning in `NodeCommands.getNodes()` with direct API client calls and caching.

## Context

NodeCommands.getNodes() currently spawns kubectl to list nodes. This migration eliminates process overhead and adds caching since nodes change infrequently. The function signature remains the same for backward compatibility, but the implementation switches to API client.

## Acceptance Criteria

- [ ] `NodeCommands.getNodes()` uses `fetchNodes()` instead of kubectl
- [ ] Caching integrated with 30-second TTL
- [ ] Function signature unchanged (still accepts kubeconfigPath and contextName)
- [ ] Return type unchanged (still returns NodesResult)
- [ ] Error handling compatible with existing patterns
- [ ] Existing callers work without modification

## Implementation Steps

1. Open `src/kubectl/NodeCommands.ts`
2. Add imports:
   ```typescript
   import { fetchNodes } from '../kubernetes/resourceFetchers';
   import { getResourceCache, CACHE_TTL } from '../kubernetes/cache';
   import { getKubernetesApiClient } from '../kubernetes/apiClient';
   ```
3. Modify `getNodes()` method:
   - Set API client context before fetching
   - Generate cache key: `${contextName}:nodes`
   - Check cache first using `cache.get()`
   - If cache miss, call `fetchNodes()`
   - Store result in cache with CACHE_TTL.NODES
   - Transform k8s.V1Node[] to NodeInfo[] format
   - Keep existing error handling structure
4. Keep kubectl error type handling for compatibility
5. Test with existing callers

## Files to Modify

- `src/kubectl/NodeCommands.ts` - Replace kubectl with API client

## Implementation Pattern

```typescript
public static async getNodes(
    kubeconfigPath: string,
    contextName: string
): Promise<NodesResult> {
    try {
        // Set context on API client
        const apiClient = getKubernetesApiClient();
        apiClient.setContext(contextName);
        
        // Check cache first
        const cache = getResourceCache();
        const cacheKey = `${contextName}:nodes`;
        const cached = cache.get<NodeInfo[]>(cacheKey);
        if (cached) {
            return { nodes: cached };
        }
        
        // Fetch from API
        const v1Nodes = await fetchNodes({ timeout: 10 });
        
        // Transform to NodeInfo format
        const nodes: NodeInfo[] = v1Nodes.map(node => ({
            name: node.metadata?.name || 'Unknown',
            status: node.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady',
            roles: node.metadata?.labels?.['node-role.kubernetes.io/master'] ? 'master' : 'worker',
            version: node.status?.nodeInfo?.kubeletVersion || 'Unknown'
        }));
        
        // Cache result
        cache.set(cacheKey, nodes, CACHE_TTL.NODES);
        
        return { nodes };
    } catch (error: unknown) {
        // Keep existing error handling
        const kubectlError = KubectlError.fromExecError(error, contextName);
        return {
            nodes: [],
            error: kubectlError
        };
    }
}
```

## Testing

- Verify nodes are fetched without kubectl process
- Verify cache hit on second call within 30 seconds
- Verify cache miss after 30 seconds
- Test error handling with unreachable cluster
- Confirm existing tree view still displays nodes correctly

## Notes

- kubeconfigPath parameter is now unused (API client loads from default)
- Keep parameter for backward compatibility
- Context switching is handled by setContext() before fetch
- Node information extraction logic may differ slightly from kubectl output
- Ensure status, roles, and version fields are correctly mapped

