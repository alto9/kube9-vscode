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

/**
 * Message types sent from extension host (EventViewerPanel) to webview (React app).
 * Used for bidirectional communication between extension and webview.
 */
export type ExtensionMessage =
    /**
     * Sent when webview is first ready, provides initial configuration and state.
     * Sent after webview sends 'ready' message to initialize webview with cluster-specific state.
     */
    | { type: 'initialState'; clusterContext: string; filters: EventFilters; autoRefreshEnabled: boolean }
    /**
     * Sent when events are loaded or refreshed successfully.
     * Sent after successful event fetch from operator to provide event data to display in table.
     */
    | { type: 'events'; events: KubernetesEvent[]; loading: false }
    /**
     * Sent when loading state changes.
     * Sent before/after event fetch operations to show/hide loading indicators in UI.
     */
    | { type: 'loading'; loading: boolean }
    /**
     * Sent when an error occurs during event fetch or processing.
     * Sent when event fetch fails, operator unavailable, etc. to display error state in UI.
     */
    | { type: 'error'; error: string; loading: false }
    /**
     * Sent when auto-refresh state changes.
     * Sent after toggle auto-refresh action to update UI to reflect auto-refresh state.
     */
    | { type: 'autoRefreshState'; enabled: boolean }
    /**
     * Sent when auto-refresh interval changes.
     * Sent after user configures refresh interval to update UI to display current interval.
     */
    | { type: 'autoRefreshInterval'; interval: number };

/**
 * Message types sent from webview (React app) to extension host (EventViewerPanel).
 * Used for bidirectional communication between webview and extension.
 */
export type WebviewMessage =
    /**
     * Sent when webview has loaded and React app is mounted.
     * Sent from React useEffect on mount to signal extension to send initialState.
     */
    | { type: 'ready' }
    /**
     * Request to load events with optional filters.
     * Sent when user changes filters or initial load to request fresh event data from operator.
     */
    | { type: 'load'; filters?: EventFilters }
    /**
     * Request to refresh events (clears cache).
     * Sent when user clicks refresh button to force fresh event fetch, bypassing cache.
     */
    | { type: 'refresh' }
    /**
     * Notify extension of filter changes.
     * Sent when user applies filters in UI to update filter state and trigger filtered event load.
     */
    | { type: 'filter'; filters: EventFilters }
    /**
     * Request to export events to file.
     * Sent when user clicks export and selects format to trigger file save dialog and write events to file.
     */
    | { type: 'export'; format: 'json' | 'csv'; events: KubernetesEvent[] }
    /**
     * Request to copy content to clipboard.
     * Sent when user copies event details or message to write content to system clipboard.
     */
    | { type: 'copy'; content: string }
    /**
     * Request to navigate to resource in tree view.
     * Sent when user clicks "Go to Resource" action to navigate tree view to show specific resource.
     */
    | { type: 'navigate'; resource: { namespace: string; kind: string; name: string } }
    /**
     * Request to open resource YAML in editor.
     * Sent when user clicks "View YAML" action to open YAML editor for specific resource.
     */
    | { type: 'viewYaml'; resource: { namespace: string; kind: string; name: string } }
    /**
     * Request to toggle auto-refresh on/off.
     * Sent when user clicks auto-refresh toggle to enable/disable automatic event refreshing.
     */
    | { type: 'toggleAutoRefresh'; enabled: boolean }
    /**
     * Request to change auto-refresh interval.
     * Sent when user selects new refresh interval to update refresh timer interval.
     */
    | { type: 'setAutoRefreshInterval'; interval: number };

