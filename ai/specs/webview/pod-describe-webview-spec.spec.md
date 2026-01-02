---
spec_id: pod-describe-webview-spec
name: Pod Describe Webview Specification
description: Technical specification for implementing graphical Pod describe functionality
feature_id:
  - pod-describe-webview
diagram_id:
  - pod-describe-architecture
---

# Pod Describe Webview Specification

## Overview

The Pod Describe Webview provides a graphical, user-friendly interface for viewing detailed Pod information. It replaces the current "Coming soon" stub in the DescribeWebview with a comprehensive Pod details display that includes status, containers, conditions, events, and more.

## Architecture

See [pod-describe-architecture](../../diagrams/webview/pod-describe-architecture.diagram.md) for visual architecture.

## Implementation Details

### PodTreeItem Enhancement

**File**: `src/tree/items/PodTreeItem.ts`

Add click command to Pod tree items:

```typescript
interface PodTreeItemConfig {
  name: string;
  namespace: string;
  status: V1PodStatus;
  metadata: V1ObjectMeta;
  context: string;
}

class PodTreeItem extends vscode.TreeItem {
  constructor(config: PodTreeItemConfig) {
    super(config.name, vscode.TreeItemCollapsibleState.None);
    
    // Add click command
    this.command = {
      command: 'kube9.describePod',
      title: 'Describe Pod',
      arguments: [config]
    };
    
    // Existing tooltip, icon, etc.
  }
}
```

### PodDescribeProvider

**File**: `src/providers/PodDescribeProvider.ts` (new)

Data provider that fetches and formats Pod information:

