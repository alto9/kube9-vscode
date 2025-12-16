import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import type {
    ClusterInfo,
    ClusterCustomizationConfig,
    ExtensionToWebviewMessage,
    WebviewToExtensionMessage
} from './types';

/**
 * VS Code API interface
 */
interface VSCodeAPI {
    postMessage(message: WebviewToExtensionMessage): void;
    getState(): unknown;
    setState(state: unknown): void;
}

/**
 * Acquire VS Code API (available in webview context)
 */
declare function acquireVsCodeApi(): VSCodeAPI;

/**
 * Main Cluster Manager App Component
 */
function ClusterManagerApp(): JSX.Element {
    const [loading, setLoading] = useState<boolean>(true);
    const [clusters, setClusters] = useState<ClusterInfo[]>([]);
    const [customizations, setCustomizations] = useState<ClusterCustomizationConfig | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        // Acquire VS Code API
        const vscode = acquireVsCodeApi();

        // Set up message listener
        const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>): void => {
            const message = event.data;
            if (message.type === 'initialize') {
                setClusters(message.data.clusters);
                setCustomizations(message.data.customizations);
                setTheme(message.data.theme);
                setLoading(false);
            }
        };

        window.addEventListener('message', handleMessage);

        // Request clusters on mount
        vscode.postMessage({ type: 'getClusters' });

        // Cleanup
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    return (
        <div className="cluster-manager-app">
            <header className="cluster-manager-header">
                <h1>Cluster Manager</h1>
            </header>
            <div className="cluster-manager-toolbar">
                {/* Toolbar area - empty for now */}
            </div>
            <main className="cluster-manager-content">
                {loading ? (
                    <div className="cluster-manager-loading">Loading...</div>
                ) : (
                    <div>
                        {/* Content area - will be populated in future stories */}
                        <p>Clusters loaded: {clusters.length}</p>
                    </div>
                )}
            </main>
            <footer className="cluster-manager-footer">
                {/* Footer area - empty for now */}
            </footer>
        </div>
    );
}

// Render the app
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<ClusterManagerApp />);
} else {
    console.error('Root element not found');
}

