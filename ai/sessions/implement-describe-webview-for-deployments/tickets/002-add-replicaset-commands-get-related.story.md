---
story_id: add-replicaset-commands-get-related
session_id: implement-describe-webview-for-deployments
feature_id:
  - deployment-describe-webview
spec_id:
  - deployment-describe-webview-spec
status: pending
---

# Add ReplicaSet Commands Get Related

## Objective

Create method in `WorkloadCommands` to fetch ReplicaSets owned by a specific deployment using owner references.

## Context

Deployments manage ReplicaSets through owner references. This command fetches all ReplicaSets in a namespace and filters to those owned by the specified deployment. The ReplicaSets will be displayed in the deployment describe webview showing revision history.

## Acceptance Criteria

- [ ] `WorkloadCommands.getRelatedReplicaSets()` method exists
- [ ] Method accepts: `deploymentName`, `deploymentUid`, `namespace`, `kubeconfigPath`, `contextName`
- [ ] Uses Kubernetes API client to fetch ReplicaSets
- [ ] Filters ReplicaSets by owner reference (matches deployment UID)
- [ ] Returns array of V1ReplicaSet objects
- [ ] Returns empty array if no ReplicaSets found (not an error)
- [ ] Handles errors gracefully with typed error result

## Implementation Steps

1. Open `src/kubectl/WorkloadCommands.ts`
2. Add `ReplicaSetsResult` interface:
```typescript
export interface ReplicaSetsResult {
    replicaSets: k8s.V1ReplicaSet[];
    error?: KubectlError;
}
```
3. Add `getRelatedReplicaSets()` static method:
```typescript
public static async getRelatedReplicaSets(
    deploymentName: string,
    deploymentUid: string,
    namespace: string,
    kubeconfigPath: string,
    contextName: string
): Promise<ReplicaSetsResult>
```
4. Implementation should:
   - Set API client context
   - Call `appsV1Api.listNamespacedReplicaSet(namespace)`
   - Filter results where `ownerReferences` contains deployment UID
   - Return filtered ReplicaSet array
5. Filter logic:
```typescript
const filtered = allReplicaSets.filter(rs =>
    rs.metadata?.ownerReferences?.some(ref =>
        ref.kind === 'Deployment' &&
        ref.name === deploymentName &&
        ref.uid === deploymentUid
    )
);
```

## Files to Modify

- `src/kubectl/WorkloadCommands.ts` - Add getRelatedReplicaSets() method

## Related Patterns

See `PodCommands.getPodsOnNode()` for similar filtering pattern.

