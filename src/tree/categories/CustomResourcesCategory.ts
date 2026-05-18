import * as vscode from 'vscode';
import { ClusterTreeItem } from '../ClusterTreeItem';
import { TreeItemData } from '../TreeItemTypes';
import { CustomResourceCommands } from '../../kubectl/CustomResourceCommands';
import { KubectlError } from '../../kubernetes/KubectlError';

/**
 * Type for error handler callback.
 */
type ErrorHandler = (error: KubectlError, clusterName: string) => void;

/**
 * Custom Resources category handler.
 * Provides functionality to fetch and display Custom Resource Definitions (CRDs).
 */
export class CustomResourcesCategory {
    /**
     * Retrieves CRD items for the Custom Resources category.
     * Queries kubectl to get all CRDs in the cluster and creates tree items for display.
     * 
     * @param resourceData Cluster context and cluster information
     * @param kubeconfigPath Path to the kubeconfig file
     * @param errorHandler Callback to handle kubectl errors
     * @returns Array of CRD tree items
     */
    public static async getCRDItems(
        resourceData: TreeItemData,
        kubeconfigPath: string,
        errorHandler: ErrorHandler
    ): Promise<ClusterTreeItem[]> {
        const contextName = resourceData.context.name;
        const clusterName = resourceData.cluster?.name || contextName;
        
        // Query CRDs using kubectl
        const result = await CustomResourceCommands.getCRDs(
            kubeconfigPath,
            contextName
        );

        // Handle errors if they occurred
        if (result.error) {
            errorHandler(result.error, clusterName);
            return [];
        }

        // If no CRDs found, return empty array
        if (result.crds.length === 0) {
            return [];
        }

        // Create tree items for each CRD
        const crdItems = result.crds.map(crdInfo => {
            // Label is the kind name (e.g., "MyCustomResource")
            const label = crdInfo.kind;

            const itemResourceData: TreeItemData = {
                ...resourceData,
                /** metadata.name / kubectl resource id (group-suffixed plural) */
                resourceName: crdInfo.name
            };
            
            const item = new ClusterTreeItem(
                label,
                'crd',
                vscode.TreeItemCollapsibleState.None,
                itemResourceData
            );

            // Set description to show group and version (e.g., "apps.example.com/v1")
            const groupVersion = crdInfo.version ? 
                `${crdInfo.group}/${crdInfo.version}` : 
                crdInfo.group;
            item.description = groupVersion;

            // Set icon to symbol-class (CRDs define resource types/classes)
            item.iconPath = new vscode.ThemeIcon('symbol-class');

            // Set tooltip with detailed information
            item.tooltip = `CRD: ${crdInfo.kind}\nGroup: ${crdInfo.group}\nVersion: ${crdInfo.version}\nFull Name: ${crdInfo.name}`;

            // No command - clicking a CRD is a no-op at this stage (placeholder for future)
            
            return item;
        });

        return crdItems;
    }
}

