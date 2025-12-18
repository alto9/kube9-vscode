---
story_id: 002-create-kubernetes-event-interfaces
session_id: add-events-category-to-tree-view-for-cluster-troub
feature_id:
  - cluster-events-tree
spec_id:
  - events-tree-spec
status: pending
---

# Create Kubernetes Event Interfaces

## Objective

Create TypeScript interfaces for Kubernetes events and event filters. These types will be used throughout the Events feature.

## Context

The operator CLI returns events in a specific JSON format. We need TypeScript interfaces to type these properly and manage filter state.

## Files to Create/Modify

- `src/types/Events.ts` (new file)

## Implementation

Create interfaces for event data and filters:

```typescript
export interface KubernetesEvent {
  reason: string;
  type: 'Normal' | 'Warning' | 'Error';
  message: string;
  involvedObject: {
    kind: string;
    namespace: string;
    name: string;
  };
  count: number;
  firstTimestamp: string;
  lastTimestamp: string;
}

export interface EventFilters {
  namespace?: string;       // 'all' | namespace name
  type?: string;            // 'all' | 'Normal' | 'Warning' | 'Error'
  since?: string;           // 'all' | '1h' | '6h' | '24h'
  resourceType?: string;    // 'all' | 'Pod' | 'Deployment' | ...
  searchText?: string;      // Search query
}

export interface EventCache {
  events: KubernetesEvent[];
  timestamp: number;
  filters: EventFilters;
}

export const DEFAULT_EVENT_FILTERS: EventFilters = {
  namespace: 'all',
  type: 'all',
  since: '24h',
  resourceType: 'all',
  searchText: ''
};
```

## Acceptance Criteria

- [ ] `KubernetesEvent` interface created with all required fields
- [ ] `EventFilters` interface created for filter state
- [ ] `EventCache` interface created for caching
- [ ] `DEFAULT_EVENT_FILTERS` constant exported
- [ ] All interfaces properly exported

## Related Files

- Spec: `ai/specs/tree/events-tree-spec.spec.md` (EventFilters and KubernetesEvent sections)
- Feature: `ai/features/cluster/cluster-events-tree.feature.md`

## Estimated Time

< 10 minutes

