---
story_id: 010-migrate-deployment-commands
session_id: replace-kubectl-process-spawning-with-kubernetescl
title: Migrate Deployment Commands to Use API Client
feature_id:
  - api-client-performance
spec_id:
  - kubernetes-client-node-integration
status: pending
estimated_minutes: 20
---

# Migrate Deployment Commands to Use API Client

## Objective

Replace kubectl process spawning in `WorkloadCommands.getDeployments()` with direct API client calls and caching.

## Context

Deployments are fetched to populate the Workloads category in the tree view. They change moderately (scaling, updates) so use 10-second cache TTL. This migration handles both all-namespace and namespace-specific queries.

## Acceptance Criteria

- [ ] `WorkloadCommands.getDeployments()` uses `fetchDeployments()` instead of kubectl
- [ ] Caching integrated with 10-second TTL
- [ ] All-namespace fetching supported
- [ ] Namespace-specific fetching supported
- [ ] Function signature unchanged
- [ ] Deployment info extraction (replicas, labels) preserved
- [ ] Error handling compatible

## Implementation Steps

1. Open `src/kubectl/WorkloadCommands.ts`
2. Find `getDeployments()` method
3. Import API client, cache, and fetchDeployments
4. Modify implementation:
   - Set API client context
   - Generate cache key (include namespace if specified)
   - Check cache with 10-second TTL
   - Call `fetchDeployments({ namespace, timeout: 10 })`
   - Transform k8s.V1Deployment[] to DeploymentInfo[]
   - Extract replicas, labels, selector
   - Cache result with CACHE_TTL.DEPLOYMENTS
5. Test with tree view Workloads category

## Files to Modify

- `src/kubectl/WorkloadCommands.ts` - Update getDeployments()

## Implementation Pattern

```typescript
public static async getDeployments(
    kubeconfigPath: string,
    contextName: string,
    namespace?: string
): Promise<DeploymentsResult> {
    try {
        const apiClient = getKubernetesApiClient();
        apiClient.setContext(contextName);
        
        const cache = getResourceCache();
        const cacheKey = namespace 
            ? `${contextName}:deployments:${namespace}`
            : `${contextName}:deployments`;
        
        const cached = cache.get<DeploymentInfo[]>(cacheKey);
        if (cached) {
            return { deployments: cached };
        }
        
        const v1Deployments = await fetchDeployments({ 
            namespace, 
            timeout: 10 
        });
        
        const deployments: DeploymentInfo[] = v1Deployments.map(deploy => ({
            name: deploy.metadata?.name || 'Unknown',
            namespace: deploy.metadata?.namespace || 'default',
            replicas: deploy.spec?.replicas || 0,
            availableReplicas: deploy.status?.availableReplicas || 0,
            labels: deploy.spec?.template?.metadata?.labels || {},
            selector: this.formatLabelSelector(deploy.spec?.selector?.matchLabels || {})
        }));
        
        cache.set(cacheKey, deployments, CACHE_TTL.DEPLOYMENTS);
        
        return { deployments };
    } catch (error: unknown) {
        const kubectlError = KubectlError.fromExecError(error, contextName);
        return {
            deployments: [],
            error: kubectlError
        };
    }
}
```

## Testing

- Verify deployments list in tree view
- Verify replica counts displayed correctly
- Test all-namespace fetching
- Test single-namespace fetching
- Verify cache hit on second access within 10 seconds
- Test with deployment scaling operation

## Notes

- Label selector formatting logic may need adjustment
- Deployment status fields (replicas, availableReplicas) critical for health display
- Consider invalidating deployment cache after scale operations (future)