```typescript
interface PodDescribeData {
  overview: PodOverview;
  containers: ContainerInfo[];
  initContainers: ContainerInfo[];
  conditions: PodCondition[];
  events: PodEvent[];
  volumes: VolumeInfo[];
  metadata: PodMetadata;
}

interface PodOverview {
  name: string;
  namespace: string;
  status: PodStatus;
  phase: string;
  podIP: string;
  hostIP: string;
  nodeName: string;
  qosClass: string;
  restartPolicy: string;
  serviceAccount: string;
  startTime: string;
  age: string;
}

interface PodStatus {
  phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown';
  reason?: string;
  message?: string;
  health: 'Healthy' | 'Degraded' | 'Unhealthy' | 'Unknown';
}

interface ContainerInfo {
  name: string;
  image: string;
  imageID: string;
  status: ContainerStatus;
  ready: boolean;
  restartCount: number;
  resources: ContainerResources;
  ports: ContainerPort[];
  environment: EnvironmentVariable[];
  volumeMounts: VolumeMount[];
}

interface ContainerStatus {
  state: 'waiting' | 'running' | 'terminated';
  stateDetails: {
    reason?: string;
    message?: string;
    startedAt?: string;
    finishedAt?: string;
    exitCode?: number;
    signal?: number;
  };
  lastState?: {
    state: 'waiting' | 'running' | 'terminated';
    reason?: string;
    exitCode?: number;
    finishedAt?: string;
  };
}

interface ContainerResources {
  requests: {
    cpu?: string;
    memory?: string;
  };
  limits: {
    cpu?: string;
    memory?: string;
  };
}

interface ContainerPort {
  name?: string;
  containerPort: number;
  protocol: string;
  hostPort?: number;
}

interface EnvironmentVariable {
  name: string;
  value?: string;
  valueFrom?: {
    type: 'configMap' | 'secret' | 'fieldRef' | 'resourceFieldRef';
    reference: string;
  };
}

interface VolumeMount {
  name: string;
  mountPath: string;
  readOnly: boolean;
  subPath?: string;
}

interface PodCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  lastTransitionTime: string;
  reason?: string;
  message?: string;
}

interface PodEvent {
  type: 'Normal' | 'Warning';
  reason: string;
  message: string;
  count: number;
  firstTimestamp: string;
  lastTimestamp: string;
  source: string;
  age: string;
}

interface VolumeInfo {
  name: string;
  type: string;
  source: string;
  mountedBy: string[];
}

interface PodMetadata {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  ownerReferences: OwnerReference[];
  uid: string;
  resourceVersion: string;
  creationTimestamp: string;
}

interface OwnerReference {
  kind: string;
  name: string;
  uid: string;
  controller: boolean;
}

class PodDescribeProvider {
  constructor(private k8sClient: KubernetesClient) {}

  async getPodDetails(
    name: string,
    namespace: string,
    context: string
  ): Promise<PodDescribeData> {
    // Fetch Pod object
    const pod = await this.k8sClient.readNamespacedPod(name, namespace);
    
    // Fetch related events
    const events = await this.k8sClient.listNamespacedEvent(
      namespace,
      `involvedObject.name=${name},involvedObject.uid=${pod.metadata?.uid}`
    );
    
    // Format data
    return {
      overview: this.formatOverview(pod),
      containers: this.formatContainers(pod.spec?.containers || [], pod.status?.containerStatuses || []),
      initContainers: this.formatContainers(pod.spec?.initContainers || [], pod.status?.initContainerStatuses || []),
      conditions: this.formatConditions(pod.status?.conditions || []),
      events: this.formatEvents(events.items),
      volumes: this.formatVolumes(pod),
      metadata: this.formatMetadata(pod.metadata!)
    };
  }

  private formatOverview(pod: V1Pod): PodOverview {
    const status = pod.status!;
    const spec = pod.spec!;
    const metadata = pod.metadata!;
    
    return {
      name: metadata.name!,
      namespace: metadata.namespace!,
      status: this.calculatePodStatus(pod),
      phase: status.phase || 'Unknown',
      podIP: status.podIP || 'N/A',
      hostIP: status.hostIP || 'N/A',
      nodeName: spec.nodeName || 'Unscheduled',
      qosClass: status.qosClass || 'BestEffort',
      restartPolicy: spec.restartPolicy || 'Always',
      serviceAccount: spec.serviceAccountName || 'default',
      startTime: status.startTime || 'N/A',
      age: this.calculateAge(metadata.creationTimestamp)
    };
  }

  private calculatePodStatus(pod: V1Pod): PodStatus {
    const phase = pod.status?.phase;
    const conditions = pod.status?.conditions || [];
    const containerStatuses = pod.status?.containerStatuses || [];
    
    // Determine health based on phase and conditions
    let health: PodStatus['health'] = 'Unknown';
    
    if (phase === 'Running') {
      const allReady = conditions.every(c => c.type !== 'Ready' || c.status === 'True');
      const noRestarts = containerStatuses.every(c => c.restartCount === 0);
      
      if (allReady && noRestarts) {
        health = 'Healthy';
      } else if (allReady) {
        health = 'Degraded';
      } else {
        health = 'Unhealthy';
      }
    } else if (phase === 'Succeeded') {
      health = 'Healthy';
    } else if (phase === 'Failed') {
      health = 'Unhealthy';
    } else if (phase === 'Pending') {
      health = 'Degraded';
    }
    
    return {
      phase: phase || 'Unknown',
      reason: pod.status?.reason,
      message: pod.status?.message,
      health
    };
  }

  private formatContainers(
    specs: V1Container[],
    statuses: V1ContainerStatus[]
  ): ContainerInfo[] {
    return specs.map(spec => {
      const status = statuses.find(s => s.name === spec.name);
      
      return {
        name: spec.name,
        image: spec.image || 'N/A',
        imageID: status?.imageID || 'N/A',
        status: this.formatContainerStatus(status),
        ready: status?.ready || false,
        restartCount: status?.restartCount || 0,
        resources: this.formatResources(spec.resources),
        ports: this.formatPorts(spec.ports || []),
        environment: this.formatEnvironment(spec.env || []),
        volumeMounts: this.formatVolumeMounts(spec.volumeMounts || [])
      };
    });
  }

  private formatContainerStatus(status?: V1ContainerStatus): ContainerStatus {
    if (!status) {
      return {
        state: 'waiting',
        stateDetails: { reason: 'Pending', message: 'Container not started' }
      };
    }
    
    let state: ContainerStatus['state'] = 'waiting';
    let stateDetails: ContainerStatus['stateDetails'] = {};
    
    if (status.state?.running) {
      state = 'running';
      stateDetails = {
        startedAt: status.state.running.startedAt
      };
    } else if (status.state?.waiting) {
      state = 'waiting';
      stateDetails = {
        reason: status.state.waiting.reason,
        message: status.state.waiting.message
      };
    } else if (status.state?.terminated) {
      state = 'terminated';
      stateDetails = {
        reason: status.state.terminated.reason,
        message: status.state.terminated.message,
        startedAt: status.state.terminated.startedAt,
        finishedAt: status.state.terminated.finishedAt,
        exitCode: status.state.terminated.exitCode,
        signal: status.state.terminated.signal
      };
    }
    
    return { state, stateDetails };
  }

  private formatResources(resources?: V1ResourceRequirements): ContainerResources {
    return {
      requests: {
        cpu: resources?.requests?.cpu || 'Not set',
        memory: resources?.requests?.memory || 'Not set'
      },
      limits: {
        cpu: resources?.limits?.cpu || 'Not set',
        memory: resources?.limits?.memory || 'Not set'
      }
    };
  }

  private formatConditions(conditions: V1PodCondition[]): PodCondition[] {
    return conditions.map(c => ({
      type: c.type,
      status: c.status as 'True' | 'False' | 'Unknown',
      lastTransitionTime: c.lastTransitionTime || 'Unknown',
      reason: c.reason,
      message: c.message
    }));
  }

  private formatEvents(events: V1Event[]): PodEvent[] {
    // Group events by type and reason
    const grouped = new Map<string, V1Event[]>();
    
    events.forEach(event => {
      const key = `${event.type}-${event.reason}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(event);
    });
    
    // Format grouped events
    return Array.from(grouped.values()).map(group => {
      const first = group[0];
      const sorted = group.sort((a, b) => 
        new Date(b.lastTimestamp || '').getTime() - 
        new Date(a.lastTimestamp || '').getTime()
      );
      
      return {
        type: (first.type || 'Normal') as 'Normal' | 'Warning',
        reason: first.reason || 'Unknown',
        message: first.message || 'No message',
        count: first.count || group.length,
        firstTimestamp: first.firstTimestamp || 'Unknown',
        lastTimestamp: sorted[0].lastTimestamp || 'Unknown',
        source: first.source?.component || 'Unknown',
        age: this.calculateAge(sorted[0].lastTimestamp)
      };
    });
  }

  private calculateAge(timestamp?: string): string {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }
}
```

### DescribeWebview Enhancement

**File**: `src/webview/DescribeWebview.ts`

Update to handle Pod resources:

```typescript
class DescribeWebview {
  private podProvider: PodDescribeProvider;
  
