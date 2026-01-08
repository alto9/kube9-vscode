import { KubectlError } from '../kubernetes/KubectlError';
import { getKubernetesApiClient } from '../kubernetes/apiClient';
import * as k8s from '@kubernetes/client-node';


/**
 * Information about a Custom Resource Definition (CRD).
 */
export interface CRDInfo {
    /** Name of the CRD (typically includes group, e.g., "mycustomresources.apps.example.com") */
    name: string;
    /** API group of the CRD (e.g., "apps.example.com") */
    group: string;
    /** Preferred version of the CRD (e.g., "v1") */
    version: string;
    /** Kind name for the custom resource (e.g., "MyCustomResource") */
    kind: string;
}

/**
 * Result of a CRD query operation.
 */
export interface CRDsResult {
    /**
     * Array of CRD information, empty if query failed.
     */
    crds: CRDInfo[];
    
    /**
     * Error information if the CRD query failed.
     */
    error?: KubectlError;
}


/**
 * Utility class for custom resource operations using the Kubernetes API client.
 */
export class CustomResourceCommands {
    /**
     * Retrieves the list of Custom Resource Definitions (CRDs) from a cluster using the Kubernetes API client.
     * 
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to query
     * @returns CRDsResult with crds array and optional error information
     */
    public static async getCRDs(
        kubeconfigPath: string,
        contextName: string
    ): Promise<CRDsResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Fetch CRDs from API
            const response = await apiClient.apiextensions.listCustomResourceDefinition({
                timeoutSeconds: 10
            });
            
            // Extract CRD information from the items array
            const crds: CRDInfo[] = (response.items || []).map((item: k8s.V1CustomResourceDefinition) => {
                const name = item.metadata?.name || 'Unknown';
                const group = item.spec?.group || '';
                const kind = item.spec?.names?.kind || 'Unknown';
                
                // Find the preferred/storage version
                // The storage version is the one marked with storage: true
                let version = '';
                if (item.spec?.versions && item.spec.versions.length > 0) {
                    const storageVersion = item.spec.versions.find(v => v.storage === true);
                    version = storageVersion?.name || item.spec.versions[0]?.name || '';
                }
                
                return {
                    name,
                    group,
                    version,
                    kind
                };
            });
            
            // Sort CRDs alphabetically by kind
            crds.sort((a, b) => a.kind.localeCompare(b.kind));
            
            return { crds };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`CRD query failed for context ${contextName}: ${kubectlError.getDetails()}`);
            
            return {
                crds: [],
                error: kubectlError
            };
        }
    }
}

