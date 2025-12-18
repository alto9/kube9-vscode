/**
 * Kubernetes event data structure.
 * Represents a single event returned from the kube9-operator CLI.
 */
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

/**
 * Event filter options.
 * Manages filter state for event queries and client-side filtering.
 */
export interface EventFilters {
    namespace?: string;       // 'all' | namespace name
    type?: string;            // 'all' | 'Normal' | 'Warning' | 'Error'
    since?: string;           // 'all' | '1h' | '6h' | '24h'
    resourceType?: string;    // 'all' | 'Pod' | 'Deployment' | ...
    searchText?: string;      // Search query
}

/**
 * Event cache structure.
 * Stores cached events with metadata for invalidation and refresh logic.
 */
export interface EventCache {
    events: KubernetesEvent[];
    timestamp: number;
    filters: EventFilters;
}

/**
 * Default event filter values.
 * Used when initializing filters for a new cluster or clearing all filters.
 */
export const DEFAULT_EVENT_FILTERS: EventFilters = {
    namespace: 'all',
    type: 'all',
    since: '24h',
    resourceType: 'all',
    searchText: ''
};

