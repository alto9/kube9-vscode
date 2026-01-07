---
story_id: 019-implement-release-status-polling
session_id: helm-package-manager
feature_id:
  - helm-release-management
spec_id:
  - helm-release-operations
status: pending
---

# Story: Implement Release Status Polling

## Objective

Implement automatic polling of release status when the webview is visible to keep release information up-to-date.

## Context

Release status can change (pending → deployed, deployed → failed) and should be refreshed automatically. See [helm-release-management](../../features/helm/helm-release-management.feature.md) for polling scenarios.

## Acceptance Criteria

- [ ] Poll release status every 30 seconds when webview is visible
- [ ] Stop polling when webview is hidden
- [ ] Resume polling when webview becomes visible again
- [ ] Update release cards with new status
- [ ] Show visual transitions when status changes
- [ ] Handle polling errors gracefully (don't spam)
- [ ] Allow manual refresh button as well

## Implementation Notes

```typescript
// In HelmPackageManagerPanel
class HelmPackageManagerPanel {
  private pollingInterval: NodeJS.Timeout | null = null;
  
  constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.panel = panel;
    
    // Start polling when webview becomes visible
    this.panel.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible) {
        this.startPolling();
      } else {
        this.stopPolling();
      }
    }, null, this.disposables);
    
    // Start initial polling if visible
    if (panel.visible) {
      this.startPolling();
    }
  }
  
  private startPolling(): void {
    // Don't start if already polling
    if (this.pollingInterval) return;
    
    this.pollingInterval = setInterval(async () => {
      try {
        await this.refreshReleases();
      } catch (error) {
        console.error('Polling error:', error);
        // Continue polling even on errors
      }
    }, 30000); // 30 seconds
  }
  
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  
  private async refreshReleases(): Promise<void> {
    const releases = await helmService.listReleases({ allNamespaces: true });
    
    // Check for upgrade availability
    for (const release of releases) {
      const upgradeCheck = await helmService.checkUpgradeAvailability(release);
      if (upgradeCheck.hasUpgrade) {
        release.upgradeAvailable = true;
        release.latestVersion = upgradeCheck.latestVersion;
      }
    }
    
    this.panel.webview.postMessage({ type: 'releasesUpdated', data: releases });
  }
  
  public dispose(): void {
    this.stopPolling();
    // ... other cleanup
  }
}

// In React component
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    const message = event.data;
    
    switch (message.type) {
      case 'releasesUpdated':
        // Update releases with smooth transition
        setReleases(prev => {
          const updated = message.data;
          // Detect status changes
          const changes = detectChanges(prev, updated);
          if (changes.length > 0) {
            showStatusChangeNotification(changes);
          }
          return updated;
        });
        break;
    }
  };
  
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

## Files Involved

- `src/webview/HelmPackageManagerPanel.ts` (add polling logic)
- Update `HelmPackageManager.tsx` to handle status updates

## Dependencies

- Depends on story 013 (release commands)
- Depends on story 005 (Releases Section)
- Works with existing webview lifecycle

## Estimated Time

20 minutes

