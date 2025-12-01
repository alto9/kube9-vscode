import { execFile } from 'child_process';
import { promisify } from 'util';
import { KubectlError, KubectlErrorType } from '../kubernetes/KubectlError';
import { getCurrentNamespace } from '../utils/kubectlContext';

/**
 * Timeout for kubectl commands in milliseconds.
 */
const KUBECTL_TIMEOUT_MS = 30000;

/**
 * Promisified version of execFile for async/await usage.
 */
const execFileAsync = promisify(execFile);

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
 * Interface for kubectl configmap response items.
 */
interface ConfigMapItem {
    metadata?: {
        name?: string;
        namespace?: string;
    };
    data?: {
        [key: string]: string;
    };
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
 * Interface for kubectl configmap list response.
 */
interface ConfigMapListResponse {
    items?: ConfigMapItem[];
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
 * Interface for kubectl secret response items.
 */
interface SecretItem {
    metadata?: {
        name?: string;
        namespace?: string;
    };
    type?: string;
}

/**
 * Interface for kubectl secret list response.
 */
interface SecretListResponse {
    items?: SecretItem[];
}

/**
 * Utility class for kubectl configuration operations.
 */
export class ConfigurationCommands {
    /**
     * Retrieves the list of configmaps from all namespaces using kubectl.
     * Uses kubectl get configmaps command with --all-namespaces and JSON output for parsing.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns ConfigMapsResult with configMaps array and optional error information
     */
    public static async getConfigMaps(
        kubeconfigPath: string,
        contextName: string
    ): Promise<ConfigMapsResult> {
        try {
            // Check if a namespace is set in kubectl context
            // Default to 'default' namespace if none is set
            let currentNamespace: string = 'default';
            try {
                const ns = await getCurrentNamespace();
                if (ns) {
                    currentNamespace = ns;
                }
            } catch (error) {
                console.warn('Failed to get current namespace, using default namespace:', error);
            }

            // Build kubectl command arguments
            // Always use the namespace (either from context or 'default')
            // kubectl will automatically use the context namespace if set
            const args = [
                'get',
                'configmaps',
                '--output=json',
                `--kubeconfig=${kubeconfigPath}`,
                `--context=${contextName}`
            ];

            // Execute kubectl get configmaps with JSON output
            const { stdout } = await execFileAsync(
                'kubectl',
                args,
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                    env: { ...process.env }
                }
            );

            // Parse the JSON response
            const response: ConfigMapListResponse = JSON.parse(stdout);
            
            // Extract configmap information from the items array
            const configMaps: ConfigMapInfo[] = response.items?.map((item: ConfigMapItem) => {
                const name = item.metadata?.name || 'Unknown';
                const namespace = item.metadata?.namespace || 'Unknown';
                
                // Count the number of data keys
                const dataKeys = item.data ? Object.keys(item.data).length : 0;
                
                return {
                    name,
                    namespace,
                    dataKeys
                };
            }) || [];
            
            // Sort configmaps by namespace first, then by name
            configMaps.sort((a, b) => {
                const namespaceCompare = a.namespace.localeCompare(b.namespace);
                if (namespaceCompare !== 0) {
                    return namespaceCompare;
                }
                return a.name.localeCompare(b.name);
            });
            
            return { configMaps };
        } catch (error: unknown) {
            // Check if stdout contains valid JSON even though an error was thrown
            // This can happen if kubectl writes warnings to stderr but valid data to stdout
            const err = error as { stdout?: Buffer | string; stderr?: Buffer | string };
            const stdout = err.stdout 
                ? (Buffer.isBuffer(err.stdout) ? err.stdout.toString() : err.stdout).trim()
                : '';
            
            if (stdout) {
                try {
                    // Try to parse stdout as valid JSON
                    const response: ConfigMapListResponse = JSON.parse(stdout);
                    
                    // Extract configmap information from the items array
                    const configMaps: ConfigMapInfo[] = response.items?.map((item: ConfigMapItem) => {
                        const name = item.metadata?.name || 'Unknown';
                        const namespace = item.metadata?.namespace || 'Unknown';
                        
                        // Count the number of data keys
                        const dataKeys = item.data ? Object.keys(item.data).length : 0;
                        
                        return {
                            name,
                            namespace,
                            dataKeys
                        };
                    }) || [];
                    
                    // Sort configmaps by namespace first, then by name
                    configMaps.sort((a, b) => {
                        const namespaceCompare = a.namespace.localeCompare(b.namespace);
                        if (namespaceCompare !== 0) {
                            return namespaceCompare;
                        }
                        return a.name.localeCompare(b.name);
                    });
                    
                    return { configMaps };
                } catch (parseError) {
                    // stdout is not valid JSON, treat as real error
                }
            }
            
            // kubectl failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            return {
                configMaps: [],
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves a specific ConfigMap by name and namespace using kubectl.
     * Uses kubectl get configmap command with JSON output for parsing.
     * 
     * @param name Name of the ConfigMap to retrieve
     * @param namespace Namespace where the ConfigMap is located
     * @param kubeconfigPath Path to the kubeconfig file
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
            // Build kubectl command arguments
            const args = [
                'get',
                'configmap',
                name,
                `--namespace=${namespace}`,
                '--output=json',
                `--kubeconfig=${kubeconfigPath}`,
                `--context=${contextName}`
            ];

            // Execute kubectl get configmap with JSON output
            const { stdout } = await execFileAsync(
                'kubectl',
                args,
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for very large clusters
                    env: { ...process.env }
                }
            );

            // Parse the JSON response
            const response: ConfigMapResponse = JSON.parse(stdout);
            
