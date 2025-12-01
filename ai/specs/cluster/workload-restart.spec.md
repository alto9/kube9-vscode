---
spec_id: workload-restart-spec
feature_id: [workload-restart]
context_id: [kubernetes-cluster-management]
---

# Workload Restart Specification

## Overview

This specification defines the technical implementation for restarting Kubernetes workloads (Deployments, StatefulSets, and DaemonSets) from the VSCode tree view using the rollout restart mechanism.

## Command Registration

### Package.json Command Definition

```json
{
  "command": "kube9.restartWorkload",
  "title": "Restart",
  "category": "Kube9"
}
```

### Menu Contribution

Add to `menus.view/item/context` in package.json:

```json
{
  "command": "kube9.restartWorkload",
  "when": "view == kube9TreeView && (viewItem == resource:Deployment || viewItem == resource:StatefulSet || viewItem == resource:DaemonSet)",
  "group": "kube9@3"
}
```

**Note**: The `when` clause restricts the "Restart" option to only Deployments, StatefulSets, and DaemonSets. ReplicaSets, CronJobs, and Pods should NOT show this option.

## Restart Mechanism

### How Rollout Restart Works

A rollout restart is achieved by adding/updating an annotation on the pod template:

```
kubectl.kubernetes.io/restartedAt: <timestamp>
```

This causes the Kubernetes controller to detect a change in the pod template and trigger a rolling update, even though no other configuration has changed.

### API Endpoints

Use the Kubernetes PATCH API on the workload resource:

| Workload Type | API Endpoint |
|---------------|--------------|
| Deployment | `PATCH /apis/apps/v1/namespaces/{namespace}/deployments/{name}` |
| StatefulSet | `PATCH /apis/apps/v1/namespaces/{namespace}/statefulsets/{name}` |
| DaemonSet | `PATCH /apis/apps/v1/namespaces/{namespace}/daemonsets/{name}` |

### JSON Patch Request Body

Use JSON Patch to add/replace the annotation:

```json
[
  {
    "op": "add",
    "path": "/spec/template/metadata/annotations/kubectl.kubernetes.io~1restartedAt",
    "value": "2024-12-01T15:30:00Z"
  }
]
```

**Important Notes:**
- The path uses `~1` to escape the forward slash in the annotation key
- If `spec.template.metadata.annotations` doesn't exist, it must be created first
- Use ISO 8601 timestamp format
- The timestamp should be the current time when the restart is triggered

### Alternative: Strategic Merge Patch

```json
{
  "spec": {
    "template": {
      "metadata": {
        "annotations": {
          "kubectl.kubernetes.io/restartedAt": "2024-12-01T15:30:00Z"
        }
      }
    }
  }
}
```

## Confirmation Dialog Specification

### Dialog Structure

Use VSCode's modal dialog with custom buttons:

```typescript
interface RestartDialogOptions {
  modal: boolean;
  title: string;
  detail: string;
  buttons: string[];
  checkboxLabel: string;
  checkboxChecked: boolean;
}

const options: RestartDialogOptions = {
  modal: true,
  title: `Restart ${resourceName}`,
  detail: `This will trigger a rolling restart of all pods.\n\nThe restart annotation will be added to the pod template, causing the controller to recreate all pods gradually.`,
  buttons: ['Restart', 'Cancel'],
  checkboxLabel: 'Wait for rollout to complete',
  checkboxChecked: false
};

const result = await vscode.window.showInformationMessage(
  `Restart ${resourceName}?`,
  options,
  ...options.buttons
);
```

### Dialog Properties

| Property | Value | Purpose |
|----------|-------|---------|
| modal | true | Requires user response |
| title | `Restart {resourceName}` | Shows which resource is being restarted |
| detail | Multi-line explanation | Explains what the restart does |
| buttons | ['Restart', 'Cancel'] | Action buttons |
| checkboxLabel | "Wait for rollout to complete" | Option to wait for completion |
| checkboxChecked | false | Unchecked by default for faster operation |

### Checkbox State Handling

