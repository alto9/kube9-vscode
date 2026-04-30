/**
 * Runtime allowlist of registered {@code kube9.*} command IDs sourced from extension {@code contributes.commands}.
 * Used by the telemetry façade before emitting {@link ProductTelemetryEventName.FeatureUsageCommand} /
 * {@link ProductTelemetryEventName.CoarseOutcomeCommand}.
 */

let kube9CommandTelemetryAllowlist: ReadonlySet<string> = new Set<string>();

export function resetKube9CommandTelemetryAllowlistForTests(): void {
    kube9CommandTelemetryAllowlist = new Set<string>();
}

export function setKube9CommandTelemetryAllowlist(ids: ReadonlySet<string>): void {
    kube9CommandTelemetryAllowlist = ids;
}

export function buildKube9TelemetryCommandAllowlistFromPackageJson(packageJson: Record<string, unknown>): ReadonlySet<string> {
    const contributes = packageJson.contributes as { commands?: { command?: string }[] } | undefined;
    const commands = contributes?.commands;
    const ids = new Set<string>();
    if (!Array.isArray(commands)) {
        return ids;
    }
    for (const row of commands) {
        const id = row.command;
        if (
            typeof id === 'string' &&
            id.startsWith('kube9.') &&
            !id.includes('.internal.')
        ) {
            ids.add(id);
        }
    }
    return ids;
}

export function isKube9TelemetryCommandAllowlisted(commandKey: string): boolean {
    return kube9CommandTelemetryAllowlist.has(commandKey);
}
