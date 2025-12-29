---
spec_id: pod-logs-panel-spec
name: Pod Logs Panel Specification
description: Technical specification for Pod Logs Viewer panel management, Kubernetes API integration, and streaming
feature_id:
  - pod-logs-panel
  - pod-logs-actions
diagram_id:
  - pod-logs-architecture
  - pod-logs-workflow
---

# Pod Logs Panel Specification

## Overview

The Pod Logs Viewer panel provides a cluster-specific webview for viewing and managing Kubernetes pod logs. It follows the FreeDashboardPanel pattern with one panel per cluster context, using the Kubernetes client library for log streaming.

## Architecture

See [pod-logs-architecture](../../../diagrams/webview/pod-logs-viewer/pod-logs-architecture.diagram.md) for component architecture and [pod-logs-workflow](../../../diagrams/webview/pod-logs-viewer/pod-logs-workflow.diagram.md) for user workflows.

## Panel Management

### Cluster-Specific Pattern

```typescript
interface PanelInfo {
  panel: vscode.WebviewPanel;
  logsProvider: LogsProvider;
  currentPod: PodInfo;
  preferences: PanelPreferences;
}

interface PodInfo {
  name: string;
  namespace: string;
  container: string | 'all';
  contextName: string;
  clusterName: string;
}

interface PanelPreferences {
  followMode: boolean;
  showTimestamps: boolean;
  lineLimit: number | 'all';
  showPrevious: boolean;
}

class PodLogsViewerPanel {
  // Map keyed by cluster context name
  private static openPanels: Map<string, PanelInfo> = new Map();
  
  public static show(
    context: vscode.ExtensionContext,
    contextName: string,
    clusterName: string,
    podName: string,
    namespace: string,
    containerName?: string
  ): void {
    const panelKey = contextName;
    const existingPanelInfo = PodLogsViewerPanel.openPanels.get(panelKey);
    
    if (existingPanelInfo) {
      // Reuse existing panel for this cluster
      existingPanelInfo.panel.reveal(vscode.ViewColumn.One);
      // Update to show new pod's logs
      PodLogsViewerPanel.updatePanel(existingPanelInfo, podName, namespace, containerName);
      return;
    }
    
    // Create new panel for this cluster
    const panel = PodLogsViewerPanel.createPanel(
      context,
      contextName,
      clusterName,
      podName,
      namespace,
      containerName
    );
  }
  
  private static createPanel(
    context: vscode.ExtensionContext,
    contextName: string,
    clusterName: string,
    podName: string,
    namespace: string,
    containerName?: string
  ): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
      'kube9PodLogs',
      `Logs: ${clusterName}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist', 'media', 'pod-logs')
        ]
      }
    );
    
    const logsProvider = new LogsProvider(context, contextName);
    const panelInfo: PanelInfo = {
      panel,
      logsProvider,
      currentPod: { name: podName, namespace, container: containerName || '', contextName, clusterName },
      preferences: { followMode: true, showTimestamps: false, lineLimit: 1000, showPrevious: false }
    };
    
    PodLogsViewerPanel.openPanels.set(contextName, panelInfo);
    
    // Set up message handler
    panel.webview.onDidReceiveMessage(
      async (message) => await PodLogsViewerPanel.handleMessage(contextName, message),
      undefined,
      []
    );
    
    // Set up disposal
    panel.onDidDispose(
      () => {
        logsProvider.dispose();
        PodLogsViewerPanel.openPanels.delete(contextName);
      },
      undefined,
      context.subscriptions
    );
    
    // Start streaming logs
    PodLogsViewerPanel.startStreaming(panelInfo, containerName);
    
    return panel;
  }
}
```

### Panel Lifecycle

1. **Creation**:
   - Check if panel exists for cluster context
   - If exists: reveal and update to new pod
   - If not exists: create new panel
   - Initialize LogsProvider for cluster
   - Start streaming logs

2. **Update**:
   - Stop current stream
   - Update panel state with new pod info
   - Send message to webview to clear display
   - Start new stream for new pod

3. **Disposal**:
   - Stop streaming connection
   - Clean up LogsProvider resources
   - Remove panel from registry
   - Release memory

## Kubernetes API Integration

### Log Streaming

```typescript
import * as k8s from '@kubernetes/client-node';

