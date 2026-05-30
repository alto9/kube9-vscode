import React from 'react';
import type { ResourceGraphNodeStatus } from '../../../types/applicationResourceGraph';
import {
    healthStatusBadgeClass,
    syncStatusBadgeClass,
    syncStatusIconClass
} from './syncHealthBadgeClasses';

export { healthStatusBadgeClass, syncStatusBadgeClass, syncStatusIconClass } from './syncHealthBadgeClasses';

interface SyncHealthBadgesProps {
    status: Pick<ResourceGraphNodeStatus, 'syncStatus' | 'healthStatus' | 'message'>;
    className?: string;
    /** When true, badges are hidden from the accessibility tree (parent supplies the name). */
    decorative?: boolean;
}

/**
 * Sync and health badges shared by drift table rows and graph tiles.
 */
export function SyncHealthBadges({ status, className, decorative = false }: SyncHealthBadgesProps): React.JSX.Element {
    const syncClass = syncStatusBadgeClass(status.syncStatus);
    const healthClass = healthStatusBadgeClass(status.healthStatus);
    const rootClass = ['argocd-status-badge-group', className].filter(Boolean).join(' ');

    return (
        <div className={rootClass} aria-hidden={decorative ? true : undefined}>
            <span
                className={`argocd-status-badge ${syncClass}`}
                title={status.message}
            >
                <span className={`codicon ${syncStatusIconClass(status.syncStatus)}`} aria-hidden="true" />
                <span>{status.syncStatus}</span>
            </span>
            <span
                className={`argocd-status-badge ${healthClass}`}
                title={status.message}
            >
                <span>{status.healthStatus}</span>
            </span>
        </div>
    );
}
