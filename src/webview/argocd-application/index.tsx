import './graph-deps';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArgoCDApplicationView } from './ArgoCDApplicationView';
import { TabType } from './components/TabBar';
import { migratePersistedTab } from './utils/tabMigration';
import { ArgoCDApplication } from '../../types/argocd';
import type { ApplicationResourceGraph } from '../../types/applicationResourceGraph';
import { deriveGraphMerging } from './components/GraphTab';
import { useGraphInteractionState } from './graph/useGraphInteractionState';

// Acquire VS Code API
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined;

// Make vscode API globally available (WebviewHeader prefers vscodeApi)
if (vscode) {
    (window as any).vscode = vscode;
    (window as any).vscodeApi = vscode;
}

interface WebviewState {
    selectedTab?: TabType | 'overview' | 'driftDetails';
}

/**
 * Main entry point for the ArgoCD Application React webview.
 */
function App(): React.JSX.Element {
    const [application, setApplication] = React.useState<ArgoCDApplication | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [activeTab, setActiveTab] = React.useState<TabType>('graph');
    const [resourceGraph, setResourceGraph] = React.useState<ApplicationResourceGraph | null>(null);
    const [graphError, setGraphError] = React.useState<string | null>(null);
    const [graphDegradation, setGraphDegradation] = React.useState<string | null>(null);
    const [skippedInvalidResourceRows, setSkippedInvalidResourceRows] = React.useState<boolean>(false);
    const [syncing, setSyncing] = React.useState<boolean>(false);
    const [refreshing, setRefreshing] = React.useState<boolean>(false);
    const [appOperationRunning, setAppOperationRunning] = React.useState<boolean>(false);

    const graphInteractionState = useGraphInteractionState(vscode, {
        menusDisabled: syncing || refreshing || appOperationRunning
    });
    const {
        handleResourceActionProgress,
        handleResourceActionResult,
        ...graphInteraction
    } = graphInteractionState;

    // Restore state from VS Code API
    React.useEffect(() => {
        if (vscode) {
            const previousState = vscode.getState() as WebviewState | undefined;
            if (previousState?.selectedTab) {
                setActiveTab(migratePersistedTab(previousState.selectedTab));
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
                    if (message.phase === 'Running') {
                        setAppOperationRunning(true);
                        if (message.message?.toLowerCase().includes('sync')) {
                            setSyncing(true);
                        } else if (message.message?.toLowerCase().includes('refresh')) {
                            setRefreshing(true);
                        }
                    } else if (message.phase === 'Succeeded' || message.phase === 'Failed' || message.phase === 'Error') {
                        setAppOperationRunning(false);
                        setSyncing(false);
                        setRefreshing(false);
                    }
                    break;

                case 'resourceGraph':
                    setResourceGraph(message.graph);
                    setGraphError(null);
                    setGraphDegradation(null);
                    setSkippedInvalidResourceRows(message.skippedInvalidResourceRows === true);
                    break;

                case 'graphError':
                    setGraphError(message.message || 'Resource graph unavailable');
                    break;

                case 'graphDegradation':
                    setGraphDegradation(message.message || 'Graph data may be incomplete');
                    break;

                case 'resourceActionProgress':
                    handleResourceActionProgress(message);
                    break;

                case 'resourceActionResult':
                    handleResourceActionResult(message);
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
    }, [application, handleResourceActionProgress, handleResourceActionResult]);

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

    const handleNavigateToResource = (kind: string, name: string, namespace: string): void => {
        if (vscode) {
            vscode.postMessage({ 
                type: 'navigateToResource',
                kind,
                name,
                namespace
            });
        }
    };

    const graphMerging = deriveGraphMerging(resourceGraph, syncing, refreshing, appOperationRunning);

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
            onNavigateToResource={handleNavigateToResource}
            resourceGraph={resourceGraph}
            graphError={graphError}
            graphDegradation={graphDegradation}
            skippedInvalidResourceRows={skippedInvalidResourceRows}
            graphMerging={graphMerging}
            graphInteraction={graphInteraction}
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

