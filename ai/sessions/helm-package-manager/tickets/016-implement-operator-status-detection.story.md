---
story_id: 016-implement-operator-status-detection
session_id: helm-package-manager
feature_id:
  - helm-operator-quick-install
spec_id:
  - helm-operator-installation
status: completed
---

# Story: Implement Kube9 Operator Status Detection

## Objective

Implement functionality to detect if the Kube9 Operator is installed and check for available upgrades.

## Context

The Featured Charts section needs to know operator installation status to show appropriate actions. See [helm-operator-installation](../../specs/helm/helm-operator-installation.spec.md) for status detection specification.

## Acceptance Criteria

- [x] Implement `getOperatorStatus()` method in Helm Service
- [x] Check for `kube9-operator` release in all namespaces
- [x] Query available versions from `kube9` repository
- [x] Compare installed version with latest version
- [x] Return status object with installation details
- [x] Add `kube9` repository if not present
- [x] Cache status with 5-minute TTL
- [x] Update status when releases list changes

## Implementation Notes

```typescript
interface OperatorInstallationStatus {
  installed: boolean;
  version?: string;
  namespace?: string;
  upgradeAvailable: boolean;
  latestVersion?: string;
  tier?: 'free' | 'pro';
}

async getOperatorStatus(): Promise<OperatorInstallationStatus> {
  // Check installed releases
  const releases = await this.listReleases({ allNamespaces: true });
  const operatorRelease = releases.find(r => 
    r.name === 'kube9-operator' || 
    r.chart.includes('kube9-operator')
  );
  
  if (!operatorRelease) {
    return {
      installed: false,
      upgradeAvailable: false
    };
  }
  
  // Ensure kube9 repository is added
  await this.ensureKube9Repository();
  
  // Check for updates
  const search = await this.searchCharts('kube9-operator', 'kube9');
  const latestVersion = search[0]?.version;
  const currentVersion = operatorRelease.version;
  
  // Determine tier (check release values or ConfigMap)
  const tier = await this.detectOperatorTier(operatorRelease);
  
  return {
    installed: true,
    version: currentVersion,
    namespace: operatorRelease.namespace,
    upgradeAvailable: latestVersion !== currentVersion,
    latestVersion,
    tier
  };
}

async ensureKube9Repository(): Promise<void> {
  const repos = await this.listRepositories();
  const kube9Repo = repos.find(r => r.name === 'kube9');
  
  if (!kube9Repo) {
    await this.addRepository('kube9', 'https://charts.kube9.io');
    await this.updateRepository('kube9');
  }
}
```

## Files Involved

- `src/services/HelmService.ts` (add methods)
- `src/webview/HelmPackageManagerPanel.ts` (call on webview load)

## Dependencies

- Depends on story 001 (HelmService)
- Depends on story 006 (repository commands)
- Depends on story 013 (release commands)

## Estimated Time

25 minutes