```typescript
interface RestartOptions {
  waitForRollout: boolean;
}

// Capture checkbox state from dialog
const checkboxState = await getCheckboxState(); // Implementation-specific
const options: RestartOptions = {
  waitForRollout: checkboxState
};
```

## Progress Notifications

### Notification Sequence

1. **Progress Notification** (while restarting):
   ```typescript
   vscode.window.withProgress({
     location: vscode.ProgressLocation.Notification,
     title: `Restarting ${resourceName}...`,
     cancellable: false
   }, async (progress) => {
     // Apply restart annotation
     await applyRestartAnnotation(name, namespace, kind);
     
     // If wait for rollout, watch status
     if (options.waitForRollout) {
       await watchRolloutStatus(name, namespace, kind, progress);
     }
   });
   ```

2. **Success Notification**:
   ```typescript
   vscode.window.showInformationMessage(
     `Restarted ${resourceName} successfully`
   );
   ```

3. **Error Notification**:
   ```typescript
   vscode.window.showErrorMessage(
     `Failed to restart ${resourceName}: ${errorMessage}`
   );
   ```

### Progress Updates (When Waiting for Rollout)

If user checks "Wait for rollout to complete":

```typescript
progress.report({
  message: 'Applying restart annotation...'
});

// After annotation applied
progress.report({
  message: 'Waiting for new pods to start...'
});

// During rollout
progress.report({
  message: `Rolling update in progress (${readyReplicas}/${desiredReplicas} ready)...`
});

// When complete
progress.report({
  message: 'Rollout complete'
});
```

## Command Handler Implementation

### Handler Structure

```typescript
async function restartWorkloadCommand(treeItem: ResourceTreeItem) {
  // 1. Extract resource information
  const { name, namespace, kind } = extractResourceInfo(treeItem);
  
  // 2. Show confirmation dialog with checkbox
  const dialogResult = await showRestartConfirmationDialog(name);
  if (!dialogResult.confirmed) {
    // User cancelled
    return;
  }
  
  // 3. Perform restart with progress notification
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `Restarting ${name}...`,
    cancellable: false
  }, async (progress) => {
    // Apply restart annotation
    progress.report({ message: 'Applying restart annotation...' });
    await applyRestartAnnotation(name, namespace, kind);
    
    // Optionally wait for rollout
    if (dialogResult.waitForRollout) {
      progress.report({ message: 'Waiting for rollout to complete...' });
      await watchRolloutStatus(name, namespace, kind, progress);
    }
  });
  
  // 4. Show success notification
  vscode.window.showInformationMessage(
    `Restarted ${name} successfully`
  );
  
  // 5. Refresh tree view
  treeProvider.refresh();
}
```

### Applying the Restart Annotation

```typescript
async function applyRestartAnnotation(
  name: string,
  namespace: string,
  kind: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  const annotationKey = 'kubectl.kubernetes.io/restartedAt';
  
  // Escape forward slash for JSON Patch path
  const escapedKey = annotationKey.replace('/', '~1');
  
  const patch = [
    {
      op: 'add',
      path: `/spec/template/metadata/annotations/${escapedKey}`,
      value: timestamp
    }
  ];
  
  await kubernetesClient.patch(
    kind.toLowerCase() + 's', // deployments, statefulsets, daemonsets
    name,
    namespace,
    patch,
    { headers: { 'Content-Type': 'application/json-patch+json' } }
  );
}
```

### Watching Rollout Status

```typescript
async function watchRolloutStatus(
  name: string,
  namespace: string,
  kind: string,
  progress: vscode.Progress<{ message?: string }>
): Promise<void> {
  const maxWaitTime = 300000; // 5 minutes
  const pollInterval = 2000; // 2 seconds
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const status = await getWorkloadStatus(name, namespace, kind);
    
    if (isRolloutComplete(status)) {
      progress.report({ message: 'Rollout complete' });
      return;
    }
    
    progress.report({
      message: `Rolling update in progress (${status.readyReplicas}/${status.desiredReplicas} ready)...`
    });
    
    await sleep(pollInterval);
  }
  
  throw new Error('Rollout timed out after 5 minutes');
}

interface WorkloadStatus {
  desiredReplicas: number;
  readyReplicas: number;
  updatedReplicas: number;
  availableReplicas: number;
}

function isRolloutComplete(status: WorkloadStatus): boolean {
  return status.readyReplicas === status.desiredReplicas &&
         status.updatedReplicas === status.desiredReplicas &&
         status.availableReplicas === status.desiredReplicas;
}
```

