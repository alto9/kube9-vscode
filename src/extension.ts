import * as vscode from 'vscode';
import { GlobalState } from './state/GlobalState';
import { WelcomeWebview } from './webview/WelcomeWebview';
import { NamespaceWebview } from './webview/NamespaceWebview';
import { DataCollectionReportPanel } from './webview/DataCollectionReportPanel';
import { KubeconfigParser } from './kubernetes/KubeconfigParser';
import { ClusterTreeProvider } from './tree/ClusterTreeProvider';
import { Settings } from './config/Settings';
import { configureApiKeyCommand } from './commands/ConfigureApiKey';
import { setActiveNamespaceCommand } from './commands/namespaceCommands';
import { showDeleteConfirmation } from './commands/deleteResource';
import { namespaceWatcher } from './services/namespaceCache';
import { NamespaceStatusBar } from './ui/statusBar';
import { YAMLEditorManager, ResourceIdentifier } from './yaml/YAMLEditorManager';
import { Kube9YAMLFileSystemProvider } from './yaml/Kube9YAMLFileSystemProvider';
import { ClusterTreeItem } from './tree/ClusterTreeItem';
import { OperatorStatusClient } from './services/OperatorStatusClient';
import { OperatorStatusMode } from './kubernetes/OperatorStatusTypes';
import { FreeDashboardPanel } from './dashboard/FreeDashboardPanel';
import { OperatedDashboardPanel } from './dashboard/OperatedDashboardPanel';

/**
 * Global extension context accessible to all components.
 * Initialized during activation.
 */
let extensionContext: vscode.ExtensionContext | undefined;

/**
 * Array to track all disposables for proper cleanup.
 */
const disposables: vscode.Disposable[] = [];

/**
 * Global cluster tree provider instance.
 * Accessible for refreshing the tree view when cluster data changes.
 */
let clusterTreeProvider: ClusterTreeProvider | undefined;

/**
 * Status bar item showing authentication status.
 * Displays API key configuration status for AI features.
 */
let authStatusBarItem: vscode.StatusBarItem | undefined;

/**
 * Status bar item showing current kubectl namespace.
 * Displays the active namespace or "All" if no namespace is set.
 */
let namespaceStatusBar: NamespaceStatusBar | undefined;

/**
 * Global YAML editor manager instance.
 * Manages YAML editor instances for Kubernetes resources.
 */
let yamlEditorManager: YAMLEditorManager | undefined;

/**
 * Get the extension context.
 * @returns The extension context
 * @throws Error if context has not been initialized
 */
export function getExtensionContext(): vscode.ExtensionContext {
    if (!extensionContext) {
        throw new Error('Extension context has not been initialized');
    }
    return extensionContext;
}

/**
 * Get the cluster tree provider instance.
 * @returns The cluster tree provider
 * @throws Error if tree provider has not been initialized
 */
export function getClusterTreeProvider(): ClusterTreeProvider {
    if (!clusterTreeProvider) {
        throw new Error('Cluster tree provider has not been initialized');
    }
    return clusterTreeProvider;
}

/**
 * Get the YAML editor manager instance.
 * @returns The YAML editor manager
 * @throws Error if YAML editor manager has not been initialized
 */
export function getYAMLEditorManager(): YAMLEditorManager {
    if (!yamlEditorManager) {
        throw new Error('YAMLEditorManager not initialized');
    }
    return yamlEditorManager;
}

