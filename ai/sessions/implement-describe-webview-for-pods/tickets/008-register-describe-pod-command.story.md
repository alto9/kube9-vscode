---
story_id: 008-register-describe-pod-command
session_id: implement-describe-webview-for-pods
feature_id:
  - pod-describe-webview
spec_id:
  - pod-describe-webview-spec
status: completed
estimated_minutes: 10
---

# Register kube9.describePod Command

## Objective

Register the `kube9.describePod` command in the extension that will be triggered when a user left-clicks a Pod in the tree view.

## Acceptance Criteria

- [x] Open `src/extension.ts`
- [x] Register `kube9.describePod` command in the activate() function
- [x] Command handler accepts Pod configuration as parameter
- [x] Handler calls `DescribeWebview.showPodDescribe(context, podConfig)`
- [x] Add error handling for invalid Pod configuration
- [x] Show error notification if Pod data is missing or invalid

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

- [x] TypeScript compilation succeeds
- [x] Command appears in extension activation
- [x] Command executes without errors when called with valid Pod configuration
- [x] Error notification displays for invalid configuration

