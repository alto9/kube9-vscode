---
story_id: 006-integrate-with-describe-webview
session_id: implement-describe-webview-for-namespaces
feature_id:
  - namespace-describe-webview
spec_id:
  - namespace-describe-webview-spec
status: pending
---

# Integrate NamespaceDescribeProvider with DescribeWebview

## Objective

Add namespace support to the shared DescribeWebview class and register the command.

## Acceptance Criteria

- `showNamespaceDescribe()` method added to DescribeWebview
- Method creates or reveals shared panel with title "Namespace / {name}"
- NamespaceDescribeProvider instantiated and used to fetch data
- Data sent to webview via postMessage with command 'updateNamespaceData'
- Error handling implemented (sends 'showError' message on failure)
- Command 'kube9.describeNamespace' registered in extension.ts
- Command handler calls DescribeWebview.showNamespaceDescribe()

## Files to Modify

- `src/webview/DescribeWebview.ts` - Add showNamespaceDescribe method
- `src/extension.ts` - Register kube9.describeNamespace command

## Implementation Notes

Follow the pattern from `showPodDescribe()` in DescribeWebview:

```typescript
async showNamespaceDescribe(namespace: NamespaceTreeItemConfig): Promise<void> {
  // Create/reveal panel
  if (!this.panel) {
    this.panel = vscode.window.createWebviewPanel(...);
  } else {
    this.panel.title = `Namespace / ${namespace.name}`;
    this.panel.reveal();
  }
  
  // Fetch and send data
  try {
    const data = await this.namespaceProvider.getNamespaceDetails(namespace.name, namespace.context);
    this.panel.webview.postMessage({ command: 'updateNamespaceData', data });
  } catch (error) {
    this.panel.webview.postMessage({ command: 'showError', data: { message: error.message } });
  }
}
```

Command registration in extension.ts:
```typescript
vscode.commands.registerCommand('kube9.describeNamespace', async (config) => {
  const webview = DescribeWebview.getInstance(config.context);
  await webview.showNamespaceDescribe(config);
});
```

## Estimated Time

20 minutes

## Dependencies

- Stories 002-005 (requires complete NamespaceDescribeProvider)

