---
spec_id: kubectl-context-operations-spec
feature_id: [context-aware-namespace-management]
context_id: [kubernetes-cluster-management]
---

# kubectl Context Operations Specification

## Overview

This specification defines how the kube9 VSCode extension should interact with kubectl contexts to manage namespace settings across multiple configured clusters. The key requirement is that namespace operations target the specific context associated with the cluster in the UI, not necessarily the current context.

## Core Functions

### setNamespace()

**Location**: `src/utils/kubectlContext.ts`

**Purpose**: Set the namespace on a specific kubectl context

**Signature**:
```typescript
export async function setNamespace(
  namespace: string, 
  contextName?: string
): Promise<boolean>
```

**Parameters**:
- `namespace` (string, required): The namespace name to set
- `contextName` (string, optional): The kubectl context name to target. If not provided, uses `--current` flag for backward compatibility.

**Implementation Requirements**:

1. **Parameter Validation**
   - Validate that `namespace` is a non-empty string
   - Return `false` if validation fails
   - Log validation errors to console

2. **Command Construction**
   - Build kubectl command based on whether contextName is provided:
     ```typescript
     const args = ['config', 'set-context'];
     
     if (contextName) {
       args.push(contextName);
     } else {
       args.push('--current');
     }
     
     args.push(`--namespace=${namespace}`);
     ```

3. **kubectl Execution**
   - Execute: `kubectl config set-context [contextName|--current] --namespace=<namespace>`
   - Set timeout: 5000ms (KUBECTL_TIMEOUT_MS constant)
   - Inherit process environment variables

4. **Cache Invalidation**
   - Invalidate namespace cache after successful execution
   - Ensures subsequent queries reflect the updated state

5. **Error Handling**
   - Catch kubectl execution errors
   - Log error details including stderr output
   - Return `false` on failure
   - Return `true` on success

**kubectl Command Examples**:
```bash
# With specific context
kubectl config set-context minikube --namespace=default

# With --current flag (backward compatibility)
kubectl config set-context --current --namespace=production
```

### clearNamespace()

**Location**: `src/utils/kubectlContext.ts`

**Purpose**: Clear the namespace setting from a specific kubectl context

**Signature**:
```typescript
export async function clearNamespace(contextName?: string): Promise<boolean>
```

**Parameters**:
- `contextName` (string, optional): The kubectl context name to target. If not provided, uses `--current` flag.

**Implementation Requirements**:

1. **Command Construction**
   - Build kubectl command based on whether contextName is provided:
     ```typescript
     const args = ['config', 'set-context'];
     
     if (contextName) {
       args.push(contextName);
     } else {
       args.push('--current');
     }
     
     args.push('--namespace=');
     ```

2. **kubectl Execution**
   - Execute: `kubectl config set-context [contextName|--current] --namespace=`
   - Empty string value clears the namespace setting
   - Set timeout: 5000ms

3. **Cache Invalidation**
   - Invalidate namespace cache after successful execution

4. **Error Handling**
   - Same error handling pattern as setNamespace()

**kubectl Command Examples**:
```bash
# Clear namespace on specific context
kubectl config set-context prod-cluster --namespace=

# Clear namespace on current context
kubectl config set-context --current --namespace=
```

## Command Handler Updates

### setActiveNamespaceCommand()

**Location**: `src/commands/namespaceCommands.ts`

**Purpose**: Handle the "Set as Active Namespace" command from tree view context menu

**Current Implementation Issue**:
- Does not extract context name from tree item
- Does not pass context name to setNamespace()

**Required Changes**:

1. **Extract Context Name**
   ```typescript
   const namespaceName = typeof item.label === 'string' 
     ? item.label 
     : item.label?.toString();
   const contextName = item.resourceData?.context?.name;
   ```

2. **Validate Extracted Data**
   ```typescript
   if (!namespaceName || !contextName) {
     vscode.window.showErrorMessage(
       'Failed to set namespace: missing namespace name or context information'
     );
     return;
   }
   ```

3. **Pass Context to setNamespace**
   ```typescript
   const success = await vscode.window.withProgress(
     {
       location: vscode.ProgressLocation.Notification,
       title: `Setting namespace '${namespaceName}' on context '${contextName}'...`,
       cancellable: false
     },
     async () => {
       return await setNamespace(namespaceName, contextName);
     }
   );
   ```

4. **Update Success/Error Messages**
   ```typescript
   if (success) {
     vscode.window.showInformationMessage(
       `Namespace '${namespaceName}' set on context '${contextName}'`
     );
     // Trigger tree refresh and status bar update
   } else {
     vscode.window.showErrorMessage(
       `Failed to set namespace '${namespaceName}' on context '${contextName}'`
     );
   }
   ```

### clearActiveNamespaceCommand()

**Location**: `src/commands/namespaceCommands.ts`

**Purpose**: Handle the "Clear Active Namespace" command

**Required Changes**:

1. **Extract Context Name**
   ```typescript
   const contextName = item.resourceData?.context?.name;
   
   if (!contextName) {
     vscode.window.showErrorMessage(
       'Failed to clear namespace: missing context information'
     );
     return;
   }
   ```