class LogsProvider {
  private kc: k8s.KubeConfig;
  private logApi: k8s.Log;
  private currentStream: NodeJS.ReadableStream | null = null;
  
  constructor(context: vscode.ExtensionContext, contextName: string) {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromDefault();
    this.kc.setCurrentContext(contextName);
    this.logApi = new k8s.Log(this.kc);
  }
  
  public async streamLogs(
    namespace: string,
    podName: string,
    containerName: string,
    options: LogOptions,
    onData: (chunk: string) => void,
    onError: (error: Error) => void,
    onClose: () => void
  ): Promise<void> {
    // Stop any existing stream
    this.stopStream();
    
    try {
      const stream = await this.logApi.log(
        namespace,
        podName,
        containerName,
        // Use nodejs.ReadableStream instead of internal Response type
        new NodeJS.Readable() as any,
        {
          follow: options.follow,
          tailLines: options.tailLines,
          pretty: false,
          timestamps: options.timestamps,
          previous: options.previous
        }
      );
      
      this.currentStream = stream as NodeJS.ReadableStream;
      
      stream.on('data', (chunk: Buffer) => {
        onData(chunk.toString('utf8'));
      });
      
      stream.on('error', (error: Error) => {
        onError(error);
      });
      
      stream.on('close', () => {
        this.currentStream = null;
        onClose();
      });
      
    } catch (error) {
      onError(error as Error);
    }
  }
  
  public stopStream(): void {
    if (this.currentStream) {
      this.currentStream.destroy();
      this.currentStream = null;
    }
  }
  
  public dispose(): void {
    this.stopStream();
  }
}

interface LogOptions {
  follow: boolean;
  tailLines?: number;
  timestamps: boolean;
  previous: boolean;
}
```

### API Endpoint

- **URL**: `/api/v1/namespaces/{namespace}/pods/{pod}/log`
- **Method**: GET
- **Query Parameters**:
  - `container`: Container name (required for multi-container pods)
  - `follow`: Stream logs in real-time (boolean)
  - `tailLines`: Number of lines from end (integer)
  - `timestamps`: Include timestamps (boolean)
  - `previous`: Get logs from previous container instance (boolean)
  - `pretty`: Pretty-print JSON logs (boolean)

### Container Discovery

```typescript
async function getPodContainers(
  kc: k8s.KubeConfig,
  namespace: string,
  podName: string
): Promise<string[]> {
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);
  const pod = await coreApi.readNamespacedPod(podName, namespace);
  
  const containers: string[] = [];
  
  // Regular containers
  if (pod.body.spec?.containers) {
    containers.push(...pod.body.spec.containers.map(c => c.name));
  }
  
  // Init containers
  if (pod.body.spec?.initContainers) {
    containers.push(...pod.body.spec.initContainers.map(c => c.name));
  }
  
  return containers;
}
```

### Multi-Container Handling

When pod has multiple containers:

1. **Initial Open**:
   - Fetch container list from pod spec
   - Show QuickPick with options: [container1, container2, ..., "All Containers"]
   - User selects container
   - Stream logs for selected container

2. **All Containers Mode**:
   - Open separate streams for each container
   - Prefix each log line with `[container-name]`
   - Interleave logs chronologically using timestamps
   - Use different colors for each container (optional)

## Message Protocol

### Extension → Webview

```typescript
type ExtensionToWebviewMessage =
  | { type: 'initialState'; data: InitialState }
  | { type: 'logData'; data: string[] }
  | { type: 'streamStatus'; status: 'connected' | 'disconnected' | 'error'; message?: string }
  | { type: 'error'; error: string }
  | { type: 'podUpdated'; pod: PodInfo }
  | { type: 'containersAvailable'; containers: string[] };

