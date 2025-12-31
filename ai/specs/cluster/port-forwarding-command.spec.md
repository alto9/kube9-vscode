---
spec_id: port-forwarding-command-spec
name: Port Forward Command Specification
description: Command implementation for starting port forwards from pod context menu
feature_id:
  - pod-port-forwarding
diagram_id:
  - port-forwarding-workflow
  - port-forwarding-ui
---

# Port Forward Command Specification

## Overview

This specification defines the implementation of the "Port Forward" command that appears in pod context menus. The command collects port information from the user, validates inputs, and delegates to the PortForwardManager to establish the forward.

See [port-forwarding-workflow](../../diagrams/cluster/port-forwarding-workflow.diagram.md) for complete workflow.

## Command Registration

### package.json

```json
{
  "commands": [
    {
      "command": "kube9.portForwardPod",
      "title": "Port Forward",
      "category": "kube9"
    },
    {
      "command": "kube9.stopPortForward",
      "title": "Stop Port Forward",
      "category": "kube9"
    },
    {
      "command": "kube9.stopAllPortForwards",
      "title": "Stop All Port Forwards",
      "category": "kube9"
    },
    {
      "command": "kube9.showPortForwards",
      "title": "Show Port Forwards",
      "category": "kube9"
    }
  ],
  "menus": {
    "view/item/context": [
      {
        "command": "kube9.portForwardPod",
        "when": "view == kube9ClusterView && viewItem == resource:Pod",
        "group": "kube9-networking@1"
      },
      {
        "command": "kube9.stopPortForward",
        "when": "view == kube9ClusterView && viewItem == portForward",
        "group": "kube9@1"
      }
    ],
    "commandPalette": [
      {
        "command": "kube9.portForwardPod",
        "when": "false"
      },
      {
        "command": "kube9.stopPortForward",
        "when": "false"
      },
      {
        "command": "kube9.showPortForwards",
        "when": "true"
      },
      {
        "command": "kube9.stopAllPortForwards",
        "when": "true"
      }
    ]
  }
}
```

### Extension Registration

```typescript
// In src/extension.ts activate()
export function activate(context: vscode.ExtensionContext) {
  // Port forward commands
  context.subscriptions.push(
    vscode.commands.registerCommand('kube9.portForwardPod', portForwardPodCommand),
    vscode.commands.registerCommand('kube9.stopPortForward', stopPortForwardCommand),
    vscode.commands.registerCommand('kube9.stopAllPortForwards', stopAllPortForwardsCommand),
    vscode.commands.registerCommand('kube9.showPortForwards', showPortForwardsCommand)
  );
}
```

## Port Forward Pod Command

### File: src/commands/portForwardPod.ts

### Command Signature

```typescript
export async function portForwardPodCommand(treeItem: ClusterTreeItem): Promise<void>
```

### Implementation Steps

#### 1. Validate Tree Item

```typescript
// Verify tree item is a Pod
if (!treeItem || !treeItem.contextValue?.startsWith('resource:')) {
  vscode.window.showErrorMessage('Invalid resource selected');
  return;
}

if (treeItem.contextValue !== 'resource:Pod') {
  vscode.window.showErrorMessage('Port forwarding is only available for Pods');
  return;
}
```

#### 2. Extract Pod Metadata

```typescript
interface PodMetadata {
  name: string;
  namespace: string;
  context: string;
  status: string;
}

function extractPodMetadata(treeItem: ClusterTreeItem): PodMetadata {
  const name = treeItem.resourceData?.resourceName || treeItem.label;
  const namespace = treeItem.resourceData?.namespace || 'default';
  const context = treeItem.resourceData?.context?.name;
  const status = treeItem.resourceData?.status;
  
  if (!name || !context) {
    throw new Error('Missing pod information');
  }
  
  return { name, namespace, context, status };
}
```

#### 3. Validate Pod Status

```typescript
if (metadata.status !== 'Running') {
  vscode.window.showErrorMessage(
    `Cannot port forward: Pod '${metadata.name}' is not in Running state (current: ${metadata.status})`
  );
  return;
}
```

#### 4. Query Pod for Container Ports