/**
 * This method is called when the extension is activated.
 * The extension is activated when VS Code starts up (onStartupFinished).
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    try {
        console.log('kube9 extension is activating...');
        
        // Store context globally for access by other components
        extensionContext = context;
        
        // Initialize global state management
        GlobalState.initialize(context);
        
        // Parse kubeconfig to discover available clusters
        // This is non-blocking and will gracefully handle missing/invalid configs
        const kubeconfig = await KubeconfigParser.parseKubeconfig();
        console.log(`Kubeconfig parsing completed. Found ${kubeconfig.clusters.length} cluster(s).`);
        
        // Register commands first before populating the tree
        // This ensures commands are available when tree items are clicked
        registerCommands();
        
        // Initialize and register tree view provider
        clusterTreeProvider = new ClusterTreeProvider();
        const treeViewDisposable = vscode.window.registerTreeDataProvider(
            'kube9ClusterView',
            clusterTreeProvider
        );
        context.subscriptions.push(treeViewDisposable);
        disposables.push(treeViewDisposable);
        console.log('Cluster tree view registered successfully.');
        
        // Pass parsed kubeconfig to tree provider to populate clusters
        clusterTreeProvider.setKubeconfig(kubeconfig);
        
        // Create and show status bar item for authentication status
        createAuthStatusBarItem();
        
        // Create and show status bar item for namespace context
        await createNamespaceStatusBarItem();
        
        // Initialize YAML editor manager
        yamlEditorManager = new YAMLEditorManager(context);
        disposables.push(yamlEditorManager);
        console.log('YAML editor manager initialized successfully.');
        
        // Register custom file system provider for kube9-yaml:// URI scheme
        const yamlFsProvider = new Kube9YAMLFileSystemProvider();
        
        // Wire up editor manager for permission checks during save operations
        yamlFsProvider.setEditorManager(yamlEditorManager);
        
        const yamlFsProviderDisposable = vscode.workspace.registerFileSystemProvider(
            'kube9-yaml',
            yamlFsProvider,
            { isCaseSensitive: true, isReadonly: false }
        );
        context.subscriptions.push(yamlFsProviderDisposable);
        disposables.push(yamlFsProviderDisposable);
        console.log('YAML file system provider registered successfully.');
        
        // Show welcome screen on first activation
        const globalState = GlobalState.getInstance();
        if (!globalState.getWelcomeScreenDismissed()) {
            WelcomeWebview.show(context);
        }
        
        // Start watching for external namespace context changes
        namespaceWatcher.startWatching();
        console.log('Namespace context watcher started.');
        
        // Subscribe to external context changes to notify webviews
        const contextChangeSubscription = namespaceWatcher.onDidChangeContext(async (state) => {
            console.log('External context change detected, notifying webviews...', state);
            // Notify all open webview panels of the external change
            await NamespaceWebview.notifyAllPanelsOfContextChange(
                state.currentNamespace || null,
                'external'
            );
        });
        context.subscriptions.push(contextChangeSubscription);
        
        console.log('kube9 extension activated successfully!');
        
        // TODO: Initialize extension components
        // - Configuration manager
        // - Kubernetes client
        // - AI integration
        // - Tree view providers
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to activate kube9 extension:', errorMessage);
        vscode.window.showErrorMessage(
            `kube9 extension failed to activate: ${errorMessage}`
        );
        throw error;
    }
}

/**
 * Extract the Kubernetes kind from a context value string.
 * Handles the 'resource:Kind' pattern used in tree items.
 * 
 * @param contextValue The context value string (e.g., 'resource:Pod')
 * @returns The extracted kind (e.g., 'Pod')
 */
function extractKindFromContextValue(contextValue: string | undefined): string {
    if (!contextValue) {
        return 'Unknown';
    }
    // Extract kind from 'resource:Pod' → 'Pod'
    const parts = contextValue.split(':');
    return parts.length > 1 ? parts[1] : contextValue;
}

/**
 * Get the API version for a given Kubernetes resource kind.
 * Maps common Kubernetes resource kinds to their appropriate API versions.
 * 
 * @param kind The Kubernetes resource kind (e.g., 'Deployment', 'Pod')
 * @returns The API version for that kind (e.g., 'apps/v1', 'v1')
 */
function getApiVersionForKind(kind: string): string {
    // Map Kubernetes kinds to their API versions
    const apiVersionMap: { [key: string]: string } = {
        'Deployment': 'apps/v1',
        'StatefulSet': 'apps/v1',
        'DaemonSet': 'apps/v1',
        'Pod': 'v1',
        'Service': 'v1',
        'ConfigMap': 'v1',
        'Secret': 'v1',
        'Namespace': 'v1',
        'Node': 'v1',
        'PersistentVolume': 'v1',
        'PersistentVolumeClaim': 'v1',
        'StorageClass': 'storage.k8s.io/v1',
        'CronJob': 'batch/v1'
    };
    return apiVersionMap[kind] || 'v1';
}

/**
 * Create and initialize the authentication status bar item.
 * Shows current API key configuration status and provides quick access to settings.
 */
