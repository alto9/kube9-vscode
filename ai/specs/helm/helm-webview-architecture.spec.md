---
spec_id: helm-webview-architecture
name: Helm Package Manager Webview Architecture
description: Technical specification for the Helm Package Manager webview structure and message passing
feature_id:
  - helm-package-manager-access
diagram_id:
  - helm-package-manager-architecture
---

# Helm Package Manager Webview Architecture

## Overview

The Helm Package Manager uses a React-based webview hosted in a VS Code panel. The webview communicates with the extension host through message passing for all Helm operations.

## Architecture

See [helm-package-manager-architecture](../../diagrams/helm/helm-package-manager-architecture.diagram.md) for visual architecture.

## Webview Panel Configuration

### Panel Creation

```typescript
interface HelmWebviewPanel {
  panel: vscode.WebviewPanel;
  currentCluster: string;
  disposables: vscode.Disposable[];
}

// Panel options
const panelOptions: vscode.WebviewOptions & vscode.WebviewPanelOptions = {
  enableScripts: true,
  retainContextWhenHidden: true,
  localResourceRoots: [
    vscode.Uri.joinPath(extensionUri, 'media'),
    vscode.Uri.joinPath(extensionUri, 'dist')
  ]
};
```

### Webview Lifecycle

- Panel created on tree item click
- Single instance per window (show existing if already open)
- Persists when hidden (retainContextWhenHidden: true)
- Disposed when panel is closed
- State saved to workspace storage

## React Application Structure

### Component Hierarchy

```
HelmPackageManager
├── FeaturedChartsSection
│   └── OperatorCard
├── RepositoriesSection
│   ├── RepositoryList
│   ├── AddRepositoryModal
│   └── RepositoryCard
├── InstalledReleasesSection
│   ├── ReleaseFilters
│   ├── ReleaseList
│   └── ReleaseCard
├── DiscoverChartsSection
│   ├── SearchBar
│   └── ChartResults
├── ChartDetailModal
│   ├── ReadmeViewer
│   ├── ValuesViewer
│   └── InstallForm
└── ReleaseDetailModal
    ├── InfoTab
    ├── ManifestTab
    ├── ValuesTab
    └── HistoryTab
```

### State Management

```typescript
interface HelmState {
  repositories: HelmRepository[];
  releases: HelmRelease[];
  featuredCharts: FeaturedChart[];
  searchResults: ChartSearchResult[];
  loading: boolean;
  error: string | null;
  currentCluster: string;
}

interface HelmRepository {
  name: string;
  url: string;
  chartCount: number;
  lastUpdated: Date;
}

interface HelmRelease {
  name: string;
  namespace: string;
  chart: string;
  version: string;
  status: 'deployed' | 'failed' | 'pending' | 'superseded';
  revision: number;
  updated: Date;
  upgradeAvailable?: string;
}

interface FeaturedChart {
  name: string;
  chart: string;
  description: string;
  version: string;
  installed: boolean;
  upgradeAvailable?: string;
}
```

## Message Passing Protocol

### Message Types

```typescript
// Messages from webview to extension
type WebviewMessage =
  | { command: 'listRepositories' }
  | { command: 'addRepository'; name: string; url: string }
  | { command: 'updateRepository'; name: string }
  | { command: 'removeRepository'; name: string }
  | { command: 'searchCharts'; query: string }
  | { command: 'getChartDetails'; chart: string }
  | { command: 'installChart'; params: InstallParams }
  | { command: 'listReleases'; namespace?: string }
  | { command: 'getReleaseDetails'; name: string; namespace: string }
  | { command: 'upgradeRelease'; params: UpgradeParams }
  | { command: 'rollbackRelease'; name: string; namespace: string; revision: number }
  | { command: 'uninstallRelease'; name: string; namespace: string }
  | { command: 'installOperator'; apiKey?: string };

// Messages from extension to webview
type ExtensionMessage =
  | { type: 'repositoriesLoaded'; data: HelmRepository[] }
  | { type: 'releasesLoaded'; data: HelmRelease[] }
  | { type: 'chartSearchResults'; data: ChartSearchResult[] }
  | { type: 'chartDetails'; data: ChartDetails }
  | { type: 'operationProgress'; operation: string; progress: number }
  | { type: 'operationComplete'; operation: string; success: boolean; message: string }
  | { type: 'operationError'; operation: string; error: string };
```

### Message Handler Pattern

```typescript
// Extension side
webviewPanel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
  switch (message.command) {
    case 'listRepositories':
      const repos = await helmService.listRepositories();
      webviewPanel.webview.postMessage({ type: 'repositoriesLoaded', data: repos });
      break;
    case 'addRepository':
      await helmService.addRepository(message.name, message.url);
      break;
    // ... other cases
  }
});

// Webview side
window.addEventListener('message', (event) => {
  const message = event.data as ExtensionMessage;
  switch (message.type) {
    case 'repositoriesLoaded':
      setRepositories(message.data);
      break;
    case 'operationComplete':
      showNotification(message.message);
      break;
    // ... other cases
  }
});
```

## Webview Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" 
  content="
    default-src 'none';
    style-src ${webview.cspSource} 'unsafe-inline';
    script-src ${webview.cspSource};
    img-src ${webview.cspSource} https:;
  "
/>
```

## State Persistence

### Workspace State

```typescript
interface HelmWorkspaceState {
  repositories: HelmRepository[];
  uiPreferences: {
    selectedTab: string;
    releaseFilters: ReleaseFilters;
    sortOrder: string;
  };
}

// Save state
context.workspaceState.update('helm.state', helmState);

// Load state
const savedState = context.workspaceState.get<HelmWorkspaceState>('helm.state');
```

## Error Handling

### Error Display

- Inline errors: Display in relevant section
- Operation errors: Show notification with details
- Connection errors: Display reconnect button
- Validation errors: Highlight form fields

### Error Recovery

- Retry mechanism for failed operations
- State recovery on reload
- Graceful degradation if Helm CLI unavailable

## Performance Considerations

- Lazy load sections on scroll
- Debounce search input (300ms)
- Cache chart lists with 5-minute TTL
- Virtual scrolling for large release lists
- Background polling for release status updates (30s interval)

