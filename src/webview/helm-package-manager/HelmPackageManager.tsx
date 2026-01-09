import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HelmState, ExtensionToWebviewMessage, WebviewToExtensionMessage, ReleaseFilters, HelmRelease, ReleaseDetails, UpgradeParams, OperatorInstallationStatus, UIState, HelmErrorInfo } from './types';
import { InstalledReleasesSection } from './components/InstalledReleasesSection';
import { RepositoriesSection } from './components/RepositoriesSection';
import { ReleaseDetailModal } from './components/ReleaseDetailModal';
import { UpgradeReleaseModal } from './components/UpgradeReleaseModal';
import { FeaturedChartsSection } from './components/FeaturedChartsSection';
import { OperatorInstallModal } from './components/OperatorInstallModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorMessage } from './components/ErrorMessage';
import { HelmErrorType } from '../../services/HelmError';
import { getVSCodeAPI } from './vscodeApi';

// Acquire VS Code API - use shared singleton to prevent multiple acquisitions
const vscode = getVSCodeAPI();

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

    const [errorInfo, setErrorInfo] = useState<HelmErrorInfo | null>(null);

    const [releaseFilters, setReleaseFilters] = useState<ReleaseFilters>({
        namespace: 'all',
        status: 'all',
        searchQuery: ''
    });

    const [selectedRelease, setSelectedRelease] = useState<HelmRelease | null>(null);
    const [releaseDetails, setReleaseDetails] = useState<ReleaseDetails | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [upgradeModalRelease, setUpgradeModalRelease] = useState<HelmRelease | null>(null);
    const [operatorStatus, setOperatorStatus] = useState<OperatorInstallationStatus>({
        installed: false,
        upgradeAvailable: false
    });
    const [operatorInstallModalOpen, setOperatorInstallModalOpen] = useState(false);
    const [selectedTab, setSelectedTab] = useState<string>('repositories');
    
    // Ref to track if initial state has been restored
    const stateRestoredRef = useRef(false);

    // Send message to extension
    const sendMessage = useCallback((message: WebviewToExtensionMessage) => {
        if (vscode) {
            vscode.postMessage(message);
        }
    }, []);

    // Save UI state to extension
    const saveUIState = useCallback((uiState: UIState) => {
        sendMessage({
            command: 'saveUIState',
            uiState
        });
    }, [sendMessage]);

    // Restore UI state from webview state (scroll positions, etc.)
    useEffect(() => {
        if (!vscode) {
            return;
        }

        const webviewState = vscode.getState() as { scrollPositions?: Record<string, number> } | undefined;
        if (webviewState?.scrollPositions) {
            // Restore scroll positions if needed
            // This would be handled by individual components that need scroll restoration
        }
    }, []);

    // Persist release filters when they change
    useEffect(() => {
        if (!stateRestoredRef.current) {
            return; // Don't save until initial state is restored
        }

        const uiState: UIState = {
            releaseFilters,
            lastSelectedNamespace: releaseFilters.namespace !== 'all' ? releaseFilters.namespace : undefined
        };
        saveUIState(uiState);
    }, [releaseFilters, saveUIState]);

    // Persist selected tab when it changes
    useEffect(() => {
        if (!stateRestoredRef.current) {
            return; // Don't save until initial state is restored
        }

        const uiState: UIState = {
            selectedTab
        };
        saveUIState(uiState);
    }, [selectedTab, saveUIState]);

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

                case 'releaseDetailsLoaded':
                    setReleaseDetails(message.data as ReleaseDetails);
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
                    setErrorInfo(message.errorInfo || null);
                    break;

                case 'error':
                    // Structured error message
                    setState(prev => ({
                        ...prev,
                        loading: false,
                        error: message.error || 'An error occurred'
                    }));
                    setErrorInfo(message.errorInfo || null);
                    break;

                case 'operationProgress':
                    // Handle operation progress updates
                    setState(prev => ({ ...prev, loading: true }));
                    break;

                case 'operatorStatusUpdated':
                    setOperatorStatus(message.data as OperatorInstallationStatus);
                    break;

                case 'uiStateRestored':
                    // Restore UI state from extension
                    const restoredState = message.data as UIState;
                    if (restoredState) {
                        if (restoredState.releaseFilters) {
                            setReleaseFilters(restoredState.releaseFilters);
                        }
                        if (restoredState.selectedTab) {
                            setSelectedTab(restoredState.selectedTab);
                        }
                        // Restore scroll positions to webview state
                        if (restoredState.scrollPositions && vscode) {
                            vscode.setState({ scrollPositions: restoredState.scrollPositions });
                        }
                    }
                    stateRestoredRef.current = true;
                    break;

                default:
                    // Unknown message type - ignore
                    break;
            }
        };

        window.addEventListener('message', handleMessage);

        // Notify extension that webview is ready
        sendMessage({ command: 'ready' });

        return () => {
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

    // Render error state - if Helm is unavailable, don't render main UI
    if (state.error) {
        // For critical errors (Helm unavailable), don't allow dismissing
        const isCriticalError = errorInfo?.type === 'CLI_NOT_FOUND' || 
                               errorInfo?.type === 'KUBECONFIG_ERROR' ||
                               state.error.includes('Helm is not available') ||
                               state.error.includes('cannot connect');
        
        return (
            <div className="helm-package-manager">
                <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
                    <h1 style={{ marginBottom: '16px' }}>Helm Package Manager</h1>
                    <ErrorMessage
                        error={state.error}
                        type={errorInfo?.type as HelmErrorType}
                        suggestion={errorInfo?.suggestion}
                        retryable={errorInfo?.retryable || false}
                        onRetry={errorInfo?.retryable ? () => {
                            setState(prev => ({ ...prev, error: null, loading: true }));
                            setErrorInfo(null);
                            sendMessage({ command: 'ready' });
                        } : undefined}
                        onDismiss={isCriticalError ? undefined : () => {
                            setState(prev => ({ ...prev, error: null }));
                            setErrorInfo(null);
                        }}
                    />
                    {isCriticalError && (
                        <p style={{ 
                            marginTop: '16px', 
                            fontSize: '12px', 
                            color: 'var(--vscode-descriptionForeground)',
                            fontStyle: 'italic'
                        }}>
                            The Helm Package Manager cannot function without Helm connectivity. Please resolve the issue above and retry.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // Render main UI with placeholder sections
    return (
        <ErrorBoundary>
            <div className="helm-package-manager">
            <h1>Helm Package Manager</h1>
            
            {/* Featured Charts Section */}
            <FeaturedChartsSection
                operatorStatus={operatorStatus}
                onInstall={() => {
                    setOperatorInstallModalOpen(true);
                }}
                onUpgrade={() => {
                    // TODO: Implement upgrade modal for operator
                    console.log('Upgrade operator clicked');
                }}
                onConfigure={() => {
                    // TODO: Implement configure modal for operator
                    console.log('Configure operator clicked');
                }}
            />

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
                    setUpgradeModalRelease(release);
                }}
                onViewDetails={(release: HelmRelease) => {
                    setSelectedRelease(release);
                    setDetailModalOpen(true);
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

            {/* Release Detail Modal */}
            <ReleaseDetailModal
                release={selectedRelease}
                open={detailModalOpen}
                onClose={() => {
                    setDetailModalOpen(false);
                    setSelectedRelease(null);
                    setReleaseDetails(null);
                }}
                onUpgrade={(release: HelmRelease) => {
                    sendMessage({
                        command: 'upgradeRelease',
                        name: release.name,
                        namespace: release.namespace,
                        chart: release.chart,
                        params: { version: release.upgradeAvailable }
                    });
                }}
                onRollback={(release: HelmRelease, revision: number) => {
                    sendMessage({
                        command: 'rollbackRelease',
                        name: release.name,
                        namespace: release.namespace,
                        revision
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

            {/* Upgrade Release Modal */}
            <UpgradeReleaseModal
                release={upgradeModalRelease}
                open={upgradeModalRelease !== null}
                onClose={() => {
                    setUpgradeModalRelease(null);
                    // Refresh releases list after upgrade
                    sendMessage({
                        command: 'listReleases',
                        params: { allNamespaces: true }
                    });
                }}
                onUpgrade={async (params: UpgradeParams) => {
                    // Send upgrade command via vscode API
                    sendMessage({
                        command: 'upgradeRelease',
                        params
                    });
                    // Wait for operationComplete message (handled in modal)
                }}
            />

            {/* Operator Install Modal */}
            <OperatorInstallModal
                open={operatorInstallModalOpen}
                onClose={() => {
                    setOperatorInstallModalOpen(false);
                }}
                onInstalled={() => {
                    // Refresh operator status after installation
                    sendMessage({
                        command: 'getOperatorStatus'
                    });
                    // Refresh releases list
                    sendMessage({
                        command: 'listReleases',
                        params: { allNamespaces: true }
                    });
                }}
            />
            </div>
        </ErrorBoundary>
    );
};