function createAuthStatusBarItem(): void {
    const context = getExtensionContext();
    const hasApiKey = Settings.hasApiKey();
    
    // Create status bar item on the right side
    authStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100 // Priority - higher values appear more to the left
    );
    
    // Set text and icon based on API key status
    if (hasApiKey) {
        authStatusBarItem.text = '$(check) kube9: Authenticated';
        authStatusBarItem.tooltip = 'API key configured. AI-powered recommendations are available.\n\nClick to manage API key settings.';
    } else {
        authStatusBarItem.text = '$(key) kube9: No API Key';
        authStatusBarItem.tooltip = 'No API key configured. AI features require authentication.\n\nCore cluster management works without an API key.\n\nClick to configure your API key.';
    }
    
    // Make it clickable to open settings
    authStatusBarItem.command = 'kube9.configureApiKey';
    
    // Show the status bar item
    authStatusBarItem.show();
    
    // Add to disposables for cleanup
    context.subscriptions.push(authStatusBarItem);
    disposables.push(authStatusBarItem);
}

/**
 * Create and initialize the namespace status bar item.
 * Shows current kubectl namespace context with automatic updates on context changes.
 */
async function createNamespaceStatusBarItem(): Promise<void> {
    try {
        const context = getExtensionContext();
        
        // Create and initialize the namespace status bar
        namespaceStatusBar = new NamespaceStatusBar(context);
        await namespaceStatusBar.initialize();
        
        console.log('Namespace status bar created successfully.');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to create namespace status bar:', errorMessage);
        // Don't throw - status bar is a non-critical feature
    }
}

/**
 * Register all extension commands.
 * Commands are tracked in the disposables array for proper cleanup.
 */
