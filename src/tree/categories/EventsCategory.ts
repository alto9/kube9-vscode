import * as vscode from 'vscode';
import { ClusterTreeItem } from '../ClusterTreeItem';
import { TreeItemType } from '../TreeItemTypes';

/**
 * Events category tree item.
 * Represents the top-level Events category node in the cluster tree view.
 * Only visible when the kube9-operator is installed (operator status is not "basic").
 */
export class EventsCategory extends ClusterTreeItem {
    /**
     * Type identifier for this category.
     * Used by ClusterTreeProvider to determine which children to load.
     */
    public type: TreeItemType = 'events';

    /**
     * Creates a new Events category tree item.
     * 
     * @param clusterElement The parent cluster tree item
     */
    constructor(public readonly clusterElement: ClusterTreeItem) {
        super('Events', 'events', vscode.TreeItemCollapsibleState.None, clusterElement.resourceData);
        
        this.contextValue = 'kube9.events.category';
        this.iconPath = new vscode.ThemeIcon('output');
        this.description = 'Cluster Events';
        this.tooltip = 'Kubernetes events for troubleshooting';
        
        // Set command to open Events Viewer webview
        // Pass only the cluster context name to avoid circular reference issues
        if (clusterElement.resourceData?.context?.name) {
            this.command = {
                command: 'kube9.events.openViewer',
                title: 'Open Events Viewer',
                arguments: [clusterElement.resourceData.context.name]
            };
        }
    }
}

