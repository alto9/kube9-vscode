import * as vscode from 'vscode';
import { ClusterTreeItem } from '../../ClusterTreeItem';
import { TreeItemData } from '../../TreeItemTypes';
import { AIConformanceReportCategory } from './AIConformanceReportCategory';
import { WellArchitectedFrameworkCategory } from './WellArchitectedFrameworkCategory';

/**
 * Kube9 Operator subcategory handler.
 * Provides operator-backed reports (require operated-mode operator status).
 */
export class OperatorSubcategory {
    /**
     * Retrieves operator report items for the Kube9 Operator subcategory.
     *
     * @param resourceData Cluster context and cluster information
     * @returns Health, Kubernetes AI Conformance, then Well Architected Assessment folder
     */
    public static getOperatorReportItems(resourceData: TreeItemData): ClusterTreeItem[] {
        return [
            this.createHealthReport(resourceData),
            AIConformanceReportCategory.createReportItem(resourceData),
            WellArchitectedFrameworkCategory.createFolder(resourceData),
        ];
    }

    /**
     * Creates the Health report tree item.
     * 
     * @param resourceData Cluster context and cluster information
     * @returns Configured Health report tree item
     */
    private static createHealthReport(resourceData: TreeItemData): ClusterTreeItem {
        const item = new ClusterTreeItem(
            'Health',
            'operatorHealth',
            vscode.TreeItemCollapsibleState.None,
            resourceData
        );
        item.iconPath = new vscode.ThemeIcon('pulse');
        item.tooltip = 'View Kube9 Operator health and status';
        
        // Make Health report clickable to open webview
        // Pass cluster context name as argument so the correct cluster's health is displayed
        item.command = {
            command: 'kube9.openOperatorHealthReport',
            title: 'Open Operator Health Report',
            arguments: [resourceData.context.name]
        };
        
        return item;
    }
}

