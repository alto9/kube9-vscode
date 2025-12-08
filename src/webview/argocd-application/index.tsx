import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArgoCDApplicationView } from './ArgoCDApplicationView';
import { TabType } from './components/TabBar';
import { ArgoCDApplication } from '../../types/argocd';

// Acquire VS Code API
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;

// Make vscode API globally available
if (vscode) {
    (window as any).vscode = vscode;
}

interface WebviewState {
    selectedTab?: TabType;
}

/**
 * Main entry point for the ArgoCD Application React webview.
 */
function App(): React.JSX.Element {
    const [application, setApplication] = React.useState<ArgoCDApplication | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [activeTab, setActiveTab] = React.useState<TabType>('overview');
    const [syncing, setSyncing] = React.useState<boolean>(false);
    const [refreshing, setRefreshing] = React.useState<boolean>(false);

    // Restore state from VS Code API
    React.useEffect(() => {
        if (vscode) {
            const previousState = vscode.getState() as WebviewState | undefined;
            if (previousState?.selectedTab) {
                setActiveTab(previousState.selectedTab);
            }
        }
    }, []);

    // Persist tab state
    React.useEffect(() => {
        if (vscode) {
            vscode.setState({ selectedTab: activeTab } as WebviewState);
        }
    }, [activeTab]);

    // Set up message listener
    React.useEffect(() => {
        if (!vscode) {
            return;
        }

        const handleMessage = (event: MessageEvent) => {
            const message = event.data;

            switch (message.type) {
                case 'applicationData':
                    setApplication(message.data);
                    setLoading(false);
                    setError(null);
                    break;

                case 'updateStatus':
                    // Update application status if we have application data
                    if (application && message.syncStatus && message.healthStatus) {
                        setApplication({
                            ...application,
                            syncStatus: message.syncStatus,
                            healthStatus: message.healthStatus
                        });
                    }
                    break;

                case 'operationProgress':
                    // Track operation progress for button states
                    if (message.phase === 'Running') {
                        if (message.message?.toLowerCase().includes('sync')) {
                            setSyncing(true);
                        } else if (message.message?.toLowerCase().includes('refresh')) {
                            setRefreshing(true);
                        }
                    } else if (message.phase === 'Succeeded' || message.phase === 'Failed' || message.phase === 'Error') {
                        // Reset operation states when operation completes
                        setSyncing(false);
                        setRefreshing(false);
                    }
                    break;

                case 'error':
                    setError(message.message || 'Unknown error');
                    setLoading(false);
                    break;

                default:
                    console.log('Unknown message type:', message.type);
            }
        };

        window.addEventListener('message', handleMessage);

        // Notify extension that webview is ready
        vscode.postMessage({ type: 'ready' });

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [application]);

    // Action handlers
    const handleSync = (): void => {
        if (vscode && !syncing && !refreshing) {
            setSyncing(true);
            vscode.postMessage({ type: 'sync' });
        }
    };

    const handleRefresh = (): void => {
        if (vscode && !syncing && !refreshing) {
            setRefreshing(true);
            vscode.postMessage({ type: 'refresh' });
        }
    };

    const handleHardRefresh = (): void => {
        if (vscode && !syncing && !refreshing) {
            setRefreshing(true);
            vscode.postMessage({ type: 'hardRefresh' });
        }
    };

    const handleViewInTree = (): void => {
        if (vscode) {
            vscode.postMessage({ type: 'viewInTree' });
        }
    };

    return (
        <ArgoCDApplicationView
            application={application}
            error={error}
            loading={loading}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            syncing={syncing}
            refreshing={refreshing}
            onSync={handleSync}
            onRefresh={handleRefresh}
            onHardRefresh={handleHardRefresh}
            onViewInTree={handleViewInTree}
        />
    );
}

// Render React app
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
} else {
    console.error('Root element not found');
}

