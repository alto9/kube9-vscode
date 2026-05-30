import type { HealthStatusCode, SyncStatusCode } from '../../../types/argocd';

/**
 * Webview sync/health badge codicons and CSS classes mirror `src/utils/argoCDIcons.ts`.
 * The tree shows one combined icon; webview surfaces show separate sync and health badges
 * with equivalent meaning.
 */

export function syncStatusBadgeClass(
    syncStatus: SyncStatusCode | string,
    healthStatus?: HealthStatusCode
): string {
    if (healthStatus === 'Suspended') {
        return 'unknown';
    }

    if (syncStatus === 'OutOfSync') {
        return healthStatus === 'Degraded' ? 'out-of-sync-warning' : 'out-of-sync';
    }

    if (syncStatus === 'Unknown') {
        return 'unknown';
    }

    if (syncStatus === 'Synced' && healthStatus === 'Progressing') {
        return 'progressing';
    }

    return 'synced';
}

export function healthStatusBadgeClass(status?: HealthStatusCode): string {
    if (!status || status === 'Unknown') {
        return 'unknown';
    }

    switch (status) {
        case 'Healthy':
            return 'healthy';
        case 'Degraded':
            return 'degraded';
        case 'Missing':
            return 'missing';
        case 'Progressing':
            return 'progressing';
        case 'Suspended':
            return 'suspended';
        default:
            return 'unknown';
    }
}

export function syncStatusIconClass(
    syncStatus: SyncStatusCode | string,
    healthStatus?: HealthStatusCode
): string {
    if (healthStatus === 'Suspended') {
        return 'codicon-debug-pause';
    }

    switch (syncStatus) {
        case 'Synced':
            if (healthStatus === 'Progressing') {
                return 'codicon-sync';
            }
            if (healthStatus === 'Degraded') {
                return 'codicon-warning';
            }
            return 'codicon-check';

        case 'OutOfSync':
            return 'codicon-warning';

        case 'Unknown':
        default:
            if (healthStatus === 'Degraded') {
                return 'codicon-error';
            }
            return 'codicon-question';
    }
}

export function healthStatusIconClass(healthStatus?: HealthStatusCode): string | null {
    if (!healthStatus || healthStatus === 'Unknown') {
        return 'codicon-question';
    }

    switch (healthStatus) {
        case 'Healthy':
            return 'codicon-check';
        case 'Degraded':
            return 'codicon-warning';
        case 'Missing':
            return 'codicon-error';
        case 'Progressing':
            return 'codicon-sync';
        case 'Suspended':
            return 'codicon-debug-pause';
        default:
            return 'codicon-question';
    }
}

export function healthStatusLabel(status?: HealthStatusCode): string {
    if (!status) {
        return '—';
    }
    if (status === 'Unknown') {
        return 'Unknown';
    }
    return status;
}
