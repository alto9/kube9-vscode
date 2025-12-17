import { execFile } from 'child_process';
import { promisify } from 'util';
import { KubectlError } from '../kubernetes/KubectlError';
import { fetchServices } from '../kubernetes/resourceFetchers';
import { getResourceCache, CACHE_TTL } from '../kubernetes/cache';
import { getKubernetesApiClient } from '../kubernetes/apiClient';
import * as k8s from '@kubernetes/client-node';

/**
 * Timeout for kubectl commands in milliseconds.
 */
const KUBECTL_TIMEOUT_MS = 30000;

/**
 * Promisified version of execFile for async/await usage.
 */
const execFileAsync = promisify(execFile);

/**
 * Information about a Kubernetes service port.
 */
export interface ServicePort {
    /** Port number exposed by the service */
    port: number;
    /** Target port on pods (can be number or named port) */
    targetPort: string | number;
    /** Protocol used (TCP, UDP, or SCTP) */
    protocol: 'TCP' | 'UDP' | 'SCTP';
    /** Node port for NodePort/LoadBalancer services */
    nodePort?: number;
}

/**
 * Information about a Kubernetes service.
 */
export interface ServiceInfo {
    /** Name of the service */
    name: string;
    /** Namespace of the service */
    namespace: string;
    /** Type of service (ClusterIP, NodePort, LoadBalancer, ExternalName) */
    type: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';
    /** Cluster IP address */
    clusterIP: string;
    /** External IP address (for LoadBalancer/NodePort services) */
    externalIP?: string;
    /** Ports exposed by the service */
    ports: ServicePort[];
    /** Label selectors for pods */
    selectors: Record<string, string>;
    /** Number of endpoints (deferred implementation) */
    endpoints?: number;
}

/**
 * Result of a services query operation.
 */
export interface ServicesResult {
    /**
     * Array of service information, empty if query failed.
     */
    services: ServiceInfo[];
    
    /**
     * Error information if the service query failed.
     */
    error?: KubectlError;
}

/**
 * Result of a single service query operation.
 */
export interface ServiceResult {
    /**
     * The service data, or null if query failed or service not found.
     */
    service: ServiceInfo | null;
    
    /**
     * Error information if the service query failed.
     */
    error?: KubectlError;
}

/**
 * Interface for kubectl service response items.
 */
interface ServiceItem {
    metadata?: {
        name?: string;
        namespace?: string;
    };
    spec?: {
        type?: string;
        clusterIP?: string;
        externalIPs?: string[];
        ports?: Array<{
            port?: number;
            targetPort?: string | number;
            protocol?: string;
            nodePort?: number;
        }>;
        selector?: Record<string, string>;
    };
    status?: {
        loadBalancer?: {
            ingress?: Array<{
                ip?: string;
                hostname?: string;
            }>;
        };
    };
}

/**
 * Interface for kubectl service response (single service).
 */
interface ServiceResponse {
    metadata?: {
        name?: string;
        namespace?: string;
    };
    spec?: {
        type?: string;
        clusterIP?: string;
        externalIPs?: string[];
        ports?: Array<{
            port?: number;
            targetPort?: string | number;
            protocol?: string;
            nodePort?: number;
        }>;
        selector?: Record<string, string>;
    };
    status?: {
        loadBalancer?: {
            ingress?: Array<{
                ip?: string;
                hostname?: string;
            }>;
        };
    };
}

/**
 * Utility class for kubectl service operations.
 */
