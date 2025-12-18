---
spec_id: events-tree-spec
name: Events Tree Specification
description: Technical specification for the Events tree category that displays Kubernetes events from the kube9-operator CLI
feature_id:
  - cluster-events-tree
diagram_id:
  - events-architecture
---

# Events Tree Specification

## Overview

The Events tree category provides a visual interface for viewing and filtering Kubernetes events within the VS Code extension. Events are retrieved from the kube9-operator CLI utility (not directly from Kubernetes API) and displayed in a hierarchical tree structure with filtering, color coding, and auto-refresh capabilities.

## Architecture

See [events-architecture](../../diagrams/cluster/events-architecture.diagram.md) for visual representation of component interactions.

## Components

### EventsTreeCategory

**Purpose**: Top-level tree category node for Events

**Class**: `EventsTreeCategory extends vscode.TreeItem`

**Properties**:
```typescript
{
  contextValue: 'kube9.events.category',
  collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
  iconPath: new vscode.ThemeIcon('output'),
  description: 'Cluster Events',
  tooltip: 'Kubernetes events for troubleshooting'
}
```

**Visibility Logic**:
```typescript
// In ClusterTreeProvider.getCategories()
if (clusterElement.operatorStatus !== OperatorStatusMode.Basic) {
  categories.push(new EventsTreeCategory(clusterElement));
}
```

**Toolbar Actions**:
- Filter by namespace (command: `kube9.events.filterNamespace`)
- Filter by type (command: `kube9.events.filterType`)
- Filter by time range (command: `kube9.events.filterTimeRange`)
- Filter by resource type (command: `kube9.events.filterResourceType`)
- Search by message text (command: `kube9.events.search`)
- Clear all filters (command: `kube9.events.clearFilters`)
- Toggle auto-refresh (command: `kube9.events.toggleAutoRefresh`)
- Manual refresh (command: `kube9.events.refresh`)

### EventsProvider

**Purpose**: Retrieves and manages event data from operator CLI

**Class**: `EventsProvider`

**Methods**:

```typescript
class EventsProvider {
  private cache: Map<string, EventCache> = new Map();
  private filters: Map<string, EventFilters> = new Map();
  private autoRefreshTimers: Map<string, NodeJS.Timer> = new Map();

  /**
   * Retrieve events from operator CLI
   * @param clusterContext Cluster context name
   * @param filters Filter options
   * @returns Array of Kubernetes events
   */
  async getEvents(
    clusterContext: string, 
    filters: EventFilters
  ): Promise<KubernetesEvent[]> {
    // Build CLI command with filters
    const cmd = this.buildQueryCommand(filters);
    
    // Execute via kubectl exec
    const result = await this.executeOperatorCLI(clusterContext, cmd);
    
    // Parse JSON response
    const events = this.parseEventResponse(result);
    
    // Apply client-side filters if needed
    const filtered = this.applyFilters(events, filters);
    
    // Limit to 500 events
    const limited = filtered.slice(0, 500);
    
    // Cache results
    this.cache.set(clusterContext, {
      events: limited,
      timestamp: Date.now(),
      filters: filters
    });
    
    return limited;
  }

  /**
   * Execute operator CLI command using Kubernetes client Exec API
   */
  private async executeOperatorCLI(
    clusterContext: string,
    command: string
  ): Promise<string> {
    // Get Kubernetes client for context
    const apiClient = getKubernetesApiClient();
    apiClient.setContext(clusterContext);
    
    // Get operator pod name
    const podName = await this.getOperatorPodName(apiClient);
    
    // Use Kubernetes Exec API
    const exec = new k8s.Exec(apiClient.kubeConfig);
    const commandArgs = command.split(' '); // Parse command into args
    
    return new Promise<string>((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      
      exec.exec(
        'kube9-system',
        podName,
        'kube9-operator', // container name
        commandArgs,
        process.stdout, // for logging only
        process.stderr, // for logging only
        process.stdin,  // not used
        false, // tty
        (status) => {
          if (status.status === 'Success') {
            resolve(stdout);
          } else {
            reject(new Error(`Operator CLI error: ${stderr || status.message}`));
          }
        }
      );
      
      // Capture stdout/stderr
      exec.on('stdout', (data) => {
        stdout += data.toString();
      });
      
      exec.on('stderr', (data) => {
        stderr += data.toString();
      });
    });
  }
  
  /**
   * Get operator pod name from deployment
   */
  private async getOperatorPodName(apiClient: KubernetesApiClient): Promise<string> {
    const pods = await apiClient.getCoreApi().listNamespacedPod('kube9-system');
    const operatorPod = pods.body.items.find(pod => 
      pod.metadata?.labels?.['app'] === 'kube9-operator'
    );
    
    if (!operatorPod || !operatorPod.metadata?.name) {
      throw new Error('kube9-operator pod not found');
    }
    
    return operatorPod.metadata.name;
  }

  /**
   * Build operator CLI query command with filters
   */
  private buildQueryCommand(filters: EventFilters): string {
    const parts = ['kube9-operator', 'query', 'events'];
    
    if (filters.namespace && filters.namespace !== 'all') {
      parts.push(`--namespace=${filters.namespace}`);
    }
    
    if (filters.type && filters.type !== 'all') {
      parts.push(`--type=${filters.type}`);
    }
    
    if (filters.since && filters.since !== 'all') {
      parts.push(`--since=${filters.since}`);
    }
    
    if (filters.resourceType && filters.resourceType !== 'all') {
      parts.push(`--resource-type=${filters.resourceType}`);
    }
    
    parts.push('--limit=500');
    parts.push('--format=json');
    
    return parts.join(' ');
  }

  /**
   * Parse JSON event response from operator CLI
   */
  private parseEventResponse(json: string): KubernetesEvent[] {
    try {
      const data = JSON.parse(json);
      return data.events || [];
    } catch (error) {
      throw new Error(`Failed to parse event response: ${error.message}`);
    }
  }

  /**
   * Apply client-side filters (e.g., search text)
   */
  private applyFilters(
    events: KubernetesEvent[], 
    filters: EventFilters
  ): KubernetesEvent[] {
    let filtered = events;
    
    // Search filter
    if (filters.searchText) {
      const search = filters.searchText.toLowerCase();
      filtered = filtered.filter(event => 
        event.message.toLowerCase().includes(search) ||
        event.reason.toLowerCase().includes(search)
      );
    }
    
    return filtered;
  }

  /**
   * Start auto-refresh for cluster
   */
  startAutoRefresh(
    clusterContext: string, 
    refreshCallback: () => void
  ): void {
    if (this.autoRefreshTimers.has(clusterContext)) {
      return; // Already running
    }
    
    const timer = setInterval(() => {
      refreshCallback();
    }, 30000); // 30 seconds
    
    this.autoRefreshTimers.set(clusterContext, timer);
  }

  /**
   * Stop auto-refresh for cluster
   */
  stopAutoRefresh(clusterContext: string): void {
    const timer = this.autoRefreshTimers.get(clusterContext);
    if (timer) {
      clearInterval(timer);
      this.autoRefreshTimers.delete(clusterContext);
    }
  }
}
```

