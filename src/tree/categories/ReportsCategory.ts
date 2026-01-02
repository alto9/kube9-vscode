import * as vscode from 'vscode';
import { ClusterTreeItem } from '../ClusterTreeItem';
import { TreeItemData } from '../TreeItemTypes';

/**
 * Reports category handler.
 * Provides the structure for reports subcategories (Kube9 Operator).
 * This category doesn't fetch data itself but returns subcategory tree items.
 */
export class ReportsCategory {
    /**
     * Retrieves the 1 reports subcategory for the Reports category.
     * Returns subcategory tree items in the correct order.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Array of 1 reports subcategory tree item
     */
    public static getReportsSubcategories(resourceData: TreeItemData): ClusterTreeItem[] {
        return [
            this.createOperatorSubcategory(resourceData)
        ];
    }

    /**
     * Creates the Kube9 Operator subcategory tree item.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Kube9 Operator subcategory tree item
     */
    private static createOperatorSubcategory(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Kube9 Operator',
            'operatorSubcategory',
            vscode.TreeItemCollapsibleState.Collapsed,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('shield');
        item.tooltip = 'View Kube9 Operator reports';
        return item;
    }
}

