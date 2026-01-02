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

Enable clicking pod names in the Node Describe webview's pod list to open the Pod Describe view in the same shared webview panel.

## Context

When users click a pod name in the webview, it should switch the shared describe panel to show that pod's details. This provides seamless navigation between related resources (Node → Pod) without opening multiple tabs.

## Files to Modify

- `src/webview/NodeDescribeWebview.ts` (update message handler)

## Implementation Steps

1. In NodeDescribeWebview.ts, implement the 'navigateToPod' message handler:
```typescript
case 'navigateToPod': {
  const podName = message.podName || message.name;
  const namespace = message.namespace;
  if (podName && namespace && NodeDescribeWebview.contextName) {
    // Open Pod Describe view in the same shared panel
    await vscode.commands.executeCommand('kube9.describePod', {
      name: podName,
      namespace: namespace,
      context: NodeDescribeWebview.contextName
    });
  }
  break;
}
```

2. The `kube9.describePod` command calls `DescribeWebview.showPodDescribe()` which:
   - Reuses the existing shared panel (the current Node describe panel)
   - Updates the panel title to `Pod / {podName}`
   - Switches the webview content to show Pod details
   - Maintains the single-panel-per-cluster approach

## Acceptance Criteria

- [x] navigateToPod message handler implemented in NodeDescribeWebview
- [x] Handler calls kube9.describePod command with pod name, namespace, and context
- [x] Clicking pod name in Node webview switches to Pod Describe view
- [x] Same webview panel is reused (no new tabs opened)
- [x] Pod Describe view shows complete pod details
- [x] Navigation works seamlessly without losing the shared panel
- [x] Error handling if pod details cannot be loaded

## Estimated Time

< 25 minutes

## Dependencies

- Requires story 007 to be completed (need webview JavaScript with navigation)

