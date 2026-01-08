import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { extractKindFromContextValue } from '../extension';
import { KubectlError } from '../kubernetes/KubectlError';
import { DescribeRawFileSystemProvider, createDescribeUri } from './DescribeRawFileSystemProvider';
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
 * Command handler for "Describe (Raw)".
 * Executes kubectl describe and opens the output in a read-only text editor.
 * 
 * @param treeItem The tree item representing the resource to describe
 */
export async function describeRawCommand(treeItem: ClusterTreeItem): Promise<void> {
    try {
        // Extract resource information from tree item
        if (!treeItem || !treeItem.resourceData) {
            throw new Error('Invalid tree item: missing resource data');
        }

        // Extract kind from contextValue (e.g., "Pod" from "resource:Pod")
        const kind = extractKindFromContextValue(treeItem.contextValue);

        // Extract resource name
        const name = treeItem.resourceData.resourceName || (treeItem.label as string);

        // Extract namespace
        const namespace = treeItem.resourceData.namespace;

        // Extract context name
        const contextName = treeItem.resourceData.context.name;

        // Fetch resource using API client and convert to YAML
        let describeOutput: string;
        try {
            describeOutput = await fetchResourceAsYAML(kind, name, namespace, contextName);
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.error(`Failed to describe ${kind}/${name}: ${kubectlError.getDetails()}`);
            
            // Show error message to user
            vscode.window.showErrorMessage(
                `Failed to describe ${kind} '${name}': ${kubectlError.getUserMessage()}`
            );
            
            // Don't open an empty tab on failure
            return;
        }

        // Get the global DescribeRawFileSystemProvider instance
        // We need to access it from the extension context
        // For now, we'll create a static instance that can be accessed
        // Actually, we should pass it as a parameter or use a singleton pattern
        // Let me use a simpler approach: get it from the workspace
        
        // Create URI with resource name and .describe suffix
        // Include namespace in URI path if present
        const uri = createDescribeUri(name, namespace);
        
        // Get the file system provider from workspace
        // We need to store it globally or access it differently
        // For simplicity, let's create a singleton instance
        const fsProvider = DescribeRawFileSystemProvider.getInstance();
        
        // Store the content in the file system provider
        // Use namespace-prefixed key if namespace is present
        const storageKey = namespace 
            ? `${namespace}/${name}.describe`
            : `${name}.describe`;
        fsProvider.setContent(storageKey, describeOutput);

        // Open the document using the custom URI
        const document = await vscode.workspace.openTextDocument(uri);

        // Show the document in a read-only editor
        await vscode.window.showTextDocument(document, {
            preview: false,
            preserveFocus: false
        });

        // The document is read-only because the FileSystemProvider is registered as readonly

        console.log(`Opened Describe (Raw) for ${kind} '${name}'`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to execute Describe (Raw) command:', errorMessage);
        vscode.window.showErrorMessage(`Failed to describe resource: ${errorMessage}`);
    }
}

