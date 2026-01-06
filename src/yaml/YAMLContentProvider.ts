import { KubectlError } from '../kubernetes/KubectlError';
import { ResourceIdentifier } from './YAMLEditorManager';
import { showErrorWithDetails } from './ErrorHandler';
import { getKubernetesApiClient } from '../kubernetes/apiClient';
import * as yaml from 'js-yaml';

/**
 * Fetches a Kubernetes resource and converts it to YAML format.
 * Routes to the appropriate API based on resource kind.
 */
async function fetchResourceAsYAML(
    kind: string,
    name: string,
    namespace: string | undefined,
    contextName: string
): Promise<string> {
    const apiClient = getKubernetesApiClient();
    apiClient.setContext(contextName);
    
    const kindLower = kind.toLowerCase();
    let resource: unknown;
    
    // Define cluster-scoped resource types
    const clusterScopedTypes = ['node', 'namespace', 'persistentvolume', 'storageclass', 'customresourcedefinition', 'crd'];
    const isClusterScoped = clusterScopedTypes.includes(kindLower);
    
    if (!isClusterScoped) {
        // Namespaced resource - namespace defaults to 'default' if not provided
        const ns = namespace || 'default';
        switch (kindLower) {
            case 'pod':
                resource = await apiClient.core.readNamespacedPod({ name, namespace: ns });
                break;
            case 'service':
                resource = await apiClient.core.readNamespacedService({ name, namespace: ns });
                break;
            case 'configmap':
                resource = await apiClient.core.readNamespacedConfigMap({ name, namespace: ns });
                break;
            case 'secret':
                resource = await apiClient.core.readNamespacedSecret({ name, namespace: ns });
                break;
            case 'deployment':
                resource = await apiClient.apps.readNamespacedDeployment({ name, namespace: ns });
                break;
            case 'statefulset':
                resource = await apiClient.apps.readNamespacedStatefulSet({ name, namespace: ns });
                break;
            case 'daemonset':
                resource = await apiClient.apps.readNamespacedDaemonSet({ name, namespace: ns });
                break;
            case 'replicaset':
                resource = await apiClient.apps.readNamespacedReplicaSet({ name, namespace: ns });
                break;
            case 'job':
                resource = await apiClient.batch.readNamespacedJob({ name, namespace: ns });
                break;
            case 'cronjob':
                resource = await apiClient.batch.readNamespacedCronJob({ name, namespace: ns });
                break;
            case 'persistentvolumeclaim':
                resource = await apiClient.core.readNamespacedPersistentVolumeClaim({ name, namespace: ns });
                break;
            default:
                throw new Error(`Unsupported namespaced resource type: ${kind}`);
        }
    } else {
        // Cluster-scoped resource
        switch (kindLower) {
            case 'node':
                resource = await apiClient.core.readNode({ name });
                break;
            case 'namespace':
                resource = await apiClient.core.readNamespace({ name });
                break;
            case 'persistentvolume':
                resource = await apiClient.core.readPersistentVolume({ name });
                break;
            case 'storageclass':
                resource = await apiClient.storage.readStorageClass({ name });
                break;
            default:
                throw new Error(`Unsupported cluster-scoped resource type: ${kind}`);
        }
    }
    
    // Convert to YAML format
    return yaml.dump(resource, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
    });
}

/**
 * Provides YAML content for Kubernetes resources by fetching from the cluster.
 * Uses the Kubernetes API client to retrieve resource YAML configurations.
 */
export class YAMLContentProvider {
    /**
     * Fetches the YAML content for a Kubernetes resource from the cluster.
     * 
     * @param resource - The resource identifier specifying which resource to fetch
     * @returns Promise resolving to the YAML content as a string
     * @throws {Error} If API call fails or resource cannot be fetched
     */
    public async fetchYAML(resource: ResourceIdentifier): Promise<string> {
        try {
            // Fetch resource using API client and convert to YAML
            return await fetchResourceAsYAML(
                resource.kind,
                resource.name,
                resource.namespace,
                resource.cluster
            );
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, resource.cluster);
            
            // Log error details for debugging
            console.error(`Failed to fetch YAML for ${resource.kind}/${resource.name}: ${kubectlError.getDetails()}`);
            
            // Show enhanced error message with retry option
            await showErrorWithDetails(
                kubectlError,
                `Failed to fetch YAML for ${resource.kind} '${resource.name}'`,
                async () => {
                    // Retry by calling fetchYAML again
                    await this.fetchYAML(resource);
                }
            );
            
            // Throw error for caller to handle
            throw new Error(`Failed to fetch YAML for ${resource.kind} '${resource.name}': ${kubectlError.getUserMessage()}`);
        }
    }
}