export class ServiceCommands {
    /**
     * Retrieves the list of services using the Kubernetes API client.
     * Uses direct API calls with caching to improve performance.
     * 
     * @param kubeconfigPath Path to the kubeconfig file (unused, kept for backward compatibility)
     * @param contextName Name of the context to query
     * @param namespace Optional namespace to filter services (if not provided, fetches from all namespaces)
     * @returns ServicesResult with services array and optional error information
     */
    public static async getServices(
        kubeconfigPath: string,
        contextName: string,
        namespace?: string
    ): Promise<ServicesResult> {
        try {
            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Check cache first
            const cache = getResourceCache();
            const cacheKey = namespace 
                ? `${contextName}:services:${namespace}`
                : `${contextName}:services`;
            const cached = cache.get<ServiceInfo[]>(cacheKey);
            if (cached) {
                return { services: cached };
            }
            
            // Fetch from API
            const v1Services = await fetchServices({ 
                namespace, 
                timeout: 10 
            });
            
            // Transform k8s.V1Service[] to ServiceInfo[] format
            const services: ServiceInfo[] = v1Services.map(svc => 
                this.mapV1ServiceToServiceInfo(svc)
            );
            
            // Sort services by namespace first, then by name
            services.sort((a, b) => {
                const namespaceCompare = a.namespace.localeCompare(b.namespace);
                if (namespaceCompare !== 0) {
                    return namespaceCompare;
                }
                return a.name.localeCompare(b.name);
            });
            
            // Cache result
            cache.set(cacheKey, services, CACHE_TTL.SERVICES);
            
            return { services };
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Service query failed for context ${contextName}${namespace ? ` in namespace ${namespace}` : ''}: ${kubectlError.getDetails()}`);
            
            return {
                services: [],
                error: kubectlError
            };
        }
    }

    /**
     * Retrieves a specific service by name and namespace using kubectl.
     * Uses kubectl get service command with JSON output for parsing.
     * 
     * @param name Name of the service to retrieve
     * @param namespace Namespace where the service is located
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns ServiceResult with service data and optional error information
     */
    public static async getService(
        name: string,
        namespace: string,
        kubeconfigPath: string,
        contextName: string
    ): Promise<ServiceResult> {
        try {
            // Build kubectl command arguments
            const args = [
                'get',
                'service',
                name,
                `--namespace=${namespace}`,
                '--output=json',
                `--kubeconfig=${kubeconfigPath}`,
                `--context=${contextName}`
            ];

            // Execute kubectl get service with JSON output
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
            const response: ServiceResponse = JSON.parse(stdout);
            
            // Map to ServiceInfo
            const service = this.mapServiceResponseToServiceInfo(response);
            
            return { service };
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
                    const response: ServiceResponse = JSON.parse(stdout);
                    
                    // Map to ServiceInfo
                    const service = this.mapServiceResponseToServiceInfo(response);
                    
                    return { service };
                } catch (parseError) {
                    // stdout is not valid JSON, treat as real error
                }
            }
            
            // kubectl failed - create structured error for detailed handling
            // 404 errors will be detected by caller using isNotFoundError()
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            return {
                service: null,
                error: kubectlError
            };
        }
    }

    /**
     * Maps a ServiceItem from Kubernetes API to ServiceInfo.
     * 
     * @param item ServiceItem from kubectl JSON response
     * @returns ServiceInfo with extracted service data
     */
    private static mapServiceItemToServiceInfo(item: ServiceItem): ServiceInfo {
        const name = item.metadata?.name || 'Unknown';
        const namespace = item.metadata?.namespace || 'Unknown';
        const spec = item.spec || {};
        
        // Extract service type with validation
        const serviceType = spec.type || 'ClusterIP';
        const type: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName' = 
            (serviceType === 'ClusterIP' || serviceType === 'NodePort' || 
             serviceType === 'LoadBalancer' || serviceType === 'ExternalName')
            ? serviceType
            : 'ClusterIP'; // Default to ClusterIP if invalid
        
        const clusterIP = spec.clusterIP || '';
        
        // Extract external IP from status.loadBalancer.ingress or spec.externalIPs
        let externalIP: string | undefined;
        if (item.status?.loadBalancer?.ingress && item.status.loadBalancer.ingress.length > 0) {
            externalIP = item.status.loadBalancer.ingress[0].ip || 
                        item.status.loadBalancer.ingress[0].hostname;
        } else if (spec.externalIPs && spec.externalIPs.length > 0) {
            externalIP = spec.externalIPs[0];
        }
        
        // Map ports array
        const ports: ServicePort[] = (spec.ports || []).map((port) => ({
            port: port.port || 0,
            targetPort: port.targetPort !== undefined ? port.targetPort : 0,
            protocol: (port.protocol === 'TCP' || port.protocol === 'UDP' || port.protocol === 'SCTP')
                ? port.protocol
                : 'TCP', // Default to TCP if missing or invalid
            nodePort: port.nodePort
        }));
        
        // Extract selectors (default to empty object)
        const selectors = spec.selector || {};
        
        return {
            name,
            namespace,
            type,
            clusterIP,
            externalIP,
            ports,
            selectors,
            endpoints: undefined // Deferred implementation per story
        };
    }

    /**
     * Maps a ServiceResponse from Kubernetes API to ServiceInfo.
     * 
     * @param response ServiceResponse from kubectl JSON response
     * @returns ServiceInfo with extracted service data
     */
    private static mapServiceResponseToServiceInfo(response: ServiceResponse): ServiceInfo {
        // Convert ServiceResponse to ServiceItem format for reuse
        const item: ServiceItem = {
            metadata: response.metadata,
            spec: response.spec,
            status: response.status
        };
        
        return this.mapServiceItemToServiceInfo(item);
    }

    /**
     * Maps a k8s.V1Service from Kubernetes API client to ServiceInfo.
     * 
     * @param v1Service V1Service from Kubernetes API client
     * @returns ServiceInfo with extracted service data
     */
    private static mapV1ServiceToServiceInfo(v1Service: k8s.V1Service): ServiceInfo {
        const name = v1Service.metadata?.name || 'Unknown';
        const namespace = v1Service.metadata?.namespace || 'Unknown';
        const spec = v1Service.spec || {};
        
        // Extract service type with validation
        const serviceType = spec.type || 'ClusterIP';
        const type: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName' = 
            (serviceType === 'ClusterIP' || serviceType === 'NodePort' || 
             serviceType === 'LoadBalancer' || serviceType === 'ExternalName')
            ? serviceType
            : 'ClusterIP'; // Default to ClusterIP if invalid
        
        const clusterIP = spec.clusterIP || '';
        
        // Extract external IP from status.loadBalancer.ingress or spec.externalIPs
        let externalIP: string | undefined;
        if (v1Service.status?.loadBalancer?.ingress && v1Service.status.loadBalancer.ingress.length > 0) {
            externalIP = v1Service.status.loadBalancer.ingress[0].ip || 
                        v1Service.status.loadBalancer.ingress[0].hostname;
        } else if (spec.externalIPs && spec.externalIPs.length > 0) {
            externalIP = spec.externalIPs[0];
        }
        
        // Map ports array
        const ports: ServicePort[] = (spec.ports || []).map((port) => ({
            port: port.port || 0,
            targetPort: port.targetPort !== undefined ? port.targetPort : 0,
            protocol: (port.protocol === 'TCP' || port.protocol === 'UDP' || port.protocol === 'SCTP')
                ? port.protocol
                : 'TCP', // Default to TCP if missing or invalid
            nodePort: port.nodePort
        }));
        
        // Extract selectors (default to empty object)
        const selectors = spec.selector || {};
        
        return {
            name,
            namespace,
            type,
            clusterIP,
            externalIP,
            ports,
            selectors,
            endpoints: undefined // Deferred implementation per story
        };
    }
}







