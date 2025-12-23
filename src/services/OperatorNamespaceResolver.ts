import * as vscode from 'vscode';
import * as k8s from '@kubernetes/client-node';
import { getKubernetesApiClient } from '../kubernetes/apiClient';

/**
 * Service for dynamically resolving the kube9-operator namespace.
 * Implements a three-tier resolution strategy with caching:
 * 1. Check cache (per cluster context)
 * 2. Try ConfigMap discovery (bootstrap strategy)
 * 3. Try VS Code settings (kube9.operatorNamespace)
 * 4. Fall back to default 'kube9-system'
 * 
 * This service eliminates hardcoded 'kube9-system' references and supports
 * operator installations in custom namespaces.
 */
export class OperatorNamespaceResolver {
    /**
     * Cache of resolved namespaces per cluster context.
     * Key: cluster context name
     * Value: namespace string
     */
    private namespaceCache: Map<string, string> = new Map();

    /**
     * Default namespace used as last resort.
     */
    private static readonly DEFAULT_NAMESPACE = 'kube9-system';

    /**
     * ConfigMap name used by operator for status.
     */
    private static readonly STATUS_CONFIGMAP_NAME = 'kube9-operator-status';

    /**
     * Resolve operator namespace for a cluster context.
     * 
     * Resolution order:
     * 1. Check cache
     * 2. Read from operator status ConfigMap (if namespace field exists)
     * 3. Read from VS Code settings (kube9.operatorNamespace)
     * 4. Fall back to default 'kube9-system'
     * 
     * @param clusterContext Cluster context name
     * @returns Resolved namespace
     */
    async resolveNamespace(clusterContext: string): Promise<string> {
        // 1. Check cache
        const cached = this.namespaceCache.get(clusterContext);
        if (cached) {
            return cached;
        }

        // 2. Try to discover from ConfigMap
        try {
            const namespaceFromConfigMap = await this.discoverFromConfigMap(clusterContext);
            if (namespaceFromConfigMap) {
                this.namespaceCache.set(clusterContext, namespaceFromConfigMap);
                console.log(`[OperatorNamespaceResolver] Operator namespace discovered from ConfigMap: ${namespaceFromConfigMap} for cluster ${clusterContext}`);
                return namespaceFromConfigMap;
            }
        } catch (error) {
            console.warn(`[OperatorNamespaceResolver] Failed to discover namespace from ConfigMap for cluster ${clusterContext}: ${(error as Error).message}`);
        }

        // 3. Try settings
        const namespaceFromSettings = this.getNamespaceFromSettings(clusterContext);
        if (namespaceFromSettings) {
            this.namespaceCache.set(clusterContext, namespaceFromSettings);
            console.log(`[OperatorNamespaceResolver] Using operator namespace from settings: ${namespaceFromSettings} for cluster ${clusterContext}`);
            return namespaceFromSettings;
        }

        // 4. Fall back to default
        const defaultNamespace = OperatorNamespaceResolver.DEFAULT_NAMESPACE;
        this.namespaceCache.set(clusterContext, defaultNamespace);
        console.warn(`[OperatorNamespaceResolver] Using default operator namespace: ${defaultNamespace} for cluster ${clusterContext}`);
        return defaultNamespace;
    }

    /**
     * Discover namespace from operator status ConfigMap.
     * 
     * Bootstrap strategy:
     * - Try settings namespace first
     * - Fall back to default namespace
     * - Look for ConfigMap in those namespaces
     * - Extract namespace field from ConfigMap if present
     * 
     * @param clusterContext Cluster context name
     * @returns Namespace from ConfigMap or null
     */
    private async discoverFromConfigMap(clusterContext: string): Promise<string | null> {
        const apiClient = getKubernetesApiClient();
        apiClient.setContext(clusterContext);

        // Bootstrap: determine where to look for ConfigMap
        const candidateNamespaces = [
            this.getNamespaceFromSettings(clusterContext),
            OperatorNamespaceResolver.DEFAULT_NAMESPACE,
            'default' // Also check 'default' namespace for operators not in kube9-system
        ].filter(Boolean) as string[];

        // Try each candidate namespace
        for (const namespace of candidateNamespaces) {
            try {
                // Try to read the ConfigMap to check if it exists in this namespace
                const configMap = await apiClient.core.readNamespacedConfigMap({
                    name: OperatorNamespaceResolver.STATUS_CONFIGMAP_NAME,
                    namespace: namespace
                });

                // ConfigMap found! Check if it has a namespace field in its data
                if (configMap.data?.namespace) {
                    // Use the namespace specified in ConfigMap data
                    console.log(`[OperatorNamespaceResolver] ConfigMap found with namespace field: ${configMap.data.namespace}`);
                    return configMap.data.namespace;
                }

                // No namespace field in data, use the namespace where ConfigMap was found
                console.log(`[OperatorNamespaceResolver] ConfigMap found in namespace: ${namespace}`);
                return namespace;
            } catch (error) {
                // ConfigMap not found in this namespace, try next
                // Check if it's a 404 error (expected) vs other errors
                const errorMessage = (error as Error).message || String(error);
                if (!errorMessage.includes('404') && !errorMessage.includes('Not Found')) {
                    // Log non-404 errors as warnings
                    console.warn(`[OperatorNamespaceResolver] Error reading ConfigMap from namespace '${namespace}': ${errorMessage}`);
                }
                continue;
            }
        }

        return null;
    }

