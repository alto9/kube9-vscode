---
spec_id: operator-health-report-spec
name: Operator Health Report Webview Specification
description: Technical specification for implementing the Kube9 Operator Health Report webview with status information, health metrics, and operator details
feature_id:
  - operator-health-report
---

# Operator Health Report Webview Specification

## Overview

The Operator Health Report webview provides a comprehensive view of the Kube9 Operator's health and status for the connected cluster. It displays operator mode, tier, health status, version, registration status, and error information. The report is designed to start minimal and expand as the operator evolves.

## Architecture

### Component Structure

```
HealthReportPanel.ts (VSCode Extension)
  ├─ Creates and manages webview
  ├─ Queries OperatorStatusClient for status
  ├─ Sends status data to React component
  └─ Handles refresh commands

operator-health-report/
  └─ index.tsx (React Webview)
      ├─ Displays operator status information
      ├─ Handles refresh button clicks
      └─ Shows status-appropriate UI states
```

## Data Structures

### HealthReportData

Complete operator health information for webview display:

```typescript
interface HealthReportData {
  clusterContext: string;
  operatorStatus: OperatorStatusData;
  timestamp: number;
  cacheAge: number; // milliseconds since status was cached
}
```

### OperatorStatusData

Operator status information from OperatorStatusClient:

```typescript
interface OperatorStatusData {
  mode: 'basic' | 'operated' | 'enabled' | 'degraded';
  tier?: 'free' | 'pro';
  version?: string;
  health?: 'healthy' | 'degraded' | 'unhealthy';
  registered?: boolean;
  lastUpdate?: string; // ISO 8601 timestamp
  error?: string | null;
  clusterId?: string;
}
```

## Extension Implementation

### HealthReportPanel.ts

Webview panel class for Health Report:

```typescript
import * as vscode from 'vscode';
import { OperatorStatusClient } from '../cluster/OperatorStatusClient';

export class HealthReportPanel {
  public static currentPanel: HealthReportPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private readonly _statusClient: OperatorStatusClient;
  private readonly _kubeconfigPath: string;
  private readonly _contextName: string;

  public static async createOrShow(
    extensionUri: vscode.Uri,
    statusClient: OperatorStatusClient,
    kubeconfigPath: string,
    contextName: string
  ): Promise<void> {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (HealthReportPanel.currentPanel) {
      HealthReportPanel.currentPanel._panel.reveal(column);
      await HealthReportPanel.currentPanel._update();
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'kube9.operatorHealthReport',
      'Kube9 Operator Health',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'out', 'webview')
        ]
      }
    );

    HealthReportPanel.currentPanel = new HealthReportPanel(
      panel,
      extensionUri,
      statusClient,
      kubeconfigPath,
      contextName
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    statusClient: OperatorStatusClient,
    kubeconfigPath: string,
    contextName: string
  ) {
    this._panel = panel;
    this._statusClient = statusClient;
    this._kubeconfigPath = kubeconfigPath;
    this._contextName = contextName;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'refresh':
            await this._update(true); // Force refresh
            break;
          case 'copyClusterId':
            if (message.clusterId) {
              await vscode.env.clipboard.writeText(message.clusterId);
              vscode.window.showInformationMessage('Cluster ID copied to clipboard');
            }
            break;
        }
      },
      null,
      this._disposables
    );
  }

  private async _update(forceRefresh = false): Promise<void> {
    const webview = this._panel.webview;

    try {
      // Get operator status
      const cachedStatus = await this._statusClient.getStatus(
        this._kubeconfigPath,
        this._contextName,
        forceRefresh
      );

      // Prepare data for webview
      const data: HealthReportData = {
        clusterContext: this._contextName,
        operatorStatus: {
          mode: cachedStatus.mode,
          tier: cachedStatus.status?.tier,
          version: cachedStatus.status?.version,
          health: cachedStatus.status?.health,
          registered: cachedStatus.status?.registered,
          lastUpdate: cachedStatus.status?.lastUpdate,
          error: cachedStatus.status?.error,
          clusterId: cachedStatus.status?.clusterId
        },
        timestamp: Date.now(),
        cacheAge: Date.now() - cachedStatus.timestamp
      };

      // Send data to webview
      webview.postMessage({ command: 'update', data });

    } catch (error) {
      // Send error to webview
      webview.postMessage({
        command: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Update webview HTML if not already set
    if (!this._panel.webview.html) {
      this._panel.webview.html = this._getHtmlForWebview(webview);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Get script and style URIs
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._panel.webview.options.localResourceRoots![0],
        'operator-health-report.js'
      )
    );

    const nonce = this._getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <title>Kube9 Operator Health</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }

  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  public dispose(): void {
    HealthReportPanel.currentPanel = undefined;

    // Clean up resources
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
```

### Command Registration

Register command in `extension.ts`:

