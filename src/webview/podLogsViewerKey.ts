/**
 * Stable string key for deduplicating pod log viewer panels by kubectl context,
 * namespace, pod, and selected container (including "all").
 */
export function makePodLogsViewerKey(
    contextName: string,
    namespace: string,
    podName: string,
    container: string
): string {
    return JSON.stringify([contextName, namespace, podName, container]);
}
