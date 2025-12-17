---
spec_id: event-viewer-webview-spec
feature_id:
  - event-viewer
diagram_id:
  - event-viewer-flow
context_id:
  - vscode-extension-development
---

# Event Viewer Webview Specification

## Overview

This specification defines the Event Viewer webview panel implementation, including UI layout, interaction patterns, and state management. The Event Viewer displays cluster events in a paginated, filterable table format. Events are queried from the kube9-operator by executing the CLI binary bundled in the operator pod via kubectl exec.

## Webview Architecture

### Webview Type

- **Panel Type**: Custom webview panel (similar to Dashboard)
- **Reuse Strategy**: One webview per cluster context (keyed by cluster context name)
- **Title Format**: `Events - {cluster-name}`

### Activation

- **Tree Item Command**: `kube9.openEventViewer`
- **Command Arguments**: `{ kubeconfigPath, contextName, operatorStatus }`
- **Icon**: `new vscode.ThemeIcon('calendar')`

## UI Layout

### Non-Operated Cluster (Call-to-Action)

```
┌─────────────────────────────────────────────────────────────┐
│                     📅 Event Viewer                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  This feature requires the kube9 Operator to be installed  │
│  in your cluster.                                           │
│                                                             │
│  The Event Viewer shows a timeline of cluster events       │
│  including:                                                 │
│    • Cluster state changes                                  │
│    • Operator activities                                    │
│    • Insight generation                                     │
│    • Assessment results                                     │
│    • Workload lifecycle events                              │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │  Install kube9 Operator             │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  Learn more about the operator →                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Operated Cluster (Event Table)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📅 Event Viewer                                             🔄 Refresh      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Filters:                                                                    │
│ [All Types ▼] [All Severities ▼] [Last 24 hours ▼] [Search...] [Clear]   │
│                                                                             │
│ Options: [ ] Group by Type                                                  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Type ↕    │ Severity ↕  │ Description              │ Resource    │ Time ↕  │
├───────────┴─────────────┴──────────────────────────┴─────────────┴─────────┤
│ 💡 Insight │ ⚠️  Warning  │ CPU throttling detected  │ prod/app   │ 2h ago  │
│ 📊 Assess  │ ❌  Error    │ 3 security violations    │ Cluster    │ 3h ago  │
│ 🔧 Operator│ ℹ️  Info     │ Health check completed   │ Operator   │ 5h ago  │
│ 📦 Workload│ ℹ️  Info     │ Deployment scaled up     │ prod/api   │ 6h ago  │
│ ...        │ ...          │ ...                      │ ...        │ ...     │
├─────────────────────────────────────────────────────────────────────────────┤
│ ◀ Previous   Page 1 of 5   Next ▶                    Showing 1-20 of 87    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Expanded Event Details

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 💡 Insight │ ⚠️  Warning  │ CPU throttling detected  │ prod/app   │ 2h ago  │
│                                                                             │
│   Event ID:        evt_abc123                                               │
│   Type:            insight                                                  │
│   Severity:        warning                                                  │
│   Timestamp:       2025-12-17 10:30:00 UTC                                 │
│                                                                             │
│   Description:                                                              │
│   CPU throttling detected in api-server deployment. Container 'app'        │
│   has been throttled 45% of the time over the last hour.                   │
│                                                                             │
│   Affected Object:                                                          │
│   Kind:            Deployment                                               │
│   Name:            api-server                                               │
│   Namespace:       production                                               │
│                                                                             │
│   Additional Details:                                                       │
│   {                                                                         │
│     "container": "app",                                                     │
│     "throttlePercentage": 45,                                               │
│     "recommendedCpuLimit": "2000m"                                          │
│   }                                                                         │
│                                                                             │
│   Actions:  [View Object] [Copy Event ID]                                  │
│                                                                             │
│   ▲ Collapse                                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## UI Components

### Filter Controls

#### Event Type Filter

Dropdown showing:
- All Types (default)
- Cluster Events
- Operator Events
- Insight Events
- Assessment Events
- Workload Events
- System Events

#### Severity Filter

Dropdown showing:
- All Severities (default)
- Critical
- Error
- Warning
- Info

#### Time Range Filter

Dropdown showing:
- Last 1 hour
- Last 6 hours
- Last 24 hours (default)
- Last 7 days
- Last 30 days
- All Time

#### Search Box

- Text input field
- Placeholder: "Search events..."
- Searches event description and object name
- Triggered by Enter key or search button

#### Clear Filters Button

- Resets all filters to defaults
- Clears search text
- Refreshes event list

### Table Columns

| Column | Width | Sortable | Content |
|--------|-------|----------|---------|
| Type | 10% | Yes | Event type icon + label |
| Severity | 10% | Yes | Severity icon + label |
| Description | 45% | No | Brief event description |
| Resource | 20% | No | Affected resource (namespace/name) |
| Time | 15% | Yes (default) | Relative timestamp |

### Pagination Controls

- **Previous Button**: `◀ Previous` (disabled on page 1)
- **Page Indicator**: `Page X of Y`
- **Next Button**: `Next ▶` (disabled on last page)
- **Result Count**: `Showing X-Y of Z`

### Event Icons

| Event Type | Icon | Color |
|------------|------|-------|
| Cluster | 🌐 | Default |
| Operator | 🔧 | Default |
| Insight | 💡 | Yellow |
| Assessment | 📊 | Blue |
| Workload | 📦 | Default |
| System | ⚙️ | Default |

### Severity Icons

| Severity | Icon | Color |
|----------|------|-------|
| Critical | 🚨 | Red |
| Error | ❌ | Red |
| Warning | ⚠️ | Orange |
| Info | ℹ️ | Blue |

## State Management

### Webview State

```typescript
interface EventViewerState {
  // Cluster context
  kubeconfigPath: string;
  contextName: string;
  operatorStatus: "basic" | "operated" | "enabled" | "degraded";
  
