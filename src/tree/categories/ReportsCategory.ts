import * as vscode from 'vscode';
import { ClusterTreeItem } from '../ClusterTreeItem';
import { TreeItemData } from '../TreeItemTypes';

/**
 * Reports category handler.
 * Provides the structure for reports subcategories (Compliance).
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
            this.createComplianceSubcategory(resourceData)
        ];
    }

    /**
     * Creates the Compliance subcategory tree item.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Compliance subcategory tree item
     */
    private static createComplianceSubcategory(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Compliance',
            'operatorSubcategory',
            vscode.TreeItemCollapsibleState.Collapsed,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('shield');
        item.tooltip = 'View compliance reports';
        return item;
    }
}

