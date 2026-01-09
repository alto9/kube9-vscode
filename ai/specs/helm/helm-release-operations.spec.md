---
spec_id: helm-release-operations
name: Helm Release Operations
description: Technical specification for managing installed Helm releases
feature_id:
  - helm-release-management
  - helm-release-upgrade
  - helm-release-rollback
diagram_id:
  - helm-release-management-flow
---

# Helm Release Operations

## Overview

Release operations manage the lifecycle of installed Helm releases, including listing, upgrading, rolling back, and uninstalling releases.

## Architecture

See [helm-release-management-flow](../../diagrams/helm/helm-release-management-flow.diagram.md) for workflow details.

## List Releases

### List Command

Extension command: `kube9.helm.listReleases`

```typescript
interface ListReleasesParams {
  namespace?: string;      // Optional: filter by namespace
  allNamespaces: boolean;  // List from all namespaces
  status?: ReleaseStatus;  // Filter by status
}

type ReleaseStatus = 'deployed' | 'failed' | 'pending-install' | 'pending-upgrade' | 'pending-rollback' | 'superseded' | 'uninstalled' | 'uninstalling' | 'unknown';

async function listReleases(params: ListReleasesParams): Promise<HelmRelease[]> {
  const args = ['list', '--output', 'json'];
  
  if (params.allNamespaces) {
    args.push('--all-namespaces');
  } else if (params.namespace) {
    args.push('--namespace', params.namespace);
  }
  
  if (params.status) {
    args.push('--filter', params.status);
  }
  
  const output = await helmService.executeCommand(args);
  return JSON.parse(output);
}
```

### Release Status Indicators

```typescript
function getReleaseStatusIndicator(release: HelmRelease): StatusIndicator {
  if (release.status === 'deployed') {
    return {
      icon: '🟢',
      color: 'green',
      label: 'Deployed',
      description: 'Release is deployed and healthy'
    };
  } else if (release.status === 'failed') {
    return {
      icon: '🔴',
      color: 'red',
      label: 'Failed',
      description: 'Release deployment failed'
    };
  } else if (release.status.startsWith('pending')) {
    return {
      icon: '🟡',
      color: 'yellow',
      label: 'Pending',
      description: 'Operation in progress'
    };
  }
  // ... other statuses
}
```

### Upgrade Availability Detection

```typescript
interface UpgradeCheck {
  hasUpgrade: boolean;
  currentVersion: string;
  latestVersion: string;
}

async function checkUpgradeAvailability(release: HelmRelease): Promise<UpgradeCheck> {
  // Extract chart name from release
  const chartName = release.chart.split('-')[0]; // "chart-version" -> "chart"
  const repo = await helmService.getChartRepository(chartName);
  
  if (!repo) {
    return {
      hasUpgrade: false,
      currentVersion: release.version,
      latestVersion: release.version
    };
  }
  
  // Search for chart to get latest version
  const results = await helmService.searchCharts(`${repo}/${chartName}`);
  if (results.length === 0) {
    return {
      hasUpgrade: false,
      currentVersion: release.version,
      latestVersion: release.version
    };
  }
  
  const latestVersion = results[0].version;
  const hasUpgrade = latestVersion !== release.version;
  
  return {
    hasUpgrade,
    currentVersion: release.version,
    latestVersion
  };
}
```

## Release Details

### Get Release Details

Extension command: `kube9.helm.getReleaseDetails`

```typescript
interface ReleaseDetails {
  name: string;
  namespace: string;
  chart: string;
  version: string;
  appVersion: string;
  status: ReleaseStatus;
  revision: number;
  updated: Date;
  description: string;
  notes: string;
  manifest: string;
  values: string;
  history: ReleaseRevision[];
}

async function getReleaseDetails(name: string, namespace: string): Promise<ReleaseDetails> {
  // Fetch details in parallel
  const [status, manifest, values, history] = await Promise.all([
    helmService.getReleaseStatus(name, namespace),
    helmService.getReleaseManifest(name, namespace),
    helmService.getReleaseValues(name, namespace),
    helmService.getReleaseHistory(name, namespace)
  ]);
  
  return {
    ...status,
    manifest,
    values,
    history
  };
}
```