### EventTreeItem

**Purpose**: Individual event displayed in tree

**Class**: `EventTreeItem extends vscode.TreeItem`

**Properties**:
```typescript
{
  contextValue: 'kube9.event',
  collapsibleState: vscode.TreeItemCollapsibleState.None,
  label: event.reason,  // e.g., "Created", "Failed", "BackOff"
  description: `${event.involvedObject.namespace}/${event.involvedObject.kind}/${event.involvedObject.name}`,
  tooltip: this.buildTooltip(event),
  iconPath: this.getIconForEventType(event.type),
  command: {
    command: 'kube9.events.showDetails',
    title: 'Show Event Details',
    arguments: [event]
  }
}
```

**Color Coding**:
```typescript
private getIconForEventType(type: string): vscode.ThemeIcon {
  switch (type) {
    case 'Normal':
      return new vscode.ThemeIcon('pass', 
        new vscode.ThemeColor('terminal.ansiGreen'));
    case 'Warning':
      return new vscode.ThemeIcon('warning', 
        new vscode.ThemeColor('editorWarning.foreground'));
    case 'Error':
      return new vscode.ThemeIcon('error', 
        new vscode.ThemeColor('editorError.foreground'));
    default:
      return new vscode.ThemeIcon('info');
  }
}
```

**Tooltip**:
```typescript
private buildTooltip(event: KubernetesEvent): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`**${event.reason}**\n\n`);
  md.appendMarkdown(`Type: ${event.type}\n\n`);
  md.appendMarkdown(`Resource: ${event.involvedObject.kind}/${event.involvedObject.name}\n\n`);
  md.appendMarkdown(`Namespace: ${event.involvedObject.namespace}\n\n`);
  md.appendMarkdown(`Message: ${event.message}\n\n`);
  md.appendMarkdown(`Count: ${event.count}\n\n`);
  md.appendMarkdown(`Age: ${this.formatAge(event.lastTimestamp)}\n\n`);
  return md;
}
```

### EventFilters

**Purpose**: Manage filter state per cluster

