import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';

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
     * Sets or removes cluster visibility in tree view.
     * 
     * @param contextName - The kubeconfig context name of the cluster
     * @param hidden - Whether the cluster should be hidden from tree view
     * @returns Promise that resolves when the visibility has been saved
     */
    async setVisibility(contextName: string, hidden: boolean): Promise<void> {
        const config = await this.getConfiguration();
        
        // Get or create cluster config for the context
        if (!config.clusters[contextName]) {
            config.clusters[contextName] = {
                alias: null,
                hidden: false,
                folderId: null,
                order: 0
            };
        }
        
        // Update hidden field
        config.clusters[contextName].hidden = hidden;
        
        // Save configuration (this will emit the change event)
        await this.updateConfiguration(config);
    }

    /**
     * Moves a cluster to a different folder or changes its display order.
     * 
     * @param contextName - The kubeconfig context name of the cluster
     * @param folderId - Target folder ID or null for root level
     * @param order - Position within folder (0-indexed)
     * @returns Promise that resolves when the move has been saved
     * @throws Error if folder doesn't exist
     */
    async moveCluster(
        contextName: string,
        folderId: string | null,
        order: number
    ): Promise<void> {
        const config = await this.getConfiguration();
        
        // Validate folder exists (if not null)
        if (folderId && !config.folders.find(f => f.id === folderId)) {
            throw new Error(`Folder ${folderId} not found`);
        }
        
        // Get old folder ID and order (if cluster existed)
        const oldClusterConfig = config.clusters[contextName];
        const oldFolderId = oldClusterConfig?.folderId ?? null;
        const oldOrder = oldClusterConfig?.order ?? 0;
        
        // Get or create cluster config
        if (!config.clusters[contextName]) {
            config.clusters[contextName] = {
                alias: null,
                hidden: false,
                folderId: folderId,
                order: order
            };
        } else {
            // Update folderId and order
            config.clusters[contextName].folderId = folderId;
            config.clusters[contextName].order = order;
        }
        
        // Handle reordering logic
        const isMovingToDifferentFolder = oldFolderId !== folderId;
        
        if (isMovingToDifferentFolder) {
            // Moving to different folder: shift clusters in both old and new folders
            
            // Shift clusters in old folder: decrement order for clusters with order > old order
            if (oldFolderId !== null) {
                for (const [otherContextName, otherCluster] of Object.entries(config.clusters)) {
                    if (otherContextName !== contextName && 
                        otherCluster.folderId === oldFolderId && 
                        otherCluster.order > oldOrder) {
                        otherCluster.order--;
                    }
                }
            }
            
            // Shift clusters in new folder: increment order for clusters with order >= new order
            if (folderId !== null) {
                for (const [otherContextName, otherCluster] of Object.entries(config.clusters)) {
                    if (otherContextName !== contextName && 
                        otherCluster.folderId === folderId && 
                        otherCluster.order >= order) {
                        otherCluster.order++;
                    }
                }
            } else {
                // Moving to root: increment order for root clusters with order >= new order
                for (const [otherContextName, otherCluster] of Object.entries(config.clusters)) {
                    if (otherContextName !== contextName && 
                        otherCluster.folderId === null && 
                        otherCluster.order >= order) {
                        otherCluster.order++;
                    }
                }
            }
        } else {
            // Moving within same folder: shift clusters between old and new positions
            if (order < oldOrder) {
                // Moving forward: increment orders of clusters between new and old
                const targetFolderId = folderId;
                for (const [otherContextName, otherCluster] of Object.entries(config.clusters)) {
                    if (otherContextName !== contextName && 
                        otherCluster.folderId === targetFolderId && 
                        otherCluster.order >= order && 
                        otherCluster.order < oldOrder) {
                        otherCluster.order++;
                    }
                }
            } else if (order > oldOrder) {
                // Moving backward: decrement orders of clusters between old and new
                const targetFolderId = folderId;
                for (const [otherContextName, otherCluster] of Object.entries(config.clusters)) {
                    if (otherContextName !== contextName && 
                        otherCluster.folderId === targetFolderId && 
                        otherCluster.order > oldOrder && 
                        otherCluster.order <= order) {
                        otherCluster.order--;
                    }
                }
            }
            // If order === oldOrder, no reordering needed
        }
        
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
     * Creates a new folder for organizing clusters.
     * 
     * @param name - Folder display name
     * @param parentId - Parent folder ID or null for root level
     * @returns Promise resolving to the created folder configuration
     * @throws Error if name is empty, duplicate, or nesting depth exceeds maximum
     */
    async createFolder(name: string, parentId: string | null): Promise<FolderConfig> {
        const config = await this.getConfiguration();
        
        // Trim and validate name
        const trimmedName = name.trim();
        if (trimmedName.length === 0) {
            throw new Error('Folder name cannot be empty');
        }
        
        // Validate name is unique within parent
        const siblings = config.folders.filter(f => f.parentId === parentId);
        if (siblings.some(f => f.name === trimmedName)) {
            throw new Error('A folder with this name already exists');
        }
        
        // Validate nesting depth (max 5 levels, root = level 0)
        const currentDepth = this.getNestingDepth(parentId, config);
        if (currentDepth >= 5) {
            throw new Error('Maximum folder depth reached (5 levels)');
        }
        
        // Generate UUID for folder ID
        const folderId = uuidv4();
        
        // Calculate next order value
        const order = this.getNextOrder(parentId, config);
        
        // Create folder configuration
        const folder: FolderConfig = {
            id: folderId,
            name: trimmedName,
            parentId: parentId,
            order: order,
            expanded: false
        };
        
        // Add to configuration
        config.folders.push(folder);
        
        // Save configuration
        await this.updateConfiguration(config);
        
        // Emit specific folder create event
        this._onDidChangeCustomizations.fire({
            type: 'folder',
            operation: 'create',
            affectedIds: [folderId]
        });
        
        return folder;
    }

    /**
     * Renames an existing folder.
     * 
     * @param folderId - Folder to rename
     * @param newName - New folder name
     * @returns Promise that resolves when the folder has been renamed
     * @throws Error if folder not found, name is empty, or name is duplicate
     */
    async renameFolder(folderId: string, newName: string): Promise<void> {
        const config = await this.getConfiguration();
        
        // Find folder by ID
        const folder = config.folders.find(f => f.id === folderId);
        if (!folder) {
            throw new Error('Folder not found');
        }
        
        // Trim and validate new name
        const trimmedName = newName.trim();
        if (trimmedName.length === 0) {
            throw new Error('Folder name cannot be empty');
        }
        
        // If name hasn't changed, no-op
        if (folder.name === trimmedName) {
            return;
        }
        
        // Validate new name is unique within parent (check siblings)
        const siblings = config.folders.filter(f => f.parentId === folder.parentId && f.id !== folderId);
        if (siblings.some(f => f.name === trimmedName)) {
            throw new Error('A folder with this name already exists');
        }
        
        // Update folder name
        folder.name = trimmedName;
        
        // Save configuration
        await this.updateConfiguration(config);
        
        // Emit specific folder update event
        this._onDidChangeCustomizations.fire({
            type: 'folder',
            operation: 'update',
            affectedIds: [folderId]
        });
    }

    /**
     * Deletes a folder and optionally moves contained clusters to root or removes them.
     * 
     * @param folderId - Folder to delete
     * @param moveToRoot - If true, move contained clusters to root; if false, delete contained clusters
     * @returns Promise that resolves when the folder has been deleted
     * @throws Error if folder not found
     */
    async deleteFolder(folderId: string, moveToRoot: boolean = true): Promise<void> {
        const config = await this.getConfiguration();
        
        // Find folder by ID
        const folder = config.folders.find(f => f.id === folderId);
        if (!folder) {
            throw new Error('Folder not found');
        }
        
        // Collect all child folder IDs recursively
        const childFolderIds = this.getChildFolderIds(folderId, config);
        const allFolderIdsToDelete = [folderId, ...childFolderIds];
        
        // Handle clusters in deleted folders
        if (moveToRoot) {
            // Move clusters to root (set folderId to null)
            for (const [, cluster] of Object.entries(config.clusters)) {
                if (cluster.folderId && allFolderIdsToDelete.includes(cluster.folderId)) {
                    cluster.folderId = null;
                }
            }
        } else {
            // Remove cluster configs for clusters in deleted folders
            for (const [contextName, cluster] of Object.entries(config.clusters)) {
                if (cluster.folderId && allFolderIdsToDelete.includes(cluster.folderId)) {
                    delete config.clusters[contextName];
                }
            }
        }
        
        // Remove all folders (deleted folder + all child folders)
        config.folders = config.folders.filter(f => !allFolderIdsToDelete.includes(f.id));
        
        // Save configuration
        await this.updateConfiguration(config);
        
        // Emit specific folder delete event with all affected folder IDs
        this._onDidChangeCustomizations.fire({
            type: 'folder',
            operation: 'delete',
            affectedIds: allFolderIdsToDelete
        });
    }

    /**
     * Calculates the nesting depth of a folder by traversing the parent chain.
     * 
     * @param folderId - Folder ID or null for root level
     * @param config - Current configuration
     * @returns Nesting depth (0 for root level)
     */
    private getNestingDepth(folderId: string | null, config: ClusterCustomizationConfig): number {
        if (folderId === null) {
            return 0; // Root level
        }
        
        const folder = config.folders.find(f => f.id === folderId);
        if (!folder) {
            return 0; // Folder not found, treat as root
        }
        
        return 1 + this.getNestingDepth(folder.parentId, config);
    }

    /**
     * Recursively collects all descendant folder IDs for a given folder.
     * 
     * @param folderId - Parent folder ID
     * @param config - Current configuration
     * @returns Array of all descendant folder IDs
     */
    private getChildFolderIds(folderId: string, config: ClusterCustomizationConfig): string[] {
        const childIds: string[] = [];
        const children = config.folders.filter(f => f.parentId === folderId);
        
        for (const child of children) {
            childIds.push(child.id);
            childIds.push(...this.getChildFolderIds(child.id, config));
        }
        
        return childIds;
    }

    /**
     * Calculates the next order value for a folder within its parent.
     * 
     * @param parentId - Parent folder ID or null for root level
     * @param config - Current configuration
     * @returns Next order value (0-indexed)
     */
    private getNextOrder(parentId: string | null, config: ClusterCustomizationConfig): number {
        const siblings = config.folders.filter(f => f.parentId === parentId);
        if (siblings.length === 0) {
            return 0;
        }
        return Math.max(...siblings.map(f => f.order)) + 1;
    }

    /**
     * Exports the current configuration as a pretty-printed JSON string.
     * 
     * @returns Promise resolving to JSON string representation of the configuration
     */
    async exportConfiguration(): Promise<string> {
        const config = await this.getConfiguration();
        return JSON.stringify(config, null, 2);
    }

    /**
     * Imports configuration from a JSON string.
     * Parses the JSON, validates the schema, and merges with existing configuration (imported takes precedence).
     * 
     * @param jsonString - JSON string representation of the configuration to import
     * @returns Promise that resolves when the import is complete
     * @throws Error if JSON is invalid or schema validation fails
     */
    async importConfiguration(jsonString: string): Promise<void> {
        // Parse JSON
        let importedConfig: ClusterCustomizationConfig;
        try {
            importedConfig = JSON.parse(jsonString);
        } catch (error) {
            throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Validate schema version
        if (!importedConfig.version || typeof importedConfig.version !== 'string') {
            throw new Error('Invalid configuration: missing or invalid version field');
        }

        // Validate structure
        if (!importedConfig.folders || !Array.isArray(importedConfig.folders)) {
            throw new Error('Invalid configuration: folders must be an array');
        }

        if (!importedConfig.clusters || typeof importedConfig.clusters !== 'object') {
            throw new Error('Invalid configuration: clusters must be an object');
        }

        // Validate folders
        const folderIds = new Set<string>();
        for (const folder of importedConfig.folders) {
            if (!folder.id || typeof folder.id !== 'string') {
                throw new Error('Invalid folder: missing or invalid id field');
            }
            if (!folder.name || typeof folder.name !== 'string' || folder.name.trim().length === 0) {
                throw new Error(`Invalid folder ${folder.id}: name cannot be empty`);
            }
            if (typeof folder.order !== 'number' || folder.order < 0) {
                throw new Error(`Invalid folder ${folder.id}: order must be a non-negative number`);
            }
            if (folderIds.has(folder.id)) {
                throw new Error(`Invalid configuration: duplicate folder ID ${folder.id}`);
            }
            folderIds.add(folder.id);
        }

        // Validate folder parent references
        for (const folder of importedConfig.folders) {
            if (folder.parentId !== null && !folderIds.has(folder.parentId)) {
                throw new Error(`Invalid folder ${folder.id}: references non-existent parent ${folder.parentId}`);
            }
        }

        // Validate clusters
        for (const [contextName, cluster] of Object.entries(importedConfig.clusters)) {
            if (cluster.alias !== null && cluster.alias !== undefined && typeof cluster.alias !== 'string') {
                throw new Error(`Invalid cluster ${contextName}: alias must be a string or null`);
            }
            if (cluster.alias && cluster.alias.length > 100) {
                throw new Error(`Invalid cluster ${contextName}: alias must be 100 characters or less`);
            }
            if (typeof cluster.hidden !== 'boolean') {
                throw new Error(`Invalid cluster ${contextName}: hidden must be a boolean`);
            }
            if (typeof cluster.order !== 'number' || cluster.order < 0) {
                throw new Error(`Invalid cluster ${contextName}: order must be a non-negative number`);
            }
            if (cluster.folderId !== null && cluster.folderId !== undefined && !folderIds.has(cluster.folderId)) {
                throw new Error(`Invalid cluster ${contextName}: references non-existent folder ${cluster.folderId}`);
            }
        }

        // Get existing configuration
        const existingConfig = await this.getConfiguration();

        // Merge configurations (imported takes precedence)
        const mergedConfig: ClusterCustomizationConfig = {
            version: importedConfig.version,
            folders: [...importedConfig.folders],
            clusters: {
                ...existingConfig.clusters,
                ...importedConfig.clusters
            }
        };

        // Save merged configuration
        await this.updateConfiguration(mergedConfig);
    }

    /**
     * Disposes of resources used by this service.
     * Should be called when the extension is deactivated.
     */
    dispose(): void {
        this._onDidChangeCustomizations.dispose();
    }
}

