---
story_id: 004-implement-port-forward-manager-stop-logic
session_id: add-port-forwarding-for-pods
feature_id:
  - pod-port-forwarding
spec_id:
  - port-forwarding-manager-spec
status: pending
---

# Implement Port Forward Manager Stop Logic

## Objective

Implement logic for stopping port forwards, including process termination and cleanup.

## Context

The stop logic must gracefully terminate kubectl processes and clean up state. Supports stopping individual forwards or all forwards at once.

## Implementation

### File: src/services/PortForwardManager.ts

**Implement `stopForward()`**:
1. Retrieve forward record by ID
2. Update status to 'stopped'
3. Send SIGTERM to process
4. Wait 1 second, force SIGKILL if needed
5. Remove from forwards map
6. Emit event and update status bar

**Implement `stopAllForwards()`**:
```typescript
public async stopAllForwards(): Promise<void> {
  const forwardIds = Array.from(this.forwards.keys());
  await Promise.all(
    forwardIds.map(id => this.stopForward(id).catch(err => {
      console.error(`Failed to stop forward ${id}:`, err);
    }))
  );
}
```

**Graceful process termination**:
```typescript
private async killProcess(process: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!process.pid) {
      resolve();
      return;
    }
    
    process.kill('SIGTERM');
    
    const timeout = setTimeout(() => {
      if (!process.killed) {
        process.kill('SIGKILL');
      }
      resolve();
    }, 1000);
    
    process.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}
```

## Acceptance Criteria

- [ ] `stopForward()` terminates process gracefully
- [ ] Process killed with SIGTERM, then SIGKILL if needed
- [ ] Forward removed from state
- [ ] Event emitted on stop
- [ ] Status bar updates (decrements count)
- [ ] `stopAllForwards()` stops all forwards
- [ ] No orphaned processes remain

## Files Modified

- `src/services/PortForwardManager.ts`

## Dependencies

- 003-implement-port-forward-manager-start-logic

## Estimated Time

15 minutes

