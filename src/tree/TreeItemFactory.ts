import * as vscode from 'vscode';
import { ClusterTreeItem } from './ClusterTreeItem';
import { TreeItemData } from './TreeItemTypes';
import { PortForwardManager, PortForwardInfo, PortForwardStatus } from '../services/PortForwardManager';

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
     * Creates the Helm Package Manager tree item.
     * Opens the Helm Package Manager webview for the cluster.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Helm Package Manager tree item
     */
    static createHelmCategory(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Helm Package Manager',
            'helm',
            vscode.TreeItemCollapsibleState.None,
            resourceData
        );
        item.command = {
            command: 'kube9.helm.openPackageManager',
            title: 'Open Helm Package Manager',
            arguments: [item]
        };
        item.iconPath = new vscode.ThemeIcon('package');
        item.tooltip = 'Manage Helm charts and releases';
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

    /**
     * Creates the Port Forwarding subcategory tree item.
     * Displays active port forwards under the Networking category.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Port Forwarding subcategory tree item
     */
    static createPortForwardingSubcategory(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Port Forwarding',
            'portForwarding',
            vscode.TreeItemCollapsibleState.Collapsed,
            resourceData
        );
        
        item.iconPath = new vscode.ThemeIcon('zap');
        item.tooltip = 'Manage active port forwards';
        
        // Show badge with count of active forwards for current context
        const manager = PortForwardManager.getInstance();
        const forwards = manager.getAllForwards();
        const contextForwards = forwards.filter(fw => fw.context === resourceData.context.name);
        
        if (contextForwards.length > 0) {
            item.description = `${contextForwards.length} active`;
        }
        
        return item;
    }

    /**
     * Creates an individual port forward tree item.
     * Displays a single port forward with status, uptime, and connection details.
     * 
     * @param forward Port forward information
     * @param resourceData Cluster context and cluster information
     * @returns Configured port forward tree item
     */
    static createPortForwardItem(
        forward: PortForwardInfo,
        resourceData: TreeItemData
    ): ClusterTreeItem {
        // Label format: localhost:8080 → default/nginx-pod:80
        const label = `localhost:${forward.localPort} → ${forward.namespace}/${forward.podName}:${forward.remotePort}`;
        
        const item = new ClusterTreeItem(
            label,
            'portForward',
            vscode.TreeItemCollapsibleState.None,
            {
                ...resourceData,
                resourceName: forward.podName,
                namespace: forward.namespace,
                forwardId: forward.id
            }
        );
        
        // Set context value for context menu
        item.contextValue = 'portForward';
        
        // Set icon based on status
        item.iconPath = this.getForwardStatusIcon(forward.status);
        
        // Set description with status and uptime
        item.description = this.buildForwardDescription(forward);
        
        // Set tooltip with detailed information
        item.tooltip = this.buildForwardTooltip(forward);
        
        return item;
    }

    /**
     * Gets the appropriate icon for a port forward status.
     * 
     * @param status Port forward status
     * @returns Theme icon for the status
     */
    private static getForwardStatusIcon(status: PortForwardStatus): vscode.ThemeIcon {
        switch (status) {
            case PortForwardStatus.Connected:
                return new vscode.ThemeIcon(
                    'circle-filled',
                    new vscode.ThemeColor('testing.iconPassed')
                );
            case PortForwardStatus.Connecting:
                return new vscode.ThemeIcon('sync~spin');
            case PortForwardStatus.Error:
                return new vscode.ThemeIcon(
                    'circle-filled',
                    new vscode.ThemeColor('testing.iconFailed')
                );
            case PortForwardStatus.Disconnected:
                return new vscode.ThemeIcon(
                    'circle-outline',
                    new vscode.ThemeColor('editorWarning.foreground')
                );
            case PortForwardStatus.Stopped:
                return new vscode.ThemeIcon('circle-outline');
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }

    /**
     * Builds the description text for a port forward item.
     * Format: "Connected • 5m 32s"
     * 
     * @param forward Port forward information
     * @returns Description string
     */
    private static buildForwardDescription(forward: PortForwardInfo): string {
        const statusText = forward.status.charAt(0).toUpperCase() + forward.status.slice(1);
        const uptimeText = this.formatUptime(forward.uptime);
        return `${statusText} • ${uptimeText}`;
    }

    /**
     * Builds the tooltip text for a port forward item.
     * Provides detailed information about the port forward.
     * 
     * @param forward Port forward information
     * @returns Tooltip string
     */
    private static buildForwardTooltip(forward: PortForwardInfo): string {
        const uptimeText = this.formatUptime(forward.uptime);
        return `Port Forward: ${forward.podName}\n` +
               `Namespace: ${forward.namespace}\n` +
               `Local Port: ${forward.localPort}\n` +
               `Remote Port: ${forward.remotePort}\n` +
               `Status: ${forward.status}\n` +
               `Uptime: ${uptimeText}\n` +
               `Started: ${forward.startTime.toLocaleString()}`;
    }

    /**
     * Formats uptime in seconds to a human-readable string.
     * Format: "45s", "1m 15s", "1h 5m"
     * 
     * @param seconds Uptime in seconds
     * @returns Formatted uptime string
     */
    private static formatUptime(seconds: number): string {
        if (seconds < 60) {
            return `${seconds}s`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes < 60) {
            if (remainingSeconds === 0) {
                return `${minutes}m`;
            }
            return `${minutes}m ${remainingSeconds}s`;
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (remainingMinutes === 0) {
            return `${hours}h`;
        }
        return `${hours}h ${remainingMinutes}m`;
    }
}

