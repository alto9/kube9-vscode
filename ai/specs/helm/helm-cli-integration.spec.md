---
spec_id: helm-cli-integration
name: Helm CLI Integration
description: Technical specification for executing and parsing Helm CLI commands
feature_id:
  - helm-repository-management
  - helm-chart-discovery
  - helm-chart-installation
  - helm-release-management
diagram_id:
  - helm-package-manager-architecture
---

# Helm CLI Integration

## Overview

The Helm CLI Integration service wraps Helm 3.x command-line tool execution using Node.js child_process.spawn, similar to the existing kubectl integration pattern.

## Architecture

See [helm-package-manager-architecture](../../diagrams/helm/helm-package-manager-architecture.diagram.md) for service architecture.

## Helm Service Class

### Service Interface

```typescript
interface IHelmService {
  // Repository operations
  listRepositories(): Promise<HelmRepository[]>;
  addRepository(name: string, url: string): Promise<void>;
  updateRepository(name: string): Promise<void>;
  removeRepository(name: string): Promise<void>;
  
  // Chart operations
  searchCharts(query: string): Promise<ChartSearchResult[]>;
  getChartDetails(chart: string): Promise<ChartDetails>;
  getChartValues(chart: string): Promise<string>;
  getChartReadme(chart: string): Promise<string>;
  
  // Release operations
  listReleases(namespace?: string): Promise<HelmRelease[]>;
  getReleaseDetails(name: string, namespace: string): Promise<ReleaseDetails>;
  getReleaseHistory(name: string, namespace: string): Promise<ReleaseRevision[]>;
  getReleaseValues(name: string, namespace: string): Promise<string>;
  getReleaseManifest(name: string, namespace: string): Promise<string>;
  installRelease(params: InstallParams): Promise<void>;
  upgradeRelease(params: UpgradeParams): Promise<void>;
  rollbackRelease(name: string, namespace: string, revision: number): Promise<void>;
  uninstallRelease(name: string, namespace: string): Promise<void>;
  
  // Utility operations
  version(): Promise<string>;
  dryRun(params: InstallParams): Promise<string>;
}
```

## Command Execution

### Spawn Pattern

```typescript
class HelmService implements IHelmService {
  private async executeCommand(
    args: string[],
    options?: { input?: string }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const helm = spawn('helm', args, {
        env: { ...process.env, KUBECONFIG: this.kubeconfigPath },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      helm.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      helm.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      if (options?.input) {
        helm.stdin.write(options.input);
        helm.stdin.end();
      }
      
      helm.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || stdout));
        }
      });
      
      helm.on('error', (err) => {
        reject(new Error(`Failed to spawn helm: ${err.message}`));
      });
    });
  }
}
```

### Environment Configuration

```typescript
interface HelmEnvironment {
  KUBECONFIG: string;
  HELM_CACHE_HOME?: string;
  HELM_CONFIG_HOME?: string;
  HELM_DATA_HOME?: string;
}

// Use current cluster's kubeconfig
const kubeconfigPath = vscode.workspace.getConfiguration('kube9').get<string>('kubeconfigPath');
```

## Repository Commands

### List Repositories

```typescript
async listRepositories(): Promise<HelmRepository[]> {
  const output = await this.executeCommand(['repo', 'list', '--output', 'json']);
  const repos = JSON.parse(output) as Array<{
    name: string;
    url: string;
  }>;
  
  return repos.map(repo => ({
    name: repo.name,
    url: repo.url,
    chartCount: 0, // Fetched separately
    lastUpdated: new Date()
  }));
}
```

### Add Repository

```typescript
async addRepository(name: string, url: string): Promise<void> {
  await this.executeCommand(['repo', 'add', name, url]);
}
```

### Update Repository

```typescript
async updateRepository(name: string): Promise<void> {
  await this.executeCommand(['repo', 'update', name]);
}
```

### Remove Repository

```typescript
async removeRepository(name: string): Promise<void> {
  await this.executeCommand(['repo', 'remove', name]);
}
```

## Chart Commands

### Search Charts

```typescript
async searchCharts(query: string): Promise<ChartSearchResult[]> {
  const output = await this.executeCommand([
    'search', 'repo', query,
    '--output', 'json',
    '--max-col-width', '0'
  ]);
  
  const results = JSON.parse(output) as Array<{
    name: string;
    version: string;
    app_version: string;
    description: string;
  }>;
  
  return results.map(r => ({
    name: r.name,
    version: r.version,
    appVersion: r.app_version,
    description: r.description,
    repository: r.name.split('/')[0]
  }));
}
```

### Get Chart Details

```typescript
async getChartDetails(chart: string): Promise<ChartDetails> {
  const [readme, values] = await Promise.all([
    this.getChartReadme(chart),
    this.getChartValues(chart)
  ]);
  
  return {
    name: chart,
    readme,
    values,
    versions: await this.getChartVersions(chart)
  };
}
```

### Get Chart Values

```typescript
async getChartValues(chart: string): Promise<string> {
  return await this.executeCommand(['show', 'values', chart]);
}
```