```typescript
// Register operator health report command
context.subscriptions.push(
  vscode.commands.registerCommand(
    'kube9.openOperatorHealthReport',
    async () => {
      const clusterManager = ClusterManager.getInstance();
      const currentCluster = clusterManager.getCurrentCluster();
      
      if (!currentCluster) {
        vscode.window.showWarningMessage('No cluster selected');
        return;
      }

      await HealthReportPanel.createOrShow(
        context.extensionUri,
        operatorStatusClient,
        currentCluster.kubeconfigPath,
        currentCluster.contextName
      );
    }
  )
);
```

## React Webview Implementation

### operator-health-report/index.tsx

Main React component for Health Report:

```typescript
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

interface HealthReportData {
  clusterContext: string;
  operatorStatus: OperatorStatusData;
  timestamp: number;
  cacheAge: number;
}

interface OperatorStatusData {
  mode: 'basic' | 'operated' | 'enabled' | 'degraded';
  tier?: 'free' | 'pro';
  version?: string;
  health?: 'healthy' | 'degraded' | 'unhealthy';
  registered?: boolean;
  lastUpdate?: string;
  error?: string | null;
  clusterId?: string;
}

const OperatorHealthReport: React.FC = () => {
  const [data, setData] = useState<HealthReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for messages from extension
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;
      
      switch (message.command) {
        case 'update':
          setData(message.data);
          setError(null);
          setLoading(false);
          break;
        case 'error':
          setError(message.error);
          setLoading(false);
          break;
      }
    };

    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    vscode.postMessage({ command: 'refresh' });
  };

  const handleCopyClusterId = (clusterId: string) => {
    vscode.postMessage({ command: 'copyClusterId', clusterId });
  };

  if (loading) {
    return <div className="loading">Loading operator status...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">Unable to fetch operator status: {error}</div>
        <button onClick={handleRefresh}>Retry</button>
      </div>
    );
  }

  if (!data) {
    return <div className="error-container">No data available</div>;
  }

  return (
    <div className="health-report">
      <header className="report-header">
        <h1>Kube9 Operator Health</h1>
        <button onClick={handleRefresh} className="refresh-button">
          Refresh
        </button>
      </header>

      {/* Stale status warning */}
      {data.cacheAge > 5 * 60 * 1000 && (
        <div className="warning-banner">
          ⚠️ Status data is stale (last updated {formatCacheAge(data.cacheAge)})
        </div>
      )}

      <div className="cluster-info">
        <strong>Cluster:</strong> {data.clusterContext}
      </div>

      {/* Render different UI based on mode */}
      {data.operatorStatus.mode === 'basic' ? (
        <BasicModeView />
      ) : (
        <OperatorStatusView status={data.operatorStatus} onCopyClusterId={handleCopyClusterId} />
      )}

      <div className="timestamp">
        Last checked: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

const BasicModeView: React.FC = () => {
  return (
    <div className="basic-mode">
      <div className="status-card">
        <h2>Kube9 Operator Not Installed</h2>
        <p>The Kube9 Operator is not currently installed in this cluster.</p>
        <div className="benefits">
          <h3>Benefits of Installing Kube9 Operator:</h3>
          <ul>
            <li>Enhanced cluster monitoring and health reporting</li>
            <li>AI-powered insights and recommendations</li>
            <li>Advanced dashboards and visualizations</li>
            <li>Automated drift detection and compliance</li>
          </ul>
        </div>
        <button className="install-button">How to Install</button>
      </div>
    </div>
  );
};

interface OperatorStatusViewProps {
  status: OperatorStatusData;
  onCopyClusterId: (clusterId: string) => void;
}

const OperatorStatusView: React.FC<OperatorStatusViewProps> = ({ status, onCopyClusterId }) => {
  return (
    <div className="operator-status">
      <div className="status-grid">
        <StatusCard label="Status Mode" value={getModeDisplay(status.mode, status.tier)} status={status.mode} />
        {status.tier && <StatusCard label="Tier" value={status.tier.toUpperCase()} />}
        {status.health && (
          <StatusCard
            label="Health"
            value={status.health.charAt(0).toUpperCase() + status.health.slice(1)}
            status={status.health}
          />
        )}
        {status.version && <StatusCard label="Version" value={status.version} />}
        {status.registered !== undefined && (
          <StatusCard
            label="Registered"
            value={status.registered ? 'Yes' : 'No'}
            status={status.registered ? 'healthy' : 'degraded'}
          />
        )}
        {status.lastUpdate && (
          <StatusCard label="Last Update" value={formatTimestamp(status.lastUpdate)} />
        )}
      </div>

      {status.clusterId && (
        <div className="cluster-id-section">
          <strong>Cluster ID:</strong>
          <code>{status.clusterId}</code>
          <button onClick={() => onCopyClusterId(status.clusterId!)}>Copy</button>
        </div>
      )}

      {status.error && (
        <div className="error-section">
          <h3>Error Details</h3>
          <div className="error-message">{status.error}</div>
        </div>
      )}

      {/* Placeholder for future metrics */}
      <div className="future-metrics">
        <h3>Additional Metrics</h3>
        <p className="placeholder-text">More operator metrics coming soon...</p>
      </div>
    </div>
  );
};

interface StatusCardProps {
  label: string;
  value: string;
  status?: 'healthy' | 'degraded' | 'unhealthy' | 'operated' | 'enabled' | 'basic';
}

const StatusCard: React.FC<StatusCardProps> = ({ label, value, status }) => {
  const statusClass = status ? `status-${status}` : '';
  
  return (
    <div className={`status-card ${statusClass}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
};

