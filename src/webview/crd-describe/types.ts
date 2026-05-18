import type { CRDDescribeData } from '../../providers/CRDDescribeProvider';

/** VS Code webview messaging API surface used by Describe webviews. */
export interface VSCodeAPI {
    postMessage(message: WebviewToExtensionMessage): void;
    getState(): unknown;
    setState(state: unknown): void;
}

export interface ExtensionToWebviewMessage {
    command: 'updateCRDDescribeData' | 'showError';
    data: CRDDescribeData | { message: string };
}

export interface WebviewToExtensionMessage {
    command: 'refresh' | 'viewYaml' | 'ready';
}

export type { CRDDescribeData };
