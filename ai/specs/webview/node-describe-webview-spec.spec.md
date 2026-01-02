---
spec_id: node-describe-webview-spec
name: Node Describe Webview Specification
description: Technical specification for implementing comprehensive node describe webview with detailed node information, resource metrics, conditions, and running pods
feature_id:
  - node-describe-webview
diagram_id:
  - node-describe-flow
---

# Node Describe Webview Specification

## Overview

The Node Describe Webview provides a comprehensive view of Kubernetes node information including status, capacity, conditions, resource allocation, running pods, labels, taints, and addresses. This webview uses the shared describe webview panel that updates its content based on the selected node.

## Architecture

See [node-describe-flow](../../diagrams/webview/node-describe-flow.diagram.md) for the complete data flow architecture.

## Data Structures

### NodeDescribeData

Complete node information structure for webview display:

```typescript
interface NodeDescribeData {
  name: string;
  overview: NodeOverview;
  resources: NodeResources;
  conditions: NodeCondition[];
  pods: NodePodInfo[];
  addresses: NodeAddress[];
  labels: Record<string, string>;
  taints: NodeTaint[];
  allocation: ResourceAllocation;
}
```

### NodeOverview

Basic node metadata and system information:

```typescript
interface NodeOverview {
  name: string;
  status: 'Ready' | 'NotReady' | 'Unknown';
  roles: string[];                    // e.g., ["control-plane", "master"]
  creationTimestamp: string;          // ISO 8601 timestamp
  kubernetesVersion: string;          // e.g., "v1.28.0"
  containerRuntime: string;           // e.g., "containerd://1.6.0"
  osImage: string;                    // e.g., "Ubuntu 22.04.3 LTS"
  kernelVersion: string;              // e.g., "5.15.0-87-generic"
  architecture: string;               // e.g., "amd64", "arm64"
}
```

### NodeResources

Node capacity and allocatable resources:

```typescript
interface NodeResources {
  cpu: ResourceMetric;
  memory: ResourceMetric;
  pods: ResourceMetric;
  ephemeralStorage: ResourceMetric;
}

interface ResourceMetric {
  capacity: string;          // Total capacity (e.g., "4", "16Gi", "110")
  capacityRaw: number;       // Numeric value in base units
  allocatable: string;       // Schedulable amount (e.g., "3.5", "14Gi", "100")
  allocatableRaw: number;    // Numeric value in base units
  used: string;              // Currently used (e.g., "2", "8Gi", "45")
  usedRaw: number;           // Numeric value in base units
  available: string;         // Remaining available (e.g., "1.5", "6Gi", "55")
  availableRaw: number;      // Numeric value in base units
  unit: 'cores' | 'bytes' | 'count'; // Unit type
  usagePercentage: number;   // Percentage of allocatable used (0-100)
}
```

### NodeCondition

Node health conditions from Kubernetes status:

```typescript
interface NodeCondition {
  type: 'Ready' | 'MemoryPressure' | 'DiskPressure' | 'PIDPressure' | 'NetworkUnavailable';
  status: 'True' | 'False' | 'Unknown';
  reason: string;              // e.g., "KubeletReady", "KubeletHasSufficientMemory"
  message: string;             // Human-readable message
  lastTransitionTime: string;  // ISO 8601 timestamp
  relativeTime: string;        // e.g., "2h ago", "5m ago"
}
```

### NodePodInfo

Information about pods running on the node:

```typescript
interface NodePodInfo {
  name: string;
  namespace: string;
  status: string;              // e.g., "Running", "Pending", "Failed"
  cpuRequest: string;          // e.g., "100m"
  cpuRequestRaw: number;       // Millicores
  memoryRequest: string;       // e.g., "128Mi"
  memoryRequestRaw: number;    // Bytes
  cpuLimit: string;            // e.g., "200m"
  cpuLimitRaw: number;         // Millicores
  memoryLimit: string;         // e.g., "256Mi"
  memoryLimitRaw: number;      // Bytes
  restartCount: number;
  age: string;                 // e.g., "2d", "5h", "30m"
}
```

### NodeAddress

Node network addresses:

```typescript
interface NodeAddress {
  type: 'Hostname' | 'InternalIP' | 'ExternalIP' | 'InternalDNS' | 'ExternalDNS';
  address: string;
}
```

