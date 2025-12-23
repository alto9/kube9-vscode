---
story_id: 002-create-port-forward-manager-singleton
session_id: add-port-forwarding-for-pods
feature_id:
  - pod-port-forwarding
spec_id:
  - port-forwarding-manager-spec
status: pending
---

# Create PortForwardManager Singleton

## Objective

Create the PortForwardManager singleton service that manages all port forwarding operations, including process spawning, state management, and cleanup.

## Context

The PortForwardManager is the central hub for all port forwarding operations. It:
- Spawns and monitors kubectl port-forward processes
- Tracks active forwards in memory
- Provides port availability checking
- Manages status bar updates
- Handles cleanup on extension deactivate

## Implementation

### File: src/services/PortForwardManager.ts (NEW)

Create the singleton with:

**Data Structures**:
```typescript
interface PortForwardConfig {
  podName: string;
  namespace: string;
  context: string;
  localPort: number;
  remotePort: number;
  containerName?: string;
}

enum PortForwardStatus {
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',
  Stopped = 'stopped'
}

interface PortForwardRecord {
  id: string;  // UUID
  config: PortForwardConfig;
  processId: number;
  process: ChildProcess;
  status: PortForwardStatus;
  startTime: Date;
  lastActivity?: Date;
  error?: string;
}

interface PortForwardInfo {
  id: string;
  podName: string;
  namespace: string;
  context: string;
  localPort: number;
  remotePort: number;
  status: PortForwardStatus;
  uptime: number;  // Calculated from startTime
  startTime: Date;
}
```

**Class Structure**:
```typescript
export class PortForwardManager {
  private static instance: PortForwardManager;
  private forwards: Map<string, PortForwardRecord>;
  private eventEmitter: vscode.EventEmitter<PortForwardEvent>;
  private statusBarItem: vscode.StatusBarItem;
  
  private constructor() {
    this.forwards = new Map();
    this.eventEmitter = new vscode.EventEmitter<PortForwardEvent>();
    this.initializeStatusBar();
  }
  
  public static getInstance(): PortForwardManager {
    if (!PortForwardManager.instance) {
      PortForwardManager.instance = new PortForwardManager();
    }
    return PortForwardManager.instance;
  }
  
  public get onForwardsChanged(): vscode.Event<PortForwardEvent> {
    return this.eventEmitter.event;
  }
  
  public dispose(): void {
    this.stopAllForwards();
    this.statusBarItem.dispose();
    this.eventEmitter.dispose();
  }
}
```

**Core Methods** (stub implementations):
- `startForward(config: PortForwardConfig): Promise<PortForwardInfo>`
- `stopForward(forwardId: string): Promise<void>`
- `stopAllForwards(): Promise<void>`
- `getAllForwards(): PortForwardInfo[]`
- `getForward(forwardId: string): PortForwardInfo | undefined`
- `isPortAvailable(port: number): Promise<boolean>`
- `findNextAvailablePort(startPort: number): Promise<number>`

**Helper Methods**:
- `private initializeStatusBar(): void`
- `private updateStatusBar(): void`
- `private validateConfig(config: PortForwardConfig): void`
- `private buildKubectlCommand(config: PortForwardConfig): string[]`
- `private getForwardInfo(record: PortForwardRecord): PortForwardInfo`

## Acceptance Criteria

- [ ] PortForwardManager class created with singleton pattern
- [ ] All data structures defined (interfaces, enums)
- [ ] Core methods implemented with basic logic
- [ ] Status bar item initialized (hidden by default)
- [ ] Event emitter set up
- [ ] Dispose method properly cleans up resources
- [ ] No TypeScript compilation errors

## Files Created

- `src/services/PortForwardManager.ts`

## Dependencies

- 001-add-port-forward-tree-item-types (for type safety)

## Notes

- Keep implementations simple for now - full functionality will be added in subsequent stories
- Focus on structure and interfaces
- Use `uuid` package for generating forward IDs
- Status bar should show `$(zap) kube9: N forward(s) active` format

## Estimated Time

25 minutes

