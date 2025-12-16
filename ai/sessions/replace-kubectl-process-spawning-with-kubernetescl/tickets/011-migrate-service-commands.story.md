---
story_id: 011-migrate-service-commands
session_id: replace-kubectl-process-spawning-with-kubernetescl
title: Migrate Service Commands to Use API Client
feature_id:
  - api-client-performance
spec_id:
  - kubernetes-client-node-integration
status: pending
estimated_minutes: 20
---

# Migrate Service Commands to Use API Client

## Objective

Replace kubectl process spawning in `ServiceCommands.getServices()` with direct API client calls and caching.

## Context

Services are displayed in the Networking category. They change infrequently (30-second TTL appropriate). This migration handles both all-namespace and namespace-specific service queries and preserves service type, cluster IP, and port information.

## Acceptance Criteria

- [ ] `ServiceCommands.getServices()` uses `fetchServices()` instead of kubectl
- [ ] Caching integrated with 30-second TTL
- [ ] All-namespace fetching supported
- [ ] Namespace-specific fetching supported
- [ ] Service type (ClusterIP, NodePort, LoadBalancer) extracted
- [ ] ClusterIP and ports information preserved
- [ ] Function signature unchanged
- [ ] Error handling compatible

## Implementation Steps

1. Open `src/kubectl/ServiceCommands.ts`
2. Find `getServices()` method
3. Import API client, cache, and fetchServices
4. Modify implementation:
   - Set API client context
   - Generate cache key (include namespace if specified)
   - Check cache with 30-second TTL
   - Call `fetchServices({ namespace, timeout: 10 })`
   - Transform k8s.V1Service[] to ServiceInfo[]
   - Extract type, clusterIP, ports, selector
   - Cache result with CACHE_TTL.SERVICES
5. Test with tree view Networking category

## Files to Modify

- `src/kubectl/ServiceCommands.ts` - Update getServices()

## Implementation Pattern

```typescript
public static async getServices(
    kubeconfigPath: string,
    contextName: string,
    namespace?: string
): Promise<ServicesResult> {
    try {
        const apiClient = getKubernetesApiClient();
        apiClient.setContext(contextName);
        
        const cache = getResourceCache();
        const cacheKey = namespace 
            ? `${contextName}:services:${namespace}`
            : `${contextName}:services`;
        
        const cached = cache.get<ServiceInfo[]>(cacheKey);
        if (cached) {
            return { services: cached };
        }
        
        const v1Services = await fetchServices({ 
            namespace, 
            timeout: 10 
        });
        
        const services: ServiceInfo[] = v1Services.map(svc => ({
            name: svc.metadata?.name || 'Unknown',
            namespace: svc.metadata?.namespace || 'default',
            type: svc.spec?.type || 'ClusterIP',
            clusterIP: svc.spec?.clusterIP || 'None',
            ports: svc.spec?.ports?.map(p => ({
                name: p.name,
                port: p.port,
                targetPort: p.targetPort,
                protocol: p.protocol
            })) || [],
            selector: svc.spec?.selector || {}
        }));
        
        cache.set(cacheKey, services, CACHE_TTL.SERVICES);
        
        return { services };
    } catch (error: unknown) {
        const kubectlError = KubectlError.fromExecError(error, contextName);
        return {
            services: [],
            error: kubectlError
        };
    }
}
```

## Testing

- Verify services list in Networking category
- Verify service types displayed correctly
- Verify ClusterIP and ports shown in tooltips
- Test all-namespace fetching
- Test single-namespace fetching
- Verify cache hit on second access within 30 seconds
- Test with different service types (ClusterIP, NodePort, LoadBalancer)

## Notes

- Port information structure may need adjustment for UI display
- External IP for LoadBalancer services should be included if available
- Selector information useful for showing service → pod relationships

