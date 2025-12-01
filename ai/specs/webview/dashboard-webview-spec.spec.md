---
spec_id: dashboard-webview-spec
feature_id: [free-dashboard, operated-dashboard]
diagram_id: [dashboard-architecture]
context_id: [vscode-extension-development]
---

# Dashboard Webview Specification

## Overview

The Dashboard webview provides the container and routing logic for displaying cluster dashboards. It determines the appropriate dashboard implementation based on operator status and manages the webview lifecycle, data refresh, and error handling.

## Webview Registration

### Command Registration

```typescript
// Register dashboard command in extension activation
context.subscriptions.push(
  vscode.commands.registerCommand('kube9.openDashboard', async (clusterElement) => {
    await openDashboard(clusterElement);
  })
);
```

### Dashboard Opening Logic

```typescript
async function openDashboard(clusterElement: ClusterTreeItem) {
  // Get cluster context
  const clusterName = clusterElement.label;
  const clusterContext = clusterElement.metadata.context;
  
  // Determine operator status
  const operatorStatus = await getOperatorStatus(clusterContext);
  
  // Create or reveal webview panel
  const panel = vscode.window.createWebviewPanel(
    'kube9Dashboard',
    `Dashboard: ${clusterName}`,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [/* extension URIs */]
    }
  );
  
  // Load appropriate dashboard
  if (operatorStatus === OperatorStatusMode.Basic) {
    loadFreeNonOperatedDashboard(panel, clusterContext);
  } else {
    loadFreeOperatedDashboard(panel, clusterContext, operatorStatus);
  }
}
```

## Dashboard Type Resolution

### Operator Status Detection

The webview determines dashboard type based on operator status:

```typescript
enum OperatorStatusMode {
  Basic = 'basic',       // No operator → Free Non-Operated Dashboard
  Operated = 'operated', // Operator without key → Free Operated Dashboard (with upsell)
  Enabled = 'enabled',   // Operator with key → Free Operated Dashboard (with AI)
  Degraded = 'degraded'  // Operator with issues → Free Operated Dashboard (with warnings)
}

function getDashboardType(status: OperatorStatusMode): DashboardType {
  return status === OperatorStatusMode.Basic 
    ? DashboardType.FreeNonOperated 
    : DashboardType.FreeOperated;
}
```

## Webview HTML Structure

### Basic HTML Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard</title>
  <style>
    /* VSCode-aware styling */
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 20px;
    }
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .loading-spinner {
      text-align: center;
      padding: 40px;
    }
    .error-message {
      background-color: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div id="dashboard-root" class="dashboard-container">
    <!-- Dashboard content injected here -->
  </div>
  <script>
    // Webview communication setup
    const vscode = acquireVsCodeApi();
    
    // Listen for messages from extension
    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.type) {
        case 'updateData':
          updateDashboardData(message.data);
          break;
        case 'error':
          showError(message.error);
          break;
        case 'loading':
          showLoading();
          break;
      }
    });
    
    // Request initial data
    vscode.postMessage({ type: 'requestData' });
  </script>
</body>
</html>
```

## Data Refresh Strategy

### Automatic Refresh

```typescript
class DashboardRefreshManager {
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL_MS = 30000; // 30 seconds
  
  startAutoRefresh(panel: vscode.WebviewPanel, clusterContext: string) {
    this.stopAutoRefresh();
    
    this.refreshInterval = setInterval(async () => {
      if (panel.visible) {
        await this.refreshDashboardData(panel, clusterContext);
      }
    }, this.REFRESH_INTERVAL_MS);
  }
  
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
  
  async refreshDashboardData(panel: vscode.WebviewPanel, clusterContext: string) {
    try {
      panel.webview.postMessage({ type: 'loading' });
      const data = await fetchDashboardData(clusterContext);
      panel.webview.postMessage({ type: 'updateData', data });
    } catch (error) {
      panel.webview.postMessage({ type: 'error', error: error.message });
    }
  }
}
```

### Manual Refresh

```typescript
// Handle manual refresh from webview
panel.webview.onDidReceiveMessage(async (message) => {
  if (message.type === 'refresh') {
    await refreshManager.refreshDashboardData(panel, clusterContext);
  }
});
```

## Message Protocol

### Extension → Webview Messages

```typescript
interface WebviewMessage {
  type: 'updateData' | 'error' | 'loading' | 'operatorStatusChanged';
  data?: DashboardData;
  error?: string;
  operatorStatus?: OperatorStatusMode;
}
```

### Webview → Extension Messages

```typescript
interface ExtensionMessage {
  type: 'requestData' | 'refresh' | 'installOperator';
  payload?: any;
}
```

## State Management

### Dashboard State

```typescript
interface DashboardState {
  clusterContext: string;
  clusterName: string;
  operatorStatus: OperatorStatusMode;
  lastRefresh: Date;
  data: DashboardData | null;
  error: string | null;
  isLoading: boolean;
}
```

### Persistent State

```typescript
// Use VSCode webview state for persistence
const state = vscode.getState() || {};

function saveState(newState: Partial<DashboardState>) {
  const currentState = vscode.getState() || {};
  vscode.setState({ ...currentState, ...newState });
}
```

## Error Handling

### Error Types

```typescript
enum DashboardErrorType {
  NetworkError = 'network',
  PermissionError = 'permission',
  TimeoutError = 'timeout',
  DataFormatError = 'format',
  UnknownError = 'unknown'
}

interface DashboardError {
  type: DashboardErrorType;
  message: string;
  retryable: boolean;
}
```

### Error Display

```typescript
function formatErrorMessage(error: DashboardError): string {
  const baseMessage = `Dashboard Error: ${error.message}`;
  const retryMessage = error.retryable 
    ? 'Click refresh to try again.' 
    : 'This issue may require manual intervention.';
  return `${baseMessage}\n\n${retryMessage}`;
}
```

## Performance Considerations

### Data Caching

- Cache dashboard data for 30 seconds to minimize kubectl calls
- Invalidate cache on manual refresh
- Separate cache per cluster context

### Resource Cleanup

```typescript
panel.onDidDispose(() => {
  refreshManager.stopAutoRefresh();
  clearDataCache(clusterContext);
  disposeDashboardResources(panel);
});
```

## Multi-Dashboard Support

### Panel Management

```typescript
const activeDashboards = new Map<string, vscode.WebviewPanel>();

function getOrCreateDashboardPanel(clusterContext: string): vscode.WebviewPanel {
  if (activeDashboards.has(clusterContext)) {
    const panel = activeDashboards.get(clusterContext)!;
    panel.reveal(vscode.ViewColumn.One);
    return panel;
  }
  
  const panel = createNewDashboardPanel(clusterContext);
  activeDashboards.set(clusterContext, panel);
  
  panel.onDidDispose(() => {
    activeDashboards.delete(clusterContext);
  });
  
  return panel;
}
```

## Testing Hooks

### Test Interface

```typescript
interface DashboardTestInterface {
  getCurrentState(): DashboardState;
  triggerRefresh(): Promise<void>;
  simulateError(error: DashboardError): void;
  getRefreshCount(): number;
}
```

