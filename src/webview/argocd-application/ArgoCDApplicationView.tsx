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
import { ARGOCD_APP_PANEL_IDS, ARGOCD_APP_TAB_IDS } from './graph/tabBarA11y';

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
 *
 * Focus order follows `.ai/interface/accessibility.md`: header actions, graph toolbar,
 * graph tiles, Graph | Details tabs, then the active panel. CSS grid keeps tabs visually
 * below the header while DOM order preserves keyboard sequence.
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
                disabled: syncing || refreshing,
                busy: syncing
            },
            {
                label: refreshing ? 'Refreshing...' : 'Refresh',
                icon: 'codicon-refresh',
                onClick: onRefresh,
                disabled: syncing || refreshing,
                busy: refreshing
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
            <div className="argocd-app-shell">
                <WebviewHeader
                    title={`ArgoCD: ${application.name}`}
                    actions={headerActions}
                    helpContext="argocd-application"
                    className="argocd-app-shell__header"
                />

                {activeTab === 'graph' && application && (
                    <GraphTab
                        application={application}
                        resourceGraph={resourceGraph}
                        graphInteraction={graphInteraction}
                        panelId={ARGOCD_APP_PANEL_IDS.graph}
                        labelledBy={ARGOCD_APP_TAB_IDS.graph}
                        className="argocd-app-shell__main"
                    />
                )}

                <div className="argocd-app-shell__tabs">
                    <TabBar activeTab={activeTab} onTabChange={onTabChange} />
                </div>

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
                        panelId={ARGOCD_APP_PANEL_IDS.details}
                        labelledBy={ARGOCD_APP_TAB_IDS.details}
                        className="argocd-app-shell__main"
                    />
                )}
            </div>
        );
    }

    // Fallback (should not reach here)
    return <LoadingState />;
}
