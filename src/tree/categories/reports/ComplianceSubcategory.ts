import * as vscode from 'vscode';
import { ClusterTreeItem } from '../../ClusterTreeItem';
import { TreeItemData } from '../../TreeItemTypes';

/**
 * Compliance subcategory handler.
 * Provides functionality to display compliance report items.
 * Currently returns a placeholder Data Collection report item.
 */
export class ComplianceSubcategory {
    /**
     * Retrieves compliance report items for the Compliance subcategory.
     * Returns the Data Collection report item (placeholder).
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Array containing the Data Collection report item
     */
    public static getComplianceReportItems(resourceData: TreeItemData): ClusterTreeItem[] {
        return [
            this.createDataCollectionReport(resourceData)
        ];
    }

    /**
     * Creates the Data Collection report tree item.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Data Collection report tree item
     */
    private static createDataCollectionReport(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Data Collection',
            'operatorHealth',
            vscode.TreeItemCollapsibleState.None,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('database');
        item.tooltip = 'Data Collection report (coming soon)';
        
        // Make Data Collection report clickable to open webview
        item.command = {
            command: 'kube9.openDataCollectionReport',
            title: 'Open Data Collection Report',
            arguments: []
        };
        
        return item;
    }
}

