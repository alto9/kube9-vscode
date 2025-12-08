import * as vscode from 'vscode';
import { ClusterTreeItem } from './ClusterTreeItem';
import { TreeItemData } from './TreeItemTypes';

/**
 * Factory class for creating tree items with consistent configuration.
 * Provides methods to create category tree items with appropriate icons and settings.
 */
export class TreeItemFactory {
    /**
     * Creates the Dashboard category tree item.
     * Provides access to cluster dashboard with overview and metrics.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Dashboard category tree item
     */
    static createDashboardCategory(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Dashboard',
            'dashboard',
            vscode.TreeItemCollapsibleState.None,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('dashboard');
        item.tooltip = 'View cluster dashboard';
        
        // Add command to open dashboard when clicked
        item.command = {
            command: 'kube9.openDashboard',
            title: 'Open Dashboard',
            arguments: [item]
        };
        
        return item;
    }

    /**
     * Creates the Nodes category tree item.
     * Displays all nodes in the cluster.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Nodes category tree item
     */
    static createNodesCategory(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Nodes',
            'nodes',
            vscode.TreeItemCollapsibleState.Collapsed,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('server');
        item.tooltip = 'View all nodes in the cluster';
        return item;
    }

    /**
     * Creates the Namespaces category tree item.
     * Displays all namespaces in the cluster.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Namespaces category tree item
     */
    static createNamespacesCategory(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Namespaces',
            'namespaces',
            vscode.TreeItemCollapsibleState.Collapsed,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('symbol-namespace');
        item.tooltip = 'View all namespaces in the cluster';
        return item;
    }

    /**
     * Creates the Networking category tree item.
     * Displays networking subcategories (Services).
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Networking category tree item
     */
    static createNetworkingCategory(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Networking',
            'networking',
            vscode.TreeItemCollapsibleState.Collapsed,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('globe');
        item.tooltip = 'View networking resources (Services, Ingress, etc.)';
        return item;
    }

    /**
     * Creates the Workloads category tree item.
     * Displays workload subcategories (Deployments, StatefulSets, DaemonSets, CronJobs).
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Workloads category tree item
     */
    static createWorkloadsCategory(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Workloads',
            'workloads',
            vscode.TreeItemCollapsibleState.Collapsed,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('layers');
        item.tooltip = 'View workloads (Deployments, StatefulSets, DaemonSets, CronJobs)';
        return item;
    }

    /**
     * Creates the Storage category tree item.
     * Displays storage subcategories (Persistent Volumes, Persistent Volume Claims, Storage Classes).
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Storage category tree item
     */
    static createStorageCategory(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Storage',
            'storage',
            vscode.TreeItemCollapsibleState.Collapsed,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('database');
        item.tooltip = 'View storage resources (PVs, PVCs, Storage Classes)';
        return item;
    }

    /**
     * Creates the Helm category tree item.
     * Displays all Helm releases in the cluster.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Helm category tree item
     */
    static createHelmCategory(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Helm',
            'helm',
            vscode.TreeItemCollapsibleState.Collapsed,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('package');
        item.tooltip = 'View Helm releases';
        return item;
    }

    /**
     * Creates the Configuration category tree item.
     * Displays configuration subcategories (ConfigMaps, Secrets).
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Configuration category tree item
     */
    static createConfigurationCategory(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Configuration',
            'configuration',
            vscode.TreeItemCollapsibleState.Collapsed,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('settings-gear');
        item.tooltip = 'View configuration resources (ConfigMaps, Secrets)';
        return item;
    }

    /**
     * Creates the ArgoCD Applications category tree item.
     * Displays all ArgoCD Applications in the cluster.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured ArgoCD Applications category tree item
     */
    static createArgoCDCategory(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'ArgoCD Applications',
            'argocd',
            vscode.TreeItemCollapsibleState.Collapsed,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('sync');
        item.tooltip = 'View ArgoCD Applications';
        return item;
    }

    /**
     * Creates the Custom Resources category tree item.
     * Displays all Custom Resource Definitions (CRDs) in the cluster.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Custom Resources category tree item
     */
    static createCustomResourcesCategory(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Custom Resources',
            'customResources',
            vscode.TreeItemCollapsibleState.Collapsed,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('extensions');
        item.tooltip = 'View Custom Resource Definitions (CRDs)';
        return item;
    }

    /**
     * Creates the Reports category tree item.
     * Displays reports subcategories (Compliance).
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Reports category tree item
     */
    static createReportsCategory(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Reports',
            'reports',
            vscode.TreeItemCollapsibleState.Collapsed,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('graph');
        item.tooltip = 'View cluster reports and compliance information';
        return item;
    }
}