### NodeTaint

Node taints that affect pod scheduling:

```typescript
interface NodeTaint {
  key: string;                 // e.g., "node-role.kubernetes.io/control-plane"
  value: string;               // May be empty
  effect: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
}
```

### ResourceAllocation

Aggregate resource allocation breakdown:

```typescript
interface ResourceAllocation {
  cpu: AllocationMetric;
  memory: AllocationMetric;
}

interface AllocationMetric {
  requests: string;            // e.g., "2 cores", "4 GiB"
  requestsRaw: number;         // Numeric value in base units
  limits: string;              // e.g., "4 cores", "8 GiB"
  limitsRaw: number;           // Numeric value in base units
  allocatable: string;         // Same as NodeResources.allocatable
  allocatableRaw: number;
  requestsPercentage: number;  // % of allocatable (0-100)
  limitsPercentage: number;    // % of allocatable (0-100)
}
```

## kubectl Integration

### Get Node Details

Command to fetch comprehensive node information:

```bash
kubectl get node <node-name> -o json
```

Response structure (V1Node from @kubernetes/client-node):

```typescript
import * as k8s from '@kubernetes/client-node';

// Use k8s.V1Node as the source
interface V1Node {
  metadata: k8s.V1ObjectMeta;
  spec: k8s.V1NodeSpec;
  status: k8s.V1NodeStatus;
}
```

### Get Pods on Node

Command to fetch all pods running on a specific node:

```bash
kubectl get pods --all-namespaces --field-selector spec.nodeName=<node-name> -o json
```

Response structure (V1PodList):

```typescript
interface V1PodList {
  items: k8s.V1Pod[];
}
```

### Resource Calculation

Extract resource information from V1Node:

```typescript
function extractNodeResources(node: k8s.V1Node): NodeResources {
  const capacity = node.status?.capacity || {};
  const allocatable = node.status?.allocatable || {};
  
  return {
    cpu: calculateResourceMetric(
      capacity.cpu || '0',
      allocatable.cpu || '0',
      usedCpu,  // Calculated from pod requests
      'cores'
    ),
    memory: calculateResourceMetric(
      capacity.memory || '0',
      allocatable.memory || '0',
      usedMemory,  // Calculated from pod requests
      'bytes'
    ),
    pods: calculateResourceMetric(
      capacity.pods || '0',
      allocatable.pods || '0',
      String(podCount),
      'count'
    ),
    ephemeralStorage: calculateResourceMetric(
      capacity['ephemeral-storage'] || '0',
      allocatable['ephemeral-storage'] || '0',
      '0',  // Currently not calculated
      'bytes'
    )
  };
}

function calculateResourceMetric(
  capacity: string,
  allocatable: string,
  used: string,
  unit: 'cores' | 'bytes' | 'count'
): ResourceMetric {
  const capacityRaw = parseKubernetesQuantity(capacity, unit);
  const allocatableRaw = parseKubernetesQuantity(allocatable, unit);
  const usedRaw = parseKubernetesQuantity(used, unit);
  const availableRaw = allocatableRaw - usedRaw;
  const usagePercentage = (usedRaw / allocatableRaw) * 100;
  
  return {
    capacity: formatQuantity(capacityRaw, unit),
    capacityRaw,
    allocatable: formatQuantity(allocatableRaw, unit),
    allocatableRaw,
    used: formatQuantity(usedRaw, unit),
    usedRaw,
    available: formatQuantity(availableRaw, unit),
    availableRaw,
    unit,
    usagePercentage: Math.round(usagePercentage)
  };
}
```

## Message Protocol

Extension to Webview:

```typescript
interface NodeDescribeMessage {
  command: 'updateNodeData' | 'refreshComplete' | 'error';
  data: NodeDescribeData | ErrorData;
}

interface ErrorData {
  message: string;
  details?: string;
}
```

Webview to Extension:

```typescript
interface WebviewMessage {
  command: 'refresh' | 'navigateToPod' | 'copyValue';
  data: RefreshData | NavigateToPodData | CopyValueData;
}

interface RefreshData {
  nodeName: string;
}

interface NavigateToPodData {
  podName: string;
  namespace: string;
}

interface CopyValueData {
  value: string;
  type: 'address' | 'label' | 'taint';
}
```

