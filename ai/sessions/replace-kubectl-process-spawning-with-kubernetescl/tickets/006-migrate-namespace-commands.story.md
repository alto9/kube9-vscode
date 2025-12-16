---
story_id: 006-migrate-namespace-commands
session_id: replace-kubectl-process-spawning-with-kubernetescl
title: Migrate NamespaceCommands to Use API Client
feature_id:
  - api-client-performance
spec_id:
  - kubernetes-client-node-integration
status: completed
estimated_minutes: 20
---

# Migrate NamespaceCommands to Use API Client

## Objective

Replace kubectl process spawning in `NamespaceCommands.getNamespaces()` with direct API client calls and caching.

## Context

NamespaceCommands.getNamespaces() currently spawns kubectl to list namespaces. Like nodes, namespaces change infrequently and benefit from caching. This migration provides 30-second caching and eliminates process overhead.

## Acceptance Criteria

- [ ] `NamespaceCommands.getNamespaces()` uses `fetchNamespaces()` instead of kubectl
- [ ] Caching integrated with 30-second TTL
- [ ] Function signature unchanged
- [ ] Return type unchanged (still returns NamespacesResult)
- [ ] Alphabetical sorting preserved
- [ ] Error handling compatible with existing patterns
- [ ] Existing callers work without modification

## Implementation Steps

1. Open `src/kubectl/NamespaceCommands.ts`
2. Add imports:
   ```typescript
   import { fetchNamespaces } from '../kubernetes/resourceFetchers';
   import { getResourceCache, CACHE_TTL } from '../kubernetes/cache';
   import { getKubernetesApiClient } from '../kubernetes/apiClient';
   ```
3. Modify `getNamespaces()` method:
   - Set API client context
   - Generate cache key: `${contextName}:namespaces`
   - Check cache first
   - If cache miss, call `fetchNamespaces()`
   - Transform k8s.V1Namespace[] to NamespaceInfo[]
   - Sort alphabetically
   - Cache result with CACHE_TTL.NAMESPACES
   - Keep existing error handling
4. Test with existing callers

## Files to Modify

- `src/kubectl/NamespaceCommands.ts` - Replace kubectl with API client

## Implementation Pattern

```typescript
public static async getNamespaces(
    kubeconfigPath: string,
    contextName: string
): Promise<NamespacesResult> {
    try {
        // Set context on API client
        const apiClient = getKubernetesApiClient();
        apiClient.setContext(contextName);
        
        // Check cache first
        const cache = getResourceCache();
        const cacheKey = `${contextName}:namespaces`;
        const cached = cache.get<NamespaceInfo[]>(cacheKey);
        if (cached) {
            return { namespaces: cached };
        }
        
        // Fetch from API
        const v1Namespaces = await fetchNamespaces({ timeout: 10 });
        
        // Transform to NamespaceInfo format
        const namespaces: NamespaceInfo[] = v1Namespaces.map(ns => ({
            name: ns.metadata?.name || 'Unknown',
            status: ns.status?.phase || 'Unknown'
        }));
        
        // Sort alphabetically
        namespaces.sort((a, b) => a.name.localeCompare(b.name));
        
        // Cache result
        cache.set(cacheKey, namespaces, CACHE_TTL.NAMESPACES);
        
        return { namespaces };
    } catch (error: unknown) {
        const kubectlError = KubectlError.fromExecError(error, contextName);
        return {
            namespaces: [],
            error: kubectlError
        };
    }
}
```

## Testing

- Verify namespaces fetched without kubectl process
- Verify alphabetical sorting maintained
- Verify cache hit on second call within 30 seconds
- Verify cache miss after 30 seconds
- Test error handling with unreachable cluster
- Confirm tree view displays namespaces correctly

## Notes

- ClusterConnectivity.getNamespaces() also exists and should be migrated similarly
- Consider consolidating duplicate namespace fetching logic in future refactor
- Namespace phase extraction logic identical to kubectl output

