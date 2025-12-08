---
spec_id: argocd-webview-spec
feature_id: [argocd-application-webview]
diagram_id: [argocd-architecture]
context_id: [kubernetes-cluster-management, vscode-extension-development]
---

# ArgoCD Application Webview Specification

## Overview

The ArgoCD Application webview provides a detailed panel for viewing and interacting with ArgoCD Applications. It displays comprehensive information across two tabs (Overview and Drift Details), allows users to trigger actions (sync, refresh, hard refresh), and provides navigation to related Kubernetes resources. The webview is implemented using VS Code's webview API with React for the UI.

## Architecture

### Webview Provider

**Class**: `ArgoCDApplicationWebviewProvider`

**Location**: `src/webview/ArgoCDApplicationWebviewProvider.ts`

**Responsibilities**:
1. Create and manage webview panel lifecycle
2. Load application data from ArgoCDService
3. Handle messages from webview (actions, navigation)
4. Update webview when application status changes
5. Provide webview HTML/CSS/JS content

**Constructor Parameters**:
```typescript
constructor(
  private extensionContext: vscode.ExtensionContext,
  private argoCDService: ArgoCDService,
  private treeProvider: ClusterTreeProvider
) {}
```

### Panel Creation

```typescript
async showApplication(
  applicationName: string,
  namespace: string,
  context: string
): Promise<void> {
  // Create or reuse webview panel
  const panel = vscode.window.createWebviewPanel(
    'kube9.argocdApplication',
    `ArgoCD: ${applicationName}`,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionContext.extensionUri, 'media'),
        vscode.Uri.joinPath(this.extensionContext.extensionUri, 'out')
      ]
    }
  );
  
  // Set initial HTML
  panel.webview.html = this.getWebviewContent(panel.webview);
  
  // Load application data
  await this.loadApplicationData(applicationName, namespace, context, panel);
  
  // Set up message handlers
  this.setupMessageHandlers(panel, applicationName, namespace, context);
}
```

**Panel Options**:
- `enableScripts: true` - Allow JavaScript execution
- `retainContextWhenHidden: true` - Preserve state when panel hidden
- `localResourceRoots` - Allow loading local resources (CSS, JS, icons)

## Webview Content Structure

### HTML Structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" 
        content="default-src 'none'; 
                 style-src ${cspSource} 'unsafe-inline'; 
                 script-src ${cspSource};">
  <link rel="stylesheet" href="${styleUri}">
  <title>ArgoCD Application</title>
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri}"></script>
</body>
</html>
```

**Security**:
- Content Security Policy (CSP) to restrict resource loading
- Only allow scripts/styles from extension URI
- No inline scripts (except initial bootstrapping)

### React Component Structure

```
<ArgoCDApplicationView>
  ├── <LoadingState> (conditional)
  ├── <ErrorState> (conditional)
  └── <ApplicationContent> (when loaded)
      ├── <TabBar>
      │   ├── <Tab label="Overview" active />
      │   └── <Tab label="Drift Details" />
      ├── <OverviewTab> (conditional)
      │   ├── <MetadataSection>
      │   ├── <SyncStatusSection>
      │   ├── <HealthStatusSection>
      │   ├── <SourceSection>
      │   ├── <DestinationSection>
      │   ├── <LastOperationSection>
      │   └── <ActionButtons>
      └── <DriftDetailsTab> (conditional)
          ├── <OutOfSyncSummary>
          ├── <ResourceFilter>
          └── <ResourceTable>
              └── <ResourceRow> (expandable)
```

## Overview Tab Components

### MetadataSection

Displays basic application metadata:

```typescript
interface MetadataProps {
  name: string;
  namespace: string;
  project: string;
  createdAt: string;
}