```typescript
interface ContainerPort {
  name?: string;
  containerPort: number;
  protocol?: string;
}

async function getContainerPorts(
  podName: string,
  namespace: string,
  context: string
): Promise<ContainerPort[]> {
  try {
    const client = KubernetesApiClient.getInstance();
    const pod = await client.core.readNamespacedPod(podName, namespace);
    
    const ports: ContainerPort[] = [];
    for (const container of pod.body.spec?.containers || []) {
      if (container.ports) {
        ports.push(...container.ports);
      }
    }
    
    return ports;
  } catch (error) {
    // Fallback: allow custom port entry even if can't read pod
    console.error('Failed to read pod ports:', error);
    return [];
  }
}
```

#### 5. Show Remote Port Selection Dialog

```typescript
interface RemotePortSelection {
  port: number;
  name?: string;
}

async function selectRemotePort(
  containerPorts: ContainerPort[]
): Promise<RemotePortSelection | undefined> {
  interface PortQuickPickItem extends vscode.QuickPickItem {
    port: number;
  }
  
  const items: PortQuickPickItem[] = [];
  
  // Add known container ports
  for (const cp of containerPorts) {
    const label = cp.name
      ? `${cp.containerPort} (${cp.name})`
      : `${cp.containerPort}`;
    const description = cp.protocol ? `Protocol: ${cp.protocol}` : undefined;
    
    items.push({
      label,
      description,
      port: cp.containerPort
    });
  }
  
  // Add custom port option
  items.push({
    label: '$(add) Custom port...',
    description: 'Enter a port number manually',
    port: -1 // Sentinel value
  });
  
  const selected = await vscode.window.showQuickPick(items, {
    title: 'Select Remote Port',
    placeHolder: 'Choose the port on the pod to forward',
    ignoreFocusOut: true
  });
  
  if (!selected) {
    return undefined; // User cancelled
  }
  
  // Handle custom port entry
  if (selected.port === -1) {
    const customPort = await vscode.window.showInputBox({
      title: 'Enter Remote Port',
      prompt: 'Enter the port number on the pod',
      placeHolder: 'e.g., 8080',
      validateInput: (value) => {
        const port = parseInt(value, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          return 'Port must be a number between 1 and 65535';
        }
        return undefined;
      },
      ignoreFocusOut: true
    });
    
    if (!customPort) {
      return undefined;
    }
    
    return { port: parseInt(customPort, 10) };
  }
  
  return {
    port: selected.port,
    name: containerPorts.find(cp => cp.containerPort === selected.port)?.name
  };
}
```

#### 6. Show Local Port Selection Dialog

```typescript
async function selectLocalPort(
  remotePort: number,
  manager: PortForwardManager
): Promise<number | undefined> {
  // Check if remote port is available locally
  const remotePortAvailable = await manager.isPortAvailable(remotePort);
  
  // Build default value and placeholder
  const defaultPort = remotePortAvailable ? remotePort : undefined;
  const suggestedPort = defaultPort || await manager.findNextAvailablePort(remotePort);
  
  const placeHolder = defaultPort
    ? `Default: ${defaultPort} (same as remote)`
    : `Suggested: ${suggestedPort} (${remotePort} is in use)`;
  
  const localPortInput = await vscode.window.showInputBox({
    title: 'Select Local Port',
    prompt: 'Choose the local port to bind on localhost',
    value: suggestedPort.toString(),
    placeHolder,
    validateInput: async (value) => {
      // Validate format
      const port = parseInt(value, 10);
      if (isNaN(port)) {
        return 'Port must be a number';
      }
      
      // Validate range (non-privileged ports)
      if (port < 1024 || port > 65535) {
        return 'Port must be between 1024 and 65535';
      }
      
      // Check availability (async validation)
      const available = await manager.isPortAvailable(port);
      if (!available) {
        const alternative = await manager.suggestAlternativePort(port);
        return `Port ${port} is already in use. Try ${alternative}?`;
      }
      
      return undefined;
    },
    ignoreFocusOut: true
  });
  
  if (!localPortInput) {
    return undefined;
  }
  
  return parseInt(localPortInput, 10);
}
```

#### 7. Start Port Forward