### Get Chart README

```typescript
async getChartReadme(chart: string): Promise<string> {
  return await this.executeCommand(['show', 'readme', chart]);
}
```

## Release Commands

### List Releases

```typescript
async listReleases(namespace?: string): Promise<HelmRelease[]> {
  const args = ['list', '--output', 'json'];
  
  if (namespace) {
    args.push('--namespace', namespace);
  } else {
    args.push('--all-namespaces');
  }
  
  const output = await this.executeCommand(args);
  const releases = JSON.parse(output) as Array<{
    name: string;
    namespace: string;
    revision: string;
    updated: string;
    status: string;
    chart: string;
    app_version: string;
  }>;
  
  return releases.map(r => ({
    name: r.name,
    namespace: r.namespace,
    revision: parseInt(r.revision),
    updated: new Date(r.updated),
    status: r.status as ReleaseStatus,
    chart: r.chart,
    appVersion: r.app_version
  }));
}
```

### Install Release

```typescript
async installRelease(params: InstallParams): Promise<void> {
  const args = [
    'install', params.releaseName, params.chart,
    '--namespace', params.namespace,
    '--create-namespace'
  ];
  
  if (params.values) {
    // Write values to temp file
    const valuesFile = await this.writeTempValues(params.values);
    args.push('--values', valuesFile);
  }
  
  if (params.version) {
    args.push('--version', params.version);
  }
  
  if (params.wait) {
    args.push('--wait');
  }
  
  await this.executeCommand(args);
}
```

### Upgrade Release

```typescript
async upgradeRelease(params: UpgradeParams): Promise<void> {
  const args = [
    'upgrade', params.releaseName, params.chart,
    '--namespace', params.namespace
  ];
  
  if (params.reuseValues) {
    args.push('--reuse-values');
  }
  
  if (params.values) {
    const valuesFile = await this.writeTempValues(params.values);
    args.push('--values', valuesFile);
  }
  
  if (params.version) {
    args.push('--version', params.version);
  }
  
  await this.executeCommand(args);
}
```

### Rollback Release

```typescript
async rollbackRelease(name: string, namespace: string, revision: number): Promise<void> {
  await this.executeCommand([
    'rollback', name, revision.toString(),
    '--namespace', namespace
  ]);
}
```

### Uninstall Release

```typescript
async uninstallRelease(name: string, namespace: string): Promise<void> {
  await this.executeCommand([
    'uninstall', name,
    '--namespace', namespace
  ]);
}
```

### Get Release History

```typescript
async getReleaseHistory(name: string, namespace: string): Promise<ReleaseRevision[]> {
  const output = await this.executeCommand([
    'history', name,
    '--namespace', namespace,
    '--output', 'json'
  ]);
  
  const history = JSON.parse(output) as Array<{
    revision: number;
    updated: string;
    status: string;
    chart: string;
    app_version: string;
    description: string;
  }>;
  
  return history.map(h => ({
    revision: h.revision,
    updated: new Date(h.updated),
    status: h.status,
    chart: h.chart,
    appVersion: h.app_version,
    description: h.description
  }));
}
```

## Error Handling

### Helm CLI Errors

```typescript
class HelmError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly exitCode: number,
    public readonly stderr: string
  ) {
    super(message);
    this.name = 'HelmError';
  }
}

// Parse common errors
function parseHelmError(stderr: string): string {
  if (stderr.includes('not found')) {
    return 'Chart or release not found';
  } else if (stderr.includes('already exists')) {
    return 'Release already exists';
  } else if (stderr.includes('connection refused')) {
    return 'Unable to connect to Kubernetes cluster';
  }
  return stderr;
}
```

### Version Check

```typescript
async checkHelmVersion(): Promise<void> {
  try {
    const version = await this.version();
    const match = version.match(/v(\d+)\.(\d+)\.(\d+)/);
    
    if (match) {
      const major = parseInt(match[1]);
      if (major < 3) {
        throw new Error('Helm 3.x or higher is required');
      }
    }
  } catch (error) {
    throw new Error('Helm CLI not found. Please install Helm 3.x');
  }
}
```

## Temp File Management

```typescript
private async writeTempValues(values: string): Promise<string> {
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `helm-values-${Date.now()}.yaml`);
  await fs.promises.writeFile(tmpFile, values, 'utf8');
  
  // Schedule cleanup
  setTimeout(() => {
    fs.promises.unlink(tmpFile).catch(() => {});
  }, 60000); // Clean up after 1 minute
  
  return tmpFile;
}
```

## Progress Reporting

```typescript
interface ProgressCallback {
  (operation: string, progress: number, message: string): void;
}

// Emit progress during long operations
async installRelease(
  params: InstallParams,
  onProgress?: ProgressCallback
): Promise<void> {
  onProgress?.('install', 0, 'Starting installation...');
  
  // Execute command with progress updates
  await this.executeCommand(args);
  
  onProgress?.('install', 100, 'Installation complete');
}
```