## Kubectl Integration

### Restart Command

Use kubectl rollout restart:

```bash
kubectl rollout restart deployment/{name} --namespace={namespace}
```

This is equivalent to adding the restart annotation manually.

### Alternative: Direct Annotation with kubectl

```bash
kubectl patch deployment/{name} --namespace={namespace} \
  --type='json' \
  -p='[{"op": "add", "path": "/spec/template/metadata/annotations/kubectl.kubernetes.io~1restartedAt", "value": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}]'
```

### Watching Rollout Status

```bash
kubectl rollout status deployment/{name} --namespace={namespace}
```

This command watches the rollout and exits when complete or fails.

## Error Handling

### Error Scenarios

| Error Type | Cause | Handling |
|------------|-------|----------|
| Resource Not Found | Workload was deleted | Show error with "Resource may have been deleted" |
| Permission Denied | RBAC restrictions | Show error with "Insufficient permissions" |
| Cluster Unavailable | Connection lost | Show error with "Cannot connect to cluster" |
| Annotations Missing | spec.template.metadata.annotations doesn't exist | Create the annotations object first, then add restart annotation |
| Rollout Timeout | Pods fail to start | Show error with "Rollout did not complete within 5 minutes" |
| API Timeout | Slow response | Show error with "Request timed out" |

### Error Message Format

```
Failed to restart {resourceName}: {errorReason}

Details: {apiErrorMessage}
```

### Handling Missing Annotations Object

If `spec.template.metadata.annotations` doesn't exist, create it first:

```typescript
async function ensureAnnotationsExist(name: string, namespace: string, kind: string): Promise<void> {
  try {
    const workload = await kubernetesClient.get(kind, name, namespace);
    if (!workload.spec?.template?.metadata?.annotations) {
      // Create empty annotations object
      const patch = [
        {
          op: 'add',
          path: '/spec/template/metadata/annotations',
          value: {}
        }
      ];
      await kubernetesClient.patch(kind, name, namespace, patch);
    }
  } catch (error) {
    // Handle error
  }
}
```

## Tree View Updates

### Refresh Behavior

After successful restart:

1. Refresh the entire tree view
2. If a namespace webview is open displaying this workload, send refresh message to webview
3. Tree item should show rollout status in tooltip
4. Pod list should update to show old pods terminating and new pods starting

### Tree Item Display

Consider adding rollout status to tree item tooltip:

```
Deployment: nginx-deployment
Namespace: default
Replicas: 5
Status: Rolling update in progress
Last restarted: 2024-12-01 15:30:00
```

### Pod Status During Restart

During a rolling restart:
- Old pods show "Terminating" status
- New pods show "ContainerCreating" → "Running" status
- Pod ages reset to show new creation times
- Tree view should update in real-time to reflect pod changes

## Testing Considerations

### Test Cases

1. Restart Deployment via context menu
2. Restart StatefulSet via context menu
3. Restart DaemonSet via context menu
4. Restart with "Wait for rollout" checked
5. Restart with "Wait for rollout" unchecked
6. Cancel restart from confirmation dialog
7. Handle error when resource not found
8. Handle error when cluster unavailable
9. Handle missing annotations object (create it first)
10. Verify annotation is added/updated correctly
11. Verify rollout status is watched correctly
12. Context menu only shows for Deployments, StatefulSets, DaemonSets
13. Tree view refreshes after restart
14. Pod list updates during rolling restart
15. Multiple restarts update the same annotation

## Dependencies

- Existing kubectl integration
- Tree view context menu system
- Resource tree item structure
- VSCode confirmation dialog API
- VSCode progress notification system
- Kubernetes client library

## Related Specifications

- `workload-scaling-spec` - Similar pattern for workload operations
- `tree-view-spec` - Context menu system and tree item structure
- `kubectl-integration-spec` - kubectl command execution

