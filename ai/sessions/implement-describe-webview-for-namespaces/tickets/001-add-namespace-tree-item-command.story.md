---
story_id: 001-add-namespace-tree-item-command
session_id: implement-describe-webview-for-namespaces
feature_id:
  - namespace-describe-webview
spec_id:
  - namespace-describe-webview-spec
status: pending
---

# Add Namespace TreeItem Click Command

## Objective

Add left-click command to NamespaceTreeItem to trigger namespace describe webview.

## Acceptance Criteria

- NamespaceTreeItem has `command` property configured
- Command is `kube9.describeNamespace`
- Command passes NamespaceTreeItemConfig with name, context, status, metadata
- Left-clicking namespace in tree view triggers command

## Files to Modify

- `src/tree/items/NamespaceTreeItem.ts` - Add command property to constructor

## Implementation Notes

Follow the pattern used in other tree items (see ClusterTreeItem). The command should be:

```typescript
this.command = {
  command: 'kube9.describeNamespace',
  title: 'Describe Namespace',
  arguments: [config]
};
```

Where config is:
```typescript
interface NamespaceTreeItemConfig {
  name: string;
  status: V1NamespaceStatus;
  metadata: V1ObjectMeta;
  context: string;
}
```

## Estimated Time

15 minutes

## Dependencies

None - this is the foundation

