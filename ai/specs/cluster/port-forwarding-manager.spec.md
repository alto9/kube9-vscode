---
spec_id: port-forwarding-manager-spec
name: Port Forward Manager Specification
description: Singleton service for managing kubectl port-forward processes and tracking active forwards
feature_id:
  - pod-port-forwarding
diagram_id:
  - port-forwarding-architecture
  - port-forwarding-workflow
---

# Port Forward Manager Specification

## Overview

The PortForwardManager is a singleton service that manages all Kubernetes port forwarding operations. It spawns and monitors kubectl port-forward processes, maintains state of active forwards, handles cleanup, and emits events for UI coordination.

See [port-forwarding-architecture](../../diagrams/cluster/port-forwarding-architecture.diagram.md) for system architecture.

## Core Data Structures

### PortForwardConfig

Configuration for starting a port forward:

```typescript
interface PortForwardConfig {
  podName: string;           // Name of the pod
  namespace: string;         // Namespace containing the pod
  context: string;           // kubectl context name
  localPort: number;         // Local port to bind (1024-65535)
  remotePort: number;        // Remote port on pod (1-65535)
  containerName?: string;    // Optional: specific container (for multi-container pods)
}
```

### PortForwardRecord

Internal tracking record for an active forward:

```typescript
interface PortForwardRecord {
  id: string;                // Unique identifier (UUID)
  config: PortForwardConfig; // Original configuration
  processId: number;         // kubectl process PID
  process: ChildProcess;     // Node.js child process object
  status: PortForwardStatus; // Current status
  startTime: Date;           // When forward was established
  lastActivity?: Date;       // Last known activity
  error?: string;            // Error message if status is 'error'
}
```

### PortForwardStatus

Status enumeration:

```typescript
enum PortForwardStatus {
  Connecting = 'connecting',     // Process started, waiting for connection
  Connected = 'connected',       // Successfully forwarding
  Disconnected = 'disconnected', // Lost connection but process alive
  Error = 'error',               // Error state
  Stopped = 'stopped'            // Intentionally stopped
}
```

### PortForwardInfo

Public information about a forward (returned to callers):

```typescript
interface PortForwardInfo {
  id: string;
  podName: string;
  namespace: string;
  context: string;
  localPort: number;
  remotePort: number;
  status: PortForwardStatus;
  uptime: number;            // Seconds since startTime
  startTime: Date;
}
```

## Singleton Implementation

### Class Structure

```typescript
export class PortForwardManager {
  private static instance: PortForwardManager;
  private forwards: Map<string, PortForwardRecord>;
  private eventEmitter: vscode.EventEmitter<PortForwardEvent>;
  private statusBarItem: vscode.StatusBarItem;
  
  // Private constructor for singleton
  private constructor() {
    this.forwards = new Map();
    this.eventEmitter = new vscode.EventEmitter<PortForwardEvent>();
    this.initializeStatusBar();
  }
  
  // Public singleton accessor
  public static getInstance(): PortForwardManager {
    if (!PortForwardManager.instance) {
      PortForwardManager.instance = new PortForwardManager();
    }
    return PortForwardManager.instance;
  }
  
  // Event subscription
  public get onForwardsChanged(): vscode.Event<PortForwardEvent> {
    return this.eventEmitter.event;
  }
  
  // Cleanup on extension deactivate
  public dispose(): void {
    this.stopAllForwards();
    this.statusBarItem.dispose();
    this.eventEmitter.dispose();
  }
}
```

### Singleton Lifecycle

1. **Creation**: Lazily created on first `getInstance()` call
2. **Lifetime**: Lives for entire extension lifetime
3. **Disposal**: Explicitly disposed on extension deactivation
4. **No Reset**: Cannot be recreated without reloading extension

## Core Operations

### Start Port Forward

**Method Signature**:
```typescript
public async startForward(config: PortForwardConfig): Promise<PortForwardInfo>
```

**Implementation Steps**:

1. **Validate Configuration**:
   ```typescript
   private validateConfig(config: PortForwardConfig): void {
     // Validate pod name is non-empty
     if (!config.podName || config.podName.trim() === '') {
       throw new Error('Pod name is required');
     }
     
     // Validate namespace is non-empty
     if (!config.namespace || config.namespace.trim() === '') {
       throw new Error('Namespace is required');
     }
     
     // Validate local port range (non-privileged ports)
     if (config.localPort < 1024 || config.localPort > 65535) {
       throw new Error('Local port must be between 1024 and 65535');
     }
     
     // Validate remote port range
     if (config.remotePort < 1 || config.remotePort > 65535) {
       throw new Error('Remote port must be between 1 and 65535');
     }
   }
   ```

2. **Check Port Availability**:
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

