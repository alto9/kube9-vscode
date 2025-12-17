import { KubectlError } from '../kubernetes/KubectlError';
import { fetchNamespaces } from '../kubernetes/resourceFetchers';
import { getResourceCache, CACHE_TTL } from '../kubernetes/cache';
import { getKubernetesApiClient } from '../kubernetes/apiClient';

/**
 * Information about a Kubernetes namespace.
 */
export interface NamespaceInfo {
    /** Name of the namespace */
    name: string;
    /** Status/phase of the namespace (Active, Terminating, Unknown) */
    status: string;
}

/**
 * Result of a namespace query operation.
 */
export interface NamespacesResult {
    /**
     * Array of namespace information, empty if query failed.
     */
    namespaces: NamespaceInfo[];
    
    /**
     * Error information if the namespace query failed.
     */
    error?: KubectlError;
}

/**
 * Utility class for kubectl namespace operations.
 */
export class NamespaceCommands {
    /**
     * Retrieves the list of namespaces from a cluster using the Kubernetes API client.
     * Uses direct API calls with caching to improve performance.
     * 
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to query
     * @returns NamespacesResult with namespaces array and optional error information
     */
    public static async getNamespaces(
        kubeconfigPath: string,
        contextName: string
    ): Promise<NamespacesResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Check cache first
            const cache = getResourceCache();
            const cacheKey = `${contextName}:namespaces`;
            const cached = cache.get<NamespaceInfo[]>(cacheKey);
            if (cached) {
                return { namespaces: cached };
            }
            
            // Fetch from API
            const v1Namespaces = await fetchNamespaces({ timeout: 10 });
            
            // Transform to NamespaceInfo format
            const namespaces: NamespaceInfo[] = v1Namespaces.map(ns => ({
                name: ns.metadata?.name || 'Unknown',
                status: ns.status?.phase || 'Unknown'
            }));
            
            // Sort namespaces alphabetically by name
            namespaces.sort((a, b) => a.name.localeCompare(b.name));
            
            // Cache result
            cache.set(cacheKey, namespaces, CACHE_TTL.NAMESPACES);
            
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

