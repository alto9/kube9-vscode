import * as vscode from 'vscode';
import { TreeItemType, TreeItemData, ClusterStatus } from './TreeItemTypes';
import { OperatorStatusMode, OperatorStatus } from '../kubernetes/OperatorStatusTypes';

/**
 * Re-export types for convenience.
 */
export { ClusterStatus, TreeItemType };

/**
 * Custom tree item class that extends VS Code's TreeItem with additional metadata.
 * This wrapper allows us to attach custom data to tree items for navigation and display.
 */
export class ClusterTreeItem extends vscode.TreeItem {
    /**
     * The type of tree item (cluster, namespace, allNamespaces, or info).
     */
    public readonly type: TreeItemType;

    /**
     * Optional metadata associated with this tree item.
     * Contains cluster context information (context and cluster data).
     */
    public readonly resourceData?: TreeItemData;

    /**
     * Optional array of child items.
     * Used for hierarchical navigation in the tree view.
     */
    public children?: ClusterTreeItem[];

    /**
     * Connection status of the cluster.
     * Only relevant for cluster-type tree items.
     */
    public status?: ClusterStatus;

    /**
     * Whether this namespace is the active namespace in kubectl context.
     * Only relevant for namespace-type tree items.
     */
    public isActiveNamespace?: boolean;

    /**
     * Operator status mode for the cluster.
     * Only relevant for cluster-type tree items.
     * Indicates whether the kube9-operator is installed and its operational status.
     */
    public operatorStatus?: OperatorStatusMode;

    /**
     * Full operator status details from the kube9-operator-status ConfigMap.
     * Only relevant for cluster-type tree items.
     * Contains detailed information about operator tier, version, health, and registration status.
     * Used for displaying detailed tooltip information.
     */
    public operatorStatusDetails?: OperatorStatus;

    /**
     * Creates a new ClusterTreeItem.
     * 
     * @param label The display label for the tree item
     * @param type The type of tree item
     * @param collapsibleState Whether the item is collapsible and its initial state
     * @param resourceData Optional metadata associated with this item
     */
    constructor(
        label: string,
        type: TreeItemType,
        collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
        resourceData?: TreeItemData
    ) {
        super(label, collapsibleState);
        this.type = type;
        this.resourceData = resourceData;
        
        // Set context value for use in when clauses (e.g., for context menus)
        this.contextValue = type;
        
        // Generate stable ID for preserving tree state during refreshes
        // Don't set ID for category items - let VSCode generate them to avoid duplicate registration
        const categoryTypes = ['dashboard', 'nodes', 'namespaces', 'workloads', 'storage', 
                              'networking', 'helm', 'configuration', 'argocd', 'customResources', 'reports'];
        if (!categoryTypes.includes(type)) {
            this.id = this.generateStableId(label, type, resourceData);
        }
    }
    
    /**
     * Generates a stable, unique ID for this tree item.
     * The ID is used by VSCode to preserve expansion state during tree refreshes.
     * 
     * Pattern: {contextName}/{type}/{resourceName}/{namespace}
     * 
     * @param label The display label for the tree item
     * @param type The type of tree item
     * @param resourceData Optional metadata associated with this item
     * @returns A unique, stable ID string
     */
    private generateStableId(label: string, type: TreeItemType, resourceData?: TreeItemData): string {
        const contextName = resourceData?.context?.name || 'unknown';
        
        // For cluster-level items, just use context/type
        if (type === 'cluster') {
            return `${contextName}/cluster`;
        }
        
        // For category items, use context/type
        const categoryTypes = ['dashboard', 'nodes', 'namespaces', 'workloads', 'storage', 
                              'networking', 'helm', 'configuration', 'argocd', 'customResources', 'reports'];
        if (categoryTypes.includes(type)) {
            return `${contextName}/${type}`;
        }
        
        // For subcategory items (under categories), use context/type
        const subcategoryTypes = ['deployments', 'statefulsets', 'daemonsets', 'cronjobs',
                                 'persistentVolumes', 'persistentVolumeClaims', 'storageClasses',
                                 'services', 'configmaps', 'secrets', 'compliance', 'dataCollection'];
        if (subcategoryTypes.includes(type)) {
            return `${contextName}/${type}`;
        }
        
        // For resource items, include namespace if available
        const namespace = resourceData?.namespace || '';
        if (namespace) {
            return `${contextName}/${type}/${label}/${namespace}`;
        }
        
        // Default: context/type/label
        return `${contextName}/${type}/${label}`;
    }
}

