---
story_id: wire-up-tree-view-node-click
session_id: implement-describe-webview-for-nodes
feature_id:
  - node-describe-webview
spec_id:
  - node-describe-webview-spec
status: completed
---

# Wire Up Tree View Node Click Handler

## Objective

Connect the tree view node click to the NodeDescribeWebview so that left-clicking a node in the Nodes category opens the describe webview.

## Context

Currently, clicking nodes in the tree view has no action. We need to add a command that opens the NodeDescribeWebview when a node is clicked.

## Files to Modify

- `src/tree/categories/NodesCategory.ts` (add command to tree items)
- `src/extension.ts` (register command handler)

## Implementation Steps

1. In NodesCategory.ts, update node tree item creation:
   - Set command on tree item: `item.command = { command: 'kube9.describeNode', title: 'Describe Node', arguments: [nodeInfo, resourceData] }`
   - This makes left-click trigger the describe command

2. In extension.ts, register the command:
```typescript
context.subscriptions.push(
  vscode.commands.registerCommand(
    'kube9.describeNode',
    async (nodeInfo, resourceData) => {
      const nodeName = nodeInfo.name;
      const kubeconfigPath = getKubeconfigPath(context);
      const contextName = resourceData.context.name;
      
      await NodeDescribeWebview.show(
        context,
        nodeName,
        kubeconfigPath,
        contextName
      );
    }
  )
);
```

3. Import NodeDescribeWebview at top of extension.ts

4. Ensure kubeconfig path and context name are correctly passed

## Acceptance Criteria

- [ ] Node tree items have command set to 'kube9.describeNode'
- [ ] Command registered in extension.ts
- [ ] Command handler calls NodeDescribeWebview.show() with correct parameters
- [ ] Left-clicking a node in tree opens the describe webview
- [ ] Webview shows correct node name in title
- [ ] Webview displays node data
- [ ] NodeDescribeWebview imported in extension.ts
- [ ] No errors when clicking nodes

## Estimated Time

< 15 minutes

## Dependencies

- Requires stories 005, 006, and 007 to be completed (need working NodeDescribeWebview)