```typescript
const manager = PortForwardManager.getInstance();

try {
  // Show progress while starting
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Starting port forward for ${metadata.name}...`,
      cancellable: false
    },
    async (progress) => {
      const forwardInfo = await manager.startForward({
        podName: metadata.name,
        namespace: metadata.namespace,
        context: metadata.context,
        localPort: localPort,
        remotePort: remotePort
      });
      
      // Success notification with "Open Browser" action
      const action = await vscode.window.showInformationMessage(
        `✅ Port forward established: localhost:${localPort} → ${metadata.namespace}/${metadata.name}:${remotePort}`,
        'Open Browser',
        'Show Forwards'
      );
      
      if (action === 'Open Browser') {
        vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${localPort}`));
      } else if (action === 'Show Forwards') {
        vscode.commands.executeCommand('kube9.showPortForwards');
      }
    }
  );
} catch (error) {
  handlePortForwardError(error, metadata, remotePort, localPort);
}
```

#### 8. Error Handling

```typescript
function handlePortForwardError(
  error: any,
  metadata: PodMetadata,
  remotePort: number,
  localPort: number
): void {
  if (error instanceof PortConflictError) {
    vscode.window.showErrorMessage(
      error.message,
      `Use ${error.suggestedPort}`
    ).then(action => {
      if (action === `Use ${error.suggestedPort}`) {
        // Retry with suggested port
        portForwardPodCommand({
          ...metadata,
          suggestedLocalPort: error.suggestedPort
        });
      }
    });
  } else if (error.message?.includes('kubectl not found')) {
    vscode.window.showErrorMessage(
      'kubectl not found. Please install kubectl to use port forwarding.',
      'Install kubectl'
    ).then(action => {
      if (action === 'Install kubectl') {
        vscode.env.openExternal(
          vscode.Uri.parse('https://kubernetes.io/docs/tasks/tools/install-kubectl/')
        );
      }
    });
  } else if (error.message?.includes('Permission denied') || error.message?.includes('Forbidden')) {
    vscode.window.showErrorMessage(
      `Permission denied: You need pods/portforward permission in namespace '${metadata.namespace}'`,
      'View RBAC Docs'
    ).then(action => {
      if (action === 'View RBAC Docs') {
        vscode.env.openExternal(
          vscode.Uri.parse('https://kubernetes.io/docs/reference/access-authn-authz/rbac/')
        );
      }
    });
  } else {
    vscode.window.showErrorMessage(
      `Failed to start port forward: ${error.message}`,
      'Retry'
    ).then(action => {
      if (action === 'Retry') {
        portForwardPodCommand(metadata);
      }
    });
  }
}
```

## Stop Port Forward Command

### Command Signature

```typescript
export async function stopPortForwardCommand(treeItem: PortForwardTreeItem): Promise<void>
```

### Implementation

```typescript
async function stopPortForwardCommand(treeItem: PortForwardTreeItem): Promise<void> {
  if (!treeItem || treeItem.contextValue !== 'portForward') {
    vscode.window.showErrorMessage('Invalid port forward selected');
    return;
  }
  
  const forwardId = treeItem.forwardId;
  const manager = PortForwardManager.getInstance();
  const forwardInfo = manager.getForward(forwardId);
  
  if (!forwardInfo) {
    vscode.window.showErrorMessage('Port forward not found');
    return;
  }
  
  // Optional: Show confirmation
  const confirm = await vscode.window.showWarningMessage(
    `Stop port forward localhost:${forwardInfo.localPort} → ${forwardInfo.namespace}/${forwardInfo.podName}:${forwardInfo.remotePort}?`,
    'Stop',
    'Cancel'
  );
  
  if (confirm !== 'Stop') {
    return;
  }
  
  try {
    await manager.stopForward(forwardId);
    vscode.window.showInformationMessage(
      `Port forward stopped: localhost:${forwardInfo.localPort}`
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to stop port forward: ${error.message}`
    );
  }
}
```

## Stop All Port Forwards Command

### Command Signature

```typescript
export async function stopAllPortForwardsCommand(): Promise<void>
```

### Implementation

```typescript
async function stopAllPortForwardsCommand(): Promise<void> {
  const manager = PortForwardManager.getInstance();
  const forwards = manager.getAllForwards();
  
  if (forwards.length === 0) {
    vscode.window.showInformationMessage('No active port forwards');
    return;
  }
  
  const confirm = await vscode.window.showWarningMessage(
    `Stop all ${forwards.length} active port forward(s)?`,
    'Stop All',
    'Cancel'
  );
  
  if (confirm !== 'Stop All') {
    return;
  }
  
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Stopping all port forwards...',
        cancellable: false
      },
      async () => {
        await manager.stopAllForwards();
      }
    );
    
    vscode.window.showInformationMessage('All port forwards stopped');
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to stop some port forwards: ${error.message}`
    );
  }
}
```