2. **Pass Context to clearNamespace**
   ```typescript
   const success = await clearNamespace(contextName);
   ```

## Webview Integration

### NamespaceWebview.ts

**Location**: `src/webview/NamespaceWebview.ts` (line 145 referenced in issue)

**Purpose**: Handle "Set as Default Namespace" button clicks in namespace webview

**Required Changes**:

1. **Pass Context Information to Webview**
   - When creating the webview, include context name in initialization data
   - Store context name in webview state

2. **Message Handler Update**
   - Extract context name from webview message or stored state
   - Pass context name when calling setNamespace()
   ```typescript
   case 'setDefaultNamespace':
     const success = await setNamespace(
       message.namespace, 
       message.contextName
     );
     // Update webview button state
     break;
   ```

## ClusterTreeItem Structure

### resourceData Property

**Required Fields**:
```typescript
interface ClusterTreeItem {
  type: string;
  label: string;
  resourceData?: {
    context?: {
      name: string;  // The kubectl context name
      cluster: string;
    };
    namespace?: string;
  };
}
```

**Verification**:
- Ensure `NamespacesCategory.ts` line 111 populates `resourceData.context.name` correctly
- Verify this data is available in tree items passed to command handlers

## Error Scenarios

### Context Not Found

**kubectl Error**: `error: context "contextName" not found`

**Handling**:
```typescript
if (stderr.includes('not found')) {
  vscode.window.showErrorMessage(
    `Failed to set namespace: context '${contextName}' not found in kubeconfig`
  );
  return false;
}
```

### Permission Denied

**kubectl Error**: `error: unable to write kubeconfig`

**Handling**:
```typescript
if (stderr.includes('unable to write') || stderr.includes('permission denied')) {
  vscode.window.showErrorMessage(
    'Failed to set namespace: permission denied to modify kubeconfig'
  );
  return false;
}
```

### Invalid Namespace

**kubectl Behavior**: Command succeeds but namespace may not exist

**Handling**:
- kubectl will set the namespace regardless of whether it exists
- Subsequent resource queries will fail with "namespace not found"
- Extension should validate namespace exists before setting (optional enhancement)

## Testing Requirements

### Unit Tests

1. **setNamespace() with contextName**
   - Verify correct command construction: `['config', 'set-context', 'minikube', '--namespace=default']`
   - Verify success returns `true`
   - Verify cache invalidation called

2. **setNamespace() without contextName (backward compatibility)**
   - Verify command uses `--current`: `['config', 'set-context', '--current', '--namespace=default']`
   - Verify existing behavior preserved

3. **clearNamespace() with contextName**
   - Verify correct command construction with empty namespace value

4. **setActiveNamespaceCommand()**
   - Mock tree item with resourceData.context.name
   - Verify context name extracted correctly
   - Verify setNamespace() called with both namespace and context

### Integration Tests

1. **Multiple Context Scenario**
   - Configure multiple kubectl contexts
   - Set namespace on non-current context
   - Verify correct context updated
   - Verify current context unchanged

2. **Context Switching**
   - Set namespace on context A
   - Switch to context B
   - Verify namespace persists on context A
   - Verify context B has separate namespace setting

### End-to-End Tests

1. **Tree View Context Menu**
   - Expand cluster in tree
   - Right-click namespace
   - Select "Set as Active Namespace"
   - Verify checkmark appears on correct cluster's namespace
   - Verify kubectl context matches

2. **Webview Button**
   - Open namespace webview for non-current context
   - Click "Set as Default Namespace"
   - Verify namespace set on correct context
   - Verify button state updates

## Performance Considerations

### No Context Switching Overhead

- Setting namespace on a specific context does NOT require switching to that context
- Operations complete without changing the user's current context
- No overhead from context switching operations

### Cache Management

- Invalidate cache only for the affected context
- Do not invalidate global state unnecessarily
- Maintain separate cache entries per context if applicable

## Security Considerations

### kubeconfig Modification

- Only modify the `namespace` field of contexts
- Do not modify other context properties
- Validate context name to prevent injection

### Validation

- Validate namespace names match Kubernetes naming conventions: `^[a-z0-9]([-a-z0-9]*[a-z0-9])?$`
- Reject invalid namespace names before executing kubectl

## Backward Compatibility

### Optional contextName Parameter

The `contextName` parameter is optional to maintain backward compatibility:

- **With contextName**: Targets specific context (new behavior)
- **Without contextName**: Uses `--current` flag (existing behavior)

This allows:
- Gradual migration of call sites
- Legacy code to continue functioning
- New features to use explicit context targeting

### Migration Path

1. Update core functions (setNamespace, clearNamespace) - **DONE**
2. Update command handlers to pass context - **INCREMENTAL**
3. Update webview integration - **INCREMENTAL**
4. Legacy calls without context parameter continue to work

## Related Files

- `src/utils/kubectlContext.ts` - Core kubectl context functions (lines 193-214, 241)
- `src/commands/namespaceCommands.ts` - Command handlers (lines 11-38)
- `src/tree/categories/NamespacesCategory.ts` - Tree item creation (line 111)
- `src/webview/NamespaceWebview.ts` - Webview integration (line 145)

