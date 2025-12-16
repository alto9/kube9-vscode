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
 * Event payload for customization change notifications.
 */
export interface CustomizationChangeEvent {
    /** Type of customization that changed */
    type: 'folder' | 'cluster' | 'bulk';
    /** Operation that was performed */
    operation: 'create' | 'update' | 'delete';
    /** Array of affected IDs (folder IDs or cluster context names) */
    affectedIds: string[];
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
     * Event emitter for customization changes.
     */
    private readonly _onDidChangeCustomizations = new vscode.EventEmitter<CustomizationChangeEvent>();

    /**
     * Public event that fires when customizations change.
     * Subscribers (webview, tree provider) can listen to this for real-time updates.
     */
    readonly onDidChangeCustomizations: vscode.Event<CustomizationChangeEvent> = 
        this._onDidChangeCustomizations.event;

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
        
        // Emit change event after successful write
        // For now, emit 'bulk' type since we don't track individual changes yet
        // Future stories will refine this to emit specific change types
        this._onDidChangeCustomizations.fire({
            type: 'bulk',
            operation: 'update',
            affectedIds: []
        });
    }

    /**
     * Sets or removes a cluster alias.
     * 
     * @param contextName - The kubeconfig context name of the cluster
     * @param alias - The friendly name to assign, or null to remove the alias
     * @returns Promise that resolves when the alias has been saved
     * @throws Error if alias exceeds 100 characters
     */
    async setAlias(contextName: string, alias: string | null): Promise<void> {
        const config = await this.getConfiguration();
        
        // Trim whitespace from alias
        const trimmedAlias = alias?.trim() || null;
        
        // Validate alias length
        if (trimmedAlias && trimmedAlias.length > 100) {
            throw new Error('Alias must be 100 characters or less');
        }
        
        // Get or create cluster config for the context
        if (!config.clusters[contextName]) {
            config.clusters[contextName] = {
                alias: null,
                hidden: false,
                folderId: null,
                order: 0
            };
        }
        
        // Update alias field
        config.clusters[contextName].alias = trimmedAlias;
        
        // Save configuration (this will emit the change event)
        await this.updateConfiguration(config);
    }

    /**
     * Gets customization for a specific cluster.
     * 
     * @param contextName - Cluster context name
     * @returns Cluster configuration or default values
     */
    getClusterConfig(contextName: string): ClusterConfig {
        const config = this.context.globalState.get<ClusterCustomizationConfig>(
            ClusterCustomizationService.STORAGE_KEY,
            ClusterCustomizationService.DEFAULT_CONFIG
        );
        
        // Return cluster config if exists, otherwise return defaults
        return config.clusters[contextName] || {
            alias: null,
            hidden: false,
            folderId: null,
            order: 0
        };
    }

    /**
     * Disposes of resources used by this service.
     * Should be called when the extension is deactivated.
     */
    dispose(): void {
        this._onDidChangeCustomizations.dispose();
    }
}

