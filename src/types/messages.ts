import { PanelPreferences } from '../utils/PreferencesManager';

/**
 * Interface for storing pod information.
 * Represents the current pod being viewed in the panel.
 */
export interface PodInfo {
    name: string;
    namespace: string;
    container: string;
    contextName: string;
    clusterName: string;
    /** Whether the container has crashed/restarted (has previous logs available) */
    hasCrashed?: boolean;
}

/**
 * Initial state sent from extension to webview when webview is ready.
 * Contains all information needed to initialize the webview UI.
 */
export interface InitialState {
    /** Pod information for the current log view */
    pod: PodInfo;
    /** User preferences for this cluster */
    preferences: PanelPreferences;
    /** List of available containers in the pod */
    containers: string[];
}

/**
 * Message types sent from extension host (PodLogsViewerPanel) to webview (React app).
 * Used for bidirectional communication between extension and webview.
 */
export type ExtensionToWebviewMessage =
    /**
     * Sent when webview is first ready, provides initial configuration and state.
     * Sent after webview sends 'ready' message to initialize webview with pod and preferences.
     */
    | { type: 'initialState'; data: InitialState }
    /**
     * Sent when new log data is received from Kubernetes API.
     * Contains array of log lines to append to the display.
     */
    | { type: 'logData'; data: string[] }
    /**
     * Sent when log stream connection status changes.
     * Indicates whether log streaming is connected, disconnected, reconnecting, or in error state.
     */
    | { type: 'streamStatus'; status: 'connected' | 'disconnected' | 'reconnecting' | 'error' }
    /**
     * Sent when user preferences are updated in the extension.
     * Contains the updated preferences that should be reflected in the webview UI.
     */
    | { type: 'preferencesUpdated'; preferences: PanelPreferences }
    /**
     * Sent when an error occurs during log streaming.
     * Contains error message and error type for appropriate handling in webview.
     */
    | { type: 'error'; error: string; errorType?: 'podNotFound' | 'permissionDenied' | 'connectionFailed' | 'maxReconnectAttempts' };

/**
 * Message types sent from webview (React app) to extension host (PodLogsViewerPanel).
 * Used for bidirectional communication between webview and extension.
 */
export type WebviewToExtensionMessage =
    /**
     * Sent when webview has loaded and React app is mounted.
     * Sent from React useEffect on mount to signal extension to send initialState.
     */
    | { type: 'ready' }
    /**
     * Request to refresh logs.
     * Sent when user clicks refresh button to reload logs from Kubernetes API.
     */
    | { type: 'refresh' }
    /**
     * Request to toggle follow mode on/off.
     * Sent when user toggles follow mode to enable/disable automatic scrolling to latest logs.
     */
    | { type: 'toggleFollow'; enabled: boolean }
    /**
     * Request to toggle timestamps display on/off.
     * Sent when user toggles timestamps to show/hide timestamps in log lines.
     */
    | { type: 'toggleTimestamps'; enabled: boolean }
    /**
     * Request to copy logs to clipboard.
     * Sent when user clicks copy button to copy all visible logs to clipboard.
     */
    | { type: 'copy'; lines: string[]; includeTimestamps: boolean }
    /**
     * Request to export logs to a file.
     * Sent when user clicks export button to save logs to a file with customizable filename.
     */
    | { type: 'export'; lines: string[]; podName: string; containerName: string; includeTimestamps: boolean }
    /**
     * Request to set line limit for log fetching.
     * Sent when user selects a line limit from dropdown or enters a custom value.
     * If limit is 'custom', extension will prompt for numeric input.
     */
    | { type: 'setLineLimit'; limit: number | 'all' | 'custom' }
    /**
     * Request to switch container in multi-container pod.
     * Sent when user selects a different container from the dropdown.
     * Container can be a specific container name or 'all' for all containers.
     */
    | { type: 'switchContainer'; container: string | 'all' }
    /**
     * Request to toggle previous container logs on/off.
     * Sent when user checks/unchecks the "Show previous container logs" checkbox.
     * Only available for crashed/restarted containers.
     */
    | { type: 'setPrevious'; enabled: boolean };

