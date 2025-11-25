import * as vscode from 'vscode';
import { ClusterTreeItem } from '../../ClusterTreeItem';
import { TreeItemData } from '../../TreeItemTypes';
import { ServiceCommands, ServicePort } from '../../../kubectl/ServiceCommands';
import { KubectlError } from '../../../kubernetes/KubectlError';

/**
 * Type for error handler callback.
 */
type ErrorHandler = (error: KubectlError, clusterName: string) => void;

/**
 * Services subcategory handler.
 * Provides functionality to fetch and display services.
 */
export class ServicesSubcategory {
    /**
     * Retrieves service items for the Services subcategory.
     * Queries kubectl to get all services across all namespaces and creates tree items for display.
     * 
     * @param resourceData Cluster context and cluster information
     * @param kubeconfigPath Path to the kubeconfig file
     * @param errorHandler Callback to handle kubectl errors
     * @returns Array of service tree items
     */
    public static async getServiceItems(
        resourceData: TreeItemData,
        kubeconfigPath: string,
        errorHandler: ErrorHandler
    ): Promise<ClusterTreeItem[]> {
        const contextName = resourceData.context.name;
        const clusterName = resourceData.cluster?.name || contextName;
        
        // Query services using kubectl
        const result = await ServiceCommands.getServices(
            kubeconfigPath,
            contextName
        );

        // Handle errors if they occurred
        if (result.error) {
            errorHandler(result.error, clusterName);
            return [];
        }

        // If no services found, return empty array
        if (result.services.length === 0) {
            return [];
        }

        // Create tree items for each service
        const serviceItems = result.services.map(serviceInfo => {
            // Create tree item with 'service' type
            const item = new ClusterTreeItem(
                `${serviceInfo.namespace}/${serviceInfo.name}`,
                'service',
                vscode.TreeItemCollapsibleState.None,
                {
                    ...resourceData,
                    resourceName: serviceInfo.name,
                    namespace: serviceInfo.namespace
                }
            );
            
            // Set context value for "View YAML" menu
            item.contextValue = 'resource:Service';

            // Set description to show service type
            item.description = serviceInfo.type;

            // Set icon to match Services category
            item.iconPath = new vscode.ThemeIcon('globe');

            // Set tooltip with detailed information
            const portsFormatted = this.formatPorts(serviceInfo.ports);
            const selectorsFormatted = this.formatSelectors(serviceInfo.selectors);
            item.tooltip = `Service: ${serviceInfo.name}\nNamespace: ${serviceInfo.namespace}\nType: ${serviceInfo.type}\nCluster IP: ${serviceInfo.clusterIP}\nExternal IP: ${serviceInfo.externalIP || 'N/A'}\nPorts: ${portsFormatted || 'None'}\nSelectors: ${selectorsFormatted}\nEndpoints: N/A`;

            // No click command (placeholder)

            return item;
        });

        return serviceItems;
    }

    /**
     * Formats service ports as a comma-separated string.
     * Format: "port:targetPort/protocol"
     * 
     * @param ports Array of service ports
     * @returns Formatted ports string, or empty string if no ports
     */
    private static formatPorts(ports: ServicePort[]): string {
        if (ports.length === 0) {
            return '';
        }

        return ports.map(port => {
            const targetPort = typeof port.targetPort === 'number' 
                ? port.targetPort.toString() 
                : port.targetPort;
            return `${port.port}:${targetPort}/${port.protocol}`;
        }).join(', ');
    }

    /**
     * Formats service selectors as a comma-separated string.
     * Format: "key=value"
     * 
     * @param selectors Service selector labels
     * @returns Formatted selectors string, or "None" if empty
     */
    private static formatSelectors(selectors: Record<string, string>): string {
        const keys = Object.keys(selectors);
        if (keys.length === 0) {
            return 'None';
        }

        return keys.map(key => `${key}=${selectors[key]}`).join(', ');
    }
}

