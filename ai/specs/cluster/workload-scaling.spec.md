---
spec_id: workload-scaling-spec
feature_id: [workload-scaling]
context_id: [kubernetes-cluster-management]
---

# Workload Scaling Specification

## Overview

This specification defines the technical implementation for quick scaling of Kubernetes workloads (Deployments, StatefulSets, and ReplicaSets) from the VSCode tree view.

## Command Registration

### Package.json Command Definition

```json
{
  "command": "kube9.scaleWorkload",
  "title": "Scale",
  "category": "Kube9"
}
```

### Menu Contribution

Add to `menus.view/item/context` in package.json:

```json
{
  "command": "kube9.scaleWorkload",
  "when": "view == kube9TreeView && (viewItem == resource:Deployment || viewItem == resource:StatefulSet || viewItem == resource:ReplicaSet)",
  "group": "kube9@2"
}
```

**Note**: The `when` clause restricts the "Scale" option to only Deployments, StatefulSets, and ReplicaSets. DaemonSets and CronJobs should NOT show this option.

## API Endpoints

### Kubernetes Scale Subresource

Use the Kubernetes `/scale` subresource for all scaling operations:

| Workload Type | API Endpoint |
|---------------|--------------|
| Deployment | `PATCH /apis/apps/v1/namespaces/{namespace}/deployments/{name}/scale` |
| StatefulSet | `PATCH /apis/apps/v1/namespaces/{namespace}/statefulsets/{name}/scale` |
| ReplicaSet | `PATCH /apis/apps/v1/namespaces/{namespace}/replicasets/{name}/scale` |

### Request Body

```json
{
  "spec": {
    "replicas": <number>
  }
}
```

### Response Structure

The API returns a Scale object:

```json
{
  "kind": "Scale",
  "apiVersion": "autoscaling/v1",
  "metadata": {
    "name": "nginx-deployment",
    "namespace": "default",
    "resourceVersion": "123456"
  },
  "spec": {
    "replicas": 5
  },
  "status": {
    "replicas": 3,
    "selector": "app=nginx"
  }
}
```

## Input Validation

### Validation Rules

| Rule | Constraint | Error Message |
|------|------------|---------------|
| Type | Must be a number | "Replica count must be a number" |
| Minimum | Must be >= 0 | "Replica count must be a positive number (0 or greater)" |
| Maximum | Must be <= 1000 | "Replica count must not exceed 1000" |
| Required | Cannot be empty | "Replica count is required" |

