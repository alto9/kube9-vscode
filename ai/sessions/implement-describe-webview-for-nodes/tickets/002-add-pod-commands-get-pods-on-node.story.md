---
story_id: add-pod-commands-get-pods-on-node
session_id: implement-describe-webview-for-nodes
feature_id:
  - node-describe-webview
spec_id:
  - node-describe-webview-spec
status: completed
---

# Add PodCommands.getPodsOnNode() Method

## Objective

Add a new method to PodCommands class that fetches all pods running on a specific node using the Kubernetes API client.

## Context

To display which pods are running on a node in the describe webview, we need a method that filters pods by node name. The Kubernetes API supports field selectors for this purpose.

## Files to Modify

- `src/kubectl/PodCommands.ts`

## Implementation Steps

1. Add new interface `PodsOnNodeResult` to the file:
```typescript
export interface PodsOnNodeResult {
  pods: k8s.V1Pod[];
  error: KubectlError | null;
}
```

2. Add new static method `getPodsOnNode()` to PodCommands class:
```typescript
public static async getPodsOnNode(
  kubeconfigPath: string,
  contextName: string,
  nodeName: string
): Promise<PodsOnNodeResult>
```

3. Implementation should:
   - Set context on API client using `getKubernetesApiClient()`
   - Use `fetchPods()` from resourceFetchers with field selector: `spec.nodeName=${nodeName}`
   - Query all namespaces (not just default)
   - Return array of V1Pod objects on success
   - Return empty array and error object on failure
   - Follow existing patterns in PodCommands class

4. Import `k8s` from '@kubernetes/client-node' if not already imported

## Acceptance Criteria

- [ ] PodsOnNodeResult interface exported from file
- [ ] getPodsOnNode() method added to PodCommands class
- [ ] Method accepts kubeconfigPath, contextName, and nodeName parameters
- [ ] Method returns Promise<PodsOnNodeResult>
- [ ] Uses field selector to filter pods by node name
- [ ] Queries all namespaces (--all-namespaces equivalent)
- [ ] Returns empty pods array (not null) on error
- [ ] Handles errors gracefully and returns error in result object
- [ ] Follows existing code patterns in PodCommands class

## Estimated Time

< 20 minutes

## Dependencies

None - can be done in parallel with story 001

