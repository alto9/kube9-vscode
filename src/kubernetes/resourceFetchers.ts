import * as vscode from 'vscode';
import * as k8s from '@kubernetes/client-node';
import { getKubernetesApiClient } from './apiClient';

/**
 * Options for fetching Kubernetes resources.
 * All fields are optional to allow flexible resource queries.
 */
export interface FetchOptions {
    /**
     * Timeout in seconds for the API request.
     * Defaults to 10 seconds if not specified.
     */
    timeout?: number;
    /**
     * Namespace to filter resources by.
     * If not specified, resources from all namespaces are returned.
     */
    namespace?: string;
    /**
     * Label selector to filter resources by labels.
     * Format: "key=value" or "key1=value1,key2=value2"
     */
    labelSelector?: string;
    /**
     * Field selector to filter resources by fields.
     * Format: "fieldName=value"
     */
    fieldSelector?: string;
}

/**
 * Fetch all nodes in the cluster.
 * Nodes are cluster-level resources and cannot be filtered by namespace.
 * 
 * @param options - Optional fetch options including timeout, label selector, and field selector
 * @returns Promise resolving to an array of V1Node objects
 * @throws Error if the API request fails or times out
 * 
 * @example
 * ```typescript
 * const nodes = await fetchNodes({ timeout: 15 });
 * const filteredNodes = await fetchNodes({ labelSelector: 'node-role.kubernetes.io/worker=' });
 * ```
 */
export async function fetchNodes(options: FetchOptions = {}): Promise<k8s.V1Node[]> {
    const client = getKubernetesApiClient();

    try {
        const response = await client.core.listNode({
            fieldSelector: options.fieldSelector,
            labelSelector: options.labelSelector,
            timeoutSeconds: options.timeout || 10
        });

        return response.items;
    } catch (error) {
        handleApiError(error, 'fetch nodes');
        throw error;
    }
}

/**
 * Fetch all namespaces in the cluster.
 * Namespaces are cluster-level resources.
 * 
 * @param options - Optional fetch options including timeout, label selector, and field selector
 * @returns Promise resolving to an array of V1Namespace objects
 * @throws Error if the API request fails or times out
 * 
 * @example
 * ```typescript
 * const namespaces = await fetchNamespaces();
 * const activeNamespaces = await fetchNamespaces({ labelSelector: 'status=active' });
 * ```
 */
export async function fetchNamespaces(options: FetchOptions = {}): Promise<k8s.V1Namespace[]> {
    const client = getKubernetesApiClient();

    try {
        const response = await client.core.listNamespace({
            fieldSelector: options.fieldSelector,
            labelSelector: options.labelSelector,
            timeoutSeconds: options.timeout || 10
        });

        return response.items;
    } catch (error) {
        handleApiError(error, 'fetch namespaces');
        throw error;
    }
}

/**
 * Fetch pods from the cluster.
 * Can fetch pods from a specific namespace or from all namespaces.
 * 
 * @param options - Optional fetch options including namespace, timeout, label selector, and field selector
 * @returns Promise resolving to an array of V1Pod objects
 * @throws Error if the API request fails or times out
 * 
 * @example
 * ```typescript
 * // Fetch all pods from all namespaces
 * const allPods = await fetchPods();
 * 
 * // Fetch pods from a specific namespace
 * const defaultPods = await fetchPods({ namespace: 'default' });
 * 
 * // Fetch pods with label selector
 * const appPods = await fetchPods({ namespace: 'production', labelSelector: 'app=myapp' });
 * ```
 */
export async function fetchPods(options: FetchOptions = {}): Promise<k8s.V1Pod[]> {
    const client = getKubernetesApiClient();

    try {
        const response = options.namespace
            ? await client.core.listNamespacedPod({
                namespace: options.namespace,
                fieldSelector: options.fieldSelector,
                labelSelector: options.labelSelector,
                timeoutSeconds: options.timeout || 10
            })
            : await client.core.listPodForAllNamespaces({
                fieldSelector: options.fieldSelector,
                labelSelector: options.labelSelector,
                timeoutSeconds: options.timeout || 10
            });

        return response.items;
    } catch (error) {
        handleApiError(error, 'fetch pods');
        throw error;
    }
}

/**
 * Fetch deployments from the cluster.
 * Can fetch deployments from a specific namespace or from all namespaces.
 * 
 * @param options - Optional fetch options including namespace, timeout, label selector, and field selector
 * @returns Promise resolving to an array of V1Deployment objects
 * @throws Error if the API request fails or times out
 * 
 * @example
 * ```typescript
 * // Fetch all deployments from all namespaces
 * const allDeployments = await fetchDeployments();
 * 
 * // Fetch deployments from a specific namespace
 * const defaultDeployments = await fetchDeployments({ namespace: 'default' });
 * 
 * // Fetch deployments with label selector
 * const appDeployments = await fetchDeployments({ namespace: 'production', labelSelector: 'app=myapp' });
 * ```
 */
