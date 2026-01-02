---
story_id: add-deployment-commands-get-details
session_id: implement-describe-webview-for-deployments
feature_id:
  - deployment-describe-webview
spec_id:
  - deployment-describe-webview-spec
status: completed
---

# Add Deployment Commands Get Details

## Objective

Create method in `WorkloadCommands` to fetch detailed deployment information for a specific deployment using the Kubernetes API client.

## Context

This command will fetch comprehensive deployment data including metadata, spec, and status. It follows the same pattern as existing resource detail commands but is specifically for single deployment details (not list operations). This data will be used by the DeploymentDescribeWebview to display deployment information.

## Acceptance Criteria

- [x] `WorkloadCommands.getDeploymentDetails()` method exists
- [x] Method accepts: `deploymentName`, `namespace`, `kubeconfigPath`, `contextName` parameters
- [x] Uses Kubernetes API client (not kubectl process spawning)
- [x] Returns complete V1Deployment object from @kubernetes/client-node
- [x] Handles errors gracefully with typed error result
- [x] Method is async and returns Promise<DeploymentDetailsResult>
- [x] No caching (describe views should always show fresh data)

## Implementation Steps

1. Open `src/kubectl/WorkloadCommands.ts`
2. Add `DeploymentDetailsResult` interface:
```typescript
export interface DeploymentDetailsResult {
    deployment?: k8s.V1Deployment;
    error?: KubectlError;
}
```
3. Add `getDeploymentDetails()` static method:
```typescript
public static async getDeploymentDetails(
    deploymentName: string,
    namespace: string,
    kubeconfigPath: string,
    contextName: string
): Promise<DeploymentDetailsResult>
```
4. Implementation should:
   - Set API client context
   - Call `appsV1Api.readNamespacedDeployment(deploymentName, namespace)`
   - Return complete V1Deployment object
   - Catch errors and return as KubectlError
5. Import necessary types from @kubernetes/client-node

## Files to Modify

- `src/kubectl/WorkloadCommands.ts` - Add getDeploymentDetails() method

## Related Patterns

See `NodeCommands.getNodeDetails()` for similar single-resource fetch pattern.

