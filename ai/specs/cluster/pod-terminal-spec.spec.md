---
spec_id: pod-terminal-spec
feature_id: [pod-terminal]
---

# Pod Terminal Command Specification

## Overview

This specification defines the technical implementation for opening interactive terminal sessions into Kubernetes pods directly from the VS Code integrated terminal. The feature uses `kubectl exec` to establish the connection and leverages the VS Code Terminal API to provide a seamless user experience.

## Command Registration

### Package.json Configuration

```json
{
  "commands": [
    {
      "command": "kube9.openTerminal",
      "title": "Open Terminal",
      "category": "kube9"
    }
  ],
  "menus": {
    "view/item/context": [
      {
        "command": "kube9.openTerminal",
        "when": "view == kube9ClusterView && viewItem == resource:Pod",
        "group": "kube9@2"
      }
    ]
  }
}
```

### Extension Registration

In `src/extension.ts`, register the command in the `registerCommands()` function:

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('kube9.openTerminal', openTerminalCommand)
);
```

## Command Implementation

### File: src/commands/openTerminal.ts

#### Core Function Signature

```typescript
export async function openTerminalCommand(treeItem: ClusterTreeItem): Promise<void>
```

#### Implementation Steps

1. **Validate Tree Item**
   - Verify `treeItem` exists and is not null
   - Verify `contextValue` starts with 'resource:'
   - Verify `contextValue` is exactly 'resource:Pod'
   - If validation fails, show error: "Failed to open terminal: Invalid resource"

2. **Extract Pod Information**
   - Get pod name from `treeItem.resourceData.resourceName` or `treeItem.label`
   - Get namespace from `treeItem.resourceData.namespace` (default: 'default')
   - Get context from `treeItem.resourceData.context.name`
   - Get kubeconfig path from tree provider via `getClusterTreeProvider().getKubeconfigPath()`
   - If any required field is missing, show error: "Failed to open terminal: Missing resource information"

3. **Query Pod Status**
   - Execute: `kubectl get pod <name> -n <namespace> --context <context> -o json`
   - Parse JSON response to get pod status
   - Check `status.phase` field
   - If phase is not 'Running', show error: "Cannot open terminal: Pod '<name>' is not in Running state (current: <phase>)"

4. **Query Container List**
   - From the pod JSON response, extract `spec.containers[]`
   - Get container names from `container.name` field
   - Filter out init containers (from `spec.initContainers[]`)
   - If no containers found, show error: "No containers found in pod"

5. **Handle Container Selection**
   - **Single Container**: Skip selection, use the only container
   - **Multiple Containers**: Show quick pick dialog
     - Title: "Select Container"
     - Items: Array of container names
     - Placeholder: "Choose a container to open terminal in"
     - If user cancels, return without opening terminal

6. **Determine Shell**
   - Default to `/bin/sh` (most universal)
   - Optionally try `/bin/bash` first with fallback to `/bin/sh`
   - Future enhancement: Detect available shells by checking pod

7. **Build kubectl Command**
   - Base command: `kubectl exec -it <pod-name> -n <namespace> --context <context>`
   - If multi-container: Add `-c <container-name>`
   - Add shell: `-- <shell>`
   - Full example: `kubectl exec -it nginx-pod -n default --context my-cluster -- /bin/sh`
   - Multi-container example: `kubectl exec -it app-pod -n default --context my-cluster -c web -- /bin/sh`

8. **Create VS Code Terminal**
   - Terminal name format: `kube9: <namespace>/<pod-name>` for single-container
   - Terminal name format: `kube9: <namespace>/<pod-name> (<container>)` for multi-container
   - Use `vscode.window.createTerminal()` with options:
     ```typescript
     {
       name: terminalName,
       shellPath: 'kubectl',
       shellArgs: execArgs,
       cwd: undefined,
       env: process.env
     }
     ```
   - Alternative approach: Use default shell and send command as text:
     ```typescript
     const terminal = vscode.window.createTerminal({ name: terminalName });
     terminal.sendText(kubectlCommand);
     terminal.show();
     ```

9. **Focus Terminal**
   - Call `terminal.show()` to focus the terminal
   - Terminal should be visible and active immediately

#### Error Handling

```typescript
// Pod not found
catch (error) {
  if (isKubectlNotFoundError(error)) {
    vscode.window.showErrorMessage(
      'kubectl not found. Please install kubectl to use this feature.'
    );
  } else if (isPodNotFoundError(error)) {
    vscode.window.showErrorMessage(
      `Pod '${podName}' not found in namespace '${namespace}'`
    );
  } else if (isPermissionDeniedError(error)) {
    vscode.window.showErrorMessage(
      'Permission denied: Unable to exec into pod. Check your RBAC permissions for pod/exec resource.'
    );
  } else {
    vscode.window.showErrorMessage(
      `Failed to open terminal: ${error.message}`
    );
  }
}
```

## Data Structures

### Pod Status Response (from kubectl)

```typescript
interface PodStatusResponse {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    containers: Array<{
      name: string;
      image: string;
    }>;
    initContainers?: Array<{
      name: string;
      image: string;
    }>;
  };
  status: {
    phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown';
    containerStatuses?: Array<{
      name: string;
      state: {
        running?: { startedAt: string };
        waiting?: { reason: string };
        terminated?: { reason: string };
      };
    }>;
  };
}
```

### Container Selection Item

```typescript
interface ContainerQuickPickItem extends vscode.QuickPickItem {
  label: string;  // Container name
  description?: string;  // Container image (optional)
}
```

## Integration Points

### With Existing Infrastructure

1. **ClusterTreeItem**: Extract pod metadata from existing tree item structure
2. **ClusterTreeProvider**: Use `getKubeconfigPath()` to get kubeconfig location
3. **kubectl Integration**: Use existing kubectl patterns from other commands (scale, restart, delete)
4. **Error Handling**: Use `KubectlError` class for structured error handling

### VS Code APIs Used

1. **Terminal API**: `vscode.window.createTerminal()`
2. **Quick Pick API**: `vscode.window.showQuickPick()` for container selection
3. **Notifications**: `vscode.window.showErrorMessage()`

## kubectl Command Format

### Basic Structure
```bash
kubectl exec -it <pod> -n <namespace> --context <context> -- <shell>
```

### Flags Explanation
- `-i`: Keep stdin open (interactive)
- `-t`: Allocate a pseudo-TTY
- `-n`: Namespace
- `--context`: Kubeconfig context
- `-c`: Container name (multi-container pods only)
- `--`: Separates kubectl args from command to execute
- `<shell>`: Shell to run in container (e.g., `/bin/sh`, `/bin/bash`)

### Examples

Single-container pod:
```bash
kubectl exec -it nginx-pod -n default --context docker-desktop -- /bin/sh
```

Multi-container pod:
```bash
kubectl exec -it app-pod -n production --context prod-cluster -c web -- /bin/sh
```

Using bash:
```bash
kubectl exec -it ubuntu-pod -n default --context my-cluster -- /bin/bash
```

## Validation Rules

### Pre-execution Checks

1. **Tree Item Validation**
   - Must be a Pod resource
   - Must have valid resourceData
   - Must have context information

2. **Pod State Validation**
   - Pod must exist
   - Pod phase must be 'Running'
   - At least one container must be running

3. **Permission Validation**
   - User must have pod/exec permissions in RBAC
   - Context must be valid and accessible

### Input Validation

1. **Pod Name**: Required, non-empty string
2. **Namespace**: Required, non-empty string, defaults to 'default'
3. **Context**: Required, non-empty string
4. **Container Name**: Required for multi-container pods

## Error Scenarios

### Scenario: kubectl Not Found
- **Detection**: Command execution fails with 'command not found'
- **Message**: "kubectl not found. Please install kubectl to use this feature."
- **Action**: No terminal opened

### Scenario: Pod Not Running
- **Detection**: `status.phase` != 'Running'
- **Message**: "Cannot open terminal: Pod '<name>' is not in Running state (current: <phase>)"
- **Action**: No terminal opened

### Scenario: Pod Not Found
- **Detection**: kubectl returns 404 or 'not found' error
- **Message**: "Pod '<name>' not found in namespace '<namespace>'"
- **Action**: Refresh tree view, no terminal opened

### Scenario: Permission Denied
- **Detection**: kubectl returns 403 or permission error
- **Message**: "Permission denied: Unable to exec into pod. Check your RBAC permissions for pod/exec resource."
- **Action**: No terminal opened, show RBAC documentation link

### Scenario: Connection Error
- **Detection**: Network timeout or cluster unreachable
- **Message**: "Failed to connect to pod: <error details>"
- **Action**: Terminal may open but show connection error

### Scenario: Container Selection Cancelled
- **Detection**: User dismisses quick pick dialog
- **Message**: None
- **Action**: Silently return, no terminal opened

## Performance Considerations

1. **Pod Status Query**: Single kubectl call to get pod status and containers (200-500ms)
2. **Terminal Creation**: Immediate, no blocking operations
3. **Connection Establishment**: kubectl handles connection, typically 1-2 seconds
4. **No Operator Dependency**: Works entirely through kubectl, no additional infrastructure

## Security Considerations

1. **RBAC Enforcement**: Respects Kubernetes RBAC for pod/exec permissions
2. **Context Isolation**: Each terminal uses specified kubectl context
3. **No Credential Storage**: Uses existing kubeconfig authentication
4. **Audit Trail**: Terminal commands visible in terminal history
5. **No Privilege Escalation**: Cannot execute commands with elevated privileges beyond user's RBAC

## Testing Requirements

### Unit Tests

1. Test pod metadata extraction from tree item
2. Test container selection logic (single vs multi-container)
3. Test kubectl command string building
4. Test error message generation
5. Test validation functions

### Integration Tests

1. Test with actual single-container pod
2. Test with multi-container pod
3. Test container selection dialog
4. Test error scenarios (pod not found, not running, etc.)
5. Test with different namespaces and contexts
6. Test terminal naming
7. Test multiple terminals to same pod

### Edge Cases

1. Pod with special characters in name
2. Pod in non-default namespace
3. Pod with many containers (10+)
4. Pod that terminates immediately after connection
5. Cluster becomes unreachable during connection
6. Context switch while terminal is open

## Future Enhancements

1. **Shell Detection**: Query pod to detect available shells (bash, sh, zsh)
2. **Custom Commands**: Allow user to specify custom command instead of shell
3. **Init Container Support**: Option to exec into init containers
4. **Terminal Persistence**: Attempt reconnection if pod restarts
5. **Multiple Sessions**: Track and manage multiple terminal sessions per pod
6. **Terminal Profiles**: Save preferred shell configurations per namespace/context
7. **Command History**: Integrate with pod command history if available

## Dependencies

### VS Code APIs
- `vscode.window.createTerminal()`
- `vscode.window.showQuickPick()`
- `vscode.window.showErrorMessage()`
- `vscode.commands.registerCommand()`

### Internal Dependencies
- `ClusterTreeItem` - Tree item structure
- `ClusterTreeProvider` - Kubeconfig path access
- `KubectlError` - Error handling (if needed)
- Existing kubectl integration patterns

### External Dependencies
- kubectl CLI must be installed and in PATH
- Valid kubeconfig with cluster access
- User must have pod/exec RBAC permissions

## Implementation Checklist

- [ ] Create `src/commands/openTerminal.ts`
- [ ] Add command to `package.json` commands array
- [ ] Add context menu entry in `package.json` menus
- [ ] Register command in `src/extension.ts`
- [ ] Implement tree item validation
- [ ] Implement pod metadata extraction
- [ ] Implement pod status query
- [ ] Implement container list extraction
- [ ] Implement container selection dialog (multi-container)
- [ ] Implement kubectl command builder
- [ ] Implement VS Code terminal creation
- [ ] Implement error handling
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Update documentation

