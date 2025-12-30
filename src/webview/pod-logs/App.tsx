import React, { useEffect, useState } from 'react';
import { ExtensionToWebviewMessage, WebviewToExtensionMessage, InitialState } from '../../types/messages';

// Acquire VS Code API
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;

/**
 * Main App component for the Pod Logs Viewer webview.
 * Manages message handling and initial state.
 */
export const App: React.FC = () => {
    const [initialState, setInitialState] = useState<InitialState | null>(null);

    // Send message to extension
    const sendMessage = React.useCallback((message: WebviewToExtensionMessage) => {
        if (vscode) {
            vscode.postMessage(message);
        }
    }, []);

    // Handle messages from extension
    useEffect(() => {
        if (!vscode) {
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            const message = event.data as ExtensionToWebviewMessage;
            console.log('[PodLogsApp] Received message:', message.type);

            switch (message.type) {
                case 'initialState':
                    setInitialState(message.data);
                    break;
                case 'logData':
                    // TODO: Handle logData in future story
                    console.log('[PodLogsApp] Received logData:', message.data.length, 'lines');
                    break;
                case 'streamStatus':
                    // TODO: Handle streamStatus in future story
                    console.log('[PodLogsApp] Stream status:', message.status);
                    break;
                default:
                    console.log('[PodLogsApp] Unknown message type:', message);
            }
        };

        window.addEventListener('message', handleMessage);

        // Send ready message on mount
        sendMessage({ type: 'ready' });

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [sendMessage]);

    return (
        <div className="pod-logs-viewer">
            <h1>Pod Logs Viewer</h1>
            {initialState ? (
                <div>
                    <p>Pod: {initialState.pod.name}</p>
                    <p>Namespace: {initialState.pod.namespace}</p>
                    <p>Container: {initialState.pod.container}</p>
                    <p>Containers: {initialState.containers.join(', ')}</p>
                </div>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    );
};