### Release Detail Modal

```typescript
interface ReleaseDetailModalProps {
  release: string;
  namespace: string;
  onUpgrade: () => void;
  onRollback: (revision: number) => void;
  onUninstall: () => void;
  onClose: () => void;
}

// Modal tabs:
// 1. Info: Status, chart, version, namespace, revision
// 2. Manifest: Deployed Kubernetes resources (YAML)
// 3. Values: Current chart values (YAML)
// 4. History: Revision history with rollback actions
```

## Upgrade Release

### Upgrade Parameters

```typescript
interface UpgradeParams {
  releaseName: string;
  chart: string;
  namespace: string;
  version?: string;
  values?: string;
  reuseValues: boolean;
  wait: boolean;
  timeout?: string;
}
```

### Upgrade Modal

```typescript
interface UpgradeModalState {
  currentVersion: string;
  targetVersion: string;
  reuseValues: boolean;
  customValues: string;
  showValuesDiff: boolean;
}

// Modal displays:
// - Current version vs available versions dropdown
// - Reuse existing values checkbox (default: true)
// - Custom values editor (optional)
// - Values diff view (if custom values provided)
// - Upgrade button with confirmation
```

### Upgrade Command

Extension command: `kube9.helm.upgradeRelease`

```typescript
async function upgradeRelease(params: UpgradeParams): Promise<void> {
  try {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Upgrading ${params.releaseName}...`,
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: 'Starting upgrade...' });
      
      const args = [
        'upgrade', params.releaseName, params.chart,
        '--namespace', params.namespace
      ];
      
      if (params.reuseValues) {
        args.push('--reuse-values');
      }
      
      if (params.values) {
        const valuesFile = await helmService.writeTempValues(params.values);
        args.push('--values', valuesFile);
      }
      
      if (params.version) {
        args.push('--version', params.version);
      }
      
      if (params.wait) {
        args.push('--wait');
      }
      
      progress.report({ increment: 30, message: 'Executing upgrade...' });
      
      await helmService.executeCommand(args);
      
      progress.report({ increment: 70, message: 'Upgrade complete' });
    });
    
    // Refresh releases
    const releases = await helmService.listReleases();
    webview.postMessage({ type: 'releasesLoaded', data: releases });
    
    vscode.window.showInformationMessage(
      `Successfully upgraded ${params.releaseName}`
    );
  } catch (error) {
    throw new Error(`Upgrade failed: ${error.message}`);
  }
}
```

## Rollback Release

### Release History

```typescript
interface ReleaseRevision {
  revision: number;
  updated: Date;
  status: string;
  chart: string;
  appVersion: string;
  description: string;
}

async function getReleaseHistory(name: string, namespace: string): Promise<ReleaseRevision[]> {
  const output = await helmService.executeCommand([
    'history', name,
    '--namespace', namespace,
    '--output', 'json'
  ]);
  
  return JSON.parse(output);
}
```

### Rollback Confirmation

```typescript
interface RollbackConfirmation {
  releaseName: string;
  currentRevision: number;
  targetRevision: number;
  targetChart: string;
}