  async showPodDescribe(pod: PodTreeItemConfig): Promise<void> {
    // Show or create webview
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        'kube9.describe',
        `Pod / ${pod.name}`,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );
      
      this.panel.webview.html = this.getWebviewContent();
      this.setupMessageHandling();
    } else {
      this.panel.title = `Pod / ${pod.name}`;
      this.panel.reveal();
    }
    
    // Fetch and send Pod data
    try {
      const podData = await this.podProvider.getPodDetails(
        pod.name,
        pod.namespace,
        pod.context
      );
      
      this.panel.webview.postMessage({
        command: 'updatePodData',
        data: podData
      });
    } catch (error) {
      this.panel.webview.postMessage({
        command: 'showError',
        data: {
          message: `Failed to load Pod details: ${error.message}`
        }
      });
    }
  }
}
```

### Webview UI Implementation

**File**: `media/describe/PodDescribeApp.tsx` (new)

React-based webview interface:

```typescript
interface PodDescribeAppProps {
  vscode: VSCodeAPI;
}

const PodDescribeApp: React.FC<PodDescribeAppProps> = ({ vscode }) => {
  const [podData, setPodData] = useState<PodDescribeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'containers' | 'conditions' | 'events'>('overview');

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      
      switch (message.command) {
        case 'updatePodData':
          setPodData(message.data);
          setError(null);
          break;
        case 'showError':
          setError(message.data.message);
          break;
      }
    };
    
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  if (!podData) {
    return <LoadingSpinner />;
  }

  return (
    <div className="pod-describe-container">
      <header className="pod-header">
        <h1>{podData.overview.name}</h1>
        <StatusBadge status={podData.overview.status} />
        <div className="header-actions">
          <button onClick={() => vscode.postMessage({ command: 'refresh' })}>
            Refresh
          </button>
          <button onClick={() => vscode.postMessage({ command: 'viewYaml' })}>
            View YAML
          </button>
        </div>
      </header>

      <nav className="tab-navigation">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'containers' ? 'active' : ''}
          onClick={() => setActiveTab('containers')}
        >
          Containers ({podData.containers.length})
        </button>
        <button
          className={activeTab === 'conditions' ? 'active' : ''}
          onClick={() => setActiveTab('conditions')}
        >
          Conditions
        </button>
        <button
          className={activeTab === 'events' ? 'active' : ''}
          onClick={() => setActiveTab('events')}
        >
          Events ({podData.events.length})
        </button>
      </nav>

      <main className="tab-content">
        {activeTab === 'overview' && <OverviewTab data={podData.overview} />}
        {activeTab === 'containers' && <ContainersTab containers={podData.containers} initContainers={podData.initContainers} />}
        {activeTab === 'conditions' && <ConditionsTab conditions={podData.conditions} />}
        {activeTab === 'events' && <EventsTab events={podData.events} />}
      </main>
    </div>
  );
};
```

### UI Components

**Overview Tab**:
- Status and phase with color indicators
- Node placement and IP addresses
- QoS class and restart policy
- Age and start time
- Service account

**Containers Tab**:
- Separate sections for init containers and regular containers
- Container status (Running, Waiting, Terminated) with visual indicators
- Image and image ID
- Restart count with warning if high
- Resource requests and limits (CPU, memory)
- Ports exposed
- Environment variables (grouped, expandable)
- Volume mounts

**Conditions Tab**:
- Table of Pod conditions
- Status (True/False/Unknown) with color coding
- Last transition time
- Reason and message
- Sortable by transition time

**Events Tab**:
- Timeline view of events
- Type (Normal/Warning) with icons
- Reason and message
- Event count (grouped events)
- First and last occurrence times
- Source component
- Age calculation

### CSS Styling

**File**: `media/describe/podDescribe.css` (new)

```css
.pod-describe-container {
  padding: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.pod-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background-color: var(--vscode-editor-background);
  border-bottom: 2px solid var(--vscode-panel-border);
}

