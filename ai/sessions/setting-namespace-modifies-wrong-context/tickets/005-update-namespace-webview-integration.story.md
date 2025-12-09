---
story_id: 005-update-namespace-webview-integration
session_id: setting-namespace-modifies-wrong-context
feature_id: [context-aware-namespace-management]
spec_id: [kubectl-context-operations-spec]
status: pending
---

# Update Namespace Webview to Pass Context Information

## Objective

Modify the namespace webview in `src/webview/NamespaceWebview.ts` to include context information when the "Set as Default Namespace" button is clicked, ensuring the namespace is set on the correct cluster's context.

## Current State

**Location**: `src/webview/NamespaceWebview.ts` around line 145

Current implementation likely:
- Handles webview button click message
- Calls `setNamespace(namespace)` without context
- Does not pass context information

## Changes Required

### 1. Pass Context Information to Webview

When creating the webview, include context name in initialization data:

```typescript
// In webview creation/initialization
const contextName = item.resourceData?.context?.name;

// Pass to webview HTML or initial state
webview.postMessage({
  type: 'initialize',
  namespace: namespaceName,
  contextName: contextName,
  // ... other data
});
```

### 2. Store Context in Webview State

Ensure webview maintains context name in its state so it's available when button is clicked.

### 3. Update Message Handler

Modify the message handler for 'setDefaultNamespace':

```typescript
case 'setDefaultNamespace':
  const namespace = message.namespace;
  const contextName = message.contextName || this.contextName; // From stored state
  
  const success = await setNamespace(namespace, contextName);
  
  if (success) {
    // Update button state
    webview.postMessage({
      type: 'namespaceSet',
      namespace: namespace
    });
  }
  break;
```

### 4. Update Webview HTML/TypeScript

Ensure the webview frontend sends contextName in the message:

```typescript
// In webview frontend
vscode.postMessage({
  type: 'setDefaultNamespace',
  namespace: currentNamespace,
  contextName: currentContext
});
```

## Acceptance Criteria

- [ ] Context name is passed to webview on initialization
- [ ] Context name is stored in webview state
- [ ] "Set as Default Namespace" button sends contextName in message
- [ ] Message handler passes contextName to `setNamespace()`
- [ ] Webview button updates correctly after namespace is set
- [ ] Multiple webviews for different contexts work independently

## Files Modified

- `src/webview/NamespaceWebview.ts` (around line 145 and initialization)
- Potentially webview HTML/frontend code if separate

## Dependencies

- Story 001 must be completed (setNamespace signature updated)

## Testing Notes

- Test with multiple contexts open in separate webviews
- Verify correct context is targeted when button is clicked
- Verify button state updates appropriately

## Estimated Time

25-30 minutes

