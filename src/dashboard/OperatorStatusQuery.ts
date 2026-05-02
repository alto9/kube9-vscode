import { OperatorStatusClient } from '../services/OperatorStatusClient';
import { KubeconfigParser } from '../kubernetes/KubeconfigParser';
import { OperatorDashboardStatus } from './types';
import { OperatorStatusMode } from '../kubernetes/OperatorStatusTypes';

/**
 * Singleton instance of OperatorStatusClient for querying operator status.
 */
const operatorStatusClient = new OperatorStatusClient();

/**
 * Queries the operator status ConfigMap to determine if the operator is installed.
 *
 * Wraps {@link OperatorStatusClient} for dashboard use.
 *
 * @param clusterContext The Kubernetes context name for the cluster
 * @returns Promise resolving to OperatorDashboardStatus or null if operator not installed
 * @throws Error if unable to determine kubeconfig path or query fails unexpectedly
 */
export async function getOperatorDashboardStatus(
    clusterContext: string
): Promise<OperatorDashboardStatus | null> {
    const kubeconfigPath = KubeconfigParser.getKubeconfigPath();

    const cachedStatus = await operatorStatusClient.getStatus(
        kubeconfigPath,
        clusterContext,
        false
    );

    const mode = cachedStatus.mode;

    if (mode === OperatorStatusMode.Basic || !cachedStatus.status) {
        return null;
    }

    const operatorStatus = cachedStatus.status;

    const dashboardStatus: OperatorDashboardStatus = {
        mode: mode as 'basic' | 'operated' | 'enabled' | 'degraded',
        version: operatorStatus.version,
        health: operatorStatus.health
    };

    return dashboardStatus;
}

/**
 * Clears the cached operator status for a specific cluster.
 * Useful when forcing a dashboard refresh.
 * 
 * @param clusterContext The Kubernetes context name for the cluster
 */
export function clearOperatorStatusCache(clusterContext: string): void {
    const kubeconfigPath = KubeconfigParser.getKubeconfigPath();
    operatorStatusClient.clearCache(kubeconfigPath, clusterContext);
}

/**
 * Clears all cached operator statuses.
 * Useful during extension deactivation or when forcing a full refresh.
 */
export function clearAllOperatorStatusCache(): void {
    operatorStatusClient.clearAllCache();
}