## Show Port Forwards Command

### Command Signature

```typescript
export async function showPortForwardsCommand(): Promise<void>
```

### Implementation

```typescript
async function showPortForwardsCommand(): Promise<void> {
  // Focus the tree view
  await vscode.commands.executeCommand('kube9ClusterView.focus');
  
  // Tree provider will handle expanding Port Forwarding category
  // This is triggered by the status bar item click
  
  // Optional: Show quick pick if user prefers list view
  const manager = PortForwardManager.getInstance();
  const forwards = manager.getAllForwards();
  
  if (forwards.length === 0) {
    vscode.window.showInformationMessage('No active port forwards');
    return;
  }
  
  // Alternative implementation: Show quick pick list
  interface ForwardQuickPickItem extends vscode.QuickPickItem {
    forwardId: string;
  }
  
  const items: ForwardQuickPickItem[] = forwards.map(fw => ({
    label: `localhost:${fw.localPort} → ${fw.namespace}/${fw.podName}:${fw.remotePort}`,
    description: `Status: ${fw.status} | Uptime: ${formatUptime(fw.uptime)}`,
    detail: `Started: ${fw.startTime.toLocaleString()}`,
    forwardId: fw.id
  }));
  
  const selected = await vscode.window.showQuickPick(items, {
    title: 'Active Port Forwards',
    placeHolder: 'Select a port forward to manage',
    ignoreFocusOut: true
  });
  
  if (selected) {
    // Focus tree on specific forward
    // or show actions menu
  }
}

function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
```

## Additional Context Menu Actions

### Copy Local URL

```typescript
vscode.commands.registerCommand('kube9.copyPortForwardURL', async (treeItem: PortForwardTreeItem) => {
  const manager = PortForwardManager.getInstance();
  const forward = manager.getForward(treeItem.forwardId);
  
  if (forward) {
    const url = `http://localhost:${forward.localPort}`;
    await vscode.env.clipboard.writeText(url);
    vscode.window.showInformationMessage(`Copied: ${url}`);
  }
});
```

### View Pod

```typescript
vscode.commands.registerCommand('kube9.viewPortForwardPod', async (treeItem: PortForwardTreeItem) => {
  const manager = PortForwardManager.getInstance();
  const forward = manager.getForward(treeItem.forwardId);
  
  if (forward) {
    // Focus tree on the pod
    // Implementation depends on tree provider structure
    vscode.commands.executeCommand('kube9.focusOnPod', {
      namespace: forward.namespace,
      podName: forward.podName,
      context: forward.context
    });
  }
});
```

## Validation Functions

### Validate Port Range

```typescript
function isValidPortNumber(port: number, allowPrivileged: boolean = false): boolean {
  const minPort = allowPrivileged ? 1 : 1024;
  return Number.isInteger(port) && port >= minPort && port <= 65535;
}
```

### Validate Port Input

```typescript
function validatePortInput(value: string, allowPrivileged: boolean = false): string | undefined {
  const port = parseInt(value, 10);
  
  if (isNaN(port)) {
    return 'Port must be a number';
  }
  
  if (!isValidPortNumber(port, allowPrivileged)) {
    const min = allowPrivileged ? 1 : 1024;
    return `Port must be between ${min} and 65535`;
  }
  
  return undefined;
}
```

## Testing Requirements

### Unit Tests
- Pod metadata extraction
- Port validation
- Error message generation
- Port selection dialog logic
- kubectl command construction

### Integration Tests
- Complete port forward workflow
- User cancellation handling
- Port conflict detection and resolution
- Multiple forwards to same pod
- Stop forward command
- Stop all forwards command

### UI Tests
- Port selection dialogs appear correctly
- Input validation works
- Error notifications display
- Success notifications with actions
- Status bar integration

## Performance Considerations

- **Async Dialogs**: All dialogs are non-blocking
- **Port Availability**: Fast checks using net.Server
- **Validation**: Real-time validation in input boxes
- **Progress Indication**: User feedback during long operations
- **Error Recovery**: Graceful handling with retry options

