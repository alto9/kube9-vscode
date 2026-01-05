import * as vscode from 'vscode';
import * as k8s from '@kubernetes/client-node';
import { ClusterTreeItem } from '../ClusterTreeItem';
import { TreeItemData } from '../TreeItemTypes';

/**
 * Configuration passed from namespace tree item to describe webview.
 */
export interface NamespaceTreeItemConfig {
    /** Name of the namespace */
    name: string;
    /** Status of the namespace */
    status: k8s.V1NamespaceStatus;
    /** Metadata of the namespace */
    metadata: k8s.V1ObjectMeta;
    /** Kubernetes context name */
    context: string;
}

/**
 * Tree item class for Kubernetes namespaces.
 * Extends ClusterTreeItem with namespace-specific functionality.
 */
export class NamespaceTreeItem extends ClusterTreeItem {
    /** Namespace information */
    public readonly namespaceInfo: {
        name: string;
        status: k8s.V1NamespaceStatus;
        metadata: k8s.V1ObjectMeta;
    };

    /**
     * Creates a new NamespaceTreeItem.
     * 
     * @param config Namespace configuration with name, status, metadata, and context
     * @param resourceData Cluster context and cluster information
     */
    constructor(config: NamespaceTreeItemConfig, resourceData: TreeItemData) {
        // Namespaces are non-expandable items
        super(
            config.name,
            'namespace',
            vscode.TreeItemCollapsibleState.None,
            {
                ...resourceData,
                resourceName: config.name
            }
        );
        
        this.namespaceInfo = {
            name: config.name,
            status: config.status,
            metadata: config.metadata
        };
        
        // Set context value for "View YAML" menu
        this.contextValue = 'resource:Namespace';
        
        // Set command to open Describe webview on left-click
        this.command = {
            command: 'kube9.describeNamespace',
            title: 'Describe Namespace',
            arguments: [{
                name: config.name,
                status: config.status,
                metadata: config.metadata,
                context: config.context
            }]
        };
    }
}