## WebView HTML Structure

### Layout

```html
<div class="node-describe-container">
  <!-- Header -->
  <div class="node-header">
    <h1 class="node-title">Node / <span class="node-name">control-plane</span></h1>
    <div class="header-actions">
      <button id="refresh-btn" class="action-btn">
        <span class="btn-icon">🔄</span>
        <span class="btn-text">Refresh</span>
      </button>
    </div>
  </div>

  <!-- Status Banner -->
  <div class="status-banner status-ready">
    <span class="status-icon">✓</span>
    <span class="status-text">Ready</span>
  </div>

  <!-- Overview Section -->
  <div class="section">
    <h2>Overview</h2>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Kubernetes Version</span>
        <span class="info-value">v1.28.0</span>
      </div>
      <!-- More info items -->
    </div>
  </div>

  <!-- Resources Section -->
  <div class="section">
    <h2>Resources</h2>
    <div class="resources-table">
      <table>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Capacity</th>
            <th>Allocatable</th>
            <th>Used</th>
            <th>Available</th>
            <th>Usage</th>
          </tr>
        </thead>
        <tbody>
          <!-- Resource rows with progress bars -->
        </tbody>
      </table>
    </div>
  </div>

  <!-- Conditions Section -->
  <div class="section">
    <h2>Conditions</h2>
    <div class="conditions-table">
      <!-- Conditions with status indicators -->
    </div>
  </div>

  <!-- Pods Section -->
  <div class="section">
    <h2>Pods</h2>
    <div class="pods-table">
      <!-- Sortable table of pods -->
    </div>
  </div>

  <!-- Addresses Section -->
  <div class="section">
    <h2>Addresses</h2>
    <div class="addresses-list">
      <!-- Copyable addresses -->
    </div>
  </div>

  <!-- Labels Section -->
  <div class="section">
    <h2>Labels</h2>
    <div class="labels-list">
      <!-- Key-value labels -->
    </div>
  </div>

  <!-- Taints Section -->
  <div class="section">
    <h2>Taints</h2>
    <div class="taints-list">
      <!-- Taints with effects -->
    </div>
  </div>

  <!-- Resource Allocation Section -->
  <div class="section">
    <h2>Resource Allocation</h2>
    <div class="allocation-chart">
      <!-- Progress bars for requests vs limits -->
    </div>
  </div>
</div>
```

### CSS Theme Integration

Use VS Code CSS variables for consistent theming:

```css
.node-describe-container {
  padding: 20px;
  background-color: var(--vscode-editor-background);
  color: var(--vscode-foreground);
  font-family: var(--vscode-font-family);
}

.status-banner.status-ready {
  background-color: var(--vscode-testing-iconPassed);
}

.status-banner.status-not-ready {
  background-color: var(--vscode-testing-iconFailed);
}

.progress-bar {
  background-color: var(--vscode-progressBar-background);
}

.progress-bar-fill {
  background-color: var(--vscode-button-background);
}
```

## Implementation Details

### Extension Host (src/webview/)

#### NodeDescribeWebview.ts

Main webview controller that integrates with the shared DescribeWebview panel:

