---
story_id: 008-register-describe-pod-command
session_id: implement-describe-webview-for-pods
feature_id:
  - pod-describe-webview
spec_id:
  - pod-describe-webview-spec
status: pending
estimated_minutes: 10
---

# Register kube9.describePod Command

## Objective

Register the `kube9.describePod` command in the extension that will be triggered when a user left-clicks a Pod in the tree view.

## Acceptance Criteria

- [ ] Open `src/extension.ts`
- [ ] Register `kube9.describePod` command in the activate() function
- [ ] Command handler accepts Pod configuration as parameter
- [ ] Handler calls `DescribeWebview.showPodDescribe(context, podConfig)`
- [ ] Add error handling for invalid Pod configuration
- [ ] Show error notification if Pod data is missing or invalid

## Files Involved

**Modified Files:**
- `src/extension.ts`

## Implementation Notes

Reference:
- `ai/specs/webview/pod-describe-webview-spec.spec.md` (lines 858-867)

Command registration:
```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('kube9.describePod', async (podConfig: PodTreeItemConfig) => {
    try {
      if (!podConfig || !podConfig.name || !podConfig.namespace) {
        throw new Error('Invalid Pod configuration');
      }
      
      await DescribeWebview.showPodDescribe(context, podConfig);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to describe Pod: ${error.message}`);
    }
  })
);
```

## Dependencies

- Story 004 (DescribeWebview.showPodDescribe must exist)

## Testing

- [ ] TypeScript compilation succeeds
- [ ] Command appears in extension activation
- [ ] Command executes without errors when called with valid Pod configuration
- [ ] Error notification displays for invalid configuration