  // Event data
  events: Event[];
  totalCount: number;
  
  // Filters
  filters: {
    type: string | null;
    severity: string | null;
    timeRange: string;
    searchText: string;
  };
  
  // Pagination
  currentPage: number;
  perPage: number;
  totalPages: number;
  
  // UI state
  groupByType: boolean;
  sortColumn: "type" | "severity" | "time";
  sortDirection: "asc" | "desc";
  expandedEventIds: string[];
  
  // Loading state
  isLoading: boolean;
  error: string | null;
}
```

### Event Data Model

```typescript
interface Event {
  // Core fields
  id: string;
  type: "cluster" | "operator" | "insight" | "assessment" | "workload" | "system";
  severity: "critical" | "error" | "warning" | "info";
  timestamp: string; // ISO 8601
  description: string;
  
  // Affected object
  objectKind?: string;
  objectName?: string;
  objectNamespace?: string;
  
  // Additional metadata
  metadata?: Record<string, any>;
  
  // Related events
  relatedEventIds?: string[];
}
```

## Message Protocol (Extension ↔ Webview)

### Extension → Webview Messages

#### Initial Data

```typescript
{
  type: "init",
  data: {
    kubeconfigPath: string,
    contextName: string,
    operatorStatus: "basic" | "operated" | "enabled" | "degraded"
  }
}
```

#### Event Data Update

```typescript
{
  type: "eventData",
  data: {
    events: Event[],
    totalCount: number,
    currentPage: number,
    totalPages: number
  }
}
```

#### Loading State

```typescript
{
  type: "loading",
  data: { isLoading: boolean }
}
```

#### Error

```typescript
{
  type: "error",
  data: { error: string }
}
```

### Webview → Extension Messages

#### Load Events

```typescript
{
  type: "loadEvents",
  data: {
    filters: {
      type?: string,
      severity?: string,
      since?: string,
      searchText?: string
    },
    page: number,
    perPage: number,
    sortBy?: string,
    sortDirection?: "asc" | "desc"
  }
}
```

#### Refresh

```typescript
{
  type: "refresh",
  data: null
}
```

#### Install Operator

```typescript
{
  type: "installOperator",
  data: null
}
```

#### View Object

```typescript
{
  type: "viewObject",
  data: {
    kind: string,
    name: string,
    namespace?: string
  }
}
```

## Implementation Details

### Webview Provider Class

```typescript
class EventViewerProvider {
  private static panels: Map<string, vscode.WebviewPanel> = new Map();
  
