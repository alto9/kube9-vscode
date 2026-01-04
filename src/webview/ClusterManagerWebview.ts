import * as vscode from 'vscode';
import { ClusterCustomizationService, ClusterCustomizationConfig } from '../services/ClusterCustomizationService';
import { KubeconfigParser, ParsedKubeconfig } from '../kubernetes/KubeconfigParser';
import { getHelpController } from '../extension';

/**
 * Message sent from webview to extension requesting cluster list.
 */
interface GetClustersMessage {
    type: 'getClusters';
}

/**
 * Message sent from webview to extension to set a cluster alias.
 */
interface SetAliasMessage {
    type: 'setAlias';
    data: {
        contextName: string;
        alias: string | null;
    };
}

/**
 * Message sent from webview to extension to toggle cluster visibility.
 */
interface ToggleVisibilityMessage {
    type: 'toggleVisibility';
    data: {
        contextName: string;
        hidden: boolean;
    };
}

/**
 * Message sent from webview to extension to create a folder.
 */
interface CreateFolderMessage {
    type: 'createFolder';
    data: {
        name: string;
        parentId: string | null;
    };
}

/**
 * Message sent from webview to extension to move a cluster to a folder.
 */
interface MoveClusterMessage {
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
interface RenameFolderMessage {
    type: 'renameFolder';
    data: {
        folderId: string;
        newName: string;
    };
}

/**
 * Message sent from webview to extension to delete a folder.
 */
interface DeleteFolderMessage {
    type: 'deleteFolder';
    data: {
        folderId: string;
        moveToRoot: boolean;
    };
}

/**
 * Message sent from webview to extension to export configuration.
 */
interface ExportConfigurationMessage {
    type: 'exportConfiguration';
}

/**
 * Message sent from webview to extension to import configuration.
 */
interface ImportConfigurationMessage {
    type: 'importConfiguration';
}

/**
 * Message sent from webview to extension to open contextual help.
 */
interface OpenHelpMessage {
    type: 'openHelp';
    context?: string;
}

/**
 * Message sent from extension to webview with initialization data.
 */
interface InitializeMessage {
    type: 'initialize';
    data: {
        clusters: Array<{
            contextName: string;
            clusterName: string;
            clusterServer: string;
            isActive: boolean;
        }>;
        customizations: ClusterCustomizationConfig;
        theme: 'light' | 'dark';
    };
}

/**
 * Message sent from extension to webview when customizations are updated.
 */
interface CustomizationsUpdatedMessage {
    type: 'customizationsUpdated';
    data: ClusterCustomizationConfig;
}

/**
 * Message sent from extension to webview with an error.
 */
interface ErrorMessage {
    type: 'error';
    message: string;
}

/**
 * Message sent from extension to webview when theme changes.
 */
interface ThemeChangedMessage {
    type: 'themeChanged';
    data: {
        theme: 'light' | 'dark';
    };
}

/**
 * Message sent from webview to extension to reorder a folder.
 */
interface ReorderFolderMessage {
    type: 'reorderFolder';
    data: {
        folderId: string;
        newParentId: string | null;
        newOrder: number;
    };
}

/**
 * Message sent from webview to extension to reorder a cluster.
 */
interface ReorderClusterMessage {
    type: 'reorderCluster';
    data: {
        contextName: string;
        newOrder: number;
    };
}

/**
 * Union type for all webview messages from webview to extension.
 */
type WebviewToExtensionMessage = GetClustersMessage | SetAliasMessage | ToggleVisibilityMessage | CreateFolderMessage | MoveClusterMessage | RenameFolderMessage | DeleteFolderMessage | ExportConfigurationMessage | ImportConfigurationMessage | OpenHelpMessage | ReorderFolderMessage | ReorderClusterMessage;

/**
 * Union type for all webview messages from extension to webview.
 */
type WebviewFromExtensionMessage = InitializeMessage | CustomizationsUpdatedMessage | ErrorMessage | ThemeChangedMessage;

/**
 * Union type for all webview messages.
 */
type WebviewMessage = WebviewToExtensionMessage | WebviewFromExtensionMessage;

/**
 * ClusterManagerWebview manages the webview panel for the Cluster Manager interface.
 * Uses singleton pattern to ensure only one instance can be open at a time.
 */
export class ClusterManagerWebview {
    /**
     * The single Cluster Manager webview panel instance.
     * Undefined when no panel is open.
     */
    private static currentPanel: ClusterManagerWebview | undefined;