```typescript
export class NodeDescribeWebview {
  private static currentPanel: vscode.WebviewPanel | undefined;
  private static currentNodeName: string | undefined;
  
  /**
   * Opens or reveals the shared describe webview for a node.
   * Integrates with DescribeWebview to ensure all resource describes use one shared panel.
   */
  public static async show(
    context: vscode.ExtensionContext,
    nodeName: string,
    kubeconfigPath: string,
    contextName: string
  ): Promise<void> {
    // Check for existing shared panel from DescribeWebview
    const sharedPanel = DescribeWebview.getSharedPanel();
    
    if (sharedPanel) {
      // Reuse the shared panel (from Pod, PVC, or previous Node)
      NodeDescribeWebview.currentPanel = sharedPanel;
      NodeDescribeWebview.currentPanel.title = `Node / ${nodeName}`;
      NodeDescribeWebview.currentPanel.webview.html = NodeDescribeWebview.getWebviewContent(
        NodeDescribeWebview.currentPanel.webview
      );
      await NodeDescribeWebview.refreshNodeData();
      NodeDescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
      return;
    }
    
    // Create new panel with shared panel ID
    const panel = vscode.window.createWebviewPanel(
      'kube9Describe',  // Shared panel ID used by all describe views
      `Node / ${nodeName}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    
    NodeDescribeWebview.currentPanel = panel;
    // Register as the shared panel for all describe views
    DescribeWebview.setSharedPanel(panel);
    
    // Set up HTML, message handlers, and fetch data
    panel.webview.html = NodeDescribeWebview.getWebviewContent(panel.webview);
    NodeDescribeWebview.setupMessageHandlers(panel, context);
    await NodeDescribeWebview.refreshNodeData();
    
    // Clear shared panel on disposal
    panel.onDidDispose(() => {
      NodeDescribeWebview.currentPanel = undefined;
      DescribeWebview.setSharedPanel(undefined);
    });
  }
  
  /**
   * Fetches node data and updates webview.
   */
  private async refreshNodeData(
    nodeName: string,
    kubeconfigPath: string,
    contextName: string
  ): Promise<void> {
    try {
      // Fetch node details
      const nodeData = await NodeCommands.getNodeDetails(
        kubeconfigPath,
        contextName,
        nodeName
      );
      
      // Fetch pods on node
      const podsData = await PodCommands.getPodsOnNode(
        kubeconfigPath,
        contextName,
        nodeName
      );
      
      // Transform to NodeDescribeData
      const describeData = this.transformNodeData(nodeData, podsData);
      
      // Send to webview
      this.panel?.webview.postMessage({
        command: 'updateNodeData',
        data: describeData
      });
    } catch (error) {
      this.panel?.webview.postMessage({
        command: 'error',
        data: {
          message: 'Failed to fetch node data',
          details: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
  
  /**
   * Sets up message handlers from webview.
   */
  private setupMessageHandlers(): void {
    this.panel?.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      switch (message.command) {
        case 'refresh':
          if (this.currentNodeName) {
            await this.refreshNodeData(
              this.currentNodeName,
              // Get kubeconfig and context from current state
            );
          }
          break;
          
        case 'navigateToPod':
          // Open Pod Describe view in the shared panel
          const podName = message.podName || message.name;
          const namespace = message.namespace;
          if (podName && namespace) {
            await vscode.commands.executeCommand('kube9.describePod', {
              name: podName,
              namespace: namespace,
              context: this.contextName
            });
          }
          break;
          
        case 'copyValue':
          // Copy value to clipboard
          await vscode.env.clipboard.writeText(message.data.value);
          vscode.window.showInformationMessage('Copied to clipboard');
          break;
      }
    });
  }
}
```

#### NodeCommands.ts (additions)

Add method to get detailed node information:

```typescript
export interface NodeDetailsResult {
  node: k8s.V1Node | null;
  error: KubectlError | null;
}

export class NodeCommands {
  /**
   * Gets detailed information for a specific node.
   */
  public static async getNodeDetails(
    kubeconfigPath: string,
    contextName: string,
    nodeName: string
  ): Promise<NodeDetailsResult> {
    const result = await KubectlService.executeJson<k8s.V1Node>(
      ['get', 'node', nodeName, '-o', 'json'],
      kubeconfigPath,
      contextName
    );
    
    if (result.error) {
      return {
        node: null,
        error: result.error
      };
    }
    
    return {
      node: result.data,
      error: null
    };
  }
}
```

#### PodCommands.ts (additions)

Add method to get pods running on a specific node:

```typescript
export interface PodsOnNodeResult {
  pods: k8s.V1Pod[];
  error: KubectlError | null;
}

export class PodCommands {
  /**
   * Gets all pods running on a specific node.
   */
  public static async getPodsOnNode(
    kubeconfigPath: string,
    contextName: string,
    nodeName: string
  ): Promise<PodsOnNodeResult> {
    const result = await KubectlService.executeJson<k8s.V1PodList>(
      [
        'get', 'pods',
        '--all-namespaces',
        '--field-selector', `spec.nodeName=${nodeName}`,
        '-o', 'json'
      ],
      kubeconfigPath,
      contextName
    );
    
    if (result.error) {
      return {
        pods: [],
        error: result.error
      };
    }
    
    return {
      pods: result.data.items || [],
      error: null
    };
  }
}
```

### Webview Scripts (media/node-describe.js)

#### Main Script

```javascript
(function() {
  const vscode = acquireVsCodeApi();
  let currentNodeData = null;
  
  // Handle messages from extension
  window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.command) {
      case 'updateNodeData':
        currentNodeData = message.data;
        renderNodeData(message.data);
        break;
        
      case 'refreshComplete':
        hideLoadingIndicator();
        break;
        
      case 'error':
        showError(message.data.message, message.data.details);
        break;
    }
  });
  
  // Render node data
  function renderNodeData(data) {
    renderOverview(data.overview);
    renderResources(data.resources);
    renderConditions(data.conditions);
    renderPods(data.pods);
    renderAddresses(data.addresses);
    renderLabels(data.labels);
    renderTaints(data.taints);
    renderAllocation(data.allocation);
  }
  
  // Refresh button handler
  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    showLoadingIndicator();
    vscode.postMessage({
      command: 'refresh',
      data: { nodeName: currentNodeData?.name }
    });
  });
  
  // Helper functions for rendering sections
  // ... (implementation details)
})();
```

## Utility Functions

### Kubernetes Quantity Parsing

```typescript
/**
 * Parses Kubernetes quantity strings (e.g., "4", "16Gi", "100m").
 */