  static show(
    kubeconfigPath: string,
    contextName: string,
    operatorStatus: CachedOperatorStatus
  ): void {
    const key = `${kubeconfigPath}:${contextName}`;
    
    // Reuse existing panel if available
    if (this.panels.has(key)) {
      const panel = this.panels.get(key)!;
      panel.reveal();
      return;
    }
    
    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'kube9EventViewer',
      `Events - ${contextName}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    
    // Set HTML content
    panel.webview.html = this.getHtmlContent(panel.webview);
    
    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message, kubeconfigPath, contextName, panel)
    );
    
    // Clean up on close
    panel.onDidDispose(() => {
      this.panels.delete(key);
    });
    
    this.panels.set(key, panel);
    
    // Send initial data
    panel.webview.postMessage({
      type: "init",
      data: { kubeconfigPath, contextName, operatorStatus: operatorStatus.mode }
    });
    
    // Load initial events if operated
    if (operatorStatus.mode !== "basic") {
      this.loadEvents(panel, kubeconfigPath, contextName, {}, 1, 20);
    }
  }
  
  private static async loadEvents(
    panel: vscode.WebviewPanel,
    kubeconfigPath: string,
    contextName: string,
    filters: any,
    page: number,
    perPage: number
  ): Promise<void> {
    panel.webview.postMessage({ type: "loading", data: { isLoading: true } });
    
    try {
      const result = await EventQueryClient.listEvents(
        contextName,
        filters,
        page,
        perPage
      );
      
      panel.webview.postMessage({
        type: "eventData",
        data: result
      });
    } catch (error) {
      panel.webview.postMessage({
        type: "error",
        data: { error: error.message }
      });
    } finally {
      panel.webview.postMessage({ type: "loading", data: { isLoading: false } });
    }
  }
  
  private static async handleMessage(
    message: any,
    kubeconfigPath: string,
    contextName: string,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    switch (message.type) {
      case "loadEvents":
        await this.loadEvents(
          panel,
          kubeconfigPath,
          contextName,
          message.data.filters,
          message.data.page,
          message.data.perPage
        );
        break;
        
      case "refresh":
        await this.loadEvents(panel, kubeconfigPath, contextName, {}, 1, 20);
        break;
        
      case "installOperator":
        vscode.env.openExternal(
          vscode.Uri.parse("https://docs.kube9.io/operator/installation")
        );
        break;
        
      case "viewObject":
        // Navigate to object in tree view or open detail view
        vscode.commands.executeCommand(
          "kube9.viewObject",
          message.data.kind,
          message.data.name,
          message.data.namespace
        );
        break;
    }
  }
}
```

### HTML/CSS/JavaScript

The webview should use:
- **React** for UI components
- **CSS** matching VS Code theme (light/dark mode)
- **VS Code Webview UI Toolkit** for consistent styling
- **Table component** with sorting and filtering
- **Relative time formatting** using a library like `date-fns`

### Relative Timestamp Updates

Use `setInterval` to update relative timestamps every 60 seconds:

```typescript
// In webview JavaScript
setInterval(() => {
  updateRelativeTimestamps();
}, 60000);
```

## Performance Considerations

### Pagination

- Default page size: 20 events
- Maximum page size: 100 events
- Client-side pagination not supported (too many events)

### Caching

- Cache event data for current page in webview state
- Don't cache across page navigations
- Refresh button bypasses any caching

### Virtual Scrolling

Not required for initial implementation (pagination handles this).

## Error Handling

### Operator Not Reachable

Display error message:
```
Unable to connect to kube9 Operator.
The operator may be down or unreachable.

[Retry]
```

### Query Timeout

Display error message:
```
Event query timed out.
The operator may be busy or the cluster may be slow.

[Retry]
```

### Empty Results

Display empty state:
```
No events found.

Try adjusting your filters or time range.
```

## Accessibility

- Table should be keyboard navigable
- All actions should have keyboard shortcuts
- ARIA labels for icons
- Screen reader friendly event descriptions

## Testing Considerations

### Unit Tests

- State management logic
- Filter combination logic
- Pagination calculations
- Time range conversion
- Event type/severity mappings

### Integration Tests

- Webview creation and reuse
- Message protocol (extension ↔ webview)
- Event data loading
- Filter application
- Pagination navigation
- Error handling

### End-to-End Tests

- Open Event Viewer for operated cluster
- Open Event Viewer for non-operated cluster
- Apply filters and verify results
- Navigate pages
- Expand/collapse event details
- Install operator button action
- View object action

