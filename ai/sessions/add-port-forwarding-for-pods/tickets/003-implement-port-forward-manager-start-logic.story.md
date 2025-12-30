---
story_id: 003-implement-port-forward-manager-start-logic
session_id: add-port-forwarding-for-pods
feature_id:
  - pod-port-forwarding
spec_id:
  - port-forwarding-manager-spec
status: completed
---

# Implement Port Forward Manager Start Logic

## Objective

Implement the complete logic for starting port forwards, including validation, process spawning, monitoring, and error handling.

## Context

The `startForward()` method is the core of PortForwardManager. It must:
1. Validate configuration
2. Check port availability
3. Spawn kubectl process
4. Monitor process output for connection
5. Handle errors and timeouts
6. Update status bar

## Implementation

### File: src/services/PortForwardManager.ts

**Implement `startForward()` method**:
1. Validate config (ports in range, required fields)
2. Check if port is available using `isPortAvailable()`
3. Check for existing forward (prevent duplicates)
4. Build kubectl command: `kubectl port-forward <pod> <localPort>:<remotePort> -n <namespace> --context <context>`
5. Spawn process using Node.js `child_process.spawn()`
6. Create PortForwardRecord with status 'connecting'
7. Set up process monitoring (stdout, stderr, exit)
8. Wait for connection confirmation (10 second timeout)
9. Update status to 'connected' on success
10. Emit event and update status bar
11. Return PortForwardInfo

**Implement port availability**:
```typescript
private async isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}
```

**Process monitoring**:
- Watch stdout for "Forwarding from" message (connection success)
- Watch stderr for error messages
- Handle process exit events
- Set 10-second connection timeout

## Acceptance Criteria

- [x] Config validation works correctly
- [x] Port availability check using net module
- [x] kubectl process spawns successfully
- [x] Process output monitoring set up
- [x] Connection success detected from stdout
- [x] Timeout handling (10 seconds)
- [x] Error handling for common failures
- [x] Status bar updates when forward starts
- [x] Event emitted on successful start

## Files Modified

- `src/services/PortForwardManager.ts`

## Dependencies

- 002-create-port-forward-manager-singleton

## Estimated Time

30 minutes

