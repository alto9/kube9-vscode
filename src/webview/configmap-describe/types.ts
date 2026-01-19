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
 * Re-export ConfigMapDescribeData from ConfigMapDescribeProvider for convenience.
 */
import type { ConfigMapDescribeData } from '../../providers/ConfigMapDescribeProvider';

/**
 * Message sent from extension to webview.
 */
export interface ExtensionToWebviewMessage {
    /** Command type */
    command: 'updateConfigMapData' | 'showError';
    /** Message data */
    data: ConfigMapDescribeData | { message: string };
}

/**
 * Message sent from webview to extension.
 */
export interface WebviewToExtensionMessage {
    /** Command type */
    command: 'refresh' | 'viewYaml' | 'ready';
    /** Optional data payload */
    data?: unknown;
}

/**
 * Re-export ConfigMapDescribeData from ConfigMapDescribeProvider for convenience.
 */
export type { ConfigMapDescribeData };
