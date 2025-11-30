---
story_id: add-kubectl-scale-functions
session_id: add-quick-scale-for-deploymentsstatefulsetsreplica
feature_id: [workload-scaling]
spec_id: [workload-scaling-spec]
status: completed
priority: high
estimated_minutes: 25
---

## Objective

Add kubectl integration functions to get current replica count and scale workloads (Deployments, StatefulSets, ReplicaSets).

## Context

The WorkloadCommands class already has methods to fetch workload information. We need to add two new methods:
1. Get current replica count for a specific workload
2. Scale a workload to a specified replica count using `kubectl scale`

These functions will be used by the scale command handler.

## Implementation Steps

1. Open `src/kubectl/WorkloadCommands.ts`

2. Add interface for scale result:
```typescript
export interface ScaleResult {
    success: boolean;
    error?: KubectlError;
}
```

3. Add `getCurrentReplicaCount` static method:
```typescript
public static async getCurrentReplicaCount(
    kubeconfigPath: string,
    contextName: string,
    kind: 'Deployment' | 'StatefulSet' | 'ReplicaSet',
    name: string,
    namespace: string
): Promise<number | null>
```
- Use kubectl get with jsonpath: `kubectl get <kind>/<name> -n <namespace> -o jsonpath='{.spec.replicas}'`
- Parse result as integer
- Return null on error
- Handle missing replicas field (return 0)

4. Add `scaleWorkload` static method:
```typescript
public static async scaleWorkload(
    kubeconfigPath: string,
    contextName: string,
    kind: 'Deployment' | 'StatefulSet' | 'ReplicaSet',
    name: string,
    namespace: string,
    replicas: number
): Promise<ScaleResult>
```
- Convert kind to lowercase for kubectl command (deployment, statefulset, replicaset)
- Build command: `kubectl scale <kind>/<name> --replicas=<count> -n <namespace>`
- Use execFileAsync with KUBECTL_TIMEOUT_MS
- Return ScaleResult with success: true on success
- Return ScaleResult with success: false and KubectlError on failure

## Files Affected

- `src/kubectl/WorkloadCommands.ts` - Add two new static methods

## Acceptance Criteria

- [ ] `getCurrentReplicaCount` successfully retrieves replica count for Deployments
- [ ] `getCurrentReplicaCount` successfully retrieves replica count for StatefulSets
- [ ] `getCurrentReplicaCount` successfully retrieves replica count for ReplicaSets
- [ ] `getCurrentReplicaCount` returns null on kubectl errors
- [ ] `scaleWorkload` successfully scales Deployments
- [ ] `scaleWorkload` successfully scales StatefulSets
- [ ] `scaleWorkload` successfully scales ReplicaSets
- [ ] `scaleWorkload` returns proper error information on failure
- [ ] Functions use existing error handling patterns (KubectlError.fromExecError)

## Dependencies

- None (foundational story)

## Technical Notes

- Follow existing patterns in WorkloadCommands class
- Use `execFileAsync` from util/promisify
- Use KUBECTL_TIMEOUT_MS constant
- Use KubectlError for structured error handling
- Convert kind to lowercase for kubectl commands (Deployment → deployment)

