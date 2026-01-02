---
story_id: implement-replicaset-navigation
session_id: implement-describe-webview-for-deployments
feature_id:
  - deployment-describe-webview
spec_id:
  - deployment-describe-webview-spec
status: completed
---

# Implement ReplicaSet Navigation

## Objective

Implement the ability to navigate to a ReplicaSet in the tree view when clicking its name in the deployment describe webview.

## Context

When viewing a deployment's describe webview, the ReplicaSets section shows related ReplicaSets. Clicking a ReplicaSet name should reveal and highlight that ReplicaSet in the tree view.

## Acceptance Criteria

- [x] Message handler for 'navigateToReplicaSet' exists in DeploymentDescribeWebview
- [x] Handler receives replicaSetName and namespace
- [x] Command to reveal resource in tree view exists (kube9.revealReplicaSet command)
- [x] Tree view expands and highlights the parent Deployment (ReplicaSets are managed by Deployments)
- [x] Works even if Workloads/Deployments category is currently collapsed
- [x] Error handling if Deployment not found in tree

## Implementation Steps

1. In `DeploymentDescribeWebview.setupMessageHandlers()`, add case for 'navigateToReplicaSet':
```typescript
case 'navigateToReplicaSet':
    await vscode.commands.executeCommand(
        'kube9.revealResource',
        'ReplicaSet',
        message.replicaSetName,
        DeploymentDescribeWebview.currentNamespace
    );
    break;
```
2. Check if `kube9.revealResource` command exists
   - If yes, use it
   - If no, create it or use tree view API to reveal item
3. Alternative approach using tree view:
```typescript
case 'navigateToReplicaSet':
    const treeView = getTreeView(); // Get tree view instance
    const item = findTreeItem('replicaset', message.replicaSetName, namespace);
    if (item) {
        treeView.reveal(item, { select: true, focus: true, expand: true });
    }
    break;
```
4. Update webview JavaScript to make ReplicaSet names clickable:
```javascript
function renderReplicaSets(replicaSets) {
    replicaSets.forEach(rs => {
        const nameElement = document.createElement('a');
        nameElement.textContent = rs.name;
        nameElement.href = '#';
        nameElement.addEventListener('click', (e) => {
            e.preventDefault();
            vscode.postMessage({
                command: 'navigateToReplicaSet',
                replicaSetName: rs.name
            });
        });
        // ... append to table ...
    });
}
```

## Files to Modify

- `src/webview/DeploymentDescribeWebview.ts` - Add message handler
- `src/extension.ts` - Register revealResource command if it doesn't exist

## Notes

- ReplicaSets may be under a collapsed Workloads → ReplicaSets category
- Navigation should expand the tree as needed to reveal the item
- Consider showing a message if ReplicaSet cannot be found

