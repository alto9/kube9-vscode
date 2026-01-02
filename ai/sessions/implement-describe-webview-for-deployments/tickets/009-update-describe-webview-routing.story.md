---
story_id: update-describe-webview-routing
session_id: implement-describe-webview-for-deployments
feature_id:
  - deployment-describe-webview
spec_id:
  - deployment-describe-webview-spec
status: pending
---

# Update Describe Webview Routing

## Objective

Update `DescribeWebview.showFromTreeItem()` to route deployment resources to the new DeploymentDescribeWebview instead of showing "Coming soon" stub.

## Context

Currently, `DescribeWebview.showFromTreeItem()` shows a generic "Coming soon" message for all resources. Nodes already use a dedicated webview. Now deployments need to route to DeploymentDescribeWebview as well.

## Acceptance Criteria

- [ ] `DescribeWebview.showFromTreeItem()` checks resource kind
- [ ] If kind === 'Deployment', route to DeploymentDescribeWebview.show()
- [ ] If kind === 'Node', continue routing to NodeDescribeWebview (if applicable)
- [ ] Other resource types continue to show stub or route as appropriate
- [ ] DeploymentDescribeWebview imported in DescribeWebview.ts
- [ ] Deployment namespace extracted and passed correctly
- [ ] Kubeconfig path obtained and passed correctly

## Implementation Steps

1. Open `src/webview/DescribeWebview.ts`
2. Import `DeploymentDescribeWebview` at the top
3. In `showFromTreeItem()` method, after extracting resource info, add routing logic:
```typescript
public static showFromTreeItem(
    context: vscode.ExtensionContext,
    treeItem: ClusterTreeItem
): void {
    // ... existing extraction code ...
    
    // Route to specialized webviews
    if (kind === 'Deployment') {
        // Get kubeconfig path
        const kubeconfigPath = KubeconfigParser.getKubeconfigPath();
        
        // Call DeploymentDescribeWebview
        DeploymentDescribeWebview.show(
            context,
            name,
            namespace!, // Deployment is always namespaced
            kubeconfigPath,
            contextName
        );
        return;
    }
    
    // ... existing fallback to generic view ...
}
```
4. Ensure namespace is defined (deployments are always namespaced)
5. Import KubeconfigParser if not already imported
6. Test that clicking deployments opens DeploymentDescribeWebview

## Files to Modify

- `src/webview/DescribeWebview.ts` - Update showFromTreeItem() routing

## Notes

- Deployments are always namespace-scoped, so namespace should never be undefined
- Consider adding validation/error handling if namespace is missing