**Interface**:
```typescript
interface EventFilters {
  namespace?: string;       // 'all' | namespace name
  type?: string;            // 'all' | 'Normal' | 'Warning' | 'Error'
  since?: string;           // 'all' | '1h' | '6h' | '24h'
  resourceType?: string;    // 'all' | 'Pod' | 'Deployment' | ...
  searchText?: string;      // Search query
}
```

**Default Filters**:
```typescript
const defaultFilters: EventFilters = {
  namespace: 'all',
  type: 'all',
  since: '24h',      // Default to last 24 hours
  resourceType: 'all',
  searchText: ''
};
```

### KubernetesEvent

**Purpose**: Data structure for Kubernetes events

**Interface**:
```typescript
interface KubernetesEvent {
  reason: string;                    // e.g., "Created", "Failed"
  type: 'Normal' | 'Warning' | 'Error';
  message: string;                   // Full event message
  involvedObject: {
    kind: string;                    // e.g., "Pod", "Deployment"
    namespace: string;
    name: string;
  };
  count: number;                     // How many times occurred
  firstTimestamp: string;            // ISO 8601 timestamp
  lastTimestamp: string;             // ISO 8601 timestamp
}
```

## Commands

### kube9.events.filterNamespace

**Action**: Show namespace filter QuickPick

**Implementation**:
```typescript
async function filterNamespace(eventsCategory: EventsTreeCategory) {
  const namespaces = await getNamespaces(eventsCategory.clusterContext);
  const items = ['All Namespaces', ...namespaces];
  
  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Filter events by namespace'
  });
  
  if (selected) {
    const namespace = selected === 'All Namespaces' ? 'all' : selected;
    eventsProvider.setFilter(eventsCategory.clusterContext, { namespace });
    treeView.refresh(eventsCategory);
  }
}
```

### kube9.events.filterType

**Action**: Show type filter QuickPick

**Implementation**:
```typescript
async function filterType(eventsCategory: EventsTreeCategory) {
  const types = ['All', 'Normal', 'Warning', 'Error'];
  
  const selected = await vscode.window.showQuickPick(types, {
    placeHolder: 'Filter events by type'
  });
  
  if (selected) {
    const type = selected === 'All' ? 'all' : selected;
    eventsProvider.setFilter(eventsCategory.clusterContext, { type });
    treeView.refresh(eventsCategory);
  }
}
```

### kube9.events.filterTimeRange

**Action**: Show time range filter QuickPick

**Implementation**:
```typescript
async function filterTimeRange(eventsCategory: EventsTreeCategory) {
  const ranges = [
    { label: 'Last 1 hour', value: '1h' },
    { label: 'Last 6 hours', value: '6h' },
    { label: 'Last 24 hours', value: '24h' },
    { label: 'All', value: 'all' }
  ];
  
  const selected = await vscode.window.showQuickPick(ranges, {
    placeHolder: 'Filter events by time range'
  });
  
  if (selected) {
    eventsProvider.setFilter(eventsCategory.clusterContext, { since: selected.value });
    treeView.refresh(eventsCategory);
  }
}
```

### kube9.events.filterResourceType

**Action**: Show resource type filter QuickPick

**Implementation**:
```typescript
async function filterResourceType(eventsCategory: EventsTreeCategory) {
  const types = ['All', 'Pod', 'Deployment', 'Service', 'StatefulSet', 
                 'DaemonSet', 'Job', 'CronJob', 'ReplicaSet'];
  
  const selected = await vscode.window.showQuickPick(types, {
    placeHolder: 'Filter events by resource type'
  });
  
  if (selected) {
    const resourceType = selected === 'All' ? 'all' : selected;
    eventsProvider.setFilter(eventsCategory.clusterContext, { resourceType });
    treeView.refresh(eventsCategory);
  }
}
```

### kube9.events.search

**Action**: Show input box for search text

**Implementation**:
```typescript
async function search(eventsCategory: EventsTreeCategory) {
  const searchText = await vscode.window.showInputBox({
    prompt: 'Search events by message text',
    placeHolder: 'Enter search term...'
  });
  
  if (searchText !== undefined) {
    eventsProvider.setFilter(eventsCategory.clusterContext, { searchText });
    treeView.refresh(eventsCategory);
  }
}
```

### kube9.events.clearFilters

**Action**: Reset all filters to defaults

**Implementation**:
```typescript
function clearFilters(eventsCategory: EventsTreeCategory) {
  eventsProvider.clearFilters(eventsCategory.clusterContext);
  treeView.refresh(eventsCategory);
}
```

### kube9.events.toggleAutoRefresh

**Action**: Toggle auto-refresh on/off