async function confirmRollback(params: RollbackConfirmation): Promise<boolean> {
  const message = `Roll back ${params.releaseName} to revision ${params.targetRevision}?`;
  const detail = `Current revision: ${params.currentRevision}\nTarget: ${params.targetChart}`;
  
  const result = await vscode.window.showWarningMessage(
    message,
    { modal: true, detail },
    'Rollback',
    'Cancel'
  );
  
  return result === 'Rollback';
}
```

### Rollback Command

Extension command: `kube9.helm.rollbackRelease`

```typescript
async function rollbackRelease(
  name: string,
  namespace: string,
  revision: number
): Promise<void> {
  try {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Rolling back ${name}...`,
      cancellable: false
    }, async () => {
      await helmService.executeCommand([
        'rollback', name, revision.toString(),
        '--namespace', namespace
      ]);
    });
    
    // Refresh releases
    const releases = await helmService.listReleases();
    webview.postMessage({ type: 'releasesLoaded', data: releases });
    
    vscode.window.showInformationMessage(
      `Successfully rolled back ${name} to revision ${revision}`
    );
  } catch (error) {
    throw new Error(`Rollback failed: ${error.message}`);
  }
}
```

## Uninstall Release

### Uninstall Confirmation

```typescript
interface UninstallConfirmation {
  releaseName: string;
  namespace: string;
  chart: string;
}

async function confirmUninstall(params: UninstallConfirmation): Promise<boolean> {
  const message = `Permanently uninstall ${params.releaseName}?`;
  const detail = `This will remove all resources created by this release.\nChart: ${params.chart}\nNamespace: ${params.namespace}`;
  
  const result = await vscode.window.showWarningMessage(
    message,
    { modal: true, detail },
    { title: 'Uninstall', isCloseAffordance: false },
    { title: 'Cancel', isCloseAffordance: true }
  );
  
  return result?.title === 'Uninstall';
}
```

### Uninstall Command

Extension command: `kube9.helm.uninstallRelease`

```typescript
async function uninstallRelease(name: string, namespace: string): Promise<void> {
  try {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Uninstalling ${name}...`,
      cancellable: false
    }, async () => {
      await helmService.executeCommand([
        'uninstall', name,
        '--namespace', namespace
      ]);
    });
    
    // Refresh releases
    const releases = await helmService.listReleases();
    webview.postMessage({ type: 'releasesLoaded', data: releases });
    
    vscode.window.showInformationMessage(
      `Successfully uninstalled ${name}`
    );
  } catch (error) {
    throw new Error(`Uninstall failed: ${error.message}`);
  }
}
```

## Release Filtering

### Filter Options

```typescript
interface ReleaseFilters {
  namespace: string | 'all';
  status: ReleaseStatus | 'all';
  searchQuery: string;
}

function filterReleases(
  releases: HelmRelease[],
  filters: ReleaseFilters
): HelmRelease[] {
  let filtered = releases;
  
  // Filter by namespace
  if (filters.namespace !== 'all') {
    filtered = filtered.filter(r => r.namespace === filters.namespace);
  }
  
  // Filter by status
  if (filters.status !== 'all') {
    filtered = filtered.filter(r => r.status === filters.status);
  }
  
  // Filter by search query
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(r =>
      r.name.toLowerCase().includes(query) ||
      r.chart.toLowerCase().includes(query)
    );
  }
  
  return filtered;
}
```

### Filter UI

```typescript
interface ReleaseFiltersProps {
  filters: ReleaseFilters;
  namespaces: string[];
  onFilterChange: (filters: ReleaseFilters) => void;
}

// Filter UI displays:
// - Namespace dropdown (All, or specific namespace)
// - Status dropdown (All, Deployed, Failed, Pending)
// - Search input (filter by name or chart)
// - Clear filters button
```

## Status Monitoring

### Polling for Updates

```typescript
class ReleaseStatusMonitor {
  private interval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL = 30000; // 30 seconds
  
  start(callback: (releases: HelmRelease[]) => void): void {
    this.interval = setInterval(async () => {
      try {
        const releases = await helmService.listReleases();
        callback(releases);
      } catch (error) {
        console.error('Failed to poll releases:', error);
      }
    }, this.POLL_INTERVAL);
  }
  
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
```

### Real-time Status Updates

```typescript
// When webview is visible, poll for release updates
let statusMonitor: ReleaseStatusMonitor | null = null;

webviewPanel.onDidChangeViewState((e) => {
  if (e.webviewPanel.visible) {
    // Start monitoring
    statusMonitor = new ReleaseStatusMonitor();
    statusMonitor.start((releases) => {
      webviewPanel.webview.postMessage({
        type: 'releasesLoaded',
        data: releases
      });
    });
  } else {
    // Stop monitoring
    statusMonitor?.stop();
    statusMonitor = null;
  }
});
```

