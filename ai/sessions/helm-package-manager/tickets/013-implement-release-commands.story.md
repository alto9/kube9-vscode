---
story_id: 013-implement-release-commands
session_id: helm-package-manager
feature_id:
  - helm-release-management
  - helm-release-upgrade
  - helm-release-rollback
spec_id:
  - helm-release-operations
  - helm-cli-integration
status: completed
---

# Story: Implement Release Management Commands

## Objective

Implement extension commands for release operations (list, get details, upgrade, rollback, uninstall) in the Helm Service.

## Context

Release commands manage the lifecycle of installed Helm releases. See [helm-release-operations](../../specs/helm/helm-release-operations.spec.md) for command specifications.

## Acceptance Criteria

- [x] Implement `listReleases(params)` method in HelmService
- [x] Implement `getReleaseDetails(name, namespace)` method
- [x] Implement `getReleaseHistory(name, namespace)` method
- [x] Implement `upgradeRelease(params)` method
- [x] Implement `rollbackRelease(name, namespace, revision)` method
- [x] Implement `uninstallRelease(name, namespace)` method
- [x] Create message handlers for all release operations
- [x] Handle errors with user-friendly messages
- [x] Show progress notifications for operations

## Implementation Notes

```typescript
// HelmService methods
async listReleases(params: ListReleasesParams): Promise<HelmRelease[]> {
  const args = ['list', '--output', 'json'];
  
  if (params.allNamespaces) {
    args.push('--all-namespaces');
  } else if (params.namespace) {
    args.push('--namespace', params.namespace);
  }
  
  if (params.status) {
    args.push('--filter', params.status);
  }
  
  const output = await this.executeCommand(args);
  return JSON.parse(output);
}

async getReleaseDetails(name: string, namespace: string): Promise<ReleaseDetails> {
  const [status, manifest, values, history] = await Promise.all([
    this.executeCommand(['status', name, '--namespace', namespace, '--output', 'json']),
    this.executeCommand(['get', 'manifest', name, '--namespace', namespace]),
    this.executeCommand(['get', 'values', name, '--namespace', namespace, '--all']),
    this.executeCommand(['history', name, '--namespace', namespace, '--output', 'json'])
  ]);
  
  return {
    ...JSON.parse(status),
    manifest,
    values,
    history: JSON.parse(history)
  };
}

async upgradeRelease(params: UpgradeParams): Promise<void> {
  const args = [
    'upgrade',
    params.releaseName,
    params.chart,
    '--namespace', params.namespace
  ];
  
  if (params.reuseValues) {
    args.push('--reuse-values');
  }
  
  if (params.values) {
    const valuesFile = await this.createTempValuesFile(params.values);
    args.push('--values', valuesFile);
  }
  
  if (params.version) {
    args.push('--version', params.version);
  }
  
  await this.executeCommand(args);
}

async rollbackRelease(name: string, namespace: string, revision: number): Promise<void> {
  await this.executeCommand([
    'rollback',
    name,
    revision.toString(),
    '--namespace', namespace
  ]);
}

async uninstallRelease(name: string, namespace: string): Promise<void> {
  await this.executeCommand([
    'uninstall',
    name,
    '--namespace', namespace
  ]);
}
```

## Files Involved

- `src/services/HelmService.ts` (add methods)
- `src/webview/HelmPackageManagerPanel.ts` (add message handlers)

## Dependencies

- Depends on story 001 (HelmService)
- Depends on story 003 (webview panel)
- Works with story 005 (Releases Section UI)

## Estimated Time

30 minutes

