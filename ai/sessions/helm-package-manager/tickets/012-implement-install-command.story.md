---
story_id: 012-implement-install-command
session_id: helm-package-manager
feature_id:
  - helm-chart-installation
spec_id:
  - helm-chart-operations
  - helm-cli-integration
status: completed
---

# Story: Implement Chart Installation Command

## Objective

Implement the extension command that executes `helm install` with custom values and options, including progress feedback and error handling.

## Context

The install command executes Helm CLI to install charts into the cluster. It handles custom values, namespace creation, and provides progress updates. See [helm-chart-operations](../../specs/helm/helm-chart-operations.spec.md) for install specification.

## Acceptance Criteria

- [x] Implement `installChart(params)` method in HelmService
- [x] Create temporary values file from custom YAML
- [x] Execute `helm install` with appropriate flags
- [x] Handle `--create-namespace` flag
- [x] Show progress notification with steps
- [x] Clean up temporary values file after install
- [x] Handle common installation errors (release exists, timeout, invalid values)
- [x] Refresh releases list after successful installation
- [x] Send installation result to webview

## Implementation Notes

```typescript
interface InstallParams {
  chart: string;
  releaseName: string;
  namespace: string;
  createNamespace: boolean;
  values?: string;
  version?: string;
  wait?: boolean;
  timeout?: string;
}

async installChart(params: InstallParams): Promise<void> {
  const args = [
    'install',
    params.releaseName,
    params.chart,
    '--namespace', params.namespace
  ];
  
  if (params.createNamespace) {
    args.push('--create-namespace');
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
  
  // Create temporary values file if custom values provided
  let valuesFile: string | null = null;
  if (params.values) {
    valuesFile = path.join(os.tmpdir(), `helm-values-${Date.now()}.yaml`);
    await fs.promises.writeFile(valuesFile, params.values, 'utf8');
    args.push('--values', valuesFile);
  }
  
  try {
    await this.executeCommand(args);
  } finally {
    // Clean up temporary file
    if (valuesFile) {
      try {
        await fs.promises.unlink(valuesFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

// Message handler
case 'installChart':
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Installing ${message.params.releaseName}...`,
      cancellable: false
    },
    async (progress) => {
      progress.report({ message: 'Preparing installation...' });
      
      try {
        await helmService.installChart(message.params);
        progress.report({ message: 'Installation complete!' });
        
        vscode.window.showInformationMessage(
          `Successfully installed ${message.params.releaseName}`
        );
        
        // Refresh releases
        const releases = await helmService.listReleases({ allNamespaces: true });
        this.panel.webview.postMessage({ type: 'releasesLoaded', data: releases });
      } catch (error) {
        vscode.window.showErrorMessage(`Installation failed: ${error.message}`);
        this.panel.webview.postMessage({ 
          type: 'installFailed', 
          error: error.message 
        });
      }
    }
  );
  break;
```

## Files Involved

- `src/services/HelmService.ts` (add installChart method)
- `src/webview/HelmPackageManagerPanel.ts` (add message handler)

## Dependencies

- Depends on story 001 (HelmService)
- Depends on story 010 (install form)
- Depends on story 011 (YAML editor)

## Estimated Time

30 minutes

