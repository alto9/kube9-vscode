import React from 'react';
import { ArgoCDApplication } from '../../../types/argocd';
import { OverviewTab } from './OverviewTab';
import { DriftDetailsTab } from './DriftDetailsTab';

interface DetailsTabProps {
    application: ArgoCDApplication;
    syncing?: boolean;
    refreshing?: boolean;
    onSync: () => void;
    onRefresh: () => void;
    onHardRefresh: () => void;
    onViewInTree: () => void;
    onNavigateToResource: (kind: string, name: string, namespace: string) => void;
}

const sectionDividerStyle: React.CSSProperties = {
    borderTop: '1px solid var(--vscode-panel-border)',
    margin: '24px 0'
};

/**
 * Details tab combining overview metadata and drift resource table in one scrollable column.
 */
export function DetailsTab({
    application,
    syncing = false,
    refreshing = false,
    onSync,
    onRefresh,
    onHardRefresh,
    onViewInTree,
    onNavigateToResource
}: DetailsTabProps): React.JSX.Element {
    return (
        <div>
            <OverviewTab
                application={application}
                syncing={syncing}
                refreshing={refreshing}
                onSync={onSync}
                onRefresh={onRefresh}
                onHardRefresh={onHardRefresh}
                onViewInTree={onViewInTree}
            />
            <div style={sectionDividerStyle} role="separator" />
            <DriftDetailsTab application={application} onNavigate={onNavigateToResource} />
        </div>
    );
}
