---
spec_id: helm-chart-operations
name: Helm Chart Operations
description: Technical specification for chart discovery, search, and installation
feature_id:
  - helm-chart-discovery
  - helm-chart-installation
diagram_id:
  - helm-chart-installation-flow
---

# Helm Chart Operations

## Overview

Chart operations enable users to discover, search, review, and install Helm charts from configured repositories.

## Architecture

See [helm-chart-installation-flow](../../diagrams/helm/helm-chart-installation-flow.diagram.md) for workflow details.

## Chart Search

### Search Command

Extension command: `kube9.helm.searchCharts`

```typescript
interface ChartSearchParams {
  query: string;
  repository?: string;  // Optional: limit to specific repo
  maxResults?: number;
}

async function searchCharts(params: ChartSearchParams): Promise<ChartSearchResult[]> {
  const args = ['search', 'repo', params.query, '--output', 'json'];
  
  if (params.repository) {
    args.push('--regexp', `^${params.repository}/`);
  }
  
  if (params.maxResults) {
    args.push('--max-col-width', '0');
  }
  
  const output = await helmService.executeCommand(args);
  const results = JSON.parse(output);
  
  return results.map(r => ({
    name: r.name,
    version: r.version,
    appVersion: r.app_version,
    description: r.description,
    repository: r.name.split('/')[0],
    chart: r.name.split('/')[1]
  }));
}
```

### Search Debouncing

```typescript
class SearchDebouncer {
  private timeout: NodeJS.Timeout | null = null;
  private readonly delay: number = 300; // 300ms
  
  debounce(callback: () => void): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    
    this.timeout = setTimeout(() => {
      callback();
      this.timeout = null;
    }, this.delay);
  }
}
```

## Chart Details

### Get Chart Details

Extension command: `kube9.helm.getChartDetails`

```typescript
interface ChartDetails {
  name: string;
  description: string;
  readme: string;
  values: string;
  versions: string[];
  maintainers: ChartMaintainer[];
  keywords: string[];
  home: string;
}

async function getChartDetails(chart: string): Promise<ChartDetails> {
  // Fetch chart information in parallel
  const [readme, values, versions] = await Promise.all([
    helmService.getChartReadme(chart),
    helmService.getChartValues(chart),
    helmService.getChartVersions(chart)
  ]);
  
  return {
    name: chart,
    readme,
    values,
    versions,
    maintainers: [],
    keywords: [],
    home: ''
  };
}
```

### Chart Detail Modal

```typescript
interface ChartDetailModalProps {
  chart: string;
  onInstall: (chart: string, version?: string) => void;
  onClose: () => void;
}

// Modal tabs:
// 1. README: Markdown-rendered chart documentation
// 2. Values: YAML-formatted default values with comments
// 3. Versions: List of available versions with release dates
```

## Chart Installation

### Installation Parameters

```typescript
interface InstallParams {
  releaseName: string;
  chart: string;
  namespace: string;
  createNamespace: boolean;
  values?: string;           // YAML values
  version?: string;
  wait: boolean;            // Wait for resources to be ready
  timeout?: string;         // Timeout duration (e.g., "5m")
  dryRun: boolean;
}
```

### Installation Form

```typescript
interface InstallFormState {
  releaseName: string;
  namespace: string;
  createNamespace: boolean;
  version: string;
  values: string;
  editMode: 'yaml' | 'form';
  validation: ValidationErrors;
}

function validateInstallForm(state: InstallFormState): ValidationErrors {
  const errors: ValidationErrors = {};
  
  // Release name validation
  if (!state.releaseName) {
    errors.releaseName = 'Release name is required';
  } else if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(state.releaseName)) {
    errors.releaseName = 'Invalid release name format';
  }
  
  // Namespace validation
  if (!state.namespace) {
    errors.namespace = 'Namespace is required';
  } else if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(state.namespace)) {
    errors.namespace = 'Invalid namespace format';
  }
  
  // Values validation (if YAML mode)
  if (state.editMode === 'yaml' && state.values) {
    try {
      yaml.parse(state.values);
    } catch (e) {
      errors.values = 'Invalid YAML syntax';
    }
  }
  
  return errors;
}
```

### Install Chart Command

Extension command: `kube9.helm.installChart`