export function parseKubernetesQuantity(
  quantity: string,
  unit: 'cores' | 'bytes' | 'count'
): number {
  if (unit === 'count') {
    return parseInt(quantity, 10);
  }
  
  if (unit === 'cores') {
    // Handle millicores (e.g., "100m" = 0.1 cores)
    if (quantity.endsWith('m')) {
      return parseFloat(quantity.slice(0, -1)) / 1000;
    }
    return parseFloat(quantity);
  }
  
  if (unit === 'bytes') {
    // Handle Kubernetes memory quantities (Ki, Mi, Gi, Ti)
    const match = quantity.match(/^(\d+(?:\.\d+)?)(Ki|Mi|Gi|Ti|Pi|Ei)?$/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const suffix = match[2] || '';
    
    const multipliers: Record<string, number> = {
      '': 1,
      'Ki': 1024,
      'Mi': 1024 ** 2,
      'Gi': 1024 ** 3,
      'Ti': 1024 ** 4,
      'Pi': 1024 ** 5,
      'Ei': 1024 ** 6
    };
    
    return value * (multipliers[suffix] || 1);
  }
  
  return 0;
}

/**
 * Formats quantity for display.
 */
export function formatQuantity(value: number, unit: 'cores' | 'bytes' | 'count'): string {
  if (unit === 'count') {
    return String(value);
  }
  
  if (unit === 'cores') {
    return `${value.toFixed(2)} cores`;
  }
  
  if (unit === 'bytes') {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let unitIndex = 0;
    let size = value;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
  
  return String(value);
}
```

### Relative Time Formatting

```typescript
/**
 * Formats ISO timestamp as relative time (e.g., "2h ago", "5m ago").
 */
export function formatRelativeTime(isoTimestamp: string): string {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();
  const diff = now - then;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}
```

## Performance Considerations

- **Lazy Loading**: Load node data only when webview is opened
- **Caching**: Cache node data for 30 seconds to reduce kubectl calls
- **Incremental Updates**: Update only changed sections during refresh
- **Virtual Scrolling**: Use virtual scrolling for long pod lists (>100 pods)
- **Debounced Refresh**: Debounce refresh button to prevent rapid API calls

## Testing Strategy

### Unit Tests
- Kubernetes quantity parsing and formatting
- Relative time formatting
- Resource metric calculations
- Data transformation functions

### Integration Tests
- kubectl command execution for node details
- kubectl command execution for pods on node
- Message passing between extension and webview
- Webview panel lifecycle management

### E2E Tests
- Left-click node opens describe webview
- Webview displays all sections correctly
- Refresh button updates data
- Navigate to pod from pod list
- Copy address/label/taint to clipboard
- Right-click "Describe (Raw)" opens text editor
- Reusing shared webview for different nodes

