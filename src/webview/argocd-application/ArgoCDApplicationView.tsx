import React from 'react';
import { WebviewHeader, WebviewHeaderAction } from '../components/WebviewHeader';
import { TabBar, TabType } from './components/TabBar';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { OverviewTab } from './components/OverviewTab';
import { DriftDetailsTab } from './components/DriftDetailsTab';
import { ArgoCDApplication } from '../../types/argocd';

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
    onNavigateToResource
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

                {activeTab === 'overview' && application && (
                    <OverviewTab
                        application={application}
                        syncing={syncing}
                        refreshing={refreshing}
                        onSync={onSync}
                        onRefresh={onRefresh}
                        onHardRefresh={onHardRefresh}
                        onViewInTree={onViewInTree}
                    />
                )}

                {activeTab === 'driftDetails' && application && (
                    <DriftDetailsTab
                        application={application}
                        onNavigate={onNavigateToResource}
                    />
                )}
                </div>
            </div>
        );
    }

    // Fallback (should not reach here)
    return <LoadingState />;
}

