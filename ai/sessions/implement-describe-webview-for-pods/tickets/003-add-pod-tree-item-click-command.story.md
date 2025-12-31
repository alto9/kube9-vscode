---
story_id: 003-add-pod-tree-item-click-command
session_id: implement-describe-webview-for-pods
feature_id:
  - pod-describe-webview
spec_id:
  - pod-describe-webview-spec
status: pending
estimated_minutes: 15
---

# Add Click Command to PodTreeItem

## Objective

Enhance PodTreeItem to trigger the Describe webview when a user left-clicks on a Pod in the tree view.

## Acceptance Criteria

- [ ] Open `src/tree/items/PodTreeItem.ts`
- [ ] Add `command` property to PodTreeItem constructor
- [ ] Set command to `kube9.describePod`
- [ ] Pass Pod configuration (name, namespace, status, metadata, context) as command arguments
- [ ] Command should only trigger on left-click, not right-click
- [ ] Ensure no breaking changes to existing Pod tree item functionality

## Files Involved

**Modified Files:**
- `src/tree/items/PodTreeItem.ts`

## Implementation Notes

Add this to the PodTreeItem constructor:

```typescript
this.command = {
  command: 'kube9.describePod',
  title: 'Describe Pod',
  arguments: [{
    name: podInfo.name,
    namespace: podInfo.namespace,
    status: podInfo.status,
    metadata: {}, // Extract from podInfo if available
    context: resourceData.context.name
  }]
};
```

Reference:
- `ai/specs/webview/pod-describe-webview-spec.spec.md` (lines 23-43)

## Dependencies

None - this is independent work.

## Testing

- [ ] TypeScript compilation succeeds
- [ ] No linter errors
- [ ] Left-clicking a Pod in tree view attempts to execute `kube9.describePod` command
- [ ] Pod information is passed correctly in command arguments

