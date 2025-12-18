---
story_id: 003-create-events-provider-skeleton
session_id: add-events-category-to-tree-view-for-cluster-troub
feature_id:
  - cluster-events-tree
spec_id:
  - events-tree-spec
status: completed
---

# Create EventsProvider Skeleton

## Objective

Create the `EventsProvider` class skeleton with cache, filter management, and method stubs. Implementation of actual operator CLI execution will come in next story.

## Context

EventsProvider is the core service that retrieves events from operator CLI, manages caching, and handles filtering. This story creates the class structure without operator CLI integration.

## Files to Create/Modify

- `src/services/EventsProvider.ts` (new file)

## Implementation

Create EventsProvider class with cache and filter management:

```typescript
import * as vscode from 'vscode';
import { KubernetesEvent, EventFilters, EventCache, DEFAULT_EVENT_FILTERS } from '../types/Events';

export class EventsProvider {
    private cache: Map<string, EventCache> = new Map();
    private filters: Map<string, EventFilters> = new Map();
    private autoRefreshTimers: Map<string, NodeJS.Timer> = new Map();

    /**
     * Retrieve events from operator CLI
     */
    async getEvents(
        clusterContext: string,
        filters?: EventFilters
    ): Promise<KubernetesEvent[]> {
        const activeFilters = filters || this.getFilters(clusterContext);
        
        // TODO: Implement operator CLI execution
        // Placeholder for now
        return [];
    }

    /**
     * Get current filters for cluster
     */
    getFilters(clusterContext: string): EventFilters {
        return this.filters.get(clusterContext) || { ...DEFAULT_EVENT_FILTERS };
    }

    /**
     * Set filter for cluster
     */
    setFilter(clusterContext: string, filter: Partial<EventFilters>): void {
        const currentFilters = this.getFilters(clusterContext);
        this.filters.set(clusterContext, { ...currentFilters, ...filter });
        this.clearCache(clusterContext);
    }

    /**
     * Clear all filters for cluster
     */
    clearFilters(clusterContext: string): void {
        this.filters.set(clusterContext, { ...DEFAULT_EVENT_FILTERS });
        this.clearCache(clusterContext);
    }

    /**
     * Clear cache for cluster
     */
    clearCache(clusterContext: string): void {
        this.cache.delete(clusterContext);
    }

    /**
     * Start auto-refresh for cluster
     */
    startAutoRefresh(clusterContext: string, refreshCallback: () => void): void {
        if (this.autoRefreshTimers.has(clusterContext)) {
            return; // Already running
        }
        
        const timer = setInterval(() => {
            refreshCallback();
        }, 30000); // 30 seconds
        
        this.autoRefreshTimers.set(clusterContext, timer);
    }

    /**
     * Stop auto-refresh for cluster
     */
    stopAutoRefresh(clusterContext: string): void {
        const timer = this.autoRefreshTimers.get(clusterContext);
        if (timer) {
            clearInterval(timer);
            this.autoRefreshTimers.delete(clusterContext);
        }
    }

    /**
     * Check if auto-refresh is enabled
     */
    isAutoRefreshEnabled(clusterContext: string): boolean {
        return this.autoRefreshTimers.has(clusterContext);
    }
}
```

## Acceptance Criteria

- [ ] EventsProvider class created with proper structure
- [ ] Cache management methods implemented
- [ ] Filter management methods implemented
- [ ] Auto-refresh timer methods implemented
- [ ] `getEvents()` method stubbed (returns empty array for now)
- [ ] All methods properly typed with TypeScript

## Related Files

- Spec: `ai/specs/tree/events-tree-spec.spec.md` (EventsProvider section)
- Types: `src/types/Events.ts`
- Feature: `ai/features/cluster/cluster-events-tree.feature.md`

## Estimated Time

< 25 minutes

