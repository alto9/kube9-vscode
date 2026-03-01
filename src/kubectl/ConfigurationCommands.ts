import { KubectlError } from '../kubernetes/KubectlError';
import { getKubernetesApiClient } from '../kubernetes/apiClient';
import { getResourceCache, CACHE_TTL } from '../kubernetes/cache';
import { fetchSecrets } from '../kubernetes/resourceFetchers';


/**
 * Information about a Kubernetes configmap.
 */
export interface ConfigMapInfo {
    /** Name of the configmap */
    name: string;
    /** Namespace of the configmap */
    namespace: string;
    /** Number of data keys in the configmap */
    dataKeys: number;
}

/**
 * Result of a configmap query operation.
 */
export interface ConfigMapsResult {
    /**
     * Array of configmap information, empty if query failed.
     */
    configMaps: ConfigMapInfo[];
    
    /**
     * Error information if the configmap query failed.
     */
    error?: KubectlError;
}

/**
 * Result of a single ConfigMap query operation.
 */
export interface ConfigMapResult {
    /**
     * The ConfigMap data, or null if query failed or ConfigMap not found.
     */
    configMap: ConfigMapResponse | null;
    
    /**
     * Error information if the ConfigMap query failed.
     */
    error?: KubectlError;
}


/**
 * Interface for kubectl configmap response (single ConfigMap).
 */
interface ConfigMapResponse {
    metadata?: {
        name?: string;
        namespace?: string;
    };
    data?: {
        [key: string]: string;
    };
}


/**
 * Information about a Kubernetes secret.
 */
export interface SecretInfo {
    /** Name of the secret */
    name: string;
    /** Namespace of the secret */
    namespace: string;
    /** Type of the secret (e.g., Opaque, kubernetes.io/service-account-token) */
    type: string;
}

/**
 * Result of a secret query operation.
 */
export interface SecretsResult {
    /**
     * Array of secret information, empty if query failed.
     */
    secrets: SecretInfo[];
    
    /**
     * Error information if the secret query failed.
     */
    error?: KubectlError;
}



/**
 * Utility class for kubectl configuration operations.
 */
export class ConfigurationCommands {
    /**
     * Retrieves the list of configmaps from all namespaces using the Kubernetes API client.
     * Uses direct API calls to fetch ConfigMap resources.
     * 
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to query
     * @returns ConfigMapsResult with configMaps array and optional error information
     */
    public static async getConfigMaps(
        kubeconfigPath: string,
        contextName: string
    ): Promise<ConfigMapsResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Check cache first
            const cache = getResourceCache();
            const cacheKey = `${contextName}:configmaps`;
            const cached = cache.get<ConfigMapInfo[]>(cacheKey);
            if (cached) {
                return { configMaps: cached };
            }
            
            // Fetch from API - get all configmaps across all namespaces
            const response = await apiClient.core.listConfigMapForAllNamespaces({
                timeoutSeconds: 10
            });
            
            // Transform k8s.V1ConfigMap[] to ConfigMapInfo[] format
            const configMaps: ConfigMapInfo[] = response.items.map(cm => {
                const name = cm.metadata?.name || 'Unknown';
                const namespace = cm.metadata?.namespace || 'Unknown';
                
                // Count the number of data keys
                const dataKeys = cm.data ? Object.keys(cm.data).length : 0;
                
                return {
                    name,
                    namespace,
                    dataKeys
                };
            });
            
            // Sort configmaps by namespace first, then by name
            configMaps.sort((a, b) => {
                const namespaceCompare = a.namespace.localeCompare(b.namespace);
                if (namespaceCompare !== 0) {
                    return namespaceCompare;
                }
                return a.name.localeCompare(b.name);
            });
            
            // Cache result
            cache.set(cacheKey, configMaps, CACHE_TTL.DEPLOYMENTS); // Use same TTL as deployments
            
            return { configMaps };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            return {
                configMaps: [],
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves a specific ConfigMap by name and namespace using the Kubernetes API client.
     * Uses direct API calls to fetch a single ConfigMap resource.
     * 
     * @param name Name of the ConfigMap to retrieve
     * @param namespace Namespace where the ConfigMap is located
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to query
     * @returns ConfigMapResult with configMap data and optional error information
     */
    public static async getConfigMap(
        name: string,
        namespace: string,
        kubeconfigPath: string,
        contextName: string
    ): Promise<ConfigMapResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Fetch single ConfigMap from API
            const v1ConfigMap = await apiClient.core.readNamespacedConfigMap({
                name,
                namespace
            });
            
            // Transform k8s.V1ConfigMap to ConfigMapResponse format
            const response: ConfigMapResponse = {
                metadata: {
                    name: v1ConfigMap.metadata?.name,
                    namespace: v1ConfigMap.metadata?.namespace
                },
                data: v1ConfigMap.data
            };
            
            return { configMap: response };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            // 404 errors will be detected by caller using isNotFoundError()
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            return {
                configMap: null,
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves the list of secrets using the Kubernetes API client.
     * Uses direct API calls to fetch Secret resources.
     * When namespace is provided, fetches only secrets from that namespace.
     * When namespace is not provided, fetches secrets from all namespaces.
     * 
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to query
     * @param namespace Optional namespace to filter secrets. If not provided, fetches all namespaces
     * @returns SecretsResult with secrets array and optional error information
     */
    public static async getSecrets(
        kubeconfigPath: string,
        contextName: string,
        namespace?: string
    ): Promise<SecretsResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Check cache first
            const cache = getResourceCache();
            const cacheKey = namespace 
                ? `${contextName}:secrets:${namespace}`
                : `${contextName}:secrets`;
            const cached = cache.get<SecretInfo[]>(cacheKey);
            if (cached) {
                return { secrets: cached };
            }
            
            // Fetch from API
            const v1Secrets = await fetchSecrets({ 
                namespace, 
                timeout: 10 
            });
            
            // Transform k8s.V1Secret[] to SecretInfo[] format
            const secrets: SecretInfo[] = v1Secrets.map(secret => {
                const name = secret.metadata?.name || 'Unknown';
                const secretNamespace = secret.metadata?.namespace || 'Unknown';
                const type = secret.type || 'Unknown';
                
                return {
                    name,
                    namespace: secretNamespace,
                    type
                };
            });
            
            // Sort secrets by namespace first, then by name
            secrets.sort((a, b) => {
                const namespaceCompare = a.namespace.localeCompare(b.namespace);
                if (namespaceCompare !== 0) {
                    return namespaceCompare;
                }
                return a.name.localeCompare(b.name);
            });
            
            // Cache result
            cache.set(cacheKey, secrets, CACHE_TTL.DEPLOYMENTS); // Use same TTL as deployments
            
            return { secrets };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            console.log(`Secret query failed for context ${contextName}${namespace ? ` in namespace ${namespace}` : ''}: ${kubectlError.getDetails()}`);
            
            return {
                secrets: [],
                error: kubectlError
            };
        }
    }
}

