import * as vscode from 'vscode';
import { ClusterTreeItem } from '../../ClusterTreeItem';
import { TreeItemData } from '../../TreeItemTypes';
import { PortForwardManager, PortForwardInfo, PortForwardStatus } from '../../../services/PortForwardManager';

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
        
        // Create tree items
        return sorted.map(forward =>
            this.createPortForwardItem(forward, resourceData)
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
     * Creates a tree item for a single port forward.
     * 
     * @param forward Port forward information
     * @param resourceData Cluster context and cluster information
     * @returns Port forward tree item
     */
    private static createPortForwardItem(
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
                namespace: forward.namespace
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
     * Format: "connected • 5m 32s"
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

