import React from 'react';
import { WebviewHeader, WebviewHeaderAction } from '../components/WebviewHeader';
import { WebviewSubheader } from '../components/WebviewSubheader';
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
    graphError: string | null;
    graphDegradation: string | null;
    skippedInvalidResourceRows: boolean;
    graphMerging: boolean;
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
    graphError,
    graphDegradation,
    skippedInvalidResourceRows,
    graphMerging,
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
        const operationDisabled = syncing || refreshing;

        const primaryActions: WebviewHeaderAction[] = [
            {
                label: syncing ? 'Syncing...' : 'Sync',
                icon: 'codicon-sync',
                onClick: onSync,
                disabled: operationDisabled,
                busy: syncing
            },
            {
                label: refreshing ? 'Refreshing...' : 'Refresh',
                icon: 'codicon-refresh',
                onClick: onRefresh,
                disabled: operationDisabled,
                busy: refreshing
            }
        ];

        const subheaderActions: WebviewHeaderAction[] = [
            {
                label: 'Hard Refresh',
                icon: 'codicon-clear-all',
                onClick: onHardRefresh,
                disabled: operationDisabled
            },
            {
                label: 'View in Tree',
                icon: 'codicon-list-tree',
                onClick: onViewInTree,
                disabled: operationDisabled
            }
        ];

        return (
            <div className="argocd-app-shell argocd-application-view">
                <WebviewHeader
                    title={`ArgoCD: ${application.name}`}
                    primaryActions={primaryActions}
                    helpContext="argocd-application"
                    className="argocd-app-shell__header"
                />

                <WebviewSubheader
                    actions={subheaderActions}
                    className="argocd-app-shell__subheader"
                />

                {activeTab === 'graph' && application && (
                    <GraphTab
                        application={application}
                        resourceGraph={resourceGraph}
                        graphError={graphError}
                        graphDegradation={graphDegradation}
                        skippedInvalidResourceRows={skippedInvalidResourceRows}
                        graphMerging={graphMerging}
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
