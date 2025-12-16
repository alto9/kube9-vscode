import React from 'react';
import { ArgoCDApplication } from '../../../types/argocd';
import { MetadataSection } from './MetadataSection';
import { SyncStatusSection } from './SyncStatusSection';
import { HealthStatusSection } from './HealthStatusSection';
import { SourceSection } from './SourceSection';
import { ActionButtons } from './ActionButtons';

interface OverviewTabProps {
    application: ArgoCDApplication;
    syncing?: boolean;
    refreshing?: boolean;
    onSync: () => void;
    onRefresh: () => void;
    onHardRefresh: () => void;
    onViewInTree: () => void;
}

/**
 * Overview tab component displaying comprehensive application information.
 */
export function OverviewTab({
    application,
    syncing = false,
    refreshing = false,
    onSync,
    onRefresh,
    onHardRefresh,
    onViewInTree
}: OverviewTabProps): React.JSX.Element {
    return (
        <div>
            <MetadataSection application={application} />
            <SyncStatusSection syncStatus={application.syncStatus} syncedAt={application.syncedAt} />
            <HealthStatusSection healthStatus={application.healthStatus} />
            <SourceSection source={application.source} />
            <ActionButtons
                onSync={onSync}
                onRefresh={onRefresh}
                onHardRefresh={onHardRefresh}
                onViewInTree={onViewInTree}
                syncing={syncing}
                refreshing={refreshing}
            />
        </div>
    );
}

