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
 * Re-export NamespaceDescribeData from NamespaceDescribeProvider for convenience.
 */
import type { NamespaceDescribeData } from '../../src/providers/NamespaceDescribeProvider';

/**
 * Tab type for Namespace Describe webview.
 */
export type TabType = 'overview' | 'resources' | 'quotas' | 'limitRanges' | 'events';

/**
 * Message sent from extension to webview with namespace data.
 */
export interface UpdateNamespaceDataMessage {
    command: 'updateNamespaceData';
    data: NamespaceDescribeData;
}

/**
 * Message sent from extension to webview with error information.
 */
export interface ShowErrorMessage {
    command: 'showError';
    data: { message: string };
}

/**
 * Union type for all messages from extension to webview.
 */
export type ExtensionToWebviewMessage = UpdateNamespaceDataMessage | ShowErrorMessage;

/**
 * Message sent from webview to extension to refresh namespace data.
 */
export interface RefreshMessage {
    command: 'refresh';
}

/**
 * Message sent from webview to extension to view YAML.
 */
export interface ViewYamlMessage {
    command: 'viewYaml';
}

/**
 * Message sent from webview to extension to set default namespace.
 */
export interface SetDefaultNamespaceMessage {
    command: 'setDefaultNamespace';
    data: { namespace: string };
}

/**
 * Message sent from webview to extension to navigate to a resource type in the tree view.
 */
export interface NavigateToResourceMessage {
    command: 'navigateToResource';
    data: { resourceType: string; namespace: string };
}

/**
 * Union type for all messages from webview to extension.
 */
export type WebviewToExtensionMessage = 
    RefreshMessage | 
    ViewYamlMessage | 
    SetDefaultNamespaceMessage |
    NavigateToResourceMessage;

/**
 * Re-export NamespaceDescribeData from NamespaceDescribeProvider for convenience.
 */
export type { NamespaceDescribeData };

