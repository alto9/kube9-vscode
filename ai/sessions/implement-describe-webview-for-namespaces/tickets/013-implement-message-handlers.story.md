---
story_id: 013-implement-message-handlers
session_id: implement-describe-webview-for-namespaces
feature_id:
  - namespace-describe-webview
spec_id:
  - namespace-describe-webview-spec
status: pending
---

# Implement Webview Message Handlers

## Objective

Implement message handlers in DescribeWebview for namespace-specific actions: refresh, viewYaml, setDefaultNamespace, navigateToResource.

## Acceptance Criteria

- Message handler in DescribeWebview setupMessageHandling() for namespace actions
- `refresh` command re-fetches namespace data and updates webview
- `viewYaml` command opens YAML editor for namespace
- `setDefaultNamespace` command updates kubectl context and shows notification
- `navigateToResource` command focuses tree view on specified resource type in namespace
- Error handling for all commands with user-friendly notifications
- Tree view refresh triggered after setDefaultNamespace

## Files to Modify

- `src/webview/DescribeWebview.ts` - Add message handlers in setupMessageHandling()

## Implementation Notes

Message handler structure:
```typescript
private setupMessageHandling(): void {
  this.panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
      case 'refresh':
        await this.refreshCurrentResource();
        break;
      case 'viewYaml':
        await this.openYamlEditor();
        break;
      case 'setDefaultNamespace':
        await this.setDefaultNamespace(message.data.namespace);
        break;
      case 'navigateToResource':
        await this.navigateToResource(
          message.data.resourceType,
          message.data.namespace
        );
        break;
    }
  });
}

private async setDefaultNamespace(namespace: string): Promise<void> {
  try {
    await this.k8sClient.setContextNamespace(namespace);
    vscode.window.showInformationMessage(`Default namespace set to: ${namespace}`);
    vscode.commands.executeCommand('kube9.refreshTree');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to set default namespace: ${error.message}`);
  }
}

private async navigateToResource(resourceType: string, namespace: string): Promise<void> {
  vscode.commands.executeCommand('kube9.focusResourceType', resourceType, namespace);
}
```

## Estimated Time

20 minutes

## Dependencies

- Story 006 (requires DescribeWebview integration)
- Story 007 (requires React app sending messages)

