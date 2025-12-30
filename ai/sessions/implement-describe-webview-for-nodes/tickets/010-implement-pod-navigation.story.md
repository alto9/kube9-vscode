---
story_id: implement-pod-navigation
session_id: implement-describe-webview-for-nodes
feature_id:
  - node-describe-webview
spec_id:
  - node-describe-webview-spec
status: completed
---

# Implement Pod Navigation from Node Describe Webview

## Objective

Enable clicking pod names in the Node Describe webview's pod list to navigate to and reveal that pod in the tree view.

## Context

When users click a pod name in the webview, it should navigate to that pod in the tree view. This requires revealing the pod's category, expanding it, and selecting the pod item.

## Files to Modify

- `src/webview/NodeDescribeWebview.ts` (update message handler)
- `src/tree/ClusterTreeProvider.ts` (add method to reveal pod)

## Implementation Steps

1. In NodeDescribeWebview.ts, enhance the 'navigateToPod' message handler:
```typescript
case 'navigateToPod':
  const { podName, namespace } = message.data;
  await this.navigateToPodInTree(podName, namespace);
  break;
```

2. Add new private method to NodeDescribeWebview:
```typescript
private static async navigateToPodInTree(
  podName: string,
  namespace: string
): Promise<void> {
  // Get tree view
  const treeView = ... // Access to tree view instance
  
  // Find pod in tree
  // This requires accessing ClusterTreeProvider's reveal method
  
  // Reveal and select the pod
  await vscode.commands.executeCommand('kube9.revealPod', podName, namespace);
}
```

3. In ClusterTreeProvider.ts, add public method:
```typescript
public async revealPod(podName: string, namespace: string): Promise<void> {
  // Find the pod tree item in the tree structure
  // This involves:
  // 1. Finding the current cluster
  // 2. Expanding the Workloads category
  // 3. Expanding the Pods subcategory
  // 4. Finding the specific pod
  // 5. Using tree view's reveal() method
  
  const podItem = await this.findPodTreeItem(podName, namespace);
  if (podItem && this.treeView) {
    await this.treeView.reveal(podItem, { select: true, focus: true, expand: true });
  }
}
```

4. Register command in extension.ts:
```typescript
context.subscriptions.push(
  vscode.commands.registerCommand(
    'kube9.revealPod',
    async (podName, namespace) => {
      await treeProvider.revealPod(podName, namespace);
    }
  )
);
```

## Acceptance Criteria

- [ ] navigateToPod message handler implemented in NodeDescribeWebview
- [ ] revealPod method added to ClusterTreeProvider
- [ ] Method finds pod tree item by name and namespace
- [ ] Tree view reveals and selects the pod
- [ ] Workloads and Pods categories expand automatically
- [ ] Command registered in extension.ts
- [ ] Clicking pod name in webview navigates to pod in tree
- [ ] Focus switches to tree view after navigation
- [ ] Error handling if pod not found in tree
- [ ] Shows info message if pod cannot be found

## Estimated Time

< 25 minutes

## Dependencies

- Requires story 007 to be completed (need webview JavaScript with navigation)

