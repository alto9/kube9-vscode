---
story_id: 015-add-error-handling-and-edge-cases
session_id: add-port-forwarding-for-pods
feature_id:
  - pod-port-forwarding
spec_id:
  - port-forwarding-manager-spec
  - port-forwarding-command-spec
status: pending
---

# Add Error Handling and Edge Cases

## Objective

Implement comprehensive error handling for edge cases like kubectl not found, RBAC errors, pod deletion, connection timeouts, and special characters in pod names.

## Context

Port forwarding can fail in many ways. Users need clear, actionable error messages and automatic cleanup for edge cases like pod deletion or context switching.

## Implementation

### File: src/services/PortForwardManager.ts

**Add error detection in process monitoring**:
```typescript
private monitorProcess(record: PortForwardRecord): void {
  // Watch stderr for specific errors
  record.process.stderr?.on('data', (data: Buffer) => {
    const message = data.toString();
    
    // kubectl not found
    if (message.includes('command not found') || message.includes('not recognized')) {
      this.handleKubectlNotFound(record);
    }
    
    // RBAC permission denied
    if (message.includes('Forbidden') || message.includes('pods/portforward')) {
      this.handleRBACError(record, message);
    }
    
    // Pod not found or deleted
    if (message.includes('not found') || message.includes('NotFound')) {
      this.handlePodNotFound(record);
    }
    
    // Connection refused
    if (message.includes('connection refused') || message.includes('unable to connect')) {
      this.handleConnectionError(record, message);
    }
  });
  
  // Connection timeout
  setTimeout(() => {
    if (record.status === 'connecting') {
      this.handleTimeout(record);
    }
  }, 10000); // 10 second timeout
}
```

**Error handler methods**:
```typescript
private handleKubectlNotFound(record: PortForwardRecord): void {
  vscode.window.showErrorMessage(
    'kubectl not found. Please install kubectl to use port forwarding.',
    'Install kubectl'
  ).then(action => {
    if (action === 'Install kubectl') {
      vscode.env.openExternal(vscode.Uri.parse('https://kubernetes.io/docs/tasks/tools/'));
    }
  });
  this.stopForward(record.id);
}

private handleRBACError(record: PortForwardRecord, message: string): void {
  vscode.window.showErrorMessage(
    `Permission denied: You need pods/portforward permission in namespace '${record.config.namespace}'`,
    'View RBAC Docs'
  ).then(action => {
    if (action === 'View RBAC Docs') {
      vscode.env.openExternal(vscode.Uri.parse('https://kubernetes.io/docs/reference/access-authn-authz/rbac/'));
    }
  });
  this.stopForward(record.id);
}

private handlePodNotFound(record: PortForwardRecord): void {
  vscode.window.showInformationMessage(
    `Port forward stopped: Pod '${record.config.podName}' was deleted`
  );
  this.stopForward(record.id);
}

private handleConnectionError(record: PortForwardRecord, message: string): void {
  vscode.window.showErrorMessage(
    `Connection failed: Unable to reach pod. Check cluster connectivity.`
  );
  this.stopForward(record.id);
}

private handleTimeout(record: PortForwardRecord): void {
  vscode.window.showErrorMessage(
    `Port forward connection timed out. Check pod logs and try again.`
  );
  this.stopForward(record.id);
}
```

**Handle special characters in pod names**:
```typescript
private buildKubectlCommand(config: PortForwardConfig): string[] {
  // Escape pod name if needed (kubectl handles this natively, but validate)
  const podName = config.podName;
  
  return [
    'port-forward',
    `pod/${podName}`, // Use pod/ prefix for clarity
    `${config.localPort}:${config.remotePort}`,
    '-n', config.namespace,
    '--context', config.context
  ];
}
```

**Watch for context switches**:
```typescript
// In constructor, watch for context changes
this.watchContextChanges();

private watchContextChanges(): void {
  // Subscribe to context change events
  // Note: Forwards persist across context switches (per decision in session)
  // But we should track which context each forward belongs to
}
```

## Acceptance Criteria

- [ ] kubectl not found error shows installation link
- [ ] RBAC errors show clear permission message with docs link
- [ ] Pod deletion auto-cleans up forward with notification
- [ ] Connection timeout (10s) shows helpful error
- [ ] Connection errors show clear messages
- [ ] Special characters in pod names handled correctly
- [ ] Process errors logged to output channel
- [ ] All error paths stop forward and clean up
- [ ] No orphaned processes on errors

## Files Modified

- `src/services/PortForwardManager.ts`

## Dependencies

- 003-implement-port-forward-manager-start-logic
- 004-implement-port-forward-manager-stop-logic

## Estimated Time

25 minutes

