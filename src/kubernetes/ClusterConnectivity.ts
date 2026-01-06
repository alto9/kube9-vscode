import { ClusterStatus } from './ClusterTypes';
import { KubectlError } from './KubectlError';
import { getKubernetesApiClient } from './apiClient';

/**
 * Timeout for connectivity checks in milliseconds.
 * If a cluster doesn't respond within this time, it's considered disconnected.
 */
const CONNECTIVITY_TIMEOUT_MS = 5000;


/**
 * Result of a connectivity check operation.
 */
export interface ConnectivityResult {
    /**
     * The connection status of the cluster.
     */
    status: ClusterStatus;
    
    /**
     * Error information if the connectivity check failed.
     */
    error?: KubectlError;
}

/**
 * Result of a namespace query operation.
 */
export interface NamespaceResult {
    /**
     * Array of namespace names, empty if query failed.
     */
    namespaces: string[];
    
    /**
     * Error information if the namespace query failed.
     */
    error?: KubectlError;
}

/**
 * Utility class for checking Kubernetes cluster connectivity using the Kubernetes API client.
 */
export class ClusterConnectivity {
    /**
     * Checks if a cluster is reachable using the Kubernetes API.
     * Uses the Version API as a simple connectivity check.
     * 
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to check
     * @returns ConnectivityResult with status and optional error information
     */
    public static async checkConnectivity(
        kubeconfigPath: string,
        contextName: string
    ): Promise<ConnectivityResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Use Version API as a simple connectivity check
            // This is a lightweight endpoint that just returns cluster version info
            await apiClient.version.getCode();
            
            // If API call succeeds, cluster is connected
            return { status: ClusterStatus.Connected };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Cluster connectivity check failed for context ${contextName}: ${kubectlError.getDetails()}`);
            
            return { 
                status: ClusterStatus.Disconnected,
                error: kubectlError
            };
        }
    }

    /**
     * Checks connectivity for multiple clusters in parallel.
     * This is more efficient than checking them sequentially.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextNames Array of context names to check
     * @returns Array of ConnectivityResult values in the same order as input
     */
    public static async checkMultipleConnectivity(
        kubeconfigPath: string,
        contextNames: string[]
    ): Promise<ConnectivityResult[]> {
        const promises = contextNames.map(contextName => 
            this.checkConnectivity(kubeconfigPath, contextName)
        );
        return await Promise.all(promises);
    }

    /**
     * Retrieves the list of namespaces from a cluster using the Kubernetes API client.
     * 
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to query
     * @returns NamespaceResult with namespaces array and optional error information
     */
    public static async getNamespaces(
        kubeconfigPath: string,
        contextName: string
    ): Promise<NamespaceResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Fetch namespaces from API
            const response = await apiClient.core.listNamespace({
                timeoutSeconds: Math.floor(CONNECTIVITY_TIMEOUT_MS / 1000)
            });
            
            // Extract namespace names from the items array
            const namespaces: string[] = (response.items || [])
                .map(item => item.metadata?.name)
                .filter((name): name is string => Boolean(name));
            
            // Sort alphabetically
            namespaces.sort((a, b) => a.localeCompare(b));
            
            return { namespaces };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Namespace query failed for context ${contextName}: ${kubectlError.getDetails()}`);
            
            return {
                namespaces: [],
                error: kubectlError
            };
        }
    }
}

