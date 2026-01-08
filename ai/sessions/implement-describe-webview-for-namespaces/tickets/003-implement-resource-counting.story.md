---
story_id: 003-implement-resource-counting
session_id: implement-describe-webview-for-namespaces
feature_id:
  - namespace-describe-webview
spec_id:
  - namespace-describe-webview-spec
status: completed
---

# Implement Resource Counting Logic

## Objective

Implement comprehensive resource counting for all resource types in a namespace using parallel API calls.

## Acceptance Criteria

- `countNamespacedResources()` method implemented with Promise.all for parallel execution
- `countPods()` method counts pods by status (Running, Pending, Failed, Succeeded)
- `countServices()` method counts services by type (ClusterIP, NodePort, LoadBalancer, ExternalName)
- `countJobs()` method counts jobs by status (Active, Completed, Failed)
- `countPVCs()` method counts PVCs by phase (Bound, Pending, Lost)
- `countResource()` generic method for simple resource counts (deployments, statefulsets, etc.)
- All 17 resource types counted: pods, deployments, statefulSets, daemonSets, services, configMaps, secrets, ingresses, jobs, cronJobs, pvcs, replicaSets, endpoints, networkPolicies, serviceAccounts, roles, roleBindings

## Files to Modify

- `src/providers/NamespaceDescribeProvider.ts` - Add resource counting methods

## Implementation Notes

Use parallel API calls for performance:

```typescript
const [pods, deployments, statefulSets, ...] = await Promise.all([
  this.countPods(namespace),
  this.countResource('deployments', namespace),
  this.countResource('statefulsets', namespace),
  // ... all resource types
]);
```

Each specialized counter (pods, services, jobs, pvcs) should:
1. Fetch all resources of that type
2. Iterate through items and count by status/type
3. Return summary object with counts

## Estimated Time

30 minutes

## Dependencies

- Story 002 (requires NamespaceDescribeProvider foundation)