3. **Check for Existing Forward**:
   ```typescript
   private findExistingForward(config: PortForwardConfig): PortForwardRecord | undefined {
     return Array.from(this.forwards.values()).find(record =>
       record.config.podName === config.podName &&
       record.config.namespace === config.namespace &&
       record.config.context === config.context &&
       record.config.localPort === config.localPort
     );
   }
   ```
   - If exists and connected, return existing forward info
   - If exists but disconnected, stop it and proceed with new forward

4. **Build kubectl Command**:
   ```typescript
   private buildKubectlCommand(config: PortForwardConfig): string[] {
     const args = [
       'port-forward',
       config.podName,
       `${config.localPort}:${config.remotePort}`,
       '-n', config.namespace,
       '--context', config.context
     ];
     
     if (config.containerName) {
       args.push('-c', config.containerName);
     }
     
     return args;
   }
   ```

5. **Spawn kubectl Process**:
   ```typescript
   const process = spawn('kubectl', args, {
     stdio: ['ignore', 'pipe', 'pipe']
   });
   ```

6. **Create Port Forward Record**:
   ```typescript
   const record: PortForwardRecord = {
     id: generateUUID(),
     config,
     processId: process.pid!,
     process,
     status: PortForwardStatus.Connecting,
     startTime: new Date()
   };
   this.forwards.set(record.id, record);
   ```

7. **Setup Process Monitoring**:
   ```typescript
   this.setupProcessMonitoring(record);
   ```

8. **Wait for Connection**:
   ```typescript
   await this.waitForConnection(record, 10000); // 10 second timeout
   ```

9. **Update Status Bar**:
   ```typescript
   this.emitForwardsChanged({
     type: 'added',
     forwardId: record.id,
     forwardInfo: this.getForwardInfo(record)
   });
   this.updateStatusBar();
   
   // Note: Tree does NOT refresh automatically
   // Tree will show forward when user expands Port Forwarding category
   ```

10. **Return Forward Info**:
    ```typescript
    return this.getForwardInfo(record);
    ```

**Error Handling**:
- Port unavailable → throw Error with suggested port
- kubectl not found → throw Error with installation message
- Connection timeout → throw Error, cleanup process
- Process spawn error → throw Error, cleanup state
- Permission denied → throw Error with RBAC message

### Stop Port Forward

**Method Signature**:
```typescript
public async stopForward(forwardId: string): Promise<void>
```

**Implementation Steps**:

1. **Retrieve Forward Record**:
   ```typescript
   const record = this.forwards.get(forwardId);
   if (!record) {
     throw new Error(`Forward ${forwardId} not found`);
   }
   ```

2. **Update Status**:
   ```typescript
   record.status = PortForwardStatus.Stopped;
   ```

3. **Kill Process**:
   ```typescript
   private async killProcess(process: ChildProcess): Promise<void> {
     return new Promise((resolve) => {
       if (!process.pid) {
         resolve();
         return;
       }
       
       // Try graceful SIGTERM first
       process.kill('SIGTERM');
       
       // Force kill after 1 second if still alive
       const timeout = setTimeout(() => {
         if (!process.killed) {
           process.kill('SIGKILL');
         }
         resolve();
       }, 1000);
       
       // Resolve when process exits
       process.once('exit', () => {
         clearTimeout(timeout);
         resolve();
       });
     });
   }
   ```

4. **Remove from State**:
   ```typescript
   this.forwards.delete(forwardId);
   ```

5. **Update Status Bar**:
   ```typescript
   this.emitForwardsChanged({
     type: 'removed',
     forwardId: forwardId
   });
   this.updateStatusBar();
   
   // Note: Tree does NOT refresh automatically
   // User will see updated state when they view Port Forwarding category
   ```

### Stop All Forwards

**Method Signature**:
```typescript
public async stopAllForwards(): Promise<void>
```

**Implementation**:
```typescript
const forwardIds = Array.from(this.forwards.keys());
await Promise.all(
  forwardIds.map(id => this.stopForward(id).catch(err => {
    console.error(`Failed to stop forward ${id}:`, err);
  }))
);
```

### Get All Forwards

**Method Signature**:
```typescript
public getAllForwards(): PortForwardInfo[]
```

**Implementation**:
```typescript
return Array.from(this.forwards.values()).map(record =>
  this.getForwardInfo(record)
);
```

### Get Forward by ID

**Method Signature**:
```typescript
public getForward(forwardId: string): PortForwardInfo | undefined
```

**Implementation**:
```typescript
const record = this.forwards.get(forwardId);
return record ? this.getForwardInfo(record) : undefined;
```

## Process Monitoring

### Setup Monitoring

**Method**:
```typescript
private setupProcessMonitoring(record: PortForwardRecord): void
```