**Implementation**:
```typescript
function toggleAutoRefresh(eventsCategory: EventsTreeCategory) {
  const isEnabled = eventsProvider.isAutoRefreshEnabled(eventsCategory.clusterContext);
  
  if (isEnabled) {
    eventsProvider.stopAutoRefresh(eventsCategory.clusterContext);
    vscode.window.showInformationMessage('Auto-refresh disabled for Events');
  } else {
    eventsProvider.startAutoRefresh(eventsCategory.clusterContext, () => {
      treeView.refresh(eventsCategory);
    });
    vscode.window.showInformationMessage('Auto-refresh enabled for Events (30 seconds)');
  }
}
```

### kube9.events.refresh

**Action**: Manually refresh events

**Implementation**:
```typescript
function refresh(eventsCategory: EventsTreeCategory) {
  eventsProvider.clearCache(eventsCategory.clusterContext);
  treeView.refresh(eventsCategory);
}
```

### kube9.events.showDetails

**Action**: Show full event details in Output Panel

**Implementation**:
```typescript
function showDetails(event: KubernetesEvent) {
  const outputChannel = vscode.window.createOutputChannel('Kube9 Events');
  outputChannel.clear();
  outputChannel.appendLine('=== Event Details ===');
  outputChannel.appendLine('');
  outputChannel.appendLine(`Reason: ${event.reason}`);
  outputChannel.appendLine(`Type: ${event.type}`);
  outputChannel.appendLine(`Message: ${event.message}`);
  outputChannel.appendLine('');
  outputChannel.appendLine('=== Involved Object ===');
  outputChannel.appendLine(`Kind: ${event.involvedObject.kind}`);
  outputChannel.appendLine(`Namespace: ${event.involvedObject.namespace}`);
  outputChannel.appendLine(`Name: ${event.involvedObject.name}`);
  outputChannel.appendLine('');
  outputChannel.appendLine('=== Timestamps ===');
  outputChannel.appendLine(`First Occurred: ${event.firstTimestamp}`);
  outputChannel.appendLine(`Last Occurred: ${event.lastTimestamp}`);
  outputChannel.appendLine(`Count: ${event.count}`);
  outputChannel.show();
}
```

## Performance Considerations

### Caching
- Cache event results for 30 seconds per cluster
- Invalidate cache on manual refresh or filter change
- Store cache in memory (no persistence needed)

### Limiting
- Always limit display to 500 events maximum
- Sort by lastTimestamp descending (most recent first)
- Show truncation message if more events available

### Auto-Refresh
- 30 second interval (configurable in future)
- Only refresh when tree is visible
- Stop auto-refresh when category collapsed
- Use separate timer per cluster context

### Error Handling
- Gracefully handle operator CLI errors
- Show user-friendly error messages in tree
- Log detailed errors to Output Panel
- Don't crash extension on CLI failures

## Operator CLI Contract

### Execution Method
Uses Kubernetes client Exec API instead of kubectl process spawning:

```typescript
// Using @kubernetes/client-node Exec API
const exec = new k8s.Exec(kubeConfig);
exec.exec(
  'kube9-system',          // namespace
  operatorPodName,         // pod name (discovered from deployment)
  'kube9-operator',        // container name
  ['kube9-operator', 'query', 'events', '--format=json', ...filters],
  ...
);
```

### Command Arguments
```
kube9-operator query events
  [--namespace=<namespace>]
  [--type=<Normal|Warning|Error>]
  [--since=<1h|6h|24h>]
  [--resource-type=<kind>]
  --limit=500
  --format=json
```

### Expected Response
```json
{
  "events": [
    {
      "reason": "string",
      "type": "Normal|Warning|Error",
      "message": "string",
      "involvedObject": {
        "kind": "string",
        "namespace": "string",
        "name": "string"
      },
      "count": 0,
      "firstTimestamp": "ISO 8601 string",
      "lastTimestamp": "ISO 8601 string"
    }
  ]
}
```

### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Integration Points

### Tree View Integration
- Events category created in `ClusterTreeProvider.getCategories()`
- Positioned after Reports category
- Conditional based on operator status (not basic)

### Operator Status Integration
- Check operator status before showing Events
- Use cached operator status from `OperatorStatusClient`
- Fall back gracefully if operator becomes unavailable

### Output Panel Integration
- Show event details on click
- Use shared output channel: "Kube9 Events"
- Clear before showing new event details

## Testing Considerations

- Mock operator CLI responses for unit tests
- Test filtering logic with various event datasets
- Test error handling for CLI failures
- Test auto-refresh start/stop behavior
- Test cache invalidation scenarios
- Test tree refresh performance with 500 events