function MetadataSection({ name, namespace, project, createdAt }: MetadataProps) {
  return (
    <div className="metadata-section">
      <h2>{name}</h2>
      <div className="metadata-grid">
        <div className="field">
          <label>Namespace</label>
          <span>{namespace}</span>
        </div>
        <div className="field">
          <label>Project</label>
          <span>{project}</span>
        </div>
        <div className="field">
          <label>Created</label>
          <span>{formatDate(createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
```

### SyncStatusSection

Displays sync status with icon and details:

```typescript
interface SyncStatusProps {
  status: SyncStatusCode;
  revision: string;
  targetRevision: string;
  lastSyncedAt?: string;
}

function SyncStatusSection({ status, revision, targetRevision, lastSyncedAt }: SyncStatusProps) {
  const icon = getSyncStatusIcon(status);
  const shortRevision = revision.substring(0, 7);
  
  return (
    <div className="sync-status-section">
      <h3>Sync Status</h3>
      <div className={`status-badge ${status.toLowerCase()}`}>
        <Icon name={icon} />
        <span>{status}</span>
      </div>
      <div className="status-details">
        <div className="field">
          <label>Current Revision</label>
          <span className="revision" onClick={() => copyToClipboard(revision)}>
            {shortRevision}
          </span>
        </div>
        <div className="field">
          <label>Target Revision</label>
          <span>{targetRevision}</span>
        </div>
        {lastSyncedAt && (
          <div className="field">
            <label>Last Sync</label>
            <span>{formatRelativeTime(lastSyncedAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

### HealthStatusSection

Displays health status with icon and message:

```typescript
interface HealthStatusProps {
  status: HealthStatusCode;
  message?: string;
}

function HealthStatusSection({ status, message }: HealthStatusProps) {
  const icon = getHealthStatusIcon(status);
  
  return (
    <div className="health-status-section">
      <h3>Health Status</h3>
      <div className={`status-badge ${status.toLowerCase()}`}>
        <Icon name={icon} />
        <span>{status}</span>
      </div>
      {message && (
        <div className="health-message">{message}</div>
      )}
    </div>
  );
}
```

### SourceSection

Displays Git source information:

```typescript
interface SourceProps {
  repoURL: string;
  path: string;
  targetRevision: string;
}

function SourceSection({ repoURL, path, targetRevision }: SourceProps) {
  return (
    <div className="source-section">
      <h3>Source</h3>
      <div className="source-details">
        <div className="field">
          <label>Repository</label>
          <a href={repoURL} className="external-link">
            {repoURL}
          </a>
        </div>
        <div className="field">
          <label>Path</label>
          <span>{path}</span>
        </div>
        <div className="field">
          <label>Target Revision</label>
          <span>{targetRevision}</span>
        </div>
      </div>
    </div>
  );
}
```

### ActionButtons

Action buttons for sync, refresh, and navigation:

```typescript
interface ActionButtonsProps {
  onSync: () => void;
  onRefresh: () => void;
  onHardRefresh: () => void;
  onViewInTree: () => void;
  syncing: boolean;
}

function ActionButtons({
  onSync,
  onRefresh,
  onHardRefresh,
  onViewInTree,
  syncing
}: ActionButtonsProps) {
  return (
    <div className="action-buttons">
      <button 
        className="primary" 
        onClick={onSync} 
        disabled={syncing}
      >
        {syncing ? 'Syncing...' : 'Sync'}
      </button>
      <button onClick={onRefresh} disabled={syncing}>
        Refresh
      </button>
      <button onClick={onHardRefresh} disabled={syncing}>
        Hard Refresh
      </button>
      <button className="link" onClick={onViewInTree}>
        View in Tree
      </button>
    </div>
  );
}
```

## Drift Details Tab Components

### OutOfSyncSummary

Summary of out-of-sync resources:

```typescript
interface SummaryProps {
  totalResources: number;
  outOfSyncCount: number;
}

function OutOfSyncSummary({ totalResources, outOfSyncCount }: SummaryProps) {
  if (outOfSyncCount === 0) {
    return null;
  }
  
  return (
    <div className="out-of-sync-summary warning">
      <Icon name="warning" />
      <span>{outOfSyncCount} of {totalResources} resources are out of sync</span>
    </div>
  );
}
```

### ResourceFilter

Filter toggle for showing only out-of-sync resources:

```typescript
interface FilterProps {
  showOnlyOutOfSync: boolean;
  onToggle: (value: boolean) => void;
}

function ResourceFilter({ showOnlyOutOfSync, onToggle }: FilterProps) {
  return (
    <div className="resource-filter">
      <label>
        <input
          type="checkbox"
          checked={showOnlyOutOfSync}
          onChange={(e) => onToggle(e.target.checked)}
        />
        Show only out-of-sync resources
      </label>
    </div>
  );
}
```

### ResourceTable

Table displaying all resources with sync/health status:

```typescript
interface ResourceTableProps {
  resources: ArgoCDResource[];
  onNavigateToResource: (resource: ArgoCDResource) => void;
}

function ResourceTable({ resources, onNavigateToResource }: ResourceTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  return (
    <table className="resource-table">
      <thead>
        <tr>
          <th></th>
          <th>Kind</th>
          <th>Name</th>
          <th>Namespace</th>
          <th>Sync Status</th>
          <th>Health Status</th>
        </tr>
      </thead>
      <tbody>
        {resources.map(resource => (
          <ResourceRow
            key={`${resource.kind}-${resource.name}-${resource.namespace}`}
            resource={resource}
            expanded={expandedRows.has(resource.name)}
            onToggleExpand={(name) => toggleExpanded(expandedRows, setExpandedRows, name)}
            onNavigate={() => onNavigateToResource(resource)}
          />
        ))}
      </tbody>
    </table>
  );
}
```

### ResourceRow

Expandable row for each resource:

```typescript
interface ResourceRowProps {
  resource: ArgoCDResource;
  expanded: boolean;
  onToggleExpand: (name: string) => void;
  onNavigate: () => void;
}

function ResourceRow({ resource, expanded, onToggleExpand, onNavigate }: ResourceRowProps) {
  const isOutOfSync = resource.syncStatus !== 'Synced';
  const rowClass = isOutOfSync ? 'out-of-sync' : '';
  
  return (
    <>
      <tr className={rowClass}>
        <td>
          <button 
            className="expand-icon" 
            onClick={() => onToggleExpand(resource.name)}
          >
            <Icon name={expanded ? 'chevron-down' : 'chevron-right'} />
          </button>
        </td>
        <td>{resource.kind}</td>
        <td>
          <button className="link" onClick={onNavigate}>
            {resource.name}
          </button>
        </td>
        <td>{resource.namespace}</td>
        <td>
          <StatusBadge status={resource.syncStatus} type="sync" />
        </td>
        <td>
          {resource.healthStatus && (
            <StatusBadge status={resource.healthStatus} type="health" />
          )}
        </td>
      </tr>
      {expanded && resource.message && (
        <tr className="expanded-details">
          <td colSpan={6}>
            <div className="resource-message">
              <strong>Message:</strong>
              <pre>{resource.message}</pre>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
```

## Message Communication

### Extension to Webview

Messages sent from extension to webview:

```typescript
type ExtensionMessage =
  | { type: 'applicationData'; data: ApplicationDetailsData }
  | { type: 'updateStatus'; syncStatus: SyncStatus; healthStatus: HealthStatus }
  | { type: 'operationProgress'; phase: OperationPhase; message: string }
  | { type: 'error'; message: string };
```

**Sending from Extension**:
```typescript
panel.webview.postMessage({
  type: 'applicationData',
  data: applicationDetails
});
```

### Webview to Extension

Messages sent from webview to extension:

```typescript
type WebviewMessage =
  | { type: 'sync' }
  | { type: 'refresh' }
  | { type: 'hardRefresh' }
  | { type: 'viewInTree' }
  | { type: 'navigateToResource'; kind: string; name: string; namespace: string }
  | { type: 'copyRevision'; revision: string }
  | { type: 'ready' };
```

**Sending from Webview**:
```typescript
const vscode = acquireVsCodeApi();
vscode.postMessage({ type: 'sync' });
```

**Handling in Extension**:
```typescript
panel.webview.onDidReceiveMessage(
  async (message: WebviewMessage) => {
    switch (message.type) {
      case 'sync':
        await this.handleSync(applicationName, namespace, context, panel);
        break;
      case 'refresh':
        await this.handleRefresh(applicationName, namespace, context, panel);
        break;
      case 'hardRefresh':
        await this.handleHardRefresh(applicationName, namespace, context, panel);
        break;
      case 'viewInTree':
        await this.handleViewInTree(applicationName);
        break;
      case 'navigateToResource':
        await this.handleNavigateToResource(message.kind, message.name, message.namespace);
        break;
    }
  }
);
```

## Action Handlers

### Sync Action

```typescript
async handleSync(
  name: string,
  namespace: string,
  context: string,
  panel: vscode.WebviewPanel
): Promise<void> {
  // Show syncing state in webview
  panel.webview.postMessage({
    type: 'operationProgress',
    phase: 'Running',
    message: 'Syncing application...'
  });
  
  try {
    // Execute sync
    await this.argoCDService.syncApplication(name, namespace, context);
    
    // Reload application data
    await this.loadApplicationData(name, namespace, context, panel);
    
    // Show success
    vscode.window.showInformationMessage(`Successfully synced ${name}`);
  } catch (error) {
    // Show error
    panel.webview.postMessage({
      type: 'error',
      message: error.message
    });
    vscode.window.showErrorMessage(`Sync failed: ${error.message}`);
  }
}
```

### Hard Refresh Action

```typescript
async handleHardRefresh(
  name: string,
  namespace: string,
  context: string,
  panel: vscode.WebviewPanel
): Promise<void> {
  // Show confirmation dialog
  const confirm = await vscode.window.showWarningMessage(
    'Hard refresh will clear cache and may take longer. Continue?',
    'Continue',
    'Cancel'
  );
  
  if (confirm !== 'Continue') {
    return;
  }
  
  // Execute hard refresh
  await this.argoCDService.hardRefreshApplication(name, namespace, context);
  
  // Reload data
  await this.loadApplicationData(name, namespace, context, panel);
}
```

### Navigate to Resource

```typescript
async handleNavigateToResource(
  kind: string,
  name: string,
  namespace: string
): Promise<void> {
  // Switch to tree view
  await vscode.commands.executeCommand('kube9.treeView.focus');
  
  // Expand to resource
  await this.treeProvider.revealResource(kind, name, namespace);
}
```

### View in Tree

```typescript
async handleViewInTree(applicationName: string): Promise<void> {
  // Switch to tree view
  await vscode.commands.executeCommand('kube9.treeView.focus');
  
  // Expand ArgoCD Applications category
  await this.treeProvider.expandCategory('argocd-applications');
  
  // Reveal and select application
  await this.treeProvider.revealApplication(applicationName);
}
```

## State Management

### Webview State Persistence

```typescript
interface WebviewState {
  selectedTab: 'overview' | 'driftDetails';
  showOnlyOutOfSync: boolean;
  expandedResources: string[];
}

// Save state
const vscode = acquireVsCodeApi();
vscode.setState(state);

// Restore state
const previousState = vscode.getState();
if (previousState) {
  setSelectedTab(previousState.selectedTab);
  setShowOnlyOutOfSync(previousState.showOnlyOutOfSync);
}
```

### Auto-Refresh on Status Changes

```typescript
// Poll for application updates during active operations
async startPolling(
  name: string,
  namespace: string,
  context: string,
  panel: vscode.WebviewPanel
): Promise<void> {
  const pollInterval = setInterval(async () => {
    const app = await this.argoCDService.getApplication(name, namespace, context);
    
    // Update webview with new status
    panel.webview.postMessage({
      type: 'updateStatus',
      syncStatus: app.syncStatus,
      healthStatus: app.healthStatus
    });
    
    // Stop polling if operation complete
    if (!app.lastOperation || app.lastOperation.phase !== 'Running') {
      clearInterval(pollInterval);
    }
  }, 2000);
}
```

## Styling

### Theme Integration

```css
:root {
  --vscode-font-family: var(--vscode-editor-font-family);
  --vscode-font-size: var(--vscode-editor-font-size);
  
  /* Status colors */
  --status-synced: var(--vscode-testing-iconPassed);
  --status-outOfSync: var(--vscode-testing-iconQueued);
  --status-healthy: var(--vscode-testing-iconPassed);
  --status-degraded: var(--vscode-testing-iconFailed);
  --status-progressing: var(--vscode-charts-blue);
}
```

### Responsive Design

```css
@media (max-width: 768px) {
  .metadata-grid {
    grid-template-columns: 1fr;
  }
  
  .resource-table {
    font-size: 0.9em;
  }
}
```

## Performance Considerations

1. **Lazy Loading**: Only load data when webview becomes visible
2. **Debounced Updates**: Debounce status updates during polling
3. **Virtual Scrolling**: For large resource lists (>100 resources)
4. **Memoization**: Memoize computed values (status icons, formatted times)
5. **Efficient Re-renders**: Use React.memo for component optimization

## Error Handling

### Loading Errors

Display friendly error messages when data loading fails:
- Permission denied → Suggest checking RBAC
- Application not found → Suggest it may have been deleted
- Network error → Offer retry button

### Operation Errors

Show operation-specific errors inline:
- Sync failed → Display ArgoCD error message
- Timeout → Explain operation still running in ArgoCD

## Testing Considerations

- Mock webview API for unit tests
- Test message communication between extension and webview
- Test action handlers with various error scenarios
- Test state persistence across webview hide/show
- Test theme integration in light/dark modes

