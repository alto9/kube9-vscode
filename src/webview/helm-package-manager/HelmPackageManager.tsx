import React, { useState, useEffect, useCallback } from 'react';
import { HelmState, ExtensionToWebviewMessage, WebviewToExtensionMessage, VSCodeAPI, ReleaseFilters, HelmRelease } from './types';
import { InstalledReleasesSection } from './components/InstalledReleasesSection';
import { RepositoriesSection } from './components/RepositoriesSection';

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

    const [releaseFilters, setReleaseFilters] = useState<ReleaseFilters>({
        namespace: 'all',
        status: 'all',
        searchQuery: ''
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

                case 'chartDetails':
                    // Chart details are handled by ChartDetailModal component
                    // This message type is already handled in the modal's message listener
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
            <RepositoriesSection
                repositories={state.repositories}
                onAddRepository={async (name: string, url: string) => {
                    try {
                        console.log('Adding repository:', name, url);
                        sendMessage({
                            command: 'addRepository',
                            name,
                            url
                        });
                        // Repository list will be refreshed when extension sends 'repositoriesLoaded' message
                    } catch (error) {
                        console.error('Failed to add repository:', error);
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        setState(prev => ({
                            ...prev,
                            error: `Failed to add repository: ${errorMessage}`
                        }));
                        throw error;
                    }
                }}
                onUpdateRepository={(name: string) => {
                    console.log('Update repository clicked:', name);
                    sendMessage({
                        command: 'updateRepository',
                        name
                    });
                }}
                onRemoveRepository={(name: string) => {
                    console.log('Remove repository clicked:', name);
                    sendMessage({
                        command: 'removeRepository',
                        name
                    });
                }}
            />

            {/* Releases Section */}
            <InstalledReleasesSection
                releases={state.releases}
                filters={releaseFilters}
                onFilterChange={setReleaseFilters}
                onUpgrade={(release: HelmRelease) => {
                    sendMessage({
                        command: 'upgradeRelease',
                        name: release.name,
                        namespace: release.namespace,
                        chart: release.chart,
                        params: { version: release.upgradeAvailable }
                    });
                }}
                onViewDetails={(release: HelmRelease) => {
                    sendMessage({
                        command: 'getReleaseDetails',
                        name: release.name,
                        namespace: release.namespace
                    });
                }}
                onUninstall={(release: HelmRelease) => {
                    sendMessage({
                        command: 'uninstallRelease',
                        name: release.name,
                        namespace: release.namespace
                    });
                }}
            />

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

