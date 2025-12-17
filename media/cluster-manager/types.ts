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
 * Message sent from webview to extension to set a cluster alias.
 */
export interface SetAliasMessage {
    type: 'setAlias';
    data: {
        contextName: string;
        alias: string | null;
    };
}

/**
 * Message sent from webview to extension to toggle cluster visibility.
 */
export interface ToggleVisibilityMessage {
    type: 'toggleVisibility';
    data: {
        contextName: string;
        hidden: boolean;
    };
}

/**
 * Message sent from webview to extension to create a folder.
 */
export interface CreateFolderMessage {
    type: 'createFolder';
    data: {
        name: string;
        parentId: string | null;
    };
}

/**
 * Message sent from webview to extension to move a cluster to a folder.
 */
export interface MoveClusterMessage {
    type: 'moveCluster';
    data: {
        contextName: string;
        folderId: string | null;
        order: number;
    };
}

/**
 * Message sent from webview to extension to rename a folder.
 */
export interface RenameFolderMessage {
    type: 'renameFolder';
    data: {
        folderId: string;
        newName: string;
    };
}

/**
 * Message sent from webview to extension to delete a folder.
 */
export interface DeleteFolderMessage {
    type: 'deleteFolder';
    data: {
        folderId: string;
        moveToRoot: boolean;
    };
}

/**
 * Message sent from webview to extension to export configuration.
 */
export interface ExportConfigurationMessage {
    type: 'exportConfiguration';
}

/**
 * Message sent from webview to extension to import configuration.
 */
export interface ImportConfigurationMessage {
    type: 'importConfiguration';
}

/**
 * Message sent from extension to webview when customizations are updated.
 */
export interface CustomizationsUpdatedMessage {
    type: 'customizationsUpdated';
    data: ClusterCustomizationConfig;
}

/**
 * Message sent from extension to webview with an error.
 */
export interface ErrorMessage {
    type: 'error';
    message: string;
}

/**
 * Message sent from extension to webview when theme changes.
 */
export interface ThemeChangedMessage {
    type: 'themeChanged';
    data: {
        theme: 'light' | 'dark';
    };
}

/**
 * Union type for all webview messages from extension to webview.
 */
export type ExtensionToWebviewMessage = InitializeMessage | CustomizationsUpdatedMessage | ErrorMessage | ThemeChangedMessage;

/**
 * Union type for all webview messages from webview to extension.
 */
export type WebviewToExtensionMessage = GetClustersMessage | SetAliasMessage | ToggleVisibilityMessage | CreateFolderMessage | MoveClusterMessage | RenameFolderMessage | DeleteFolderMessage | ExportConfigurationMessage | ImportConfigurationMessage;