### Validation Implementation

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validateReplicaCount(input: string): ValidationResult {
  // Check if empty
  if (!input || input.trim() === '') {
    return { valid: false, error: 'Replica count is required' };
  }
  
  // Check if numeric
  const count = parseInt(input, 10);
  if (isNaN(count)) {
    return { valid: false, error: 'Replica count must be a number' };
  }
  
  // Check minimum
  if (count < 0) {
    return { valid: false, error: 'Replica count must be a positive number (0 or greater)' };
  }
  
  // Check maximum
  if (count > 1000) {
    return { valid: false, error: 'Replica count must not exceed 1000' };
  }
  
  return { valid: true };
}
```

## User Interface Flow

### Input Dialog Specification

Use VSCode's `showInputBox` API:

```typescript
const result = await vscode.window.showInputBox({
  title: `Scale ${resourceName}`,
  prompt: 'Enter the desired number of replicas',
  placeHolder: `Current: ${currentReplicas} replicas`,
  validateInput: (value: string) => {
    const validation = validateReplicaCount(value);
    return validation.valid ? undefined : validation.error;
  }
});
```

### Dialog Properties

| Property | Value | Purpose |
|----------|-------|---------|
| title | `Scale {resourceName}` | Shows which resource is being scaled |
| prompt | "Enter the desired number of replicas" | Instruction text |
| placeHolder | `Current: {count} replicas` | Shows current replica count |
| validateInput | Function | Real-time validation as user types |

## Progress Notifications

### Notification Sequence

1. **Progress Notification** (while scaling):
   ```typescript
   vscode.window.withProgress({
     location: vscode.ProgressLocation.Notification,
     title: `Scaling ${resourceName}...`,
     cancellable: false
   }, async (progress) => {
     // Perform scaling operation
   });
   ```

2. **Success Notification**:
   ```typescript
   vscode.window.showInformationMessage(
     `Scaled ${resourceName} to ${replicaCount} ${replicaCount === 1 ? 'replica' : 'replicas'}`
   );
   ```

3. **Error Notification**:
   ```typescript
   vscode.window.showErrorMessage(
     `Failed to scale ${resourceName}: ${errorMessage}`
   );
   ```

### Notification Text Rules

- Use singular "replica" when count is 1
- Use plural "replicas" when count is 0 or > 1
- Include resource name in all notifications
- Include error details from Kubernetes API in error notifications

## Command Handler Implementation

### Handler Structure

```typescript
async function scaleWorkloadCommand(treeItem: ResourceTreeItem) {
  // 1. Extract resource information
  const { name, namespace, kind } = extractResourceInfo(treeItem);
  
  // 2. Get current replica count
  const currentReplicas = await getCurrentReplicaCount(name, namespace, kind);
  
  // 3. Show input dialog
  const newReplicaCount = await showScaleInputDialog(name, currentReplicas);
  if (newReplicaCount === undefined) {
    // User cancelled
    return;
  }
  
  // 4. Perform scaling with progress notification
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `Scaling ${name}...`,
    cancellable: false
  }, async () => {
    await scaleWorkload(name, namespace, kind, newReplicaCount);
  });
  
  // 5. Show success notification
  const replicaText = newReplicaCount === 1 ? 'replica' : 'replicas';
  vscode.window.showInformationMessage(
    `Scaled ${name} to ${newReplicaCount} ${replicaText}`
  );
  
  // 6. Refresh tree view
  treeProvider.refresh();
}
```

## Kubectl Integration

### Scale Command

Use kubectl's scale command:

```bash
kubectl scale deployment/{name} --replicas={count} --namespace={namespace}
```

Alternative using kubectl patch:

```bash
kubectl patch deployment/{name} --namespace={namespace} \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/replicas", "value": {count}}]'
```

### Getting Current Replica Count

Use kubectl to get current replica information:

```bash
kubectl get deployment/{name} --namespace={namespace} -o jsonpath='{.spec.replicas}'
```

## Error Handling

### Error Scenarios

| Error Type | Cause | Handling |
|------------|-------|----------|
| Resource Not Found | Workload was deleted | Show error with "Resource may have been deleted" |
| Permission Denied | RBAC restrictions | Show error with "Insufficient permissions" |
| Cluster Unavailable | Connection lost | Show error with "Cannot connect to cluster" |
| Invalid Replica Count | Validation failure | Show validation error in input dialog |
| API Timeout | Slow response | Show error with "Request timed out" |

### Error Message Format

```
Failed to scale {resourceName}: {errorReason}

Details: {apiErrorMessage}
```

## Tree View Updates

### Refresh Behavior

After successful scaling:

1. Refresh the entire tree view
2. If a namespace webview is open displaying this workload, send refresh message to webview
3. Tree item should show updated replica count in tooltip or label

### Tree Item Display

Consider adding replica count to tree item label:

```
nginx-deployment (3/5)  // 3 ready out of 5 desired
```

Or show in tooltip:

```
Deployment: nginx-deployment
Namespace: default
Replicas: 3/5 (3 ready, 5 desired)
Status: Scaling
```

## Testing Considerations

### Test Cases

1. Scale Deployment up (2 → 5 replicas)
2. Scale Deployment down (5 → 2 replicas)
3. Scale to zero (3 → 0 replicas)
4. Scale StatefulSet
5. Scale ReplicaSet
6. Validate negative input rejected
7. Validate non-numeric input rejected
8. Validate excessively large input rejected (> 1000)
9. Cancel operation (press Escape)
10. Error handling (cluster unavailable)
11. Tree view refreshes after scaling
12. Context menu only shows for Deployments, StatefulSets, ReplicaSets

## Dependencies

- Existing kubectl integration
- Tree view context menu system
- Resource tree item structure
- VSCode input dialog API
- VSCode notification system

## Related Specifications

- `tree-view-spec` - Context menu system and tree item structure
- `kubectl-integration-spec` - kubectl command execution

