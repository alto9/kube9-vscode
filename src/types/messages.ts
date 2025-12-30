import { PodInfo } from '../webview/PodLogsViewerPanel';
import { PanelPreferences } from '../utils/PreferencesManager';

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
     * Indicates whether log streaming is connected, disconnected, or in error state.
     */
    | { type: 'streamStatus'; status: 'connected' | 'disconnected' | 'error' };

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
     * Request to copy logs to clipboard.
     * Sent when user clicks copy button to copy all visible logs to clipboard.
     */
    | { type: 'copy'; lines: string[]; includeTimestamps: boolean }
    /**
     * Request to export logs to a file.
     * Sent when user clicks export button to save logs to a file with customizable filename.
     */
    | { type: 'export'; lines: string[]; podName: string; containerName: string; includeTimestamps: boolean };