// Helper functions
function getModeDisplay(mode: string, tier?: string): string {
  switch (mode) {
    case 'basic':
      return 'Basic (No Operator)';
    case 'operated':
      return 'Operated (Free Tier)';
    case 'enabled':
      return 'Enabled (Pro Tier)';
    case 'degraded':
      return 'Degraded';
    default:
      return mode;
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = Date.now();
  const diff = now - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return date.toLocaleString();
}

function formatCacheAge(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60000);
  if (minutes < 1) return 'less than a minute ago';
  if (minutes === 1) return '1 minute ago';
  return `${minutes} minutes ago`;
}

// Initialize
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<OperatorHealthReport />);
}

// Make vscode API available
declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();
```

## Tree Integration

### OperatorSubcategory.ts

Replace ComplianceSubcategory with OperatorSubcategory:

```typescript
import * as vscode from 'vscode';
import { BaseTreeItem } from '../../BaseTreeItem';

export class OperatorSubcategory extends BaseTreeItem {
  constructor() {
    super('Kube9 Operator', vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = 'operatorSubcategory';
    this.iconPath = new vscode.ThemeIcon('shield');
  }

  async getChildren(): Promise<BaseTreeItem[]> {
    return [
      new HealthReportItem()
    ];
  }
}

class HealthReportItem extends BaseTreeItem {
  constructor() {
    super('Health', vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'operatorHealthReport';
    this.iconPath = new vscode.ThemeIcon('pulse');
    this.command = {
      command: 'kube9.openOperatorHealthReport',
      title: 'Open Operator Health Report',
      arguments: []
    };
    this.tooltip = 'View Kube9 Operator health and status';
  }
}
```

## Styling

### styles.css

Basic styling for Health Report (extends as features grow):

```css
.health-report {
  padding: 20px;
  font-family: var(--vscode-font-family);
  color: var(--vscode-foreground);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.report-header h1 {
  margin: 0;
  font-size: 24px;
}

.refresh-button {
  padding: 6px 12px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 2px;
  cursor: pointer;
}

.refresh-button:hover {
  background: var(--vscode-button-hoverBackground);
}

.warning-banner {
  background: var(--vscode-inputValidation-warningBackground);
  border: 1px solid var(--vscode-inputValidation-warningBorder);
  color: var(--vscode-inputValidation-warningForeground);
  padding: 12px;
  margin-bottom: 20px;
  border-radius: 4px;
}

.cluster-info {
  margin-bottom: 20px;
  padding: 10px;
  background: var(--vscode-editor-background);
  border-radius: 4px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.status-card {
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  padding: 16px;
}

.status-card .label {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  margin-bottom: 8px;
}

.status-card .value {
  font-size: 18px;
  font-weight: 600;
}

.status-healthy .value { color: #4caf50; }
.status-degraded .value { color: #ff9800; }
.status-unhealthy .value { color: #f44336; }
.status-enabled .value { color: #2196f3; }
.status-operated .value { color: #9c27b0; }

.cluster-id-section {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--vscode-editor-background);
  border-radius: 4px;
  margin-bottom: 20px;
}

.cluster-id-section code {
  flex: 1;
  padding: 8px;
  background: var(--vscode-textCodeBlock-background);
  border-radius: 2px;
}

.error-section {
  background: var(--vscode-inputValidation-errorBackground);
  border: 1px solid var(--vscode-inputValidation-errorBorder);
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.future-metrics {
  background: var(--vscode-editor-background);
  padding: 16px;
  border-radius: 4px;
  border: 1px dashed var(--vscode-panel-border);
}

.placeholder-text {
  color: var(--vscode-descriptionForeground);
  font-style: italic;
}

.basic-mode {
  text-align: center;
  padding: 40px;
}

.benefits {
  text-align: left;
  margin: 20px auto;
  max-width: 500px;
}

.install-button {
  padding: 10px 20px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: none;
  border-radius: 2px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 20px;
}
```

## Testing

### Unit Tests

- Parse operator status data correctly
- Handle missing optional fields
- Format timestamps in human-readable format
- Determine status mode correctly
- Handle stale status detection

### Integration Tests

- HealthReportPanel creates webview
- Panel queries OperatorStatusClient
- Refresh command bypasses cache
- Copy cluster ID to clipboard
- Error handling for failed status queries

### End-to-End Tests

- Click Health report opens webview
- Webview displays correct status for operated mode
- Webview displays correct status for enabled mode
- Webview shows basic mode when operator not installed
- Refresh button updates status
- Warning shown for stale status

## Non-Goals

- Operator installation UI (future feature)
- Historical metrics (future feature)
- Real-time status updates (future feature)
- Detailed resource metrics (future feature)
- Log viewing (future feature)

