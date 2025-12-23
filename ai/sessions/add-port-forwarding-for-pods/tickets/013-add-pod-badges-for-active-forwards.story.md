---
story_id: 013-add-pod-badges-for-active-forwards
session_id: add-port-forwarding-for-pods
feature_id:
  - pod-port-forwarding
spec_id:
  - port-forwarding-tree-spec
status: pending
---

# Add Pod Badges for Active Forwards

## Objective

Update pod tree items to show a lightning bolt badge (⚡) when they have active port forwards.

## Context

Pods with active forwards should be visually marked in the tree view so users can quickly see which pods are being forwarded.

## Implementation

### File: src/tree/TreeItemFactory.ts or wherever pod items are created

Update the pod item creation logic:

```typescript
public static createPodItem(pod: any, resourceData: TreeItemData): ClusterTreeItem {
  const item = new ClusterTreeItem(
    pod.metadata.name,
    vscode.TreeItemCollapsibleState.None,
    'resource:Pod',
    resourceData
  );
  
  // Existing pod configuration...
  
  // Check for active forwards
  const manager = PortForwardManager.getInstance();
  const forwards = manager.getAllForwards();
  const podForwards = forwards.filter(
    fw => fw.podName === pod.metadata.name &&
          fw.namespace === pod.metadata.namespace &&
          fw.context === resourceData.context
  );
  
  if (podForwards.length > 0) {
    // Add lightning bolt badge to label
    item.label = `${pod.metadata.name} $(zap)`;
    
    // Update tooltip
    const originalTooltip = item.tooltip || '';
    item.tooltip = `${originalTooltip}\n\nActive Port Forwards: ${podForwards.length}`;
  }
  
  return item;
}
```

## Acceptance Criteria

- [ ] Pods with active forwards show lightning bolt badge
- [ ] Badge format: `pod-name $(zap)`
- [ ] Tooltip mentions number of active forwards
- [ ] Badge updates when forwards start/stop (on tree refresh)
- [ ] No badge shown for pods without forwards
- [ ] Works correctly with manual tree refresh

## Files Modified

- Location where pod tree items are created (likely TreeItemFactory or similar)

## Dependencies

- 002-create-port-forward-manager-singleton
- 008-integrate-port-forwarding-in-tree-provider

## Estimated Time

15 minutes

