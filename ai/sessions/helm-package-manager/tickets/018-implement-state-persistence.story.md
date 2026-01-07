---
story_id: 018-implement-state-persistence
session_id: helm-package-manager
feature_id:
  - helm-package-manager-access
spec_id:
  - helm-webview-architecture
status: pending
---

# Story: Implement State Persistence and Caching

## Objective

Implement state persistence for UI preferences and caching for repository/release data to improve performance and user experience.

## Context

State persistence maintains user preferences across sessions, and caching reduces unnecessary Helm CLI calls. See [helm-webview-architecture](../../specs/helm/helm-webview-architecture.spec.md) for state management specification.

## Acceptance Criteria

- [ ] Store UI preferences in workspace state (filters, sort order)
- [ ] Implement 5-minute TTL cache for repository list
- [ ] Implement cache for release list
- [ ] Restore filter state when webview reopens
- [ ] Invalidate cache on relevant operations (add repo, install chart)
- [ ] Persist scroll position when switching tabs
- [ ] Store last selected namespace in filters
- [ ] Clear cache on cluster context switch

## Implementation Notes

```typescript
// In HelmPackageManagerPanel
class HelmPackageManagerPanel {
  private cache: Map<string, CacheEntry> = new Map();
  
  interface CacheEntry {
    data: any;
    timestamp: number;
    ttl: number;
  }
  
  private async getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 300000 // 5 minutes
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp < cached.ttl)) {
      return cached.data;
    }
    
    const data = await fetcher();
    this.cache.set(key, { data, timestamp: now, ttl });
    return data;
  }
  
  private invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  // Save UI state
  private async saveState(state: UIState): Promise<void> {
    await this.context.workspaceState.update('helm.uiState', state);
  }
  
  // Restore UI state
  private async restoreState(): Promise<UIState | undefined> {
    return this.context.workspaceState.get<UIState>('helm.uiState');
  }
}

// Usage
case 'loadRepositories':
  const repos = await this.getCached(
    'repositories',
    () => helmService.listRepositories(),
    300000
  );
  this.panel.webview.postMessage({ type: 'repositoriesLoaded', data: repos });
  break;

case 'addRepository':
  await helmService.addRepository(message.name, message.url);
  this.invalidateCache('repositories');
  break;
```

## Files Involved

- `src/webview/HelmPackageManagerPanel.ts` (add caching logic)
- Update message handlers to use caching

## Dependencies

- Depends on story 003 (webview panel)
- Can be integrated gradually as features are built

## Estimated Time

25 minutes

