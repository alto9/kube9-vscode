import React, { useState, useEffect, useCallback } from 'react';
import { HelmState, ExtensionToWebviewMessage, WebviewToExtensionMessage, VSCodeAPI } from './types';

// Acquire VS Code API
const vscode: VSCodeAPI | undefined = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;

/**
 * Root component for Helm Package Manager webview.
 * Manages all UI state, message handling, and renders placeholder sections.
 */
export const HelmPackageManager: React.FC = () => {
    const [state, setState] = useState<HelmState>({
        repositories: [],
        releases: [],
        featuredCharts: [],
        searchResults: [],
        loading: true,
        error: null,
        currentCluster: ''
    });

    // Send message to extension
    const sendMessage = useCallback((message: WebviewToExtensionMessage) => {
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
            console.log('[HelmPackageManager] Received message:', message.type);

            switch (message.type) {
                case 'repositoriesLoaded':
                    setState(prev => ({ ...prev, repositories: message.data as HelmState['repositories'] }));
                    break;

                case 'releasesLoaded':
                    setState(prev => ({ ...prev, releases: message.data as HelmState['releases'] }));
                    break;

                case 'chartSearchResults':
                    setState(prev => ({ ...prev, searchResults: message.data as HelmState['searchResults'] }));
                    break;

                case 'operationComplete':
                    // Handle operation completion
                    setState(prev => ({ ...prev, loading: false }));
                    break;

                case 'operationError':
                    setState(prev => ({
                        ...prev,
                        loading: false,
                        error: message.error || 'An error occurred'
                    }));
                    break;

                case 'operationProgress':
                    // Handle operation progress updates
                    setState(prev => ({ ...prev, loading: true }));
                    break;

                default:
                    console.log('Unknown message type:', (message as any).type);
            }
        };

        window.addEventListener('message', handleMessage);

        // Notify extension that webview is ready
        console.log('[HelmPackageManager] Sending ready message');
        sendMessage({ command: 'ready' });

        return () => {
            console.log('[HelmPackageManager] Cleaning up message listener');
            window.removeEventListener('message', handleMessage);
        };
    }, [sendMessage]);

    // Render loading state
    if (state.loading && state.repositories.length === 0 && state.releases.length === 0) {
        return (
            <div className="helm-package-manager">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <div className="loading-message">Loading Helm Package Manager...</div>
                </div>
            </div>
        );
    }

    // Render error state
    if (state.error) {
        return (
            <div className="helm-package-manager">
                <div className="error-state">
                    <div className="error-icon">⚠️</div>
                    <div className="error-message">{state.error}</div>
                </div>
            </div>
        );
    }

    // Render main UI with placeholder sections
    return (
        <div className="helm-package-manager">
            <h1>Helm Package Manager</h1>
            
            {/* Featured Charts Section */}
            <section className="featured-charts-section">
                <h2>Featured Charts</h2>
                <div className="section-placeholder">
                    Featured charts will be displayed here
                </div>
            </section>

            {/* Repositories Section */}
            <section className="repositories-section">
                <h2>Repositories</h2>
                <div className="section-placeholder">
                    Repositories will be displayed here
                </div>
            </section>

            {/* Releases Section */}
            <section className="releases-section">
                <h2>Installed Releases</h2>
                <div className="section-placeholder">
                    Installed releases will be displayed here
                </div>
            </section>

            {/* Discovery Section */}
            <section className="discovery-section">
                <h2>Discover Charts</h2>
                <div className="section-placeholder">
                    Chart discovery will be displayed here
                </div>
            </section>
        </div>
    );
};