    /**
     * The VS Code webview panel instance.
     */
    public readonly panel: vscode.WebviewPanel;

    /**
     * Service for managing cluster customizations.
     */
    private readonly customizationService: ClusterCustomizationService;

    /**
     * Extension context for accessing kubeconfig.
     */
    private readonly extensionContext: vscode.ExtensionContext;

    /**
     * Extension URI for loading resources.
     */
    private readonly extensionUri: vscode.Uri;

    /**
     * Disposables for event listeners and subscriptions.
     */
    private readonly disposables: vscode.Disposable[] = [];

    /**
     * Create or show the Cluster Manager webview panel.
     * If a panel already exists, reveals it. Otherwise creates a new one.
     * 
     * @param extensionUri - The extension URI for loading resources
     * @param customizationService - Service for managing cluster customizations
     * @param extensionContext - Extension context for accessing kubeconfig
     * @returns The ClusterManagerWebview instance
     */
    public static createOrShow(
        extensionUri: vscode.Uri,
        customizationService: ClusterCustomizationService,
        extensionContext: vscode.ExtensionContext
    ): ClusterManagerWebview {
        if (ClusterManagerWebview.currentPanel) {
            ClusterManagerWebview.currentPanel.panel.reveal();
            return ClusterManagerWebview.currentPanel;
        }

        return new ClusterManagerWebview(extensionUri, customizationService, extensionContext);
    }

