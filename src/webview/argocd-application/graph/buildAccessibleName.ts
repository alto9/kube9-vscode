/**
 * Accessible name for a graph tile per `.ai/interface/accessibility.md`:
 * kind + resource name + sync status + health status.
 */
export function buildGraphTileAccessibleName(
    kindLabel: string,
    label: string,
    syncStatus: string,
    healthStatus: string
): string {
    return `${kindLabel} ${label} ${syncStatus} ${healthStatus}`;
}
