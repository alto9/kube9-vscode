import * as k8s from '@kubernetes/client-node';

/**
 * Singleton API client for Kubernetes API operations.
 * Manages connections to Kubernetes clusters and provides access to different API groups.
 * 
 * This class replaces kubectl process spawning with direct API calls, enabling:
 * - Connection pooling for better performance
 * - Parallel operations
 * - Efficient resource management
 * 
 * The singleton pattern ensures a single instance manages all API connections,
 * reusing HTTP connections via the underlying Node.js HTTP Agent.
 */
export class KubernetesApiClient {
    private kubeConfig: k8s.KubeConfig;
    private coreApi: k8s.CoreV1Api;
    private appsApi: k8s.AppsV1Api;
    private batchApi: k8s.BatchV1Api;
    private networkingApi: k8s.NetworkingV1Api;

    /**
     * Creates a new KubernetesApiClient instance.
     * Loads kubeconfig from the default location (~/.kube/config or KUBECONFIG env var).
     * Initializes API clients for all supported API groups.
     */
    constructor() {
        this.kubeConfig = new k8s.KubeConfig();
        this.kubeConfig.loadFromDefault();

        this.coreApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
        this.appsApi = this.kubeConfig.makeApiClient(k8s.AppsV1Api);
        this.batchApi = this.kubeConfig.makeApiClient(k8s.BatchV1Api);
        this.networkingApi = this.kubeConfig.makeApiClient(k8s.NetworkingV1Api);
    }

    /**
     * Switches to a specific Kubernetes context.
     * Recreates all API clients to ensure they use the new context.
     * 
     * @param contextName - The name of the context to switch to
     */
    public setContext(contextName: string): void {
        this.kubeConfig.setCurrentContext(contextName);
        // Recreate API clients with new context
        this.coreApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
        this.appsApi = this.kubeConfig.makeApiClient(k8s.AppsV1Api);
        this.batchApi = this.kubeConfig.makeApiClient(k8s.BatchV1Api);
        this.networkingApi = this.kubeConfig.makeApiClient(k8s.NetworkingV1Api);
    }

    /**
     * Gets the name of the current Kubernetes context.
     * 
     * @returns The current context name, or empty string if no context is set
     */
    public getCurrentContext(): string {
        return this.kubeConfig.getCurrentContext();
    }

    /**
     * Gets all configured Kubernetes contexts from the kubeconfig.
     * 
     * @returns Array of context objects containing name, cluster, user, and namespace
     */
    public getContexts(): k8s.Context[] {
        return this.kubeConfig.getContexts();
    }

    /**
     * Gets the Core V1 API client for core Kubernetes resources.
     * Provides access to pods, services, namespaces, nodes, etc.
     * 
     * @returns CoreV1Api client instance
     */
    public get core(): k8s.CoreV1Api {
        return this.coreApi;
    }

    /**
     * Gets the Apps V1 API client for application workloads.
     * Provides access to deployments, statefulsets, daemonsets, etc.
     * 
     * @returns AppsV1Api client instance
     */
    public get apps(): k8s.AppsV1Api {
        return this.appsApi;
    }

    /**
     * Gets the Batch V1 API client for batch workloads.
     * Provides access to jobs and cronjobs.
     * 
     * @returns BatchV1Api client instance
     */
    public get batch(): k8s.BatchV1Api {
        return this.batchApi;
    }

    /**
     * Gets the Networking V1 API client for networking resources.
     * Provides access to network policies, ingress, etc.
     * 
     * @returns NetworkingV1Api client instance
     */
    public get networking(): k8s.NetworkingV1Api {
        return this.networkingApi;
    }
}

/**
 * Private module-level variable to hold the singleton instance.
 */
let apiClientInstance: KubernetesApiClient | null = null;

/**
 * Gets the singleton KubernetesApiClient instance.
 * Creates a new instance on first call, returns the same instance on subsequent calls.
 * 
 * @returns The singleton KubernetesApiClient instance
 */
export function getKubernetesApiClient(): KubernetesApiClient {
    if (!apiClientInstance) {
        apiClientInstance = new KubernetesApiClient();
    }
    return apiClientInstance;
}

/**
 * Resets the singleton KubernetesApiClient instance.
 * Used primarily for testing to ensure clean state between tests.
 * The next call to getKubernetesApiClient() will create a new instance.
 */
export function resetKubernetesApiClient(): void {
    apiClientInstance = null;
}