            return { configMap: response };
        } catch (error: unknown) {
            // Check if stdout contains valid JSON even though an error was thrown
            // This can happen if kubectl writes warnings to stderr but valid data to stdout
            const err = error as { stdout?: Buffer | string; stderr?: Buffer | string };
            const stdout = err.stdout 
                ? (Buffer.isBuffer(err.stdout) ? err.stdout.toString() : err.stdout).trim()
                : '';
            
            if (stdout) {
                try {
                    // Try to parse stdout as valid JSON
                    const response: ConfigMapResponse = JSON.parse(stdout);
                    return { configMap: response };
                } catch (parseError) {
                    // stdout is not valid JSON, treat as real error
                }
            }
            
            // kubectl failed - create structured error for detailed handling
            // 404 errors will be detected by caller using isNotFoundError()
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            return {
                configMap: null,
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves the list of secrets from all namespaces using kubectl.
     * Uses kubectl get secrets command with --all-namespaces and JSON output for parsing.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns SecretsResult with secrets array and optional error information
     */
    public static async getSecrets(
        kubeconfigPath: string,
        contextName: string
    ): Promise<SecretsResult> {
        console.log(`[DEBUG SECRETS] getSecrets called for context: ${contextName}`);
        try {
            // Check if a namespace is set in kubectl context
            // Default to 'default' namespace if none is set
            let currentNamespace: string = 'default';
            try {
                const ns = await getCurrentNamespace();
                if (ns) {
                    currentNamespace = ns;
                }
            } catch (error) {
                console.warn('Failed to get current namespace, using default namespace:', error);
            }

            // Build kubectl command arguments
            // Always use the namespace (either from context or 'default')
            // kubectl will automatically use the context namespace if set
            const args = [
                'get',
                'secrets',
                '--output=json',
                `--kubeconfig=${kubeconfigPath}`,
                `--context=${contextName}`
            ];

            // Execute kubectl get secrets with JSON output
            const { stdout } = await execFileAsync(
                'kubectl',
                args,
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 100 * 1024 * 1024, // 100MB buffer for very large clusters with many secrets
                    env: { ...process.env }
                }
            );

            // Parse the JSON response
            console.log(`[DEBUG SECRETS] Successfully got stdout, length: ${stdout.length}`);
            const response: SecretListResponse = JSON.parse(stdout);
            console.log(`[DEBUG SECRETS] Parsed ${response.items?.length || 0} secrets`);
            
            // Extract secret information from the items array
            const secrets: SecretInfo[] = response.items?.map((item: SecretItem) => {
                const name = item.metadata?.name || 'Unknown';
                const namespace = item.metadata?.namespace || 'Unknown';
                const type = item.type || 'Unknown';
                
                return {
                    name,
                    namespace,
                    type
                };
            }) || [];
            
            // Sort secrets by namespace first, then by name
            secrets.sort((a, b) => {
                const namespaceCompare = a.namespace.localeCompare(b.namespace);
                if (namespaceCompare !== 0) {
                    return namespaceCompare;
                }
                return a.name.localeCompare(b.name);
            });
            
            return { secrets };
        } catch (error: unknown) {
            console.log(`[DEBUG SECRETS] Error caught:`, error);
            // Check if stdout contains valid JSON even though an error was thrown
            // This can happen if kubectl writes warnings to stderr but valid data to stdout
            // OR if maxBuffer was exceeded but we still have partial valid data
            const err = error as { stdout?: Buffer | string; stderr?: Buffer | string; code?: string };
            const stdout = err.stdout 
                ? (Buffer.isBuffer(err.stdout) ? err.stdout.toString() : err.stdout).trim()
                : '';
            console.log(`[DEBUG SECRETS] Error code:`, err.code);
            console.log(`[DEBUG SECRETS] stdout available:`, !!stdout, `length:`, stdout.length);
            
            // Special handling for maxBuffer exceeded - stdout will be truncated and likely invalid JSON
            if (err.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
                console.log(`[DEBUG SECRETS] maxBuffer exceeded even at 100MB! Secrets data is too large.`);
                console.log(`[DEBUG SECRETS] Consider increasing buffer further or filtering secrets by namespace.`);
                
                // Return a helpful error instead of trying to parse truncated JSON
                const bufferError = new KubectlError(
                    KubectlErrorType.Unknown,
                    `Too many secrets to display (>100MB of data). The cluster has an unusually large number of secrets. Consider viewing secrets by namespace instead.`,
                    'maxBuffer exceeded',
                    contextName
                );
                return {
                    secrets: [],
                    error: bufferError
                };
            }
            
            if (stdout) {
                try {
                    // Try to parse stdout as valid JSON
                    const response: SecretListResponse = JSON.parse(stdout);
                    
                    // Extract secret information from the items array
                    const secrets: SecretInfo[] = response.items?.map((item: SecretItem) => {
                        const name = item.metadata?.name || 'Unknown';
                        const namespace = item.metadata?.namespace || 'Unknown';
                        const type = item.type || 'Unknown';
                        
                        return {
                            name,
                            namespace,
                            type
                        };
                    }) || [];
                    
                    // Sort secrets by namespace first, then by name
                    secrets.sort((a, b) => {
                        const namespaceCompare = a.namespace.localeCompare(b.namespace);
                        if (namespaceCompare !== 0) {
                            return namespaceCompare;
                        }
                        return a.name.localeCompare(b.name);
                    });
                    
                    return { secrets };
                } catch (parseError) {
                    // stdout is not valid JSON, treat as real error
                }
            }
            
            // kubectl failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            return {
                secrets: [],
                error: kubectlError
            };
        }
    }
}

