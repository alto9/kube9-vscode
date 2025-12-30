---
story_id: create-node-describe-webview-class
session_id: implement-describe-webview-for-nodes
feature_id:
  - node-describe-webview
spec_id:
  - node-describe-webview-spec
status: pending
---

# Create NodeDescribeWebview Class

## Objective

Create the NodeDescribeWebview class that manages the webview panel, fetches data, and handles message passing between extension and webview.

## Context

This is the main controller class that orchestrates data fetching, transformation, and webview updates. It follows the same pattern as existing webview classes (DescribeWebview, NamespaceWebview, ClusterManagerWebview).

## Files to Create

- `src/webview/NodeDescribeWebview.ts` (new file)

## Implementation Steps

1. Create class with shared panel pattern (singleton approach):
```typescript
export class NodeDescribeWebview {
  private static currentPanel: vscode.WebviewPanel | undefined;
  private currentNodeName: string | undefined;
  private kubeconfigPath: string | undefined;
  private contextName: string | undefined;
}
```

2. Implement main public method:
```typescript
public static async show(
  context: vscode.ExtensionContext,
  nodeName: string,
  kubeconfigPath: string,
  contextName: string
): Promise<void>
```

3. Implementation should:
   - Create or reuse webview panel
   - Set panel title to "Node / {nodeName}"
   - Call refreshNodeData() to fetch and display data
   - Set up message handlers for refresh, navigateToPod, copyValue
   - Handle panel disposal and cleanup

4. Implement private method refreshNodeData():
   - Fetch node details using NodeCommands.getNodeDetails()
   - Fetch pods on node using PodCommands.getPodsOnNode()
   - Use Promise.all() for parallel fetching
   - Transform data using transformNodeData()
   - Post message to webview with command 'updateNodeData'
   - Handle errors and post error message to webview

5. Implement message handler setupMessageHandlers():
   - Handle 'refresh' message → call refreshNodeData()
   - Handle 'navigateToPod' message → reveal pod in tree view (stub for now)
   - Handle 'copyValue' message → copy to clipboard and show notification

6. Set webview HTML to placeholder (will be implemented in next story):
```typescript
panel.webview.html = '<html><body><h1>Loading node data...</h1></body></html>';
```

## Acceptance Criteria

- [ ] NodeDescribeWebview class created with singleton pattern
- [ ] show() static method creates or reuses webview panel
- [ ] Panel title shows "Node / {nodeName}"
- [ ] refreshNodeData() fetches data in parallel using Promise.all()
- [ ] refreshNodeData() transforms data and posts to webview
- [ ] Message handlers set up for refresh, navigateToPod, copyValue
- [ ] copyValue handler copies to clipboard and shows notification
- [ ] Error handling posts error message to webview
- [ ] Panel disposal cleans up references
- [ ] Follows patterns from existing webview classes
- [ ] Imports all required dependencies (NodeCommands, PodCommands, transformer)

## Estimated Time

< 30 minutes

## Dependencies

- Requires stories 001, 002, and 004 to be completed