.pod-header h1 {
  margin: 0;
  font-size: 1.5em;
  font-weight: 600;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 600;
  margin-left: 12px;
}

.status-badge.healthy {
  background-color: var(--vscode-testing-iconPassed);
  color: var(--vscode-editor-background);
}

.status-badge.degraded {
  background-color: var(--vscode-editorWarning-foreground);
  color: var(--vscode-editor-background);
}

.status-badge.unhealthy {
  background-color: var(--vscode-testing-iconFailed);
  color: var(--vscode-editor-background);
}

.tab-navigation {
  display: flex;
  gap: 4px;
  padding: 0 20px;
  background-color: var(--vscode-editor-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.tab-navigation button {
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--vscode-foreground);
  cursor: pointer;
  font-size: 0.95em;
  transition: all 0.2s;
}

.tab-navigation button:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.tab-navigation button.active {
  border-bottom-color: var(--vscode-focusBorder);
  font-weight: 600;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
  font-size: 0.85em;
  color: var(--vscode-descriptionForeground);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-item value {
  font-size: 1em;
  color: var(--vscode-foreground);
  font-weight: 500;
}

.container-card {
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.container-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.container-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.85em;
}

.container-status.running {
  background-color: rgba(73, 194, 109, 0.2);
  color: var(--vscode-testing-iconPassed);
}

.container-status.waiting {
  background-color: rgba(255, 191, 0, 0.2);
  color: var(--vscode-editorWarning-foreground);
}

.container-status.terminated {
  background-color: rgba(242, 76, 76, 0.2);
  color: var(--vscode-testing-iconFailed);
}

.events-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: var(--vscode-editor-background);
  border-left: 3px solid var(--vscode-panel-border);
  border-radius: 4px;
}

.event-item.warning {
  border-left-color: var(--vscode-editorWarning-foreground);
}

.event-item.normal {
  border-left-color: var(--vscode-testing-iconPassed);
}
```

## Message Protocol

### Extension to Webview

```typescript
interface ExtensionToWebviewMessage {
  command: 'updatePodData' | 'showError';
  data: PodDescribeData | { message: string };
}
```

### Webview to Extension

```typescript
interface WebviewToExtensionMessage {
  command: 'refresh' | 'viewYaml' | 'openTerminal' | 'startPortForward';
  data?: any;
}
```

## Command Registration

**Command**: `kube9.describePod`

**Handler**:
```typescript
vscode.commands.registerCommand('kube9.describePod', async (pod: PodTreeItemConfig) => {
  const webview = DescribeWebview.getInstance(pod.context);
  await webview.showPodDescribe(pod);
});
```

## Error Handling

### Pod Not Found
- Display error message in webview
- Offer "Refresh Tree" action button

### Permission Denied
- Show RBAC error message
- Link to documentation on Kubernetes permissions

### Network Error
- Display connection error
- Offer "Retry" button

### Invalid Data
- Show graceful fallback for missing fields
- Use "N/A" or "Unknown" for unavailable data

## Performance Considerations

### Data Caching
- Cache Pod data for 30 seconds
- Cache event data for 15 seconds
- Invalidate cache on explicit refresh

### Lazy Loading
- Load container details on demand
- Defer event loading until Events tab is viewed
- Virtual scrolling for large event lists

### Efficient Queries
- Use field selectors to limit event queries
- Request only necessary Pod fields
- Batch multiple API calls when possible

## Testing Requirements

### Unit Tests
- PodDescribeProvider data formatting
- Status calculation logic
- Age calculation accuracy
- Container status parsing

### Integration Tests
- Pod data fetching from API
- Event filtering and grouping
- Webview message protocol
- Command registration and handling

### E2E Tests
- Click Pod in tree opens webview
- Webview displays correct Pod information
- Tab navigation works correctly
- Refresh button updates data
- View YAML button opens editor
- Error states display properly
- Multiple Pods in same cluster reuse webview
- Different clusters have separate webviews

## Accessibility

### Keyboard Navigation
- Tab through all interactive elements
- Arrow keys for tab navigation
- Enter to activate buttons
- Escape to close webview

### Screen Readers
- Proper ARIA labels on all elements
- Status announcements for data updates
- Descriptive labels for status indicators

### Color Contrast
- High contrast mode support
- Status indicators include text and icons
- No information conveyed by color alone

