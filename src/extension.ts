import * as vscode from 'vscode';
import { GlobalState } from './state/GlobalState';
import { WelcomeWebview } from './webview/WelcomeWebview';
import { NamespaceWebview } from './webview/NamespaceWebview';
import { DescribeWebview } from './webview/DescribeWebview';
import { DataCollectionReportPanel } from './webview/DataCollectionReportPanel';
import { KubeconfigParser } from './kubernetes/KubeconfigParser';
import { ClusterTreeProvider } from './tree/ClusterTreeProvider';
import { setActiveNamespaceCommand } from './commands/namespaceCommands';
import { showDeleteConfirmation, executeKubectlDelete, DeleteResult, createCategoryTreeItemForRefresh } from './commands/deleteResource';
import { applyYAMLCommand } from './commands/applyYAML';
import { describeRawCommand } from './commands/describeRaw';
import { DescribeRawFileSystemProvider } from './commands/DescribeRawFileSystemProvider';
import { scaleWorkloadCommand } from './commands/scaleWorkload';
import { showRestartConfirmationDialog, applyRestartAnnotation, watchRolloutStatus } from './commands/restartWorkload';
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
        
        // Register custom file system provider for kube9-describe:// URI scheme
        const describeFsProvider = DescribeRawFileSystemProvider.getInstance();
        const describeFsProviderDisposable = vscode.workspace.registerFileSystemProvider(
            'kube9-describe',
            describeFsProvider,
            { isCaseSensitive: true, isReadonly: true }
        );
        context.subscriptions.push(describeFsProviderDisposable);
        disposables.push(describeFsProviderDisposable);
        console.log('Describe file system provider registered successfully.');
        
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
export function extractKindFromContextValue(contextValue: string | undefined): string {
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
    
    // Register describe resource command
    const describeResourceCmd = vscode.commands.registerCommand(
        'kube9.describeResource',
        async (treeItem: ClusterTreeItem | string | undefined) => {
            try {
                // Handle case where tree item might be passed as a string (ID) or undefined
                if (!treeItem) {
                    vscode.window.showErrorMessage('Unable to describe: no resource selected');
                    return;
                }

                // If treeItem is a string (ID), we can't proceed without the actual item
                if (typeof treeItem === 'string') {
                    console.error('Describe command received string instead of tree item:', treeItem);
                    vscode.window.showErrorMessage('Unable to describe: invalid resource reference');
                    return;
                }

                // Show the Describe webview
                DescribeWebview.showFromTreeItem(context, treeItem);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('Failed to open Describe webview:', errorMessage);
                vscode.window.showErrorMessage(`Failed to describe resource: ${errorMessage}`);
            }
        }
    );
    context.subscriptions.push(describeResourceCmd);
    disposables.push(describeResourceCmd);
    
    // Register describe resource (raw) command
    const describeRawCmd = vscode.commands.registerCommand(
        'kube9.describeResourceRaw',
        async (treeItem: ClusterTreeItem) => {
            await describeRawCommand(treeItem);
        }
    );
    context.subscriptions.push(describeRawCmd);
    disposables.push(describeRawCmd);
    
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
                
                // If user confirmed deletion, execute the deletion
                if (confirmation) {
                    // Get kubeconfig path from tree provider
                    const kubeconfigPath = getClusterTreeProvider().getKubeconfigPath();
                    if (!kubeconfigPath) {
                        throw new Error('Kubeconfig path not available');
                    }
                    
                    // Get context name from tree item
                    const contextName = treeItem.resourceData.context.name;
                    
                    // Execute deletion
                    const result: DeleteResult = await executeKubectlDelete(
                        confirmation,
                        kubeconfigPath,
                        contextName
                    );
                    
                    if (result.success) {
                        // Show success notification
                        const resourceDisplay = namespace
                            ? `${resourceType} '${resourceName}' in namespace '${namespace}'`
                            : `${resourceType} '${resourceName}'`;
                        const successMessage = confirmation.forceDelete
                            ? `Successfully force deleted ${resourceDisplay}`
                            : `Successfully deleted ${resourceDisplay}`;
                        vscode.window.showInformationMessage(successMessage);
                    }
                    
                    // Refresh tree view if indicated (for success or not found errors)
                    if (result.shouldRefresh) {
                        const treeProvider = getClusterTreeProvider();
                        
                        // Try selective refresh by refreshing only the affected category
                        // This preserves tree expansion state better than full refresh
                        const categoryItem = createCategoryTreeItemForRefresh(
                            resourceType,
                            treeItem.resourceData
                        );
                        
                        if (categoryItem) {
                            // Use selective refresh for the specific category
                            treeProvider.refreshItem(categoryItem);
                            console.log(`Selectively refreshed category for ${resourceType}`);
                        } else {
                            // Fall back to full refresh if category cannot be determined
                            treeProvider.refresh();
                            console.log(`Full tree refresh triggered for ${resourceType}`);
                        }
                    }
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
    
    // Register scale workload command
    const scaleWorkloadCmd = vscode.commands.registerCommand(
        'kube9.scaleWorkload',
        async (treeItem: ClusterTreeItem) => {
            try {
                await scaleWorkloadCommand(treeItem);
            } finally {
                // Refresh tree view after scaling (both success and error cases)
                // This ensures users see updated replica counts immediately
                if (clusterTreeProvider) {
                    clusterTreeProvider.refresh();
                }
                
                // Refresh namespace webviews if open for the scaled workload's namespace
                // This ensures webview workload tables show updated replica counts
                try {
                    const namespace = treeItem.resourceData?.namespace;
                    if (namespace) {
                        await NamespaceWebview.sendResourceUpdated(namespace);
                    }
                } catch (error) {
                    // Log error but don't block command completion
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`Failed to refresh namespace webviews after scaling: ${errorMessage}`);
                }
            }
        }
    );
    context.subscriptions.push(scaleWorkloadCmd);
    disposables.push(scaleWorkloadCmd);
    
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
    
    // Register apply YAML command
    const applyYAMLCmd = vscode.commands.registerCommand(
        'kube9.applyYAML',
        applyYAMLCommand
    );
    context.subscriptions.push(applyYAMLCmd);
    disposables.push(applyYAMLCmd);
    
    // Register restart workload command
    const restartWorkloadCmd = vscode.commands.registerCommand(
        'kube9.restartWorkload',
        async (treeItem: ClusterTreeItem) => {
            try {
                // Extract resource information from tree item
                if (!treeItem || !treeItem.resourceData) {
                    throw new Error('Invalid tree item: missing resource data');
                }
                
                // Extract resource information
                const resourceName = treeItem.resourceData.resourceName || treeItem.label as string;
                const namespace = treeItem.resourceData.namespace;
                const kind = extractKindFromContextValue(treeItem.contextValue);
                const contextName = treeItem.resourceData.context.name;
                
                console.log('Restart workload command invoked:', {
                    resourceName,
                    namespace,
                    kind,
                    contextName
                });
                
                // Show confirmation dialog
                const confirmation = await showRestartConfirmationDialog(resourceName);
                
                // If user cancelled, return early
                if (!confirmation) {
                    console.log('User cancelled restart operation');
                    return;
                }
                
                // Store waitForRollout for future implementation (stub for now)
                const waitForRollout = confirmation.waitForRollout;
                console.log('Restart confirmed:', {
                    resourceName,
                    waitForRollout
                });
                
                // Get kubeconfig path
                const treeProvider = getClusterTreeProvider();
                const kubeconfigPath = treeProvider.getKubeconfigPath();
                if (!kubeconfigPath) {
                    throw new Error('Kubeconfig path not available');
                }
                
                // Perform restart with progress notification
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Restarting ${resourceName}...`,
                    cancellable: false
                }, async (progress) => {
                    // Apply restart annotation
                    progress.report({ message: 'Applying restart annotation...' });
                    await applyRestartAnnotation(
                        resourceName,
                        namespace,
                        kind,
                        contextName,
                        kubeconfigPath
                    );
                    
                    // Watch rollout status if requested
                    if (waitForRollout) {
                        await watchRolloutStatus(
                            resourceName,
                            namespace,
                            kind,
                            contextName,
                            kubeconfigPath,
                            progress
                        );
                    }
                    
                    // Refresh tree view and namespace webviews after successful restart
                    try {
                        console.log(`Refreshing tree view and webviews for ${kind}/${resourceName}`);
                        
                        // Refresh tree view
                        treeProvider.refresh();
                        
                        // Refresh namespace webviews if namespace is available
                        if (namespace) {
                            await NamespaceWebview.sendResourceUpdated(namespace);
                        }
                        
                        console.log('Tree view and webviews refreshed successfully');
                    } catch (refreshError) {
                        // Log refresh errors but don't block success notification
                        const refreshErrorMessage = refreshError instanceof Error ? refreshError.message : String(refreshError);
                        console.error(`Failed to refresh UI after restart: ${refreshErrorMessage}`);
                    }
                });
                
                // Show success notification
                vscode.window.showInformationMessage(
                    `Restarted ${resourceName} successfully`
                );
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('Failed to execute restart workload command:', errorMessage);
                vscode.window.showErrorMessage(`Failed to restart workload: ${errorMessage}`);
            }
        }
    );
    context.subscriptions.push(restartWorkloadCmd);
    disposables.push(restartWorkloadCmd);
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
        if (namespaceStatusBar) {
            namespaceStatusBar.dispose();
        }
        
        // Clear tree provider reference
        clusterTreeProvider = undefined;
        
        // Clear status bar item reference
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