function registerCommands(): void {
    const context = getExtensionContext();
    
    // Register configure API key command
    const configureApiKeyCmd = vscode.commands.registerCommand(
        'kube9.configureApiKey',
        configureApiKeyCommand
    );
    context.subscriptions.push(configureApiKeyCmd);
    disposables.push(configureApiKeyCmd);
    
    // Register refresh clusters command
    const refreshClustersCommand = vscode.commands.registerCommand('kube9.refreshClusters', async () => {
        try {
            console.log('Refreshing clusters from kubeconfig...');
            
            // Show progress indicator
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Refreshing clusters...',
                    cancellable: false
                },
                async () => {
                    // Re-parse kubeconfig
                    const kubeconfig = await KubeconfigParser.parseKubeconfig();
                    console.log(`Kubeconfig refresh completed. Found ${kubeconfig.clusters.length} cluster(s).`);
                    
                    // Update tree provider with new data
                    if (clusterTreeProvider) {
                        clusterTreeProvider.setKubeconfig(kubeconfig);
                        // Force refresh operator status on manual refresh
                        clusterTreeProvider.refresh(true);
                    }
                }
            );
            
            vscode.window.showInformationMessage('Clusters refreshed successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to refresh clusters:', errorMessage);
            vscode.window.showErrorMessage(`Failed to refresh clusters: ${errorMessage}`);
        }
    });
    
    context.subscriptions.push(refreshClustersCommand);
    disposables.push(refreshClustersCommand);
    
    // Register open namespace command
    // Args: contextName, clusterName, namespace (undefined for "All Namespaces")
    const openNamespaceCommand = vscode.commands.registerCommand(
        'kube9.openNamespace', 
        async (contextName: string, clusterName: string, namespace?: string) => {
            try {
                console.log('Opening namespace webview:', {
                    contextName,
                    clusterName,
                    namespace: namespace || 'All Namespaces'
                });
                
                // Validate required parameters
                if (!contextName || !clusterName) {
                    console.error('Missing required parameters for openNamespace command');
                    vscode.window.showErrorMessage('Unable to open namespace: missing cluster information');
                    return;
                }
                
                // Show the namespace webview
                NamespaceWebview.show(context, {
                    clusterName,
                    contextName,
                    namespace
                });
                
                console.log(`Opened namespace webview: ${namespace || 'All Namespaces'} in ${clusterName}`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('Failed to open namespace webview:', errorMessage);
                vscode.window.showErrorMessage(`Failed to open namespace: ${errorMessage}`);
            }
        }
    );
    
    context.subscriptions.push(openNamespaceCommand);
    disposables.push(openNamespaceCommand);
    
    // Register open Data Collection report command
    const openDataCollectionReportCommand = vscode.commands.registerCommand(
        'kube9.openDataCollectionReport',
        async () => {
            try {
                console.log('Opening Data Collection report webview...');
                
                // Show the Data Collection report webview
                DataCollectionReportPanel.show(context);
                
                console.log('Opened Data Collection report webview');
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('Failed to open Data Collection report webview:', errorMessage);
                vscode.window.showErrorMessage(`Failed to open Data Collection report: ${errorMessage}`);
            }
        }
    );
    
    context.subscriptions.push(openDataCollectionReportCommand);
    disposables.push(openDataCollectionReportCommand);
    
    // Register set active namespace command
    const setActiveNamespaceCmd = vscode.commands.registerCommand(
        'kube9.setActiveNamespace',
        setActiveNamespaceCommand
    );
    context.subscriptions.push(setActiveNamespaceCmd);
    disposables.push(setActiveNamespaceCmd);
    
    // Register view resource YAML command
    const viewResourceYAMLCmd = vscode.commands.registerCommand(
        'kube9.viewResourceYAML',
        async (treeItem: ClusterTreeItem) => {
            try {
                // Extract resource information from tree item
                if (!treeItem || !treeItem.resourceData) {
                    throw new Error('Invalid tree item: missing resource data');
                }
                
                // Build ResourceIdentifier from tree item
                const resource: ResourceIdentifier = {
                    kind: extractKindFromContextValue(treeItem.contextValue),
                    name: treeItem.resourceData.resourceName || treeItem.label as string,
                    namespace: treeItem.resourceData.namespace,
                    apiVersion: getApiVersionForKind(extractKindFromContextValue(treeItem.contextValue)),
                    cluster: treeItem.resourceData.context.name
                };
                
                console.log('Opening YAML editor for resource:', resource);
                
                // Open YAML editor
                if (yamlEditorManager) {
                    await yamlEditorManager.openYAMLEditor(resource);
                } else {
                    throw new Error('YAML editor manager not initialized');
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('Failed to open YAML editor from tree view:', errorMessage);
                vscode.window.showErrorMessage(`Failed to open YAML editor: ${errorMessage}`);
            }
        }
    );
    context.subscriptions.push(viewResourceYAMLCmd);
    disposables.push(viewResourceYAMLCmd);
    
    // Register view resource YAML from palette command
    const viewResourceYAMLFromPaletteCmd = vscode.commands.registerCommand(
        'kube9.viewResourceYAMLFromPalette',
        async () => {
            try {
                // Dynamic import to avoid circular dependencies
                const { ResourceQuickPick } = await import('./yaml/ResourceQuickPick');
                
                console.log('Opening resource YAML quick pick...');
                
                // Execute quick pick flow
                const resource = await ResourceQuickPick.executeQuickPickFlow();
                
                // Check if user cancelled
                if (!resource) {
                    console.log('Resource selection cancelled by user');
                    return;
                }
                
                console.log('Opening YAML editor for resource:', resource);
                
                // Open YAML editor
                if (yamlEditorManager) {
                    await yamlEditorManager.openYAMLEditor(resource);
                } else {
                    throw new Error('YAML editor manager not initialized');
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('Failed to open YAML editor from palette:', errorMessage);
                vscode.window.showErrorMessage(`Failed to open YAML editor: ${errorMessage}`);
            }
        }
    );
    context.subscriptions.push(viewResourceYAMLFromPaletteCmd);
    disposables.push(viewResourceYAMLFromPaletteCmd);
    
    // Register delete resource command
    const deleteResourceCmd = vscode.commands.registerCommand(
        'kube9.deleteResource',
        async (treeItem: ClusterTreeItem) => {
            try {
                // Extract resource information from tree item
                if (!treeItem || !treeItem.resourceData) {
                    throw new Error('Invalid tree item: missing resource data');
                }
                
                // Extract resource type from contextValue (e.g., "Pod" from "resource:Pod")
                const resourceType = extractKindFromContextValue(treeItem.contextValue);
                
                // Extract resource name
                const resourceName = treeItem.resourceData.resourceName || treeItem.label as string;
                
                // Extract namespace
                const namespace = treeItem.resourceData.namespace;
                
                console.log('Delete resource command invoked:', {
                    resourceType,
                    resourceName,
                    namespace
                });
                
                // Show confirmation dialog
                const confirmation = await showDeleteConfirmation(
                    resourceType,
                    resourceName,
                    namespace
                );
                
                // If user confirmed deletion, log the options (actual deletion will be implemented in later stories)
                if (confirmation) {
                    console.log('User confirmed deletion:', confirmation);
                    // TODO: Implement actual deletion in later stories
                } else {
                    console.log('User cancelled deletion');
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('Failed to execute delete resource command:', errorMessage);
                vscode.window.showErrorMessage(`Failed to delete resource: ${errorMessage}`);
            }
        }
    );
    context.subscriptions.push(deleteResourceCmd);
    disposables.push(deleteResourceCmd);
    
    // Register open dashboard command
    const openDashboardCmd = vscode.commands.registerCommand(
        'kube9.openDashboard',
        async (treeItem: ClusterTreeItem) => {
            try {
                // Extract cluster information from tree item
                if (!treeItem || !treeItem.resourceData) {
                    throw new Error('Invalid tree item: missing resource data');
                }
                
                const clusterName = treeItem.resourceData.cluster.name;
                const contextName = treeItem.resourceData.context.name;
                
                console.log('Opening dashboard for cluster:', clusterName, 'context:', contextName);
                
                // Get kubeconfig path from the tree provider
                const treeProvider = getClusterTreeProvider();
                const kubeconfigPath = treeProvider.getKubeconfigPath();
                
                if (!kubeconfigPath) {
                    throw new Error('Kubeconfig path not available');
                }
                
                // Get operator status to determine dashboard type
                const operatorStatusClient = new OperatorStatusClient();
                const cachedStatus = await operatorStatusClient.getStatus(
                    kubeconfigPath,
                    contextName
                );
                
                console.log('Operator status:', cachedStatus.mode);
                
                // Open appropriate dashboard based on operator status
                if (cachedStatus.mode === OperatorStatusMode.Basic) {
                    // Open Free (Non-Operated) Dashboard
                    FreeDashboardPanel.show(
                        context,
                        kubeconfigPath,
                        contextName,
                        clusterName
                    );
                } else {
                    // Convert CachedOperatorStatus to OperatorDashboardStatus for dashboard
                    const operatorStatus = {
                        mode: cachedStatus.mode.toLowerCase() as 'basic' | 'operated' | 'enabled' | 'degraded',
                        hasApiKey: cachedStatus.status?.apiKeyConfigured || false,
                        tier: cachedStatus.status?.tier,
                        version: cachedStatus.status?.version,
                        health: cachedStatus.status?.health
                    };
                    
                    // Open Operated Dashboard with operator status
                    OperatedDashboardPanel.show(
                        context,
                        kubeconfigPath,
                        contextName,
                        clusterName,
                        operatorStatus
                    );
                }
                
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('Failed to open dashboard:', errorMessage);
                vscode.window.showErrorMessage(`Failed to open dashboard: ${errorMessage}`);
            }
        }
    );
    context.subscriptions.push(openDashboardCmd);
    disposables.push(openDashboardCmd);
}

/**
 * This method is called when the extension is deactivated.
 * Use this to clean up resources.
 */
export async function deactivate(): Promise<void> {
    console.log('kube9 extension is deactivating...');
    
    try {
        // Dispose of all tracked disposables
        for (const disposable of disposables) {
            try {
                disposable.dispose();
            } catch (error) {
                console.error('Error disposing resource:', error);
            }
        }
        disposables.length = 0;
        
        // Reset global state singleton
        GlobalState.reset();
        
        // Dispose tree provider and stop periodic refresh
        if (clusterTreeProvider) {
            clusterTreeProvider.dispose();
        }
        
        // Dispose YAML editor manager
        if (yamlEditorManager) {
            yamlEditorManager.dispose();
        }
        
        // Stop watching for namespace context changes
        namespaceWatcher.stopWatching();
        console.log('Namespace context watcher stopped.');
        
        // Dispose status bar items
        if (authStatusBarItem) {
            authStatusBarItem.dispose();
        }
        
        if (namespaceStatusBar) {
            namespaceStatusBar.dispose();
        }
        
        // Clear tree provider reference
        clusterTreeProvider = undefined;
        
        // Clear status bar item references
        authStatusBarItem = undefined;
        namespaceStatusBar = undefined;
        
        // Clear manager references
        yamlEditorManager = undefined;
        
        // Clear extension context
        extensionContext = undefined;
        
        console.log('kube9 extension deactivated successfully.');
        
        // TODO: Cleanup additional resources as they are added
        // - Close Kubernetes connections
        // - Save state
        // - Cleanup AI service connections
    } catch (error) {
        console.error('Error during deactivation:', error);
    }
}

