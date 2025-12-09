---
session_id: setting-namespace-modifies-wrong-context
start_time: '2025-12-09T15:48:28.222Z'
status: development
problem_statement: setting-namespace-modifies-wrong-context
design_complete_time: '2025-12-09T16:30:00.000Z'
distillation_complete_time: '2025-12-09T17:00:00.000Z'
changed_files:
  - path: ai/features/cluster/context-aware-namespace-management.feature.md
    change_type: added
    scenarios_added:
      - Setting namespace on the clicked context (not current context)
      - Setting namespace updates the correct context
      - Clearing namespace on a specific context
      - Visual indicators show per-context namespace state
      - Setting namespace from webview targets correct context
      - Multiple webviews show correct button states for different contexts
      - Setting namespace on non-current context does not switch context
      - Context name extracted from cluster tree item
      - Backward compatibility when context name not provided
      - Error handling for non-existent context
  - path: ai/features/navigation/tree-view-navigation.feature.md
    change_type: modified
    scenarios_modified:
      - Setting active namespace from context menu
      - Clearing active namespace selection
      - Setting namespace as default from webview button
start_commit: 18b33da588014548b7535d466b8b94117264ae37
---
## Problem Statement

When setting an active namespace on a cluster in the tree view, the extension always modifies the **current kubectl context** rather than the context associated with the cluster that was clicked. This causes namespaces to be set on the wrong cluster when multiple contexts are configured.

### Bug Scenario
1. User has multiple kubectl contexts configured (e.g., `minikube` and `prod-cluster`)
2. kubectl's current context is `prod-cluster`
3. User expands the `minikube` cluster in kube9-vscode tree view
4. User right-clicks a namespace under `minikube` and selects "Set as Active Namespace"
5. **Bug**: The namespace gets set on `prod-cluster` (current context) instead of `minikube` (clicked context)

### Expected Behavior
The namespace should be set on the context that was clicked in the UI (`minikube`):
```bash
kubectl config set-context minikube --namespace=default
```

### Actual Behavior
The namespace is set on kubectl's current context (`prod-cluster`):
```bash
kubectl config set-context --current --namespace=default
```

### Root Cause
- `src/utils/kubectlContext.ts:193-214` - `setNamespace()` function always uses `--current` flag
- `src/commands/namespaceCommands.ts:11-38` - `setActiveNamespaceCommand()` receives `ClusterTreeItem` but doesn't extract or pass `contextName`
- `src/tree/categories/NamespacesCategory.ts:111` - Passes `contextName` to command arguments but it's not used downstream

## Goals

1. **Fix namespace setting to target correct context**: Modify `setNamespace()` to accept and use a specific context name instead of always using `--current`
2. **Update command flow**: Ensure `setActiveNamespaceCommand()` extracts and passes the context name from `ClusterTreeItem`
3. **Fix clearNamespace() similarly**: Apply the same fix to `clearNamespace()` function (line 241)
4. **Update webview integration**: Ensure `NamespaceWebview.ts:145` also passes context name when calling `setNamespace()`
5. **Maintain backward compatibility**: If no context name is provided, default to `--current` behavior

## Approach

### 1. Update `setNamespace()` Signature
Modify `src/utils/kubectlContext.ts:193` to accept optional `contextName` parameter:
```typescript
export async function setNamespace(namespace: string, contextName?: string): Promise<boolean>
```

Use conditional logic to either target specific context or use `--current`:
```typescript
const args = ['config', 'set-context'];
if (contextName) {
    args.push(contextName);
} else {
    args.push('--current');
}
args.push(`--namespace=${namespace}`);
```

### 2. Update `setActiveNamespaceCommand()`
Modify `src/commands/namespaceCommands.ts:11-38` to extract and pass context:
```typescript
const contextName = item.resourceData?.context?.name;
const success = await setNamespace(namespaceName, contextName);
```

### 3. Apply Same Fix to `clearNamespace()`
Update `src/utils/kubectlContext.ts:241` with same pattern

### 4. Update Webview Integration
Modify `src/webview/NamespaceWebview.ts:145` to pass context when available

### 5. Testing Strategy
- Test with single context (should work as before)
- Test with multiple contexts where current context differs from clicked context
- Verify namespace is set on correct context
- Verify visual feedback in tree view

## Key Decisions

### Decision: Don't Auto-Switch Contexts (Option A)
When setting a namespace on a non-current context, the extension will:
- **Just set the namespace on the specified context** (don't switch to it)
- **Rationale**: Less disruptive, user maintains current context
- **Trade-off**: The UI might be slightly confusing since the visual change doesn't affect current context
- **Future consideration**: Could add visual indicators showing which context is current vs which has a namespace set

**Alternatives Considered**:
- **Option B**: Also switch to that context when setting namespace - Too disruptive
- **Option C**: Prompt the user if the context isn't current - Extra friction

## Notes

### Severity: HIGH
This bug affects any user with multiple clusters configured and can lead to:
- Operations being executed on the wrong cluster
- Confusion when namespace references don't exist on the target cluster
- **Potential data safety issues** if destructive operations are run on wrong cluster

### Related Files
- `src/utils/kubectlContext.ts` - Core kubectl context manipulation
- `src/commands/namespaceCommands.ts` - Command handlers for namespace operations  
- `src/tree/categories/NamespacesCategory.ts` - Tree view namespace items
- `src/webview/NamespaceWebview.ts` - Webview also calls `setNamespace()` (line 145)

### GitHub Issue Reference
https://github.com/alto9/kube9-vscode/issues/32
