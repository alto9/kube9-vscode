import { OperatorStatusClient } from '../services/OperatorStatusClient';
import { KubeconfigParser } from '../kubernetes/KubeconfigParser';
import { OperatorDashboardStatus } from './types';
import { OperatorStatusMode } from '../kubernetes/OperatorStatusTypes';

/**
 * Singleton instance of OperatorStatusClient for querying operator status.
 */
const operatorStatusClient = new OperatorStatusClient();

/**
 * Queries the operator status ConfigMap to determine if the operator is installed
 * and if it has an API key configured.
 * 
 * This function wraps the OperatorStatusClient to provide a simplified interface
 * tailored for dashboard needs. It determines which conditional content to display
 * based on operator presence and API key configuration.
 * 
 * @param clusterContext The Kubernetes context name for the cluster
 * @returns Promise resolving to OperatorDashboardStatus or null if operator not installed
 * @throws Error if unable to determine kubeconfig path or query fails unexpectedly
 */
export async function getOperatorDashboardStatus(
    clusterContext: string
): Promise<OperatorDashboardStatus | null> {
    // Get kubeconfig path
    const kubeconfigPath = KubeconfigParser.getKubeconfigPath();
    
    // Query operator status using the existing client
    const cachedStatus = await operatorStatusClient.getStatus(
        kubeconfigPath,
        clusterContext,
        false // Don't force refresh, use cache if available
    );
    
    // Map the status mode to dashboard-friendly format
    const mode = cachedStatus.mode;
    
    // If operator not installed (basic mode), return null
    if (mode === OperatorStatusMode.Basic || !cachedStatus.status) {
        return null;
    }
    
    // Operator is installed - extract relevant fields
    const operatorStatus = cachedStatus.status;
    
    // Map the apiKeyConfigured field from operator status
    // In enabled mode, this indicates API key is configured at operator level
    const hasApiKey = operatorStatus.apiKeyConfigured && mode === OperatorStatusMode.Enabled;
    
    // Return dashboard-specific status
    const dashboardStatus: OperatorDashboardStatus = {
        mode: mode as 'basic' | 'operated' | 'enabled' | 'degraded',
        hasApiKey,
        tier: operatorStatus.tier,
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

