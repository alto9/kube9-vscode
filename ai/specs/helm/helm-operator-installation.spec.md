---
spec_id: helm-operator-installation
name: Helm Operator 1-Click Installation
description: Technical specification for streamlined Kube9 Operator installation
feature_id:
  - helm-operator-quick-install
diagram_id:
  - helm-operator-installation-flow
---

# Helm Operator 1-Click Installation

## Overview

The 1-click operator installation provides a streamlined workflow for installing the Kube9 Operator with pre-configured defaults and optional API key entry for Pro tier features.

## Architecture

See [helm-operator-installation-flow](../../diagrams/helm/helm-operator-installation-flow.diagram.md) for workflow details.

## Featured Chart Configuration

### Operator Chart Metadata

```typescript
interface FeaturedOperatorChart {
  id: 'kube9-operator';
  name: 'Kube9 Operator';
  chart: 'kube9/kube9-operator';
  description: 'Advanced Kubernetes management for VS Code';
  documentation: 'https://alto9.github.io/kube9/';
  repository: 'kube9';
  defaultNamespace: 'kube9-system';
  defaultValues: {
    createNamespace: true;
    wait: true;
    timeout: '5m';
  };
}

const FEATURED_OPERATOR: FeaturedOperatorChart = {
  id: 'kube9-operator',
  name: 'Kube9 Operator',
  chart: 'kube9/kube9-operator',
  description: 'Advanced Kubernetes management for VS Code',
  documentation: 'https://alto9.github.io/kube9/',
  repository: 'kube9',
  defaultNamespace: 'kube9-system',
  defaultValues: {
    createNamespace: true,
    wait: true,
    timeout: '5m'
  }
};
```

### Installation Status Detection

```typescript
interface OperatorInstallationStatus {
  installed: boolean;
  version?: string;
  namespace?: string;
  upgradeAvailable: boolean;
  latestVersion?: string;
}

async function getOperatorStatus(): Promise<OperatorInstallationStatus> {
  // Check installed releases
  const releases = await helmService.listReleases({ allNamespaces: true });
  const operatorRelease = releases.find(r => 
    r.name === 'kube9-operator' || 
    r.chart.startsWith('kube9-operator-')
  );
  
  if (!operatorRelease) {
    return {
      installed: false,
      upgradeAvailable: false
    };
  }
  
  // Check for updates
  const search = await helmService.searchCharts('kube9/kube9-operator');
  const latestVersion = search[0]?.version;
  const currentVersion = operatorRelease.version;
  
  return {
    installed: true,
    version: currentVersion,
    namespace: operatorRelease.namespace,
    upgradeAvailable: latestVersion !== currentVersion,
    latestVersion
  };
}
```

## 1-Click Installation Flow

### Installation Modal

```typescript
interface OperatorInstallModalState {
  releaseName: string;
  namespace: string;
  apiKey: string;
  tier: 'free' | 'pro';
  acceptDefaults: boolean;
}

const DEFAULT_INSTALL_STATE: OperatorInstallModalState = {
  releaseName: 'kube9-operator',
  namespace: 'kube9-system',
  apiKey: '',
  tier: 'free',
  acceptDefaults: true
};
```

### Modal UI

```typescript
interface OperatorInstallModalProps {
  onInstall: (params: OperatorInstallParams) => Promise<void>;
  onCancel: () => void;
  operatorStatus: OperatorInstallationStatus;
}

// Modal sections:
// 1. Header: Kube9 Operator logo and description
// 2. Configuration:
//    - Release name (pre-filled: kube9-operator, read-only for simplicity)
//    - Namespace (pre-filled: kube9-system, editable)
//    - Create namespace checkbox (checked by default)
// 3. Pro Tier (collapsible):
//    - API key input (optional, password field)
//    - "Get API key" link → portal.kube9.dev
//    - Pro tier benefits list
// 4. Actions:
//    - "Install" button (primary)
//    - "Cancel" button (secondary)
//    - "Advanced Options" link (opens full install form)
```

### Install Operator Command

Extension command: `kube9.helm.installOperator`

```typescript
interface OperatorInstallParams {
  namespace: string;
  apiKey?: string;
}

async function installOperator(params: OperatorInstallParams): Promise<void> {
  try {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Installing Kube9 Operator...',
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: 'Preparing installation...' });
      
      // Ensure kube9 repository exists
      const repos = await helmService.listRepositories();
      if (!repos.some(r => r.name === 'kube9')) {
        progress.report({ increment: 10, message: 'Adding kube9 repository...' });
        await helmService.addRepository('kube9', 'https://charts.kube9.io');
      }
      
      progress.report({ increment: 20, message: 'Updating repository...' });
      await helmService.updateRepository('kube9');
      
      // Build install parameters
      const installParams: InstallParams = {
        releaseName: 'kube9-operator',
        chart: 'kube9/kube9-operator',
        namespace: params.namespace,
        createNamespace: true,
        wait: true,
        timeout: '5m',
        values: undefined
      };
      
      // Add API key to values if provided
      if (params.apiKey) {
        installParams.values = `apiKey: ${params.apiKey}`;
      }
      
      progress.report({ increment: 30, message: 'Installing chart...' });
      await helmService.installRelease(installParams);
      
      progress.report({ increment: 80, message: 'Verifying installation...' });
      
      // Wait for operator pod to be ready
      await waitForOperatorReady(params.namespace);
      
      progress.report({ increment: 100, message: 'Installation complete!' });
    });
    
    // Trigger operator detection
    await operatorService.detectOperator();
    
    // Refresh releases
    const releases = await helmService.listReleases();
    webview.postMessage({ type: 'releasesLoaded', data: releases });
    
    // Update featured section
    const status = await getOperatorStatus();
    webview.postMessage({ type: 'operatorStatusUpdated', data: status });
    
    // Show success message
    const message = params.apiKey
      ? 'Kube9 Operator installed successfully with Pro features enabled!'
      : 'Kube9 Operator installed successfully! Add an API key to enable Pro features.';
    
    const action = params.apiKey ? undefined : 'Add API Key';
    const result = await vscode.window.showInformationMessage(message, action);
    
    if (result === 'Add API Key') {
      // Open settings or upgrade flow
      vscode.commands.executeCommand('kube9.configureApiKey');
    }
  } catch (error) {
    throw new Error(`Operator installation failed: ${error.message}`);
  }
}
```

