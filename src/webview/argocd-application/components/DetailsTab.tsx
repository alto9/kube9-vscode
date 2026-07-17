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
    onNavigateToResource: (kind: string, name: string, namespace: string) => void;
    panelId?: string;
    labelledBy?: string;
    className?: string;
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
    onNavigateToResource,
    panelId,
    labelledBy,
    className
}: DetailsTabProps): React.JSX.Element {
    const rootClass = ['argocd-details-panel', className].filter(Boolean).join(' ');

    return (
        <div
            id={panelId}
            className={rootClass}
            role="tabpanel"
            aria-labelledby={labelledBy}
            tabIndex={-1}
        >
            <OverviewTab
                application={application}
                syncing={syncing}
                refreshing={refreshing}
                onSync={onSync}
                onRefresh={onRefresh}
                onHardRefresh={onHardRefresh}
            />
            <div style={sectionDividerStyle} role="separator" />
            <DriftDetailsTab application={application} onNavigate={onNavigateToResource} />
        </div>
    );
}
