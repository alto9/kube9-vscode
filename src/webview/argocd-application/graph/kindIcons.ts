/**
 * Codicon mapping for graph node kinds (aligned with cluster tree iconography where possible).
 */
const KIND_ICON_MAP: Record<string, string> = {
    Application: 'codicon-cloud',
    Deployment: 'codicon-repo',
    StatefulSet: 'codicon-database',
    DaemonSet: 'codicon-server',
    Service: 'codicon-globe',
    ConfigMap: 'codicon-file',
    Secret: 'codicon-key',
    Ingress: 'codicon-link-external',
    Job: 'codicon-tasklist',
    CronJob: 'codicon-clock',
    Pod: 'codicon-package'
};

export function getKindIconClass(kindLabel: string, kind?: string): string {
    const key = kind ?? kindLabel;
    const icon = KIND_ICON_MAP[kindLabel] ?? KIND_ICON_MAP[key] ?? 'codicon-symbol-class';
    return `codicon ${icon}`;
}
