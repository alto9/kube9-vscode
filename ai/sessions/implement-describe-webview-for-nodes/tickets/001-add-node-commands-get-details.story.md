---
story_id: add-node-commands-get-details
session_id: implement-describe-webview-for-nodes
feature_id:
  - node-describe-webview
spec_id:
  - node-describe-webview-spec
status: pending
---

# Add NodeCommands.getNodeDetails() Method

## Objective

Add a new method to NodeCommands class that fetches detailed information for a specific node using the Kubernetes API client.

## Context

The current NodeCommands class only has `getNodes()` which returns a list of all nodes with basic info (name, status, roles). We need a new method that returns complete V1Node details for a single node to power the describe webview.

## Files to Modify

- `src/kubectl/NodeCommands.ts`

## Implementation Steps

1. Add new interface `NodeDetailsResult` to the file:
```typescript
export interface NodeDetailsResult {
  node: k8s.V1Node | null;
  error: KubectlError | null;
}
```

2. Add new static method `getNodeDetails()` to NodeCommands class:
```typescript
public static async getNodeDetails(
  kubeconfigPath: string,
  contextName: string,
  nodeName: string
): Promise<NodeDetailsResult>
```

3. Implementation should:
   - Set context on API client using `getKubernetesApiClient()`
   - Use `fetchNode(nodeName)` from resourceFetchers
   - Return V1Node object on success
   - Return error on failure
   - Follow same pattern as existing `getNodes()` method

4. Import `k8s` from '@kubernetes/client-node' if not already imported

## Acceptance Criteria

- [ ] NodeDetailsResult interface exported from file
- [ ] getNodeDetails() method added to NodeCommands class
- [ ] Method accepts kubeconfigPath, contextName, and nodeName parameters
- [ ] Method returns Promise<NodeDetailsResult>
- [ ] Uses Kubernetes API client (not kubectl CLI)
- [ ] Handles errors gracefully and returns error in result object
- [ ] Follows existing code patterns in NodeCommands class

## Estimated Time

< 20 minutes

## Dependencies

None - this is the foundation for subsequent stories