```typescript
async function installChart(params: InstallParams): Promise<void> {
  try {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Installing ${params.chart}...`,
      cancellable: false
    }, async (progress) => {
      progress.report({ increment: 0, message: 'Starting installation...' });
      
      // Write values to temp file if provided
      let valuesFile: string | undefined;
      if (params.values) {
        valuesFile = await helmService.writeTempValues(params.values);
      }
      
      // Build install command
      const args = [
        'install', params.releaseName, params.chart,
        '--namespace', params.namespace
      ];
      
      if (params.createNamespace) {
        args.push('--create-namespace');
      }
      
      if (valuesFile) {
        args.push('--values', valuesFile);
      }
      
      if (params.version) {
        args.push('--version', params.version);
      }
      
      if (params.wait) {
        args.push('--wait');
      }
      
      if (params.timeout) {
        args.push('--timeout', params.timeout);
      }
      
      progress.report({ increment: 30, message: 'Executing helm install...' });
      
      // Execute installation
      await helmService.executeCommand(args);
      
      progress.report({ increment: 70, message: 'Installation complete' });
    });
    
    // Refresh releases list
    const releases = await helmService.listReleases();
    webview.postMessage({ type: 'releasesLoaded', data: releases });
    
    // Show success notification
    vscode.window.showInformationMessage(
      `Successfully installed ${params.chart} as ${params.releaseName}`
    );
  } catch (error) {
    throw new Error(`Installation failed: ${error.message}`);
  }
}
```

### Dry Run

Extension command: `kube9.helm.dryRunInstall`

```typescript
async function dryRunInstall(params: InstallParams): Promise<string> {
  const args = [
    'install', params.releaseName, params.chart,
    '--namespace', params.namespace,
    '--dry-run',
    '--debug'
  ];
  
  if (params.values) {
    const valuesFile = await helmService.writeTempValues(params.values);
    args.push('--values', valuesFile);
  }
  
  if (params.version) {
    args.push('--version', params.version);
  }
  
  const output = await helmService.executeCommand(args);
  return output; // Returns manifest that would be installed
}
```

## Values Editor

### YAML Mode

```typescript
interface YAMLEditorProps {
  initialValues: string;
  onChange: (values: string) => void;
  onValidate: (errors: string[]) => void;
}

// Features:
// - Syntax highlighting for YAML
// - Real-time validation
// - Error indicators
// - Format/prettify button
```

### Form Mode

```typescript
interface FormEditorProps {
  schema: ValuesSchema;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
}

interface ValuesSchema {
  fields: FormField[];
}

interface FormField {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  default?: any;
  required: boolean;
  options?: string[];  // For select type
}

// Parse comments from values.yaml to generate schema
function parseValuesSchema(valuesYaml: string): ValuesSchema {
  const lines = valuesYaml.split('\n');
  const fields: FormField[] = [];
  
  // Parse YAML with comments to extract field metadata
  // Implementation omitted for brevity
  
  return { fields };
}
```

### Mode Switching

```typescript
interface EditorState {
  mode: 'yaml' | 'form';
  yamlValues: string;
  formValues: Record<string, any>;
}

function switchEditorMode(
  currentMode: 'yaml' | 'form',
  state: EditorState
): EditorState {
  if (currentMode === 'yaml') {
    // Convert YAML to form values
    const formValues = yaml.parse(state.yamlValues);
    return { ...state, mode: 'form', formValues };
  } else {
    // Convert form values to YAML
    const yamlValues = yaml.stringify(state.formValues);
    return { ...state, mode: 'yaml', yamlValues };
  }
}
```

## Namespace Selection

### Namespace Dropdown

```typescript
interface NamespaceDropdownProps {
  selectedNamespace: string;
  onSelect: (namespace: string) => void;
  allowCreate: boolean;
}

async function loadNamespaces(): Promise<string[]> {
  // Use existing KubernetesApiClient to fetch namespaces
  const namespaces = await kubernetesClient.listNamespaces();
  return namespaces.map(ns => ns.metadata.name);
}
```

### Create Namespace Option

```typescript
interface CreateNamespaceOption {
  enabled: boolean;
  namespaceName: string;
}

// When createNamespace is enabled:
// - Checkbox shown in form
// - If checked, --create-namespace flag added to helm install
// - Namespace created automatically during installation
```

## Error Handling

### Installation Errors

```typescript
enum InstallErrorType {
  AlreadyExists = 'ALREADY_EXISTS',
  InvalidValues = 'INVALID_VALUES',
  ChartNotFound = 'CHART_NOT_FOUND',
  Timeout = 'TIMEOUT',
  ResourceConflict = 'RESOURCE_CONFLICT'
}

function parseInstallError(error: string): { type: InstallErrorType; message: string } {
  if (error.includes('already exists')) {
    return {
      type: InstallErrorType.AlreadyExists,
      message: 'A release with this name already exists in the namespace'
    };
  } else if (error.includes('timed out')) {
    return {
      type: InstallErrorType.Timeout,
      message: 'Installation timed out waiting for resources to be ready'
    };
  }
  // ... other error patterns
  
  return {
    type: InstallErrorType.Unknown,
    message: error
  };
}
```

### User-Friendly Error Messages

```typescript
function getErrorAction(errorType: InstallErrorType): string {
  switch (errorType) {
    case InstallErrorType.AlreadyExists:
      return 'Choose a different release name or uninstall the existing release';
    case InstallErrorType.InvalidValues:
      return 'Check your values for syntax errors or missing required fields';
    case InstallErrorType.ChartNotFound:
      return 'Verify the chart name and repository, then try updating repositories';
    case InstallErrorType.Timeout:
      return 'Check pod logs and cluster resources, or increase the timeout duration';
    default:
      return 'Check the error details and try again';
  }
}
```

