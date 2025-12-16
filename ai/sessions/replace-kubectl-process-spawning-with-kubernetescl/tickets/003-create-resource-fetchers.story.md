---
story_id: 003-create-resource-fetchers
session_id: replace-kubectl-process-spawning-with-kubernetescl
title: Create Resource Fetcher Functions
feature_id:
  - api-client-performance
spec_id:
  - kubernetes-client-node-integration
diagram_id:
  - api-client-architecture
status: pending
estimated_minutes: 30
---

# Create Resource Fetcher Functions

## Objective

Create a set of async functions that fetch Kubernetes resources using the API client, replacing kubectl command executions.

## Context

These functions will be the primary interface for fetching Kubernetes resources. They use the API client singleton and provide a clean async/await API for resource retrieval. This story focuses on core resources: nodes, namespaces, pods, deployments, and services.

## Acceptance Criteria

- [ ] New file `src/kubernetes/resourceFetchers.ts` created
- [ ] `FetchOptions` interface defined for common parameters
- [ ] `fetchNodes()` function implemented
- [ ] `fetchNamespaces()` function implemented
- [ ] `fetchPods()` function implemented with namespace support
- [ ] `fetchDeployments()` function implemented with namespace support
- [ ] `fetchServices()` function implemented with namespace support
- [ ] `fetchClusterResources()` parallel fetcher implemented
- [ ] Error handling function `handleApiError()` implemented
- [ ] All functions properly typed with TypeScript
- [ ] JSDoc documentation for all exported functions

## Implementation Steps

1. Create new file `src/kubernetes/resourceFetchers.ts`
2. Import necessary types from @kubernetes/client-node
3. Import API client singleton
4. Define `FetchOptions` interface
5. Implement resource fetcher functions:
   - fetchNodes(options)
   - fetchNamespaces(options)
   - fetchPods(options)
   - fetchDeployments(options)
   - fetchServices(options)
6. Implement `fetchClusterResources()` using Promise.all()
7. Implement `handleApiError()` helper function
8. Add comprehensive error handling to each function

## Files to Create

- `src/kubernetes/resourceFetchers.ts` - Resource fetching functions

## Implementation Reference

See spec `kubernetes-client-node-integration.spec.md` lines 119-350 for complete implementation details including:
- FetchOptions interface definition
- Each fetcher function signature
- Error handling patterns
- Parallel fetching implementation

Key patterns:
- All functions accept optional `FetchOptions`
- Timeout defaults to 10 seconds
- Namespace parameter is optional (all namespaces if omitted)
- Label and field selectors supported
- Errors are logged and re-thrown for caller handling

## Testing

- Verify fetchNodes() returns array of V1Node objects
- Verify fetchNamespaces() returns array of V1Namespace objects
- Verify fetchPods() works with and without namespace filter
- Verify fetchDeployments() works with and without namespace filter
- Verify fetchServices() works with and without namespace filter
- Verify fetchClusterResources() executes fetches in parallel
- Test error handling with unreachable cluster
- Test timeout behavior with slow cluster

## Notes

- These functions return native Kubernetes types (k8s.V1Node, k8s.V1Namespace, etc.)
- No kubectl process spawning - direct API calls only
- Connection pooling is automatic via underlying HTTP agent
- Parallel fetching significantly reduces load time for tree view initialization
- Error messages are logged but errors are re-thrown for caller handling

