import * as vscode from 'vscode';
import { ResourceIdentifier } from './YAMLEditorManager';
import { NamespaceCommands } from '../kubectl/NamespaceCommands';
import { WorkloadCommands } from '../kubectl/WorkloadCommands';
import { ConfigurationCommands } from '../kubectl/ConfigurationCommands';
import { getContextInfo } from '../utils/kubectlContext';
import { KubeconfigParser } from '../kubernetes/KubeconfigParser';

/**
 * Interface for namespace quick pick items
 */
interface NamespaceQuickPickItem extends vscode.QuickPickItem {
    namespace: string | null; // null represents "All Namespaces"
}

/**
 * Interface for resource kind quick pick items
 */
interface ResourceKindQuickPickItem extends vscode.QuickPickItem {
    resourceKind: string;
    apiVersion: string;
}

/**
 * Interface for resource name quick pick items
 */
interface ResourceNameQuickPickItem extends vscode.QuickPickItem {
    resourceName: string;
    resourceNamespace: string;
    resourceKind: string;
    apiVersion: string;
}

/**
 * Cache entry for resource lists
 */
interface ResourceCache {
    data: Array<{name: string; namespace?: string}>;
    timestamp: number;
}

/**
 * Utility class for providing quick pick dialogs for resource selection
 */
export class ResourceQuickPick {
    /**
     * Cache TTL in milliseconds (30 seconds)
     */
    private static readonly cacheTtlMs = 30000;

    /**
     * Cache for resource lists to avoid repeated kubectl calls
     */
    private static resourceCache = new Map<string, ResourceCache>();

    /**
     * Execute the complete quick pick flow to select a resource
     * 
     * @returns ResourceIdentifier for the selected resource, or undefined if cancelled
     */
    public static async executeQuickPickFlow(): Promise<ResourceIdentifier | undefined> {
        try {
            // Step 1: Select namespace
            const namespace = await this.getNamespaceSelection();
            if (namespace === undefined) {
                // User cancelled
                return undefined;
            }

            // Step 2: Select resource kind
            const kindSelection = await this.getResourceKindSelection();
            if (!kindSelection) {
                // User cancelled
                return undefined;
            }

            // Step 3: Select resource name
            const resourceSelection = await this.getResourceNameSelection(
                namespace,
                kindSelection.resourceKind,
                kindSelection.apiVersion
            );
            if (!resourceSelection) {
                // User cancelled
                return undefined;
            }

            // Build and return ResourceIdentifier
            const contextInfo = await getContextInfo();
            return {
                kind: resourceSelection.resourceKind,
                name: resourceSelection.resourceName,
                namespace: resourceSelection.resourceNamespace,
                apiVersion: resourceSelection.apiVersion,
                cluster: contextInfo.contextName
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Quick pick flow failed:', errorMessage);
            throw error;
        }
    }

    /**
     * Show namespace selection quick pick
     * 
     * @returns Selected namespace (null for "All Namespaces"), or undefined if cancelled
     */
    private static async getNamespaceSelection(): Promise<string | null | undefined> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Loading namespaces...',
            cancellable: false
        }, async () => {
            try {
                // Get kubeconfig and context info
                const kubeconfig = await KubeconfigParser.parseKubeconfig();
                const contextInfo = await getContextInfo();

                // Query namespaces
                const result = await NamespaceCommands.getNamespaces(
                    kubeconfig.filePath,
                    contextInfo.contextName
                );

                if (result.error) {
                    throw new Error(`Failed to list namespaces: ${result.error.getUserMessage()}`);
                }

                // Build quick pick items
                const items: NamespaceQuickPickItem[] = [
                    {
                        label: 'All Namespaces',
                        description: 'View resources across all namespaces',
                        namespace: null
                    },
                    ...result.namespaces.map(ns => ({
                        label: ns.name,
                        description: ns.status,
                        namespace: ns.name
                    }))
                ];

                // Show quick pick
                const selection = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select a namespace',
                    matchOnDescription: true
                });