    /**
     * Get operator namespace from VS Code settings.
     * 
     * Settings structure:
     * - String: applies to all clusters
     * - Object: per-cluster configuration
     * 
     * @param clusterContext Cluster context name
     * @returns Namespace from settings or null
     */
    private getNamespaceFromSettings(clusterContext: string): string | null {
        const config = vscode.workspace.getConfiguration('kube9');
        const namespaceConfig = config.get<string | Record<string, string>>('operatorNamespace');

        if (!namespaceConfig) {
            return null;
        }

        // String config applies to all clusters
        if (typeof namespaceConfig === 'string') {
            return namespaceConfig;
        }

        // Object config is per-cluster
        if (typeof namespaceConfig === 'object') {
            return namespaceConfig[clusterContext] || null;
        }

        return null;
    }

    /**
     * Invalidate cached namespace for a cluster.
     * Call this when operator status changes or namespace might have changed.
     * 
     * @param clusterContext Cluster context name
     */
    invalidateCache(clusterContext: string): void {
        this.namespaceCache.delete(clusterContext);
        console.log(`[OperatorNamespaceResolver] Namespace cache invalidated for cluster: ${clusterContext}`);
    }

    /**
     * Get cached namespace without triggering discovery.
     * 
     * @param clusterContext Cluster context name
     * @returns Cached namespace or undefined
     */
    getCachedNamespace(clusterContext: string): string | undefined {
        return this.namespaceCache.get(clusterContext);
    }

    /**
     * Clear all cached namespaces.
     * Useful for testing or after major configuration changes.
     */
    clearCache(): void {
        this.namespaceCache.clear();
        console.log('[OperatorNamespaceResolver] All namespace cache cleared');
    }

    /**
     * Validate that operator exists in resolved namespace.
     * Optional validation step to ensure discovery is correct.
     * 
     * @param clusterContext Cluster context name
     * @param namespace Namespace to validate
     * @returns True if operator pod found, false otherwise
     */
    async validateNamespace(clusterContext: string, namespace: string): Promise<boolean> {
        try {
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(clusterContext);

            const pods = await apiClient.core.listNamespacedPod({
                namespace: namespace,
                labelSelector: 'app=kube9-operator'
            });

            const operatorPods = pods.items.filter((pod: k8s.V1Pod) => 
                pod.metadata?.labels?.['app'] === 'kube9-operator'
            );

            if (operatorPods.length === 0) {
                console.warn(`[OperatorNamespaceResolver] No operator pods found in namespace: ${namespace}`);
                return false;
            }

            return true;
        } catch (error) {
            console.error(`[OperatorNamespaceResolver] Failed to validate namespace ${namespace}: ${(error as Error).message}`);
            return false;
        }
    }
}

/**
 * Private module-level variable to hold the singleton instance.
 */
let resolverInstance: OperatorNamespaceResolver | null = null;

/**
 * Get singleton instance of OperatorNamespaceResolver.
 * Creates a new instance on first call, returns the same instance on subsequent calls.
 * 
 * @returns The singleton OperatorNamespaceResolver instance
 */
export function getOperatorNamespaceResolver(): OperatorNamespaceResolver {
    if (!resolverInstance) {
        resolverInstance = new OperatorNamespaceResolver();
    }
    return resolverInstance;
}

/**
 * Reset the singleton OperatorNamespaceResolver instance.
 * Used primarily for testing to ensure clean state between tests.
 * The next call to getOperatorNamespaceResolver() will create a new instance.
 */
export function resetOperatorNamespaceResolver(): void {
    resolverInstance = null;
}

