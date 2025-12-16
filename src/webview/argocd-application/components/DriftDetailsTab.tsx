import React from 'react';
import { ArgoCDApplication } from '../../../types/argocd';
import { OutOfSyncSummary } from './OutOfSyncSummary';
import { ResourceFilter } from './ResourceFilter';
import { ResourceTable } from './ResourceTable';

interface DriftDetailsTabProps {
    application: ArgoCDApplication;
    onNavigate: (kind: string, name: string, namespace: string) => void;
}

/**
 * Drift Details tab component displaying resource-level sync status with table display, filtering, and expandable rows.
 */
export function DriftDetailsTab({ application, onNavigate }: DriftDetailsTabProps): React.JSX.Element {
    const [showOnlyOutOfSync, setShowOnlyOutOfSync] = React.useState<boolean>(false);

    const outOfSyncCount = React.useMemo(() => {
        return application.resources.filter(r => r.syncStatus === 'OutOfSync').length;
    }, [application.resources]);

    const filteredResources = React.useMemo(() => {
        if (showOnlyOutOfSync) {
            return application.resources.filter(r => r.syncStatus === 'OutOfSync');
        }
        return application.resources;
    }, [application.resources, showOnlyOutOfSync]);

    const emptyStateStyle: React.CSSProperties = {
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--vscode-descriptionForeground)',
        fontSize: '13px',
        fontFamily: 'var(--vscode-font-family)'
    };

    return (
        <div>
            <OutOfSyncSummary count={outOfSyncCount} />
            <ResourceFilter 
                showOnlyOutOfSync={showOnlyOutOfSync}
                onToggle={setShowOnlyOutOfSync}
            />
            {showOnlyOutOfSync && filteredResources.length === 0 ? (
                <div style={emptyStateStyle}>
                    No out-of-sync resources
                </div>
            ) : (
                <ResourceTable resources={filteredResources} onNavigate={onNavigate} />
            )}
        </div>
    );
}

