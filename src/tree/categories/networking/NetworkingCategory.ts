import * as vscode from 'vscode';
import { ClusterTreeItem } from '../../ClusterTreeItem';
import { TreeItemData } from '../../TreeItemTypes';
import { TreeItemFactory } from '../../TreeItemFactory';

/**
 * Networking category handler.
 * Provides the structure for networking subcategories (Services, Port Forwarding).
 * This category doesn't fetch data itself but returns subcategory tree items.
 */
export class NetworkingCategory {
    /**
     * Retrieves the networking subcategories for the Networking category.
     * Returns subcategory tree items in the correct order.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Array of networking subcategory tree items
     */
    public static getNetworkingSubcategories(resourceData: TreeItemData): ClusterTreeItem[] {
        return [
            this.createServicesSubcategory(resourceData),
            TreeItemFactory.createPortForwardingSubcategory(resourceData)
        ];
    }

    /**
     * Creates the Services subcategory tree item.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Services subcategory tree item
     */
    private static createServicesSubcategory(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Services',
            'services',
            vscode.TreeItemCollapsibleState.Collapsed,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('globe');
        item.tooltip = 'View all services across all namespaces';
        return item;
    }
}







