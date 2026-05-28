import React from 'react';
import { WebviewHeader, WebviewHeaderAction } from '../components/WebviewHeader';
import { TabBar, TabType } from './components/TabBar';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { DetailsTab } from './components/DetailsTab';
import { GraphTab } from './components/GraphTab';
import { ArgoCDApplication } from '../../types/argocd';
import type { ApplicationResourceGraph } from '../../types/applicationResourceGraph';
import type { GraphInteractionContextValue } from './graph/GraphInteractionContext';

interface ArgoCDApplicationViewProps {
    application: ArgoCDApplication | null;
    error: string | null;
    loading: boolean;
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    syncing?: boolean;
    refreshing?: boolean;
    onSync: () => void;
    onRefresh: () => void;
    onHardRefresh: () => void;
    onViewInTree: () => void;
    onNavigateToResource: (kind: string, name: string, namespace: string) => void;
    resourceGraph: ApplicationResourceGraph | null;
    graphInteraction: GraphInteractionContextValue;
}

/**
 * Main component for the ArgoCD Application webview.
 * Manages application data display, tab navigation, and state.
 */
export function ArgoCDApplicationView({
    application,
    error,
    loading,
    activeTab,
    onTabChange,
    syncing = false,
    refreshing = false,
    onSync,
    onRefresh,
    onHardRefresh,
    onViewInTree,
    onNavigateToResource,
    resourceGraph,
    graphInteraction
}: ArgoCDApplicationViewProps): React.JSX.Element {
    // Show loading state
    if (loading) {
        return <LoadingState />;
    }

    // Show error state
    if (error) {
        return <ErrorState message={error} />;
    }

    // Show content when application data is loaded
    if (application) {
        const headerActions: WebviewHeaderAction[] = [
            {
                label: syncing ? 'Syncing...' : 'Sync',
                icon: 'codicon-sync',
                onClick: onSync,
                disabled: syncing || refreshing
            },
            {
                label: refreshing ? 'Refreshing...' : 'Refresh',
                icon: 'codicon-refresh',
                onClick: onRefresh,
                disabled: syncing || refreshing
            },
            {
                label: 'Hard Refresh',
                icon: 'codicon-clear-all',
                onClick: onHardRefresh,
                disabled: syncing || refreshing
            },
            {
                label: 'View in Tree',
                icon: 'codicon-list-tree',
                onClick: onViewInTree,
                disabled: syncing || refreshing
            }
        ];

        return (
            <div style={{
                fontFamily: 'var(--vscode-font-family)',
                color: 'var(--vscode-foreground)',
                backgroundColor: 'var(--vscode-editor-background)',
                padding: 0,
                margin: 0,
                minHeight: '100vh'
            }}>
                <WebviewHeader
                    title={`ArgoCD: ${application.name}`}
                    actions={headerActions}
                    helpContext="argocd-application"
                />
                <div style={{ padding: '0 20px' }}>
                    <TabBar activeTab={activeTab} onTabChange={onTabChange} />

                {activeTab === 'graph' && application && (
                    <GraphTab
                        application={application}
                        resourceGraph={resourceGraph}
                        graphInteraction={graphInteraction}
                    />
                )}

                {activeTab === 'details' && application && (
                    <DetailsTab
                        application={application}
                        syncing={syncing}
                        refreshing={refreshing}
                        onSync={onSync}
                        onRefresh={onRefresh}
                        onHardRefresh={onHardRefresh}
                        onViewInTree={onViewInTree}
                        onNavigateToResource={onNavigateToResource}
                    />
                )}
                </div>
            </div>
        );
    }

    // Fallback (should not reach here)
    return <LoadingState />;
}

