import * as k8s from '@kubernetes/client-node';
import { KubectlError } from '../kubernetes/KubectlError';
import { fetchPods } from '../kubernetes/resourceFetchers';
import { getKubernetesApiClient } from '../kubernetes/apiClient';

/**
 * Result of a pods on node query operation.
 */
export interface PodsOnNodeResult {
    /**
     * Array of V1Pod objects running on the specified node, empty if query failed.
     */
    pods: k8s.V1Pod[];
    
    /**
     * Error information if the pod query failed.
     */
    error: KubectlError | null;
}

/**
 * Utility class for kubectl pod operations.
 */
export class PodCommands {
    /**
     * Retrieves all pods running on a specific node from a cluster using the Kubernetes API client.
     * Uses direct API calls with field selector to filter pods by node name.
     * Queries all namespaces to find pods regardless of namespace.
     * 
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to query
     * @param nodeName Name of the node to retrieve pods for
     * @returns PodsOnNodeResult with V1Pod array and optional error information
     */
    public static async getPodsOnNode(
        kubeconfigPath: string,
        contextName: string,
        nodeName: string
    ): Promise<PodsOnNodeResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Fetch pods from all namespaces with field selector for node name
            const v1Pods = await fetchPods({ 
                fieldSelector: `spec.nodeName=${nodeName}`,
                timeout: 10 
            });
            
            return {
                pods: v1Pods,
                error: null
            };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Pod query failed for node ${nodeName} in context ${contextName}: ${kubectlError.getDetails()}`);
            
            return {
                pods: [],
                error: kubectlError
            };
        }
    }
}