export async function fetchDeployments(options: FetchOptions = {}): Promise<k8s.V1Deployment[]> {
    const client = getKubernetesApiClient();

    try {
        const response = options.namespace
            ? await client.apps.listNamespacedDeployment({
                namespace: options.namespace,
                fieldSelector: options.fieldSelector,
                labelSelector: options.labelSelector,
                timeoutSeconds: options.timeout || 10
            })
            : await client.apps.listDeploymentForAllNamespaces({
                fieldSelector: options.fieldSelector,
                labelSelector: options.labelSelector,
                timeoutSeconds: options.timeout || 10
            });

        return response.items;
    } catch (error) {
        handleApiError(error, 'fetch deployments');
        throw error;
    }
}

/**
 * Fetch services from the cluster.
 * Can fetch services from a specific namespace or from all namespaces.
 * 
 * @param options - Optional fetch options including namespace, timeout, label selector, and field selector
 * @returns Promise resolving to an array of V1Service objects
 * @throws Error if the API request fails or times out
 * 
 * @example
 * ```typescript
 * // Fetch all services from all namespaces
 * const allServices = await fetchServices();
 * 
 * // Fetch services from a specific namespace
 * const defaultServices = await fetchServices({ namespace: 'default' });
 * 
 * // Fetch services with label selector
 * const appServices = await fetchServices({ namespace: 'production', labelSelector: 'app=myapp' });
 * ```
 */
export async function fetchServices(options: FetchOptions = {}): Promise<k8s.V1Service[]> {
    const client = getKubernetesApiClient();

    try {
        const response = options.namespace
            ? await client.core.listNamespacedService({
                namespace: options.namespace,
                fieldSelector: options.fieldSelector,
                labelSelector: options.labelSelector,
                timeoutSeconds: options.timeout || 10
            })
            : await client.core.listServiceForAllNamespaces({
                fieldSelector: options.fieldSelector,
                labelSelector: options.labelSelector,
                timeoutSeconds: options.timeout || 10
            });

        return response.items;
    } catch (error) {
        handleApiError(error, 'fetch services');
        throw error;
    }
}

/**
 * Fetch cluster resources in parallel for tree view initialization.
 * This function fetches nodes, namespaces, and pods simultaneously using Promise.all()
 * to significantly reduce load time compared to sequential fetching.
 * 
 * @returns Promise resolving to an object containing arrays of nodes, namespaces, and pods
 * @throws Error if any of the API requests fail or time out
 * 
 * @example
 * ```typescript
 * const { nodes, namespaces, pods } = await fetchClusterResources();
 * ```
 */
export async function fetchClusterResources(): Promise<{
    nodes: k8s.V1Node[];
    namespaces: k8s.V1Namespace[];
    pods: k8s.V1Pod[];
}> {
    const [nodes, namespaces, pods] = await Promise.all([
        fetchNodes(),
        fetchNamespaces(),
        fetchPods()
    ]);

    return { nodes, namespaces, pods };
}

/**
 * Handle API errors with user-friendly messages.
 * Displays actionable error messages via VS Code notifications and logs to console for debugging.
 * This is a private helper function used internally by all fetcher functions.
 * 
 * @param error - The error object from the API call
 * @param operation - Description of the operation that failed (e.g., 'fetch nodes')
 */
function handleApiError(error: unknown, operation: string): void {
    if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response: { statusCode: number; body?: { message?: string } } };
        const status = apiError.response.statusCode;
        const message = apiError.response.body?.message || 'Unknown error';

        if (status === 401) {
            vscode.window.showErrorMessage(
                `Authentication failed: Check your credentials in kubeconfig. Operation: ${operation}`
            );
            console.error(`Authentication failed while trying to ${operation}: ${message}`);
        } else if (status === 403) {
            vscode.window.showErrorMessage(
                `Permission denied: You don't have access to ${operation}. Check your RBAC permissions with cluster administrator.`
            );
            console.error(`Permission denied while trying to ${operation}: ${message}`);
        } else if (status === 404) {
            vscode.window.showErrorMessage(
                `Resource not found: ${message}. Operation: ${operation}`
            );
            console.error(`Resource not found while trying to ${operation}: ${message}`);
        } else if (status >= 500) {
            vscode.window.showErrorMessage(
                `Cluster error: Server reported an error while trying to ${operation}. Check cluster health.`
            );
            console.error(`Server error while trying to ${operation}: ${message}`);
        } else {
            console.error(`API error while trying to ${operation} (${status}): ${message}`);
        }
    } else if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        const connectionError = error as { code: string; message: string };
        if (connectionError.code === 'ETIMEDOUT') {
            vscode.window.showErrorMessage(
                `Connection timeout: Unable to reach cluster while trying to ${operation}. Check your network connection.`
            );
            console.error(`Connection failed while trying to ${operation}: ${connectionError.message}`);
        } else if (connectionError.code === 'ECONNREFUSED') {
            vscode.window.showErrorMessage(
                `Connection refused: Cluster endpoint not reachable while trying to ${operation}. Verify cluster is running.`
            );
            console.error(`Connection failed while trying to ${operation}: ${connectionError.message}`);
        } else if (connectionError.code === 'ENOTFOUND') {
            vscode.window.showErrorMessage(
                `DNS error: Could not resolve cluster address while trying to ${operation}. Verify cluster address in kubeconfig.`
            );
            console.error(`DNS error while trying to ${operation}: ${connectionError.message}`);
        }
    } else {
        console.error(`Unexpected error while trying to ${operation}:`, error);
    }
}