                return selection?.namespace;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to load namespaces: ${errorMessage}`);
            }
        });
    }

    /**
     * Show resource kind selection quick pick
     * 
     * @returns Selected resource kind and API version, or undefined if cancelled
     */
    private static async getResourceKindSelection(): Promise<ResourceKindQuickPickItem | undefined> {
        const items: ResourceKindQuickPickItem[] = [
            // Workloads
            {
                label: '$(package) Deployment',
                description: 'Workload',
                resourceKind: 'Deployment',
                apiVersion: 'apps/v1'
            },
            {
                label: '$(package) StatefulSet',
                description: 'Workload',
                resourceKind: 'StatefulSet',
                apiVersion: 'apps/v1'
            },
            {
                label: '$(package) DaemonSet',
                description: 'Workload',
                resourceKind: 'DaemonSet',
                apiVersion: 'apps/v1'
            },
            {
                label: '$(package) CronJob',
                description: 'Workload',
                resourceKind: 'CronJob',
                apiVersion: 'batch/v1'
            },
            {
                label: '$(package) Pod',
                description: 'Workload',
                resourceKind: 'Pod',
                apiVersion: 'v1'
            },
            // Configuration
            {
                label: '$(file-text) ConfigMap',
                description: 'Configuration',
                resourceKind: 'ConfigMap',
                apiVersion: 'v1'
            },
            {
                label: '$(lock) Secret',
                description: 'Configuration',
                resourceKind: 'Secret',
                apiVersion: 'v1'
            },
            // Networking
            {
                label: '$(cloud) Service',
                description: 'Networking',
                resourceKind: 'Service',
                apiVersion: 'v1'
            },
            // Storage
            {
                label: '$(database) PersistentVolumeClaim',
                description: 'Storage',
                resourceKind: 'PersistentVolumeClaim',
                apiVersion: 'v1'
            },
            {
                label: '$(database) PersistentVolume',
                description: 'Storage',
                resourceKind: 'PersistentVolume',
                apiVersion: 'v1'
            },
            // Cluster
            {
                label: '$(layers) Namespace',
                description: 'Cluster',
                resourceKind: 'Namespace',
                apiVersion: 'v1'
            },
            {
                label: '$(server) Node',
                description: 'Cluster',
                resourceKind: 'Node',
                apiVersion: 'v1'
            }
        ];

        const selection = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a resource type',
            matchOnDescription: true
        });

        return selection;
    }

    /**
     * Show resource name selection quick pick for a specific kind
     * 
     * @param namespace - Namespace to query (null for all namespaces)
     * @param kind - Resource kind
     * @param apiVersion - API version
     * @returns Selected resource, or undefined if cancelled
     */
    private static async getResourceNameSelection(
        namespace: string | null,
        kind: string,
        apiVersion: string
    ): Promise<ResourceNameQuickPickItem | undefined> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Loading ${kind}s...`,
            cancellable: false
        }, async () => {
            try {
                // Check cache first
                const cacheKey = `${namespace || 'all'}:${kind}`;
                const cached = this.resourceCache.get(cacheKey);
                const now = Date.now();

                let resources: Array<{name: string; namespace?: string}>;
                if (cached && (now - cached.timestamp) < ResourceQuickPick.cacheTtlMs) {
                    // Use cached data
                    resources = cached.data;
                } else {
                    // Query resources from cluster
                    resources = await this.queryResources(namespace, kind);

                    // Update cache
                    this.resourceCache.set(cacheKey, {
                        data: resources,
                        timestamp: now
                    });
                }

                if (resources.length === 0) {
                    vscode.window.showInformationMessage(
                        `No ${kind}s found in ${namespace || 'any namespace'}`
                    );
                    return undefined;
                }

                // Build quick pick items
                const items: ResourceNameQuickPickItem[] = resources.map(resource => ({
                    label: resource.name,
                    description: resource.namespace ? `Namespace: ${resource.namespace}` : 'Cluster-scoped',
                    resourceName: resource.name,
                    resourceNamespace: resource.namespace || '',
                    resourceKind: kind,
                    apiVersion: apiVersion
                }));

                // Show quick pick
                const selection = await vscode.window.showQuickPick(items, {
                    placeHolder: `Select a ${kind}`,
                    matchOnDescription: true
                });

                return selection;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to load ${kind}s: ${errorMessage}`);
            }
        });
    }

    /**
     * Query resources from the cluster based on kind
     * 
     * @param namespace - Namespace to query (null for all namespaces)
     * @param kind - Resource kind
     * @returns Array of resources with name and namespace
     */
    private static async queryResources(
        namespace: string | null,
        kind: string
    ): Promise<Array<{ name: string; namespace?: string }>> {
        // Get kubeconfig and context info
        const kubeconfig = await KubeconfigParser.parseKubeconfig();
        const contextInfo = await getContextInfo();

        switch (kind) {
            case 'Deployment': {
                const result = await WorkloadCommands.getDeployments(
                    kubeconfig.filePath,
                    contextInfo.contextName
                );
                if (result.error) {
                    throw new Error(result.error.getUserMessage());
                }
                return result.deployments.map(d => ({
                    name: d.name,
                    namespace: d.namespace
                }));
            }

            case 'StatefulSet': {
                const result = await WorkloadCommands.getStatefulSets(
                    kubeconfig.filePath,
                    contextInfo.contextName
                );
                if (result.error) {
                    throw new Error(result.error.getUserMessage());
                }
                return result.statefulsets.map(s => ({
                    name: s.name,
                    namespace: s.namespace
                }));
            }

            case 'DaemonSet': {
                const result = await WorkloadCommands.getDaemonSets(
                    kubeconfig.filePath,
                    contextInfo.contextName
                );
                if (result.error) {
                    throw new Error(result.error.getUserMessage());
                }
                return result.daemonsets.map(d => ({
                    name: d.name,
                    namespace: d.namespace
                }));
            }

            case 'CronJob': {
                const result = await WorkloadCommands.getCronJobs(
                    kubeconfig.filePath,
                    contextInfo.contextName
                );
                if (result.error) {
                    throw new Error(result.error.getUserMessage());
                }
                return result.cronjobs.map(c => ({
                    name: c.name,
                    namespace: c.namespace
                }));
            }

            case 'ConfigMap': {
                const result = await ConfigurationCommands.getConfigMaps(
                    kubeconfig.filePath,
                    contextInfo.contextName
                );
                if (result.error) {
                    throw new Error(result.error.getUserMessage());
                }
                return result.configMaps.map(c => ({
                    name: c.name,
                    namespace: c.namespace
                }));
            }

            case 'Secret': {
                const result = await ConfigurationCommands.getSecrets(
                    kubeconfig.filePath,
                    contextInfo.contextName
                );
                if (result.error) {
                    throw new Error(result.error.getUserMessage());
                }
                return result.secrets.map(s => ({
                    name: s.name,
                    namespace: s.namespace
                }));
            }

            case 'Namespace': {
                const result = await NamespaceCommands.getNamespaces(
                    kubeconfig.filePath,
                    contextInfo.contextName
                );
                if (result.error) {
                    throw new Error(result.error.getUserMessage());
                }
                // Namespaces are cluster-scoped
                return result.namespaces.map(ns => ({
                    name: ns.name
                }));
            }

            // For other resource types, show a helpful message
            default:
                throw new Error(
                    `Resource kind '${kind}' is not yet supported in quick pick. ` +
                    `Please use the tree view to access this resource type.`
                );
        }
    }

    /**
     * Clear the resource cache
     * Useful when resources may have changed
     */
    public static clearCache(): void {
        this.resourceCache.clear();
    }
}

