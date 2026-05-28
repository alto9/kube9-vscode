import type { HealthStatusCode, SyncStatusCode } from '../../../types/argocd';

export function syncStatusBadgeClass(status: SyncStatusCode | string): string {
    if (status === 'OutOfSync') {
        return 'out-of-sync';
    }
    if (status === 'Unknown') {
        return 'unknown';
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
        case 'Missing':
            return 'degraded';
        case 'Progressing':
            return 'progressing';
        case 'Suspended':
            return 'unknown';
        default:
            return 'unknown';
    }
}

export function syncStatusIconClass(status: SyncStatusCode | string): string {
    return status === 'OutOfSync' ? 'codicon-warning' : 'codicon-check';
}
