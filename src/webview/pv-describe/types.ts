/**
 * VS Code Webview API interface.
 * Matches the API provided by acquireVsCodeApi() in webview contexts.
 */
export interface VSCodeAPI {
    /**
     * Post a message to the extension host.
     * @param message The message to send
     */
    postMessage(message: WebviewToExtensionMessage): void;

    /**
     * Get the current state of the webview.
     * @returns The current state object
     */
    getState(): unknown;

    /**
     * Set the state of the webview.
     * @param state The state to set
     */
    setState(state: unknown): void;
}

/**
 * Re-export PVDescribeData from PVDescribeProvider for convenience.
 */
import type { PVDescribeData } from '../../providers/PVDescribeProvider';

/**
 * Message sent from extension to webview.
 */
export interface ExtensionToWebviewMessage {
    /** Command type */
    command: 'updatePVData' | 'showError';
    /** Message data */
    data: PVDescribeData | { message: string };
}

/**
 * Message sent from webview to extension.
 */
export interface WebviewToExtensionMessage {
    /** Command type */
    command: 'refresh' | 'viewYaml' | 'ready' | 'navigateToPVC';
    /** Optional data payload */
    data?: unknown;
}

/**
 * Re-export PVDescribeData from PVDescribeProvider for convenience.
 */
export type { PVDescribeData };