### Wait for Operator Ready

```typescript
async function waitForOperatorReady(
  namespace: string,
  timeout: number = 300000 // 5 minutes
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      // Check if operator pod is running
      const pods = await kubernetesClient.listPods(namespace, {
        labelSelector: 'app.kubernetes.io/name=kube9-operator'
      });
      
      const operatorPod = pods.find(p =>
        p.metadata.name.startsWith('kube9-operator-')
      );
      
      if (operatorPod && operatorPod.status.phase === 'Running') {
        // Check if container is ready
        const ready = operatorPod.status.containerStatuses?.every(c => c.ready);
        if (ready) {
          return; // Operator is ready
        }
      }
    } catch (error) {
      // Ignore errors and retry
    }
    
    // Wait 2 seconds before retrying
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Timeout waiting for operator to be ready');
}
```

## Operator Upgrade Flow

### Upgrade Detection

```typescript
// Periodically check for operator updates
class OperatorUpgradeChecker {
  private interval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 3600000; // 1 hour
  
  start(callback: (upgradeAvailable: boolean, version: string) => void): void {
    this.interval = setInterval(async () => {
      const status = await getOperatorStatus();
      if (status.installed && status.upgradeAvailable) {
        callback(true, status.latestVersion!);
      }
    }, this.CHECK_INTERVAL);
  }
  
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
```

### Upgrade Notification

```typescript
async function notifyOperatorUpgrade(latestVersion: string): Promise<void> {
  const message = `Kube9 Operator update available: ${latestVersion}`;
  const result = await vscode.window.showInformationMessage(
    message,
    'Upgrade Now',
    'View Changes',
    'Later'
  );
  
  if (result === 'Upgrade Now') {
    await upgradeOperator(latestVersion);
  } else if (result === 'View Changes') {
    vscode.env.openExternal(vscode.Uri.parse(
      `https://github.com/alto9/kube9-operator/releases/tag/v${latestVersion}`
    ));
  }
}
```

### Upgrade Operator Command

Extension command: `kube9.helm.upgradeOperator`

```typescript
async function upgradeOperator(targetVersion?: string): Promise<void> {
  const status = await getOperatorStatus();
  
  if (!status.installed) {
    throw new Error('Operator is not installed');
  }
  
  const upgradeParams: UpgradeParams = {
    releaseName: 'kube9-operator',
    chart: 'kube9/kube9-operator',
    namespace: status.namespace!,
    version: targetVersion,
    reuseValues: true, // Preserve existing configuration
    wait: true,
    timeout: '5m'
  };
  
  await upgradeRelease(upgradeParams);
  
  // Notify operator service of upgrade
  await operatorService.detectOperator();
}
```

## Featured Section UI

### Operator Card

```typescript
interface OperatorCardProps {
  status: OperatorInstallationStatus;
  onInstall: () => void;
  onUpgrade: () => void;
  onConfigure: () => void;
}

// Card displays:
// - Kube9 logo icon
// - "Kube9 Operator" title
// - Description text
// - Status badge (Not Installed, Installed, Update Available)
// - Primary action button:
//   - "Install Now" (if not installed)
//   - "Upgrade" with version badge (if update available)
//   - "Installed" checkmark (if current)
// - Secondary actions:
//   - "Documentation" link
//   - "View Values" link
//   - "Configure" button (if installed)
```

### Status Badge

```typescript
function getOperatorStatusBadge(status: OperatorInstallationStatus): React.ReactNode {
  if (!status.installed) {
    return <Badge color="gray">Not Installed</Badge>;
  } else if (status.upgradeAvailable) {
    return (
      <Badge color="yellow">
        Update Available: {status.latestVersion}
      </Badge>
    );
  } else {
    return (
      <Badge color="green">
        <CheckIcon /> Installed v{status.version}
      </Badge>
    );
  }
}
```

## API Key Management

### API Key Input

```typescript
interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidate: (valid: boolean) => void;
}

// API key format validation
function validateApiKey(key: string): boolean {
  // Kube9 API keys start with "kdy_" prefix
  return key.startsWith('kdy_') && key.length > 10;
}
```

### API Key Storage

```typescript
// Store API key securely in VS Code secrets
async function storeApiKey(apiKey: string): Promise<void> {
  await context.secrets.store('kube9.apiKey', apiKey);
}

async function retrieveApiKey(): Promise<string | undefined> {
  return await context.secrets.get('kube9.apiKey');
}
```

## Post-Installation Actions

### Enable Features

```typescript
async function enableProFeatures(): Promise<void> {
  // Update extension configuration
  await vscode.workspace.getConfiguration('kube9').update(
    'features.proEnabled',
    true,
    vscode.ConfigurationTarget.Global
  );
  
  // Refresh UI to show Pro features
  vscode.commands.executeCommand('kube9.refreshClusters');
  
  // Show welcome notification
  vscode.window.showInformationMessage(
    'Pro features enabled! Explore advanced dashboards and AI-powered insights.',
    'Open Dashboard'
  ).then(result => {
    if (result === 'Open Dashboard') {
      vscode.commands.executeCommand('kube9.openDashboard');
    }
  });
}
```