interface InitialState {
  pod: PodInfo;
  preferences: PanelPreferences;
  containers: string[];
}
```

### Webview → Extension

```typescript
type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'refresh'; options: LogOptions }
  | { type: 'toggleFollow'; enabled: boolean }
  | { type: 'toggleTimestamps'; enabled: boolean }
  | { type: 'setLineLimit'; limit: number | 'all' }
  | { type: 'switchContainer'; container: string }
  | { type: 'setPrevious'; enabled: boolean }
  | { type: 'export'; filepath: string }
  | { type: 'copy' }
  | { type: 'clear' };
```

## Performance Optimizations

### Virtual Scrolling

- Render only visible log lines (e.g., 50-100 lines at a time)
- Use react-window or react-virtualized library
- Calculate visible window based on scroll position
- Maintain full log data in memory (with limits)

### Buffer Management

```typescript
class LogBuffer {
  private lines: string[] = [];
  private maxLines: number = 10000;
  
  public addLine(line: string): void {
    this.lines.push(line);
    
    // Trim buffer if exceeds max
    if (this.lines.length > this.maxLines) {
      const excess = this.lines.length - this.maxLines;
      this.lines.splice(0, excess);
    }
  }
  
  public getLines(): string[] {
    return this.lines;
  }
  
  public clear(): void {
    this.lines = [];
  }
}
```

### Chunked Updates

- Batch log lines before sending to webview
- Send updates every 100ms instead of line-by-line
- Reduce message passing overhead

```typescript
class LogStreamHandler {
  private pendingLines: string[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  
  public start(panel: vscode.WebviewPanel): void {
    this.updateInterval = setInterval(() => {
      if (this.pendingLines.length > 0) {
        panel.webview.postMessage({
          type: 'logData',
          data: this.pendingLines
        });
        this.pendingLines = [];
      }
    }, 100);
  }
  
  public addLine(line: string): void {
    this.pendingLines.push(line);
  }
  
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}
```

## Error Handling

### Connection Errors

- Display error message in panel
- Provide retry button
- Attempt auto-reconnect with exponential backoff
- Maximum 5 retry attempts

### Pod Not Found

- Display clear error: "Pod '{pod-name}' not found in namespace '{namespace}'"
- Disable streaming controls
- Keep panel open with error state

### Permission Errors

- Display: "Access denied. Check your cluster permissions."
- Show required RBAC permissions
- Provide link to documentation

### Stream Interruption

- Detect stream close events
- Attempt automatic reconnection
- Show status: "Reconnecting..." in footer
- Notify user if reconnection fails

## State Persistence

### Per-Cluster Preferences

```typescript
interface ClusterPreferences {
  [contextName: string]: PanelPreferences;
}

class PreferencesManager {
  private context: vscode.ExtensionContext;
  
  public getPreferences(contextName: string): PanelPreferences {
    const allPrefs = this.context.globalState.get<ClusterPreferences>('podLogsPreferences', {});
    return allPrefs[contextName] || this.getDefaults();
  }
  
  public savePreferences(contextName: string, prefs: PanelPreferences): void {
    const allPrefs = this.context.globalState.get<ClusterPreferences>('podLogsPreferences', {});
    allPrefs[contextName] = prefs;
    this.context.globalState.update('podLogsPreferences', allPrefs);
  }
  
  private getDefaults(): PanelPreferences {
    return {
      followMode: true,
      showTimestamps: false,
      lineLimit: 1000,
      showPrevious: false
    };
  }
}
```

## Technical Requirements

- **Node.js**: >=22.14.0
- **@kubernetes/client-node**: ^0.21.0
- **React**: ^18.x
- **react-window**: ^1.8.x (for virtual scrolling)
- **VS Code API**: ^1.85.0

## Security Considerations

- Use Content Security Policy for webview
- Sanitize log content before display (escape HTML)
- Validate all user inputs (line limits, filenames)
- Secure message passing between webview and extension
- Handle sensitive data in logs appropriately

