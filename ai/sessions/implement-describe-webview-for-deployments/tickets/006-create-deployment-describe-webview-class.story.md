---
story_id: create-deployment-describe-webview-class
session_id: implement-describe-webview-for-deployments
feature_id:
  - deployment-describe-webview
spec_id:
  - deployment-describe-webview-spec
status: pending
---

# Create DeploymentDescribeWebview Class

## Objective

Create the DeploymentDescribeWebview class that manages the webview panel, fetches data, and handles message passing between extension and webview.

## Context

This is the main controller class that orchestrates data fetching, transformation, and webview updates. It follows the same pattern as NodeDescribeWebview with a shared panel approach.

## Acceptance Criteria

- [ ] `DeploymentDescribeWebview.ts` file exists in `src/webview/`
- [ ] Class has static shared panel pattern (singleton approach)
- [ ] `show()` static method creates or reuses webview panel
- [ ] `refreshDeploymentData()` private method fetches and updates data
- [ ] Message handlers for refresh, navigateToReplicaSet, copyValue
- [ ] Parallel data fetching using Promise.all()
- [ ] Error handling with user-friendly messages
- [ ] Panel disposal cleanup
- [ ] Webview retains context when hidden

## Implementation Steps

1. Create `src/webview/DeploymentDescribeWebview.ts`
2. Create class with shared panel pattern:
```typescript
export class DeploymentDescribeWebview {
    private static currentPanel: vscode.WebviewPanel | undefined;
    private static extensionContext: vscode.ExtensionContext;
    private static currentDeploymentName: string | undefined;
    private static currentNamespace: string | undefined;
    private static kubeconfigPath: string | undefined;
    private static contextName: string | undefined;
}
```
3. Implement main public method:
```typescript
public static async show(
    context: vscode.ExtensionContext,
    deploymentName: string,
    namespace: string,
    kubeconfigPath: string,
    contextName: string
): Promise<void>
```
4. Implementation should:
   - Create or reuse webview panel
   - Set panel title to "Deployment / {deploymentName}"
   - Call refreshDeploymentData() to fetch and display data
   - Set up message handlers
   - Handle panel disposal and cleanup
5. Implement `refreshDeploymentData()`:
   - Fetch deployment, ReplicaSets, events in parallel
   - Use Promise.all([getDeploymentDetails(), getRelatedReplicaSets(), getDeploymentEvents()])
   - Transform data using transformDeploymentData()
   - Post message to webview with command 'updateDeploymentData'
   - Handle errors and post error message to webview
6. Implement message handlers:
   - 'refresh' → call refreshDeploymentData()
   - 'navigateToReplicaSet' → execute revealResource command
   - 'copyValue' → copy to clipboard
7. Set webview options:
   - enableScripts: true
   - retainContextWhenHidden: true

## Files to Create

- `src/webview/DeploymentDescribeWebview.ts`

## Implementation Pattern

Follow NodeDescribeWebview.ts structure exactly, adapting for deployment-specific data.

## Related Patterns

See `src/webview/NodeDescribeWebview.ts` for complete reference implementation.

