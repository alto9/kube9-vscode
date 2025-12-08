---
story_id: add-tree-view-refresh-after-scaling
session_id: add-quick-scale-for-deploymentsstatefulsetsreplica
feature_id: [workload-scaling]
spec_id: [workload-scaling-spec]
status: completed
priority: medium
estimated_minutes: 15
---

## Objective

Add automatic tree view refresh after successful scaling operation to show updated replica counts.

## Context

After scaling a workload, the tree view should automatically refresh to show the new replica count. This requires access to the ClusterTreeProvider instance.

## Implementation Steps

1. Open `src/extension.ts`

2. Find where ClusterTreeProvider is instantiated:
```typescript
const clusterTreeProvider = new ClusterTreeProvider(/* ... */);
```

3. Modify the scale command registration to pass the tree provider:
```typescript
context.subscriptions.push(
    vscode.commands.registerCommand('kube9.scaleWorkload', async (treeItem) => {
        await scaleWorkloadCommand(treeItem);
        // Refresh tree view after scaling
        clusterTreeProvider.refresh();
    })
);
```

4. Open `src/commands/scaleWorkload.ts`

5. The command handler is already complete - the refresh is handled by the wrapper in extension.ts

## Files Affected

- `src/extension.ts` - Modify command registration to add refresh call

## Acceptance Criteria

- [x] Tree view refreshes automatically after successful scaling
- [x] Tree view refreshes even if scaling fails (to show actual state)
- [x] Refresh happens after both success and error notifications
- [x] No duplicate refresh calls

## Dependencies

- Story 005 (command registration)

## Technical Notes

- Wrap the command handler call in extension.ts to add refresh
- Use `clusterTreeProvider.refresh()` method
- Refresh should happen after command completes (both success and error cases)
- The tree provider already has access to kubectl commands to fetch updated state

