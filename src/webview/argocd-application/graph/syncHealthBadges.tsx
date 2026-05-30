import React from 'react';
import type { ResourceGraphNodeStatus } from '../../../types/applicationResourceGraph';
import {
    healthStatusBadgeClass,
    healthStatusIconClass,
    healthStatusLabel,
    syncStatusBadgeClass,
    syncStatusIconClass
} from './syncHealthBadgeClasses';

export {
    healthStatusBadgeClass,
    healthStatusIconClass,
    healthStatusLabel,
    syncStatusBadgeClass,
    syncStatusIconClass
} from './syncHealthBadgeClasses';

interface SyncHealthBadgesProps {
    status: Pick<ResourceGraphNodeStatus, 'syncStatus' | 'healthStatus' | 'message'>;
    className?: string;
    /** When true, badges are hidden from the accessibility tree (parent supplies the name). */
    decorative?: boolean;
    showSync?: boolean;
    showHealth?: boolean;
}

/**
 * Sync and health badges shared by drift table rows and graph tiles.
 */
export function SyncHealthBadges({
    status,
    className,
    decorative = false,
    showSync = true,
    showHealth = true
}: SyncHealthBadgesProps): React.JSX.Element {
    const syncClass = syncStatusBadgeClass(status.syncStatus, status.healthStatus);
    const healthClass = healthStatusBadgeClass(status.healthStatus);
    const healthIcon = healthStatusIconClass(status.healthStatus);
    const rootClass = ['argocd-status-badge-group', className].filter(Boolean).join(' ');

    return (
        <div className={rootClass} aria-hidden={decorative ? true : undefined}>
            {showSync ? (
                <span
                    className={`argocd-status-badge ${syncClass}`}
                    title={status.message}
                >
                    <span
                        className={`codicon ${syncStatusIconClass(status.syncStatus, status.healthStatus)}`}
                        aria-hidden="true"
                    />
                    <span>{status.syncStatus}</span>
                </span>
            ) : null}
            {showHealth ? (
                <span
                    className={`argocd-status-badge ${healthClass}`}
                    title={status.message}
                >
                    {healthIcon ? (
                        <span className={`codicon ${healthIcon}`} aria-hidden="true" />
                    ) : null}
                    <span>{healthStatusLabel(status.healthStatus)}</span>
                </span>
            ) : null}
        </div>
    );
}