**Implementation**:

1. **Monitor stdout**:
   ```typescript
   record.process.stdout?.on('data', (data: Buffer) => {
     const output = data.toString();
     
     // Detect successful connection
     if (output.includes('Forwarding from')) {
       this.handleConnectionEstablished(record);
     }
     
     // Update last activity
     record.lastActivity = new Date();
   });
   ```

2. **Monitor stderr**:
   ```typescript
   record.process.stderr?.on('data', (data: Buffer) => {
     const error = data.toString();
     
     // Detect specific errors
     if (error.includes('unable to forward')) {
       this.handleForwardError(record, 'Port forwarding failed');
     } else if (error.includes('error forwarding port')) {
       this.handleForwardError(record, 'Connection lost');
     } else if (error.includes('Forbidden')) {
       this.handleForwardError(record, 'Permission denied');
     }
   });
   ```

3. **Monitor process exit**:
   ```typescript
   record.process.on('exit', (code: number | null, signal: string | null) => {
     this.handleProcessExit(record, code, signal);
   });
   ```

4. **Monitor process error**:
   ```typescript
   record.process.on('error', (err: Error) => {
     this.handleProcessSpawnError(record, err);
   });
   ```

### Connection State Handlers

**Connection Established**:
```typescript
private handleConnectionEstablished(record: PortForwardRecord): void {
  if (record.status === PortForwardStatus.Connecting) {
    record.status = PortForwardStatus.Connected;
    this.emitForwardsChanged({
      type: 'updated',
      forwardId: record.id,
      forwardInfo: this.getForwardInfo(record)
    });
    
    // Show success notification
    vscode.window.showInformationMessage(
      `Port forward established: localhost:${record.config.localPort} → ${record.config.namespace}/${record.config.podName}:${record.config.remotePort}`
    );
  }
}
```

**Forward Error**:
```typescript
private handleForwardError(record: PortForwardRecord, error: string): void {
  record.status = PortForwardStatus.Error;
  record.error = error;
  this.emitForwardsChanged({
    type: 'updated',
    forwardId: record.id,
    forwardInfo: this.getForwardInfo(record)
  });
  
  // Show error notification
  vscode.window.showErrorMessage(
    `Port forward error: ${error}`,
    'Stop Forward'
  ).then(action => {
    if (action === 'Stop Forward') {
      this.stopForward(record.id);
    }
  });
}
```

**Process Exit**:
```typescript
private handleProcessExit(record: PortForwardRecord, code: number | null, signal: string | null): void {
  // Don't process if already marked as stopped (intentional)
  if (record.status === PortForwardStatus.Stopped) {
    return;
  }
  
  // Mark as disconnected
  record.status = PortForwardStatus.Disconnected;
  
  // Remove from active forwards
  this.forwards.delete(record.id);
  
  this.emitForwardsChanged({
    type: 'removed',
    forwardId: record.id
  });
  this.updateStatusBar();
  
  // Show notification if unexpected exit
  if (code !== 0 && code !== null) {
    vscode.window.showWarningMessage(
      `Port forward stopped unexpectedly: localhost:${record.config.localPort} → ${record.config.namespace}/${record.config.podName}:${record.config.remotePort}`
    );
  }
}
```

## Port Availability Checking

### Check Single Port

```typescript
public async isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err: NodeJS.ErrnoException) => {
      resolve(false);
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port, '127.0.0.1');
  });
}
```

### Find Next Available Port

```typescript
public async findNextAvailablePort(startPort: number): Promise<number> {
  const maxAttempts = 100;
  let port = startPort;
  
  for (let i = 0; i < maxAttempts; i++) {
    if (await this.isPortAvailable(port)) {
      return port;
    }
    port++;
    
    // Wrap around if we exceed max port
    if (port > 65535) {
      port = 1024;
    }
  }
  
  throw new Error('No available ports found in range 1024-65535');
}
```

### Suggest Alternative Port

```typescript
public async suggestAlternativePort(requestedPort: number): Promise<number> {
  // First try common alternatives
  const commonPorts = [8080, 8081, 3000, 5000, 8000, 9000];
  for (const port of commonPorts) {
    if (port !== requestedPort && await this.isPortAvailable(port)) {
      return port;
    }
  }
  
  // Fall back to finding next available
  return this.findNextAvailablePort(requestedPort + 1);
}
```

## Status Bar Integration

### Initialize Status Bar

```typescript
private initializeStatusBar(): void {
  this.statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  this.statusBarItem.command = 'kube9.showPortForwards';
  this.statusBarItem.tooltip = 'Click to view active port forwards';
  // Initially hidden
}
```

### Update Status Bar

