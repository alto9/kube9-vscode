/**
 * Message sent from webview to extension requesting cluster list.
 */
export interface GetClustersMessage {
    type: 'getClusters';
}

/**
 * Cluster information from kubeconfig.
 */
export interface ClusterInfo {
    contextName: string;
    clusterName: string;
    clusterServer: string;
    isActive: boolean;
}

/**
 * Configuration for a folder used to organize clusters.
 */
export interface FolderConfig {
    /** UUID v4 identifier for the folder */
    id: string;
    /** User-defined folder name */
    name: string;
    /** Parent folder ID for nesting, null for root level */
    parentId: string | null;
    /** Display order within parent (0-indexed) */
    order: number;
    /** Whether folder is expanded in tree view */
    expanded: boolean;
}

/**
 * Configuration for a cluster customization.
 */
export interface ClusterConfig {
    /** User-friendly name, null to use original context name */
    alias: string | null;
    /** Whether cluster is hidden from tree view */
    hidden: boolean;
    /** Parent folder ID, null for root level */
    folderId: string | null;
    /** Display order within folder (0-indexed) */
    order: number;
}

/**
 * Complete cluster customization configuration.
 */
export interface ClusterCustomizationConfig {
    /** Schema version (e.g., "1.0") */
    version: string;
    /** Array of folder configurations */
    folders: FolderConfig[];
    /** Map of cluster customizations keyed by kubeconfig context name */
    clusters: Record<string, ClusterConfig>;
}

/**
 * Message sent from extension to webview with initialization data.
 */
export interface InitializeMessage {
    type: 'initialize';
    data: {
        clusters: ClusterInfo[];
        customizations: ClusterCustomizationConfig;
        theme: 'light' | 'dark';
    };
}

/**
 * Union type for all webview messages from extension to webview.
 */
export type ExtensionToWebviewMessage = InitializeMessage;

/**
 * Union type for all webview messages from webview to extension.
 */
export type WebviewToExtensionMessage = GetClustersMessage;

