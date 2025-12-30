import * as k8s from '@kubernetes/client-node';
import { KubectlError } from '../kubernetes/KubectlError';
import { fetchNodes } from '../kubernetes/resourceFetchers';
import { getResourceCache, CACHE_TTL } from '../kubernetes/cache';
import { getKubernetesApiClient } from '../kubernetes/apiClient';

/**
 * Information about a Kubernetes node.
 */
export interface NodeInfo {
    /** Name of the node */
    name: string;
    /** Status of the node (Ready, NotReady, Unknown) */
    status: string;
    /** Roles assigned to the node (e.g., control-plane, worker) */
    roles: string[];
}

/**
 * Result of a node query operation.
 */
export interface NodesResult {
    /**
     * Array of node information, empty if query failed.
     */
    nodes: NodeInfo[];
    
    /**
     * Error information if the node query failed.
     */
    error?: KubectlError;
}

/**
 * Result of a node details query operation.
 */
export interface NodeDetailsResult {
    /**
     * Complete V1Node object with full node details, null if query failed.
     */
    node: k8s.V1Node | null;
    
    /**
     * Error information if the node query failed.
     */
    error: KubectlError | null;
}


/**
 * Utility class for kubectl node operations.
 */
export class NodeCommands {
    /**
     * Retrieves the list of nodes from a cluster using the Kubernetes API client.
     * Uses direct API calls with caching to improve performance.
     * 
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to query
     * @returns NodesResult with nodes array and optional error information
     */
    public static async getNodes(
        kubeconfigPath: string,
        contextName: string
    ): Promise<NodesResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Check cache first
            const cache = getResourceCache();
            const cacheKey = `${contextName}:nodes`;
            const cached = cache.get<NodeInfo[]>(cacheKey);
            if (cached) {
                return { nodes: cached };
            }
            
            // Fetch from API
            const v1Nodes = await fetchNodes({ timeout: 10 });
            
            // Transform to NodeInfo format
            const nodes: NodeInfo[] = v1Nodes.map(node => {
                const name = node.metadata?.name || 'Unknown';
                
                // Extract roles from labels
                const labels = node.metadata?.labels || {};
                const roles: string[] = [];
                
                // Check for common role labels
                if (labels['node-role.kubernetes.io/control-plane'] !== undefined || 
                    labels['node-role.kubernetes.io/master'] !== undefined) {
                    roles.push('control-plane');
                }
                
                // Check for other role labels
                Object.keys(labels).forEach(key => {
                    if (key.startsWith('node-role.kubernetes.io/') && 
                        !key.includes('control-plane') && 
                        !key.includes('master')) {
                        const role = key.replace('node-role.kubernetes.io/', '');
                        if (role && !roles.includes(role)) {
                            roles.push(role);
                        }
                    }
                });
                
                // If no roles found, default to 'worker'
                if (roles.length === 0) {
                    roles.push('worker');
                }
                
                // Determine node status from conditions
                let status = 'Unknown';
                const conditions = node.status?.conditions || [];
                const readyCondition = conditions.find(c => c.type === 'Ready');
                
                if (readyCondition) {
                    status = readyCondition.status === 'True' ? 'Ready' : 'NotReady';
                }
                
                return {
                    name,
                    status,
                    roles
                };
            });
            
            // Sort nodes alphabetically by name
            nodes.sort((a, b) => a.name.localeCompare(b.name));
            
            // Cache result
            cache.set(cacheKey, nodes, CACHE_TTL.NODES);
            
            return { nodes };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Node query failed for context ${contextName}: ${kubectlError.getDetails()}`);
            
            return {
                nodes: [],
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves detailed information for a specific node from a cluster using the Kubernetes API client.
     * Uses direct API calls to fetch complete V1Node details.
     * 
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to query
     * @param nodeName Name of the node to retrieve details for
     * @returns NodeDetailsResult with V1Node object and optional error information
     */
    public static async getNodeDetails(
        kubeconfigPath: string,
        contextName: string,
        nodeName: string
    ): Promise<NodeDetailsResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Fetch single node from API
            const v1Node = await apiClient.core.readNode({
                name: nodeName
            });
            
            return {
                node: v1Node,
                error: null
            };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Node details query failed for node ${nodeName} in context ${contextName}: ${kubectlError.getDetails()}`);
            
            return {
                node: null,
                error: kubectlError
            };
        }
    }
}