```typescript
private updateStatusBar(): void {
  const count = this.forwards.size;
  
  if (count === 0) {
    this.statusBarItem.hide();
    return;
  }
  
  const text = count === 1
    ? 'kube9: 1 forward active'
    : `kube9: ${count} forwards active`;
    
  this.statusBarItem.text = `$(zap) ${text}`;
  this.statusBarItem.show();
}
```

## Event System (Status Bar Only)

### Event Types

```typescript
type PortForwardEvent =
  | { type: 'added'; forwardId: string; forwardInfo: PortForwardInfo }
  | { type: 'removed'; forwardId: string }
  | { type: 'updated'; forwardId: string; forwardInfo: PortForwardInfo };
```

### Emit Events

```typescript
private emitForwardsChanged(event: PortForwardEvent): void {
  this.eventEmitter.fire(event);
}
```

### Subscribe to Events

**Primary Use: Status Bar Updates**:
```typescript
const manager = PortForwardManager.getInstance();
manager.onForwardsChanged(event => {
  // Update status bar (lightweight)
  this.updateStatusBar();
  
  // NO tree refresh - tree updates on-demand when user views it
});
```

**Tree Integration**:
- Tree does NOT subscribe to events
- Tree queries manager directly when getChildren is called
- This avoids unnecessary refresh overhead

## Extension Integration

### Registration in Extension.ts

```typescript
export function activate(context: vscode.ExtensionContext) {
  // Get manager instance (creates singleton)
  const portForwardManager = PortForwardManager.getInstance();
  
  // Register for cleanup on deactivate
  context.subscriptions.push({
    dispose: () => portForwardManager.dispose()
  });
  
  // Register show command (for status bar)
  context.subscriptions.push(
    vscode.commands.registerCommand('kube9.showPortForwards', () => {
      // Focus tree on Port Forwarding category
      vscode.commands.executeCommand('kube9TreeView.focus');
      // Tree provider will expand Port Forwarding category
    })
  );
}
```

## Error Handling Strategy

### Port Conflict Error

```typescript
class PortConflictError extends Error {
  constructor(
    public readonly requestedPort: number,
    public readonly suggestedPort: number
  ) {
    super(`Port ${requestedPort} is already in use. Try port ${suggestedPort}?`);
    this.name = 'PortConflictError';
  }
}
```

**Handling**:
```typescript
try {
  await manager.startForward(config);
} catch (err) {
  if (err instanceof PortConflictError) {
    const action = await vscode.window.showErrorMessage(
      err.message,
      `Use ${err.suggestedPort}`,
      'Choose Different Port'
    );
    
    if (action === `Use ${err.suggestedPort}`) {
      config.localPort = err.suggestedPort;
      await manager.startForward(config);
    }
  }
}
```

### kubectl Not Found

```typescript
private async checkKubectlAvailable(): Promise<boolean> {
  try {
    await execAsync('kubectl version --client');
    return true;
  } catch {
    return false;
  }
}
```

**Error**:
```typescript
if (!await this.checkKubectlAvailable()) {
  throw new Error('kubectl not found. Please install kubectl to use port forwarding.');
}
```

### Permission Denied

Detect from stderr containing "Forbidden" or "pods/portforward":
```typescript
throw new Error(`Permission denied: You need pods/portforward permission in namespace '${config.namespace}'`);
```

## Performance Considerations

### Process Management
- **Minimal Overhead**: One kubectl process per forward, no polling
- **Graceful Shutdown**: SIGTERM with fallback to SIGKILL
- **Process Cleanup**: Guaranteed cleanup on extension deactivate
- **No Leaks**: All processes tracked and terminated

### Memory Management
- **Lightweight State**: Only active forwards in memory
- **No Persistence**: State cleared on extension reload
- **EventEmitter**: Single emitter for all events
- **Map Storage**: O(1) lookups by forward ID

### Concurrency
- **Async Operations**: All I/O operations are async
- **No Blocking**: Process monitoring via event handlers
- **Safe Cleanup**: Concurrent stops handled correctly
- **Race Condition Protection**: Status checks before state changes

## Testing Requirements

### Unit Tests
- Singleton pattern (single instance)
- Config validation
- Port availability checking
- Next available port finding
- kubectl command building
- Event emission
- Status bar updates
- Forward info conversion

### Integration Tests
- Start forward with real kubectl
- Stop forward
- Multiple simultaneous forwards
- Port conflict handling
- Process monitoring
- Auto-cleanup on pod deletion
- Extension deactivation cleanup

### Edge Cases
- Starting forward twice for same pod/port
- Stopping non-existent forward
- kubectl process crashes immediately
- Port becomes unavailable during start
- Rapid start/stop sequences
- Large number of simultaneous forwards (10+)