    /**
     * Private constructor to enforce singleton pattern.
     * Creates a new webview panel with placeholder content.
     * 
     * @param extensionUri - The extension URI for loading resources (will be used for loading React assets in future stories)
     * @param customizationService - Service for managing cluster customizations
     * @param extensionContext - Extension context for accessing kubeconfig
     */
    private constructor(
        extensionUri: vscode.Uri,
        customizationService: ClusterCustomizationService,
        extensionContext: vscode.ExtensionContext
    ) {
        this.extensionUri = extensionUri;
        this.customizationService = customizationService;
        this.extensionContext = extensionContext;

        // Create webview panel
        this.panel = vscode.window.createWebviewPanel(
            'kube9.clusterManager',
            'Cluster Organizer',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'dist', 'media', 'cluster-manager'),
                    vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode', 'codicons')
                ]
            }
        );

        // Set HTML content
        this.panel.webview.html = ClusterManagerWebview.getWebviewContent(
            this.panel.webview,
            extensionUri
        );

        // Set up message handler
        const messageDisposable = this.panel.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                await this.handleMessage(message);
            },
            undefined,
            []
        );
        this.disposables.push(messageDisposable);

        // Set up event listener for customization changes
        const customizationDisposable = this.customizationService.onDidChangeCustomizations(
            async () => {
                const config = await this.customizationService.getConfiguration();
                const updateMessage: CustomizationsUpdatedMessage = {
                    type: 'customizationsUpdated',
                    data: config
                };
                this.panel.webview.postMessage(updateMessage);
            }
        );
        this.disposables.push(customizationDisposable);

        // Set up event listener for theme changes
        const themeDisposable = vscode.window.onDidChangeActiveColorTheme((e) => {
            const newTheme = e.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light';
            const themeMessage: ThemeChangedMessage = {
                type: 'themeChanged',
                data: { theme: newTheme }
            };
            this.panel.webview.postMessage(themeMessage);
        });
        this.disposables.push(themeDisposable);

        // Handle panel disposal to clear singleton reference and dispose resources
        const panelDisposable = this.panel.onDidDispose(
            () => {
                ClusterManagerWebview.currentPanel = undefined;
                // Dispose all resources
                vscode.Disposable.from(...this.disposables).dispose();
            },
            null,
            []
        );
        this.disposables.push(panelDisposable);

        // Store this instance as the current panel
        ClusterManagerWebview.currentPanel = this;
    }

    /**
     * Handle messages received from the webview.
     * 
     * @param message - The message received from the webview
     */
    private async handleMessage(message: WebviewMessage): Promise<void> {
        try {
            if (message.type === 'openHelp') {
                await getHelpController().openContextualHelp(message.context || 'cluster-manager');
            } else if (message.type === 'getClusters') {
                await this.handleGetClusters();
            } else if (message.type === 'setAlias') {
                await this.handleSetAlias(message.data.contextName, message.data.alias);
            } else if (message.type === 'toggleVisibility') {
                await this.handleToggleVisibility(message.data.contextName, message.data.hidden);
            } else if (message.type === 'createFolder') {
                await this.handleCreateFolder(message.data.name, message.data.parentId);
            } else if (message.type === 'moveCluster') {
                await this.handleMoveCluster(message.data.contextName, message.data.folderId, message.data.order);
            } else if (message.type === 'renameFolder') {
                await this.handleRenameFolder(message.data.folderId, message.data.newName);
            } else if (message.type === 'deleteFolder') {
                await this.handleDeleteFolder(message.data.folderId, message.data.moveToRoot);
            } else if (message.type === 'exportConfiguration') {
                await this.handleExportConfiguration();
            } else if (message.type === 'importConfiguration') {
                await this.handleImportConfiguration();
            } else if (message.type === 'reorderFolder') {
                await this.handleReorderFolder(message.data.folderId, message.data.newParentId, message.data.newOrder);
            } else if (message.type === 'reorderCluster') {
                await this.handleReorderCluster(message.data.contextName, message.data.newOrder);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error handling webview message:', errorMessage);
            // Send error message to webview
            const errorMsg: ErrorMessage = {
                type: 'error',
                message: errorMessage
            };
            this.panel.webview.postMessage(errorMsg);
        }
    }

    /**
     * Handle setAlias message by updating the cluster alias.
     * 
     * @param contextName - The kubeconfig context name of the cluster
     * @param alias - The friendly name to assign, or null to remove the alias
     */
    private async handleSetAlias(contextName: string, alias: string | null): Promise<void> {
        try {
            await this.customizationService.setAlias(contextName, alias);
            // The event listener will automatically send customizationsUpdated message
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error setting alias:', errorMessage);
            // Could send error message to webview here if needed
        }
    }

    /**
     * Handle toggleVisibility message by updating the cluster visibility.
     * 
     * @param contextName - The kubeconfig context name of the cluster
     * @param hidden - Whether the cluster should be hidden from tree view
     */
    private async handleToggleVisibility(contextName: string, hidden: boolean): Promise<void> {
        try {
            await this.customizationService.setVisibility(contextName, hidden);
            // The event listener will automatically send customizationsUpdated message
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error toggling visibility:', errorMessage);
            // Could send error message to webview here if needed
        }
    }

    /**
     * Handle createFolder message by creating a new folder.
     * 
     * @param name - The folder name
     * @param parentId - The parent folder ID, or null for root level
     */
    private async handleCreateFolder(name: string, parentId: string | null): Promise<void> {
        try {
            await this.customizationService.createFolder(name, parentId);
            // The event listener will automatically send customizationsUpdated message
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error creating folder:', errorMessage);
            // Send error message back to webview
            const errorMsg: ErrorMessage = {
                type: 'error',
                message: errorMessage
            };
            this.panel.webview.postMessage(errorMsg);
        }
    }

    /**
     * Handle moveCluster message by moving a cluster to a folder.
     * 
     * @param contextName - The kubeconfig context name of the cluster
     * @param folderId - The folder ID to move to, or null for root level
     * @param order - The display order within the folder
     */
    private async handleMoveCluster(contextName: string, folderId: string | null, order: number): Promise<void> {
        try {
            await this.customizationService.moveCluster(contextName, folderId, order);
            // The event listener will automatically send customizationsUpdated message
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error moving cluster:', errorMessage);
            // Could send error message to webview here if needed
        }
    }

    /**
     * Handle renameFolder message by renaming a folder.
     * 
     * @param folderId - The folder ID to rename
     * @param newName - The new folder name
     */
    private async handleRenameFolder(folderId: string, newName: string): Promise<void> {
        try {
            await this.customizationService.renameFolder(folderId, newName);
            // The event listener will automatically send customizationsUpdated message
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error renaming folder:', errorMessage);
            // Send error message back to webview
            const errorMsg: ErrorMessage = {
                type: 'error',
                message: errorMessage
            };
            this.panel.webview.postMessage(errorMsg);
        }
    }

    /**
     * Handle deleteFolder message by deleting a folder.
     * 
     * @param folderId - The folder ID to delete
     * @param moveToRoot - Whether to move clusters to root or delete them
     */
    private async handleDeleteFolder(folderId: string, moveToRoot: boolean): Promise<void> {
        try {
            await this.customizationService.deleteFolder(folderId, moveToRoot);
            // The event listener will automatically send customizationsUpdated message
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error deleting folder:', errorMessage);
            // Send error message back to webview
            const errorMsg: ErrorMessage = {
                type: 'error',
                message: errorMessage
            };
            this.panel.webview.postMessage(errorMsg);
        }
    }

    /**
     * Handle exportConfiguration message by exporting configuration to a JSON file.
     */
    private async handleExportConfiguration(): Promise<void> {
        try {
            // Get configuration as JSON string
            const jsonString = await this.customizationService.exportConfiguration();

            // Show save dialog
            const uri = await vscode.window.showSaveDialog({
                filters: { 'JSON': ['json'] },
                defaultUri: vscode.Uri.file('kube9-cluster-config.json')
            });

            if (!uri) {
                // User cancelled
                return;
            }

            // Write file
            await vscode.workspace.fs.writeFile(uri, Buffer.from(jsonString, 'utf-8'));

            // Show success notification
            vscode.window.showInformationMessage('Configuration exported successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error exporting configuration:', errorMessage);
            vscode.window.showErrorMessage(`Failed to export configuration: ${errorMessage}`);
            // Send error message to webview
            const errorMsg: ErrorMessage = {
                type: 'error',
                message: errorMessage
            };
            this.panel.webview.postMessage(errorMsg);
        }
    }

    /**
     * Handle importConfiguration message by importing configuration from a JSON file.
     */
    private async handleImportConfiguration(): Promise<void> {
        try {
            // Show open dialog
            const uris = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: { 'JSON': ['json'] },
                openLabel: 'Import Configuration'
            });

            if (!uris || uris.length === 0) {
                // User cancelled
                return;
            }

            const uri = uris[0];

            // Read file
            const fileData = await vscode.workspace.fs.readFile(uri);
            const jsonString = Buffer.from(fileData).toString('utf-8');

            // Import configuration
            await this.customizationService.importConfiguration(jsonString);

            // The event listener will automatically send customizationsUpdated message
            // Show success notification
            vscode.window.showInformationMessage('Configuration imported successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error importing configuration:', errorMessage);
            vscode.window.showErrorMessage(`Failed to import configuration: ${errorMessage}`);
            // Send error message to webview
            const errorMsg: ErrorMessage = {
                type: 'error',
                message: errorMessage
            };
            this.panel.webview.postMessage(errorMsg);
        }
    }

    /**
     * Handle getClusters message by sending initialize message with cluster data.
     */
    private async handleGetClusters(): Promise<void> {
        try {
            // Parse kubeconfig
            const kubeconfig = await KubeconfigParser.parseKubeconfig();

            // Get customizations
            const customizations = await this.customizationService.getConfiguration();

            // Get current theme
            const theme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
                ? 'dark'
                : 'light';

            // Format clusters array
            const clusters = this.formatClusters(kubeconfig);

            // Send initialize message
            const initializeMessage: InitializeMessage = {
                type: 'initialize',
                data: {
                    clusters,
                    customizations,
                    theme
                }
            };

            this.panel.webview.postMessage(initializeMessage);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error getting clusters:', errorMessage);
            
            // Send initialize message with empty data on error
            const initializeMessage: InitializeMessage = {
                type: 'initialize',
                data: {
                    clusters: [],
                    customizations: {
                        version: '1.0',
                        folders: [],
                        clusters: {}
                    },
                    theme: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
                        ? 'dark'
                        : 'light'
                }
            };
            this.panel.webview.postMessage(initializeMessage);
        }
    }

    /**
     * Handle reorderFolder message by reordering a folder.
     * 
     * @param folderId - The folder ID to reorder
     * @param newParentId - The new parent folder ID, or null for root level
     * @param newOrder - The new display order
     */
    private async handleReorderFolder(folderId: string, newParentId: string | null, newOrder: number): Promise<void> {
        try {
            const config = await this.customizationService.getConfiguration();
            
            // Find the folder to reorder
            const folderIndex = config.folders.findIndex(f => f.id === folderId);
            if (folderIndex === -1) {
                throw new Error(`Folder ${folderId} not found`);
            }
            
            const folder = config.folders[folderIndex];
            const oldParentId = folder.parentId;
            
            // Update folder's parentId and order
            folder.parentId = newParentId;
            folder.order = newOrder;
            
            // Renumber siblings in old parent
            if (oldParentId !== newParentId) {
                const oldSiblings = config.folders.filter(f => f.parentId === oldParentId && f.id !== folderId);
                oldSiblings.sort((a, b) => a.order - b.order);
                oldSiblings.forEach((f, index) => {
                    f.order = index;
                });
            }
            
            // Renumber siblings in new parent
            const newSiblings = config.folders.filter(f => f.parentId === newParentId && f.id !== folderId);
            newSiblings.sort((a, b) => a.order - b.order);
            
            // Insert at new position and renumber
            newSiblings.splice(newOrder, 0, folder);
            newSiblings.forEach((f, index) => {
                f.order = index;
            });
            
            await this.customizationService.updateConfiguration(config);
            // The event listener will automatically send customizationsUpdated message
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error reordering folder:', errorMessage);
            const errorMsg: ErrorMessage = {
                type: 'error',
                message: errorMessage
            };
            this.panel.webview.postMessage(errorMsg);
        }
    }

    /**
     * Handle reorderCluster message by reordering a cluster within its current folder.
     * 
     * @param contextName - The kubeconfig context name of the cluster
     * @param newOrder - The new display order
     */
    private async handleReorderCluster(contextName: string, newOrder: number): Promise<void> {
        try {
            const config = await this.customizationService.getConfiguration();
            
            // Get or create cluster config
            if (!config.clusters[contextName]) {
                config.clusters[contextName] = {
                    alias: null,
                    hidden: false,
                    folderId: null,
                    order: 0
                };
            }
            
            const clusterConfig = config.clusters[contextName];
            const folderId = clusterConfig.folderId;
            
            // Update cluster's order
            clusterConfig.order = newOrder;
            
            // Renumber siblings in same folder
            const siblings = Object.entries(config.clusters)
                .filter(([name, cfg]) => cfg.folderId === folderId && name !== contextName)
                .map(([name, cfg]) => ({ name, config: cfg }));
            
            siblings.sort((a, b) => a.config.order - b.config.order);
            
            // Insert at new position and renumber
            siblings.splice(newOrder, 0, { name: contextName, config: clusterConfig });
            siblings.forEach(({ name }, index) => {
                config.clusters[name].order = index;
            });
            
            await this.customizationService.updateConfiguration(config);
            // The event listener will automatically send customizationsUpdated message
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error reordering cluster:', errorMessage);
            const errorMsg: ErrorMessage = {
                type: 'error',
                message: errorMessage
            };
            this.panel.webview.postMessage(errorMsg);
        }
    }

    /**
     * Format clusters from ParsedKubeconfig to the required format.
     * 
     * @param kubeconfig - The parsed kubeconfig
     * @returns Formatted clusters array
     */
    private formatClusters(kubeconfig: ParsedKubeconfig): Array<{
        contextName: string;
        clusterName: string;
        clusterServer: string;
        isActive: boolean;
    }> {
        return kubeconfig.contexts.map(context => {
            // Find the corresponding cluster data
            const cluster = kubeconfig.clusters.find(c => c.name === context.cluster);
            
            // Skip if cluster data is missing (invalid kubeconfig)
            if (!cluster) {
                console.warn(`Context ${context.name} references non-existent cluster ${context.cluster}`);
                return null;
            }

            return {
                contextName: context.name,
                clusterName: cluster.name,
                clusterServer: cluster.server,
                isActive: context.name === kubeconfig.currentContext
            };
        }).filter((item): item is {
            contextName: string;
            clusterName: string;
            clusterServer: string;
            isActive: boolean;
        } => item !== null);
    }

    /**
     * Generate the HTML content for the Cluster Manager webview.
     * Loads the React bundle and sets up the webview.
     * 
     * @param webview - The webview instance
     * @param extensionUri - The extension URI for loading resources
     * @returns HTML content string
     */
    private static getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        // Get the URI for the React bundle
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'dist', 'media', 'cluster-manager', 'index.js')
        );

        // Get codicons CSS URI
        const codiconsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'; font-src ${webview.cspSource};">
    <link rel="stylesheet" href="${codiconsUri}">
    <title>Cluster Organizer</title>
</head>
<body>
    <div id="root"></div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }
}

