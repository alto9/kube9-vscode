import * as vscode from 'vscode';
import { ClusterTreeItem } from '../../ClusterTreeItem';
import { TreeItemData } from '../../TreeItemTypes';
import { PortForwardManager, PortForwardInfo } from '../../../services/PortForwardManager';
import { TreeItemFactory } from '../../TreeItemFactory';

/**
 * Port Forwarding subcategory handler.
 * Provides functionality to display active port forwards from PortForwardManager.
 */
export class PortForwardingSubcategory {
    /**
     * Retrieves port forward items for the Port Forwarding subcategory.
     * Queries PortForwardManager for active forwards and creates tree items for display.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Array of port forward tree items, or empty state item if no forwards
     */
    public static getPortForwardItems(resourceData: TreeItemData): ClusterTreeItem[] {
        const manager = PortForwardManager.getInstance();
        const forwards = manager.getAllForwards();
        
        // Filter forwards for current context
        const contextForwards = forwards.filter(
            fw => fw.context === resourceData.context.name
        );
        
        if (contextForwards.length === 0) {
            return [this.createEmptyStateItem(resourceData)];
        }
        
        // Sort forwards by namespace, pod name, local port
        const sorted = this.sortForwards(contextForwards);
        
        // Create tree items using TreeItemFactory
        return sorted.map(forward =>
            TreeItemFactory.createPortForwardItem(forward, resourceData)
        );
    }
    
    /**
     * Creates an empty state tree item when no port forwards are active.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Empty state tree item
     */
    private static createEmptyStateItem(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'No active port forwards',
            'info',
            vscode.TreeItemCollapsibleState.None,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('info');
        item.description = 'Right-click a running pod to start forwarding';
        item.contextValue = undefined; // No context menu
        return item;
    }
    
    /**
     * Sorts port forwards by namespace, pod name, and local port.
     * 
     * @param forwards Array of port forward information
     * @returns Sorted array of port forwards
     */
    private static sortForwards(forwards: PortForwardInfo[]): PortForwardInfo[] {
        return forwards.sort((a, b) => {
            // Sort by: namespace → pod name → local port
            const nsCompare = a.namespace.localeCompare(b.namespace);
            if (nsCompare !== 0) return nsCompare;
            
            const podCompare = a.podName.localeCompare(b.podName);
            if (podCompare !== 0) return podCompare;
            
            return a.localPort - b.localPort;
        });
    }
}

