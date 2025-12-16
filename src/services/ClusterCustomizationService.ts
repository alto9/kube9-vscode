import * as vscode from 'vscode';

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
 * Service for managing cluster customizations (folders, aliases, visibility) using VS Code's Global State API.
 * 
 * This service provides persistence and retrieval of cluster customizations. It is the foundation
 * for all cluster organization features.
 */
export class ClusterCustomizationService {
    /**
     * Storage key for cluster customizations in Global State.
     */
    private static readonly STORAGE_KEY = 'kube9.clusterCustomizations';

    /**
     * Default configuration when no customizations exist.
     */
    private static readonly DEFAULT_CONFIG: ClusterCustomizationConfig = {
        version: '1.0',
        folders: [],
        clusters: {}
    };

    /**
     * VS Code extension context for accessing Global State.
     */
    private readonly context: vscode.ExtensionContext;

    /**
     * Creates a new ClusterCustomizationService instance.
     * 
     * @param context - The VS Code extension context
     */
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Retrieves the current cluster customization configuration.
     * 
     * @returns Promise resolving to the complete configuration object
     */
    async getConfiguration(): Promise<ClusterCustomizationConfig> {
        const config = this.context.globalState.get<ClusterCustomizationConfig>(
            ClusterCustomizationService.STORAGE_KEY,
            ClusterCustomizationService.DEFAULT_CONFIG
        );
        return config;
    }

    /**
     * Updates and saves the cluster customization configuration.
     * 
     * @param config - The complete configuration object to save
     * @returns Promise that resolves when the configuration has been saved
     */
    async updateConfiguration(config: ClusterCustomizationConfig): Promise<void> {
        await this.context.globalState.update(
            ClusterCustomizationService.STORAGE_KEY,
            config
        );
    }
}

