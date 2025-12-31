---
story_id: 003-add-pod-tree-item-click-command
session_id: implement-describe-webview-for-pods
feature_id:
  - pod-describe-webview
spec_id:
  - pod-describe-webview-spec
status: completed
estimated_minutes: 15
---

# Add Click Command to PodTreeItem

## Objective

Enhance PodTreeItem to trigger the Describe webview when a user left-clicks on a Pod in the tree view.

## Acceptance Criteria

- [x] Open `src/tree/items/PodTreeItem.ts`
- [x] Add `command` property to PodTreeItem constructor
- [x] Set command to `kube9.describePod`
- [x] Pass Pod configuration (name, namespace, status, metadata, context) as command arguments
- [x] Command should only trigger on left-click, not right-click
- [x] Ensure no breaking changes to existing Pod tree item functionality

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

- [x] TypeScript compilation succeeds
- [x] No linter errors
- [x] Left-clicking a Pod in tree view attempts to execute `kube9.describePod` command
- [x] Pod information is passed correctly in command arguments

