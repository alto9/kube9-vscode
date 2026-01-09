import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getHelpController } from '../extension';
import { WebviewHelpHandler } from './WebviewHelpHandler';
import { HelmService } from '../services/HelmService';
import { HelmError } from '../services/HelmError';
import { KubeconfigParser } from '../kubernetes/KubeconfigParser';
import { WebviewToExtensionMessage, ExtensionToWebviewMessage, InstallParams, ListReleasesParams, UpgradeParams, UIState } from './helm-package-manager/types';
import { ClusterConnectivity } from '../kubernetes/ClusterConnectivity';
import { getContextInfo } from '../utils/kubectlContext';

/**
 * Cache entry with TTL support.
 */
interface CacheEntry {
    data: unknown;
    timestamp: number;
    ttl: number;
}

/**
 * HelmPackageManagerPanel manages a webview panel for the Helm Package Manager.
 * Uses singleton pattern to ensure only one instance can be open at a time.
 */
export class HelmPackageManagerPanel {
    /**
     * The single shared webview panel instance.
     * Reused for all Helm Package Manager actions.
     */
    private static currentPanel: HelmPackageManagerPanel | undefined;
    
    /**
     * Extension context stored for later use.
     */
    private static extensionContext: vscode.ExtensionContext | undefined;

    /**
     * HelmService instance for executing Helm commands.
     */
    private readonly helmService: HelmService;

    /**
     * The VS Code webview panel instance.
     */
    private readonly panel: vscode.WebviewPanel;

    /**
     * Disposables for event listeners and subscriptions.
     */
    private readonly disposables: vscode.Disposable[] = [];

    /**
     * In-memory cache with TTL support.
     */
    private readonly cache: Map<string, CacheEntry> = new Map();

    /**
     * Current Kubernetes context name for cache invalidation.
     */
    private currentContextName: string | undefined;

    /**
     * The active polling interval, or null if not running.
     */
    private pollingInterval: NodeJS.Timeout | null = null;

    /**
     * Polling interval in milliseconds (30 seconds).
     */
    private readonly POLL_INTERVAL_MS = 30000;

    /**
     * Create or show the Helm Package Manager webview panel.
     * If a panel already exists, reveals it. Otherwise creates a new one.
     * 
     * @param context The VS Code extension context
     * @param clusterContextName Optional cluster context name to display in the panel title
     */
    public static createOrShow(context: vscode.ExtensionContext, clusterContextName?: string): void {
        // Store the extension context for later use
        HelmPackageManagerPanel.extensionContext = context;

        // Build panel title with cluster context if provided
        const panelTitle = clusterContextName 
            ? `Helm Package Manager - ${clusterContextName}`
            : 'Helm Package Manager';

        // If we already have a panel, update its title if context changed and reveal it
        if (HelmPackageManagerPanel.currentPanel) {
            // Update title if context name is provided and different
            if (clusterContextName && HelmPackageManagerPanel.currentPanel.panel.title !== panelTitle) {
                HelmPackageManagerPanel.currentPanel.panel.title = panelTitle;
            }
            HelmPackageManagerPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'helmPackageManager',
            panelTitle,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'media'),
                    vscode.Uri.joinPath(context.extensionUri, 'dist')
                ]
            }
        );

        HelmPackageManagerPanel.currentPanel = new HelmPackageManagerPanel(panel, context);
    }

    /**
     * Private constructor to enforce singleton pattern.
     * Creates a new webview panel with HTML content and sets up message handlers.
     * 
     * @param panel The webview panel instance
     * @param context The VS Code extension context
     */
    private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
        this.panel = panel;

        // Initialize HelmService with kubeconfig path
        const kubeconfigPath = KubeconfigParser.getKubeconfigPath();
        this.helmService = new HelmService(kubeconfigPath);

        // Initialize current context name
        this.initializeContextTracking();

        // Set the webview's HTML content
        this.panel.webview.html = HelmPackageManagerPanel.getWebviewContent(this.panel.webview, context);

        // Set up message handling
        this.setWebviewMessageListeners(context);

        // Set up help message handling
        const helpHandler = new WebviewHelpHandler(getHelpController());
        helpHandler.setupHelpMessageHandler(this.panel.webview);

        // Set up polling based on webview visibility
        const viewStateDisposable = this.panel.onDidChangeViewState(
            (e) => {
                if (e.webviewPanel.visible) {
                    this.startPolling();
                } else {
                    this.stopPolling();
                }
            },
            null,
            context.subscriptions
        );
        this.disposables.push(viewStateDisposable);

        // Start initial polling if panel is visible
        if (this.panel.visible) {
            this.startPolling();
        }

        // Handle panel disposal - clear shared state
        this.panel.onDidDispose(
            () => {
                this.stopPolling();
                HelmPackageManagerPanel.currentPanel = undefined;
                // Dispose all resources
                vscode.Disposable.from(...this.disposables).dispose();
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Set up bidirectional message handling between extension and webview.
     * 
     * @param context The extension context
     */
    private setWebviewMessageListeners(context: vscode.ExtensionContext): void {
        const messageDisposable = this.panel.webview.onDidReceiveMessage(
            async (message: WebviewToExtensionMessage) => {
                try {
                    switch (message.command) {
                        case 'listRepositories':
                            await this.handleListRepositories();
                            break;

                        case 'addRepository':
                            if (message.name && message.url) {
                                await this.handleAddRepository(message.name, message.url);
                            } else {
                                this.sendError('Repository name and URL are required');
                            }
                            break;

                        case 'updateRepository':
                            if (message.name) {
                                await this.handleUpdateRepository(message.name);
                            } else {
                                this.sendError('Repository name is required');
                            }
                            break;

                        case 'removeRepository':
                            if (message.name) {
                                await this.handleRemoveRepository(message.name);
                            } else {
                                this.sendError('Repository name is required');
                            }
                            break;

                        case 'searchCharts':
                            if (message.query !== undefined) {
                                await this.handleSearchCharts(message.query, message.repository);
                            } else {
                                this.sendError('Search query is required');
                            }
                            break;

                        case 'getChartDetails':
                            if (message.chart) {
                                await this.handleGetChartDetails(message.chart);
                            } else {
                                this.sendError('Chart name is required');
                            }
                            break;

                        case 'getNamespaces':
                            await this.handleGetNamespaces();
                            break;

                        case 'installChart':
                            if (message.params) {
                                await this.handleInstallChart(message.params as InstallParams);
                            } else {
                                this.sendError('Installation parameters are required');
                            }
                            break;

                        case 'listReleases':
                            await this.handleListReleases(message.params as ListReleasesParams | undefined);
                            break;

                        case 'getReleaseDetails':
                            if (message.name && message.namespace) {
                                await this.handleGetReleaseDetails(message.name, message.namespace);
                            } else {
                                this.sendError('Release name and namespace are required');
                            }
                            break;

                        case 'getUpgradeInfo':
                            if (message.name && message.namespace && message.chart) {
                                await this.handleGetUpgradeInfo(message.name, message.namespace, message.chart);
                            } else {
                                this.sendError('Release name, namespace, and chart are required');
                            }
                            break;

                        case 'upgradeRelease':
                            if (message.params) {
                                await this.handleUpgradeRelease(message.params as UpgradeParams);
                            } else {
                                this.sendError('Upgrade parameters are required');
                            }
                            break;

                        case 'rollbackRelease':
                            if (message.name && message.namespace && message.revision !== undefined) {
                                await this.handleRollbackRelease(message.name, message.namespace, message.revision);
                            } else {
                                this.sendError('Release name, namespace, and revision are required');
                            }
                            break;

                        case 'uninstallRelease':
                            if (message.name && message.namespace) {
                                await this.handleUninstallRelease(message.name, message.namespace);
                            } else {
                                this.sendError('Release name and namespace are required');
                            }
                            break;

                        case 'copyValue': {
                            const copyValue = message.value || message.content;
                            if (copyValue) {
                                await this.handleCopyValue(copyValue);
                            }
                            break;
                        }

                        case 'ready':
                            // Webview is ready, restore UI state and load initial data
                            await this.handleReady();
                            break;

                        case 'getOperatorStatus':
                            await this.handleGetOperatorStatus();
                            break;

                        case 'installOperator':
                            if (message.params) {
                                await this.handleInstallOperator(message.params as InstallParams);
                            } else {
                                this.sendError('Installation parameters are required');
                            }
                            break;

                        case 'openExternalLink':
                            if (message.url) {
                                await this.handleOpenExternalLink(message.url);
                            } else {
                                this.sendError('URL is required');
                            }
                            break;

                        case 'ensureKube9Repository':
                            await this.handleEnsureKube9Repository();
                            break;

                        case 'saveUIState':
                            if (message.uiState) {
                                await this.handleSaveUIState(message.uiState);
                            }
                            break;

                        case 'logError':
                            // Handle error logging from React error boundary
                            if (message.error) {
                                console.error('[React Error Boundary]', {
                                    error: message.error,
                                    stack: message.stack
                                });
                            }
                            break;

                        default:
                            console.log('Helm Package Manager received unknown message:', message);
                    }
                } catch (error) {
                    console.error('Error handling message:', error);
                    // Convert to HelmError if possible, otherwise use as-is
                    if (error instanceof HelmError) {
                        this.sendError(error);
                    } else {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        this.sendError(errorMessage);
                    }
                }
            },
            null,
            context.subscriptions
        );
        this.disposables.push(messageDisposable);
    }

    /**
     * Get cached data or fetch and cache it.
     * 
     * @param key Cache key
     * @param fetcher Function to fetch data if not cached or expired
     * @param ttl Time to live in milliseconds (default: 5 minutes)
     * @returns Cached or freshly fetched data
     */
    private async getCached<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttl: number = 300000 // 5 minutes
    ): Promise<T> {
        const cached = this.cache.get(key);
        const now = Date.now();

        if (cached && (now - cached.timestamp < cached.ttl)) {
            return cached.data as T;
        }

        const data = await fetcher();
        this.cache.set(key, { data, timestamp: now, ttl });
        return data;
    }

    /**
     * Invalidate cache entries matching a pattern.
     * 
     * @param pattern Pattern to match against cache keys
     */
    private invalidateCache(pattern: string): void {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cache entries.
     */
    private clearCache(): void {
        this.cache.clear();
    }

    /**
     * Save UI state to workspace storage.
     * 
     * @param state UI state to save
     */
    private async saveState(state: UIState): Promise<void> {
        if (HelmPackageManagerPanel.extensionContext) {
            await HelmPackageManagerPanel.extensionContext.workspaceState.update('helm.uiState', state);
        }
    }

    /**
     * Restore UI state from workspace storage.
     * 
     * @returns Restored UI state or undefined if none exists
     */
    private async restoreState(): Promise<UIState | undefined> {
        if (HelmPackageManagerPanel.extensionContext) {
            return HelmPackageManagerPanel.extensionContext.workspaceState.get<UIState>('helm.uiState');
        }
        return undefined;
    }

    /**
     * Initialize context tracking and check for context changes.
     */
    private async initializeContextTracking(): Promise<void> {
        try {
            const contextInfo = await getContextInfo();
            const newContextName = contextInfo.contextName;

            // If context changed, clear cache
            if (this.currentContextName && this.currentContextName !== newContextName) {
                this.clearCache();
            }

            this.currentContextName = newContextName;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to initialize context tracking:', errorMessage);
        }
    }

    /**
     * Check for context changes and clear cache if needed.
     */
    private async checkContextChange(): Promise<void> {
        try {
            const contextInfo = await getContextInfo();
            const newContextName = contextInfo.contextName;

            if (this.currentContextName && this.currentContextName !== newContextName) {
                this.clearCache();
            }

            this.currentContextName = newContextName;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to check context change:', errorMessage);
        }
    }

    /**
     * Check if Helm is available and can connect to the cluster.
     * 
     * @returns Object with availability status and optional error message
     */
    private async checkHelmAvailability(): Promise<{ available: boolean; error?: string; errorInfo?: { type: string; suggestion?: string; retryable: boolean } }> {
        try {
            // Try a simple Helm command that doesn't require cluster access
            await this.helmService.executeCommand(['version', '--short'], { timeout: 5000 });
            
            // Try a command that requires cluster access to verify connectivity
            try {
                await this.helmService.listReleases({ allNamespaces: false, namespace: 'default' });
                return { available: true };
            } catch (clusterError) {
                // If it's a kubeconfig/connectivity error, Helm is installed but can't connect
                if (clusterError instanceof HelmError && clusterError.type === 'KUBECONFIG_ERROR') {
                    return { 
                        available: false, 
                        error: 'Helm is installed but cannot connect to the Kubernetes cluster.',
                        errorInfo: {
                            type: 'KUBECONFIG_ERROR',
                            suggestion: clusterError.suggestion || 'Check your kubeconfig and cluster connectivity. The extension cannot function without Helm connectivity.',
                            retryable: true
                        }
                    };
                }
                // Other errors might be transient, assume Helm is available
                return { available: true };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found') || errorMessage.includes('CLI_NOT_FOUND')) {
                return { 
                    available: false, 
                    error: 'Helm CLI is not installed or not found in PATH.',
                    errorInfo: {
                        type: 'CLI_NOT_FOUND',
                        suggestion: 'Please install Helm 3.x from https://helm.sh/docs/intro/install/. The Helm Package Manager requires Helm to function.',
                        retryable: false
                    }
                };
            }
            return { 
                available: false, 
                error: `Helm is not available: ${errorMessage}`,
                errorInfo: {
                    type: 'UNKNOWN',
                    suggestion: 'Please ensure Helm 3.x is installed and can connect to your Kubernetes cluster.',
                    retryable: true
                }
            };
        }
    }

    /**
     * Handle ready command - restore UI state and load initial data.
     */
    private async handleReady(): Promise<void> {
        // Check if Helm is available first
        const helmCheck = await this.checkHelmAvailability();
        if (!helmCheck.available) {
            this.sendMessage({
                type: 'error',
                error: helmCheck.error || 'Helm is not available',
                errorInfo: helmCheck.errorInfo ? {
                    type: helmCheck.errorInfo.type,
                    message: helmCheck.error || 'Helm is not available',
                    suggestion: helmCheck.errorInfo.suggestion,
                    retryable: helmCheck.errorInfo.retryable
                } : {
                    type: 'UNKNOWN',
                    message: helmCheck.error || 'Helm is not available',
                    suggestion: 'Please ensure Helm 3.x is installed and can connect to your Kubernetes cluster.',
                    retryable: true
                }
            });
            return;
        }

        // Check for context changes
        await this.checkContextChange();

        // Restore UI state
        const restoredState = await this.restoreState();
        if (restoredState) {
            this.sendMessage({
                type: 'uiStateRestored',
                data: restoredState
            });
        }

        // Load initial repository list and operator status
        await this.handleListRepositories();
        await this.handleGetOperatorStatus();
    }

    /**
     * Handle saveUIState command.
     * 
     * @param uiState UI state to save
     */
    private async handleSaveUIState(uiState: UIState): Promise<void> {
        await this.saveState(uiState);
    }

    /**
     * Handle listRepositories command.
     */
    private async handleListRepositories(): Promise<void> {
        try {
            const repositories = await this.getCached(
                'repositories',
                () => this.helmService.listRepositories(),
                300000 // 5 minutes
            );
            this.sendMessage({
                type: 'repositoriesLoaded',
                data: repositories
            });
        } catch (error) {
            console.error('Failed to list repositories:', error);
            if (error instanceof HelmError) {
                this.sendError(error);
            } else {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.sendError(`Failed to list repositories: ${errorMessage}`);
            }
        }
    }

    /**
     * Handle addRepository command.
     * 
     * @param name Repository name
     * @param url Repository URL
     */
    private async handleAddRepository(name: string, url: string): Promise<void> {
        try {
            // Validate input
            const validation = this.helmService.validateRepositoryInput(name, url);
            if (!validation.valid) {
                this.sendError(validation.errors.join(', '));
                return;
            }

            // Check if repository already exists
            const existing = await this.helmService.listRepositories();
            if (existing.some(r => r.name === name)) {
                this.sendError(`Repository '${name}' already exists`);
                return;
            }

            // Add repository
            await this.helmService.addRepository(name, url);

            // Invalidate cache
            this.invalidateCache('repositories');

            // Refresh repository list
            const updated = await this.helmService.listRepositories();
            this.sendMessage({
                type: 'repositoriesLoaded',
                data: updated
            });

            // Show success notification
            vscode.window.showInformationMessage(`Repository '${name}' added successfully`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Check for duplicate repository error
            if (errorMessage.includes('already exists')) {
                this.sendError(`Repository '${name}' already exists`);
            } else {
                this.sendError(`Failed to add repository: ${errorMessage}`);
            }
        }
    }

    /**
     * Handle updateRepository command.
     * 
     * @param name Repository name
     */
    private async handleUpdateRepository(name: string): Promise<void> {
        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Updating repository '${name}'...`,
                    cancellable: false
                },
                async () => {
                    await this.helmService.updateRepository(name);
                }
            );

            // Invalidate cache
            this.invalidateCache('repositories');

            // Refresh repository list
            const updated = await this.helmService.listRepositories();
            this.sendMessage({
                type: 'repositoriesLoaded',
                data: updated
            });

            // Show success notification
            vscode.window.showInformationMessage(`Repository '${name}' updated successfully`);
        } catch (error) {
            console.error('Failed to update repository:', error);
            if (error instanceof HelmError) {
                this.sendError(error);
            } else {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.sendError(`Failed to update repository: ${errorMessage}`);
            }
        }
    }

    /**
     * Handle removeRepository command.
     * 
     * @param name Repository name
     */
    private async handleRemoveRepository(name: string): Promise<void> {
        try {
            await this.helmService.removeRepository(name);

            // Invalidate cache
            this.invalidateCache('repositories');

            // Refresh repository list
            const updated = await this.helmService.listRepositories();
            this.sendMessage({
                type: 'repositoriesLoaded',
                data: updated
            });

            // Show success notification
            vscode.window.showInformationMessage(`Repository '${name}' removed successfully`);
        } catch (error) {
            console.error('Failed to remove repository:', error);
            if (error instanceof HelmError) {
                this.sendError(error);
            } else {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.sendError(`Failed to remove repository: ${errorMessage}`);
            }
        }
    }

    /**
     * Handle searchCharts command.
     * 
     * @param query Search query string
     * @param repository Optional repository name to filter by
     */
    private async handleSearchCharts(query: string, repository?: string): Promise<void> {
        try {
            const results = await this.helmService.searchCharts(query, repository);
            
            // Always send results, even if empty (empty array is valid)
            this.sendMessage({
                type: 'chartSearchResults',
                data: results
            });
        } catch (error) {
            console.error('Failed to search charts:', error);
            if (error instanceof HelmError) {
                this.sendError(error);
            } else {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.sendError(`Failed to search charts: ${errorMessage}`);
            }
        }
    }

    /**
     * Handle getChartDetails command.
     * 
     * @param chart Chart name (e.g., "bitnami/postgresql")
     */
    private async handleGetChartDetails(chart: string): Promise<void> {
        try {
            const details = await this.helmService.getChartDetails(chart);
            
            this.sendMessage({
                type: 'chartDetails',
                data: details
            });
        } catch (error) {
            console.error('Failed to get chart details:', error);
            if (error instanceof HelmError) {
                this.sendError(error);
            } else {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.sendError(`Failed to get chart details: ${errorMessage}`);
            }
        }
    }

    /**
     * Handle getNamespaces command.
     * Fetches available namespaces from the current Kubernetes context.
     */
    private async handleGetNamespaces(): Promise<void> {
        try {
            // Get current context information
            const contextInfo = await getContextInfo();
            const kubeconfigPath = KubeconfigParser.getKubeconfigPath();
            
            // Fetch namespaces using ClusterConnectivity
            const result = await ClusterConnectivity.getNamespaces(
                kubeconfigPath,
                contextInfo.contextName
            );
            
            // Extract namespace names
            const namespaceNames = result.namespaces;
            
            // Send namespaces to webview
            this.sendMessage({
                type: 'namespacesLoaded',
                data: namespaceNames
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to get namespaces:', errorMessage);
            
            // Send empty array on error (webview will show default)
            this.sendMessage({
                type: 'namespacesLoaded',
                data: []
            });
        }
    }

    /**
     * Handle installChart command.
     * Installs a Helm chart with progress feedback and error handling.
     * 
     * @param params Installation parameters
     */
    private async handleInstallChart(params: InstallParams): Promise<void> {
        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Installing ${params.releaseName}...`,
                    cancellable: false
                },
                async (progress) => {
                    progress.report({ message: 'Preparing installation...' });

                    try {
                        await this.helmService.installChart(params);
                        progress.report({ message: 'Installation complete!' });

                        vscode.window.showInformationMessage(
                            `Successfully installed ${params.releaseName}`
                        );

                        // Invalidate releases cache
                        this.invalidateCache('releases');

                        // Refresh releases list if listReleases handler exists
                        // For now, send a message to trigger refresh in webview
                        this.sendMessage({
                            type: 'operationComplete',
                            operation: 'installChart',
                            success: true,
                            message: `Successfully installed ${params.releaseName}`
                        });
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        vscode.window.showErrorMessage(`Installation failed: ${errorMessage}`);
                        this.sendMessage({
                            type: 'operationError',
                            operation: 'installChart',
                            error: errorMessage
                        });
                        throw error; // Re-throw to trigger outer catch
                    }
                }
            );
        } catch (error) {
            // Error already handled in withProgress callback
            // This catch ensures the error doesn't propagate further
        }
    }

    /**
     * Send a message to the webview.
     * 
     * @param message Message to send
     */
    private sendMessage(message: ExtensionToWebviewMessage): void {
        this.panel.webview.postMessage(message);
    }

    /**
     * Handle listReleases command.
     * 
     * @param params Optional parameters for listing releases
     */
    private async handleListReleases(params?: ListReleasesParams): Promise<void> {
        try {
            const listParams: ListReleasesParams = params || {
                allNamespaces: true
            };
            
            // Build cache key based on namespace filter
            const cacheKey = listParams.allNamespaces 
                ? 'releases:all' 
                : `releases:${listParams.namespace || 'default'}`;
            
            const releases = await this.getCached(
                cacheKey,
                () => this.helmService.listReleases(listParams),
                300000 // 5 minutes
            );
            
            this.sendMessage({
                type: 'releasesLoaded',
                data: releases
            });
            
            // Invalidate operator status cache and refresh status when releases change
            await this.helmService.invalidateOperatorStatusCache();
            await this.handleGetOperatorStatus();
        } catch (error) {
            console.error('Failed to list releases:', error);
            if (error instanceof HelmError) {
                this.sendError(error);
            } else {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.sendError(`Failed to list releases: ${errorMessage}`);
            }
        }
    }

    /**
     * Start automatic polling for release status updates.
     * Polls every 30 seconds when the webview is visible.
     */
    private startPolling(): void {
        // Don't start if already polling
        if (this.pollingInterval) {
            return;
        }

        this.pollingInterval = setInterval(async () => {
            try {
                await this.refreshReleases();
            } catch (error) {
                console.error('Polling error:', error);
                // Continue polling even on errors
            }
        }, this.POLL_INTERVAL_MS);
    }

    /**
     * Stop automatic polling for release status updates.
     */
    private stopPolling(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Refresh releases data by invalidating cache and fetching fresh data.
     * Used by polling to get up-to-date release status.
     */
    private async refreshReleases(): Promise<void> {
        try {
            // Invalidate releases cache to get fresh data
            this.invalidateCache('releases');

            // Fetch fresh releases data
            const listParams: ListReleasesParams = {
                allNamespaces: true
            };

            const releases = await this.helmService.listReleases(listParams);

            this.sendMessage({
                type: 'releasesLoaded',
                data: releases
            });

            // Invalidate operator status cache and refresh status when releases change
            await this.helmService.invalidateOperatorStatusCache();
            await this.handleGetOperatorStatus();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to refresh releases during polling:', errorMessage);
            // Don't send error to webview during polling - just log it
        }
    }

    /**
     * Handle getOperatorStatus command.
     * Fetches operator installation status and sends it to the webview.
     */
    private async handleGetOperatorStatus(): Promise<void> {
        try {
            const status = await this.helmService.getOperatorStatus();
            this.sendMessage({
                type: 'operatorStatusUpdated',
                data: status
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[HelmPackageManagerPanel] Failed to get operator status:', errorMessage);
            // Send default status on error
            this.sendMessage({
                type: 'operatorStatusUpdated',
                data: {
                    installed: false,
                    upgradeAvailable: false
                }
            });
        }
    }

    /**
     * Handle installOperator command.
     * Installs the Kube9 Operator with progress feedback and error handling.
     * 
     * @param params Installation parameters
     */
    private async handleInstallOperator(params: InstallParams): Promise<void> {
        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Installing Kube9 Operator...',
                    cancellable: false
                },
                async (progress) => {
                    // Step 1: Ensure repository (10%)
                    progress.report({ increment: 10, message: 'Ensuring kube9 repository...' });
                    this.sendMessage({
                        type: 'operationProgress',
                        operation: 'installOperator',
                        progress: 10
                    });
                    await this.helmService.ensureKube9Repository();

                    // Step 2: Update repository (20%)
                    progress.report({ increment: 10, message: 'Updating repository...' });
                    this.sendMessage({
                        type: 'operationProgress',
                        operation: 'installOperator',
                        progress: 20
                    });
                    await this.helmService.updateRepository('kube9');

                    // Step 2.5: Check for existing release (25%)
                    progress.report({ increment: 5, message: 'Checking for existing release...' });
                    this.sendMessage({
                        type: 'operationProgress',
                        operation: 'installOperator',
                        progress: 25
                    });
                    const existingReleases = await this.helmService.listReleases({ 
                        allNamespaces: true 
                    });
                    const existingRelease = existingReleases.find(r => 
                        r.name === params.releaseName && 
                        r.namespace === params.namespace
                    );

                    if (existingRelease) {
                        const errorMessage = `A release named '${params.releaseName}' already exists in namespace '${params.namespace}' with status '${existingRelease.status}'. Please uninstall it first before installing a new one.`;
                        vscode.window.showErrorMessage(errorMessage);
                        this.sendMessage({
                            type: 'operationError',
                            operation: 'installOperator',
                            error: errorMessage
                        });
                        throw new Error(errorMessage);
                    }

                    // Step 3: Install chart (30-80%)
                    progress.report({ increment: 5, message: 'Installing operator...' });
                    this.sendMessage({
                        type: 'operationProgress',
                        operation: 'installOperator',
                        progress: 30
                    });

                    try {
                        await this.helmService.installChart(params);
                        
                        // Step 4: Verify installation status (80-90%)
                        progress.report({ increment: 10, message: 'Verifying installation...' });
                        this.sendMessage({
                            type: 'operationProgress',
                            operation: 'installOperator',
                            progress: 80
                        });

                        // Wait a moment for Helm to update release status
                        await new Promise(resolve => setTimeout(resolve, 2000));

                        // Refresh releases list to check actual status
                        const releases = await this.helmService.listReleases({ allNamespaces: true });
                        this.sendMessage({
                            type: 'releasesLoaded',
                            data: releases
                        });

                        // Find the installed release and check its status
                        const installedRelease = releases.find(r => 
                            r.name === params.releaseName && 
                            r.namespace === params.namespace
                        );

                        // Step 5: Installation verification complete (100%)
                        progress.report({ increment: 10, message: 'Installation complete!' });
                        this.sendMessage({
                            type: 'operationProgress',
                            operation: 'installOperator',
                            progress: 100
                        });

                        // Check if release actually succeeded
                        if (!installedRelease) {
                            throw new Error('Release not found after installation');
                        }

                        if (installedRelease.status === 'failed') {
                            // Get release details to show the actual error
                            let errorDetails = 'Installation failed';
                            try {
                                const releaseDetails = await this.helmService.getReleaseDetails(
                                    params.releaseName,
                                    params.namespace
                                );
                                if (releaseDetails.description) {
                                    errorDetails = releaseDetails.description;
                                }
                            } catch {
                                // If we can't get details, use the status
                                errorDetails = `Release status: ${installedRelease.status}`;
                            }

                            vscode.window.showErrorMessage(`Operator installation failed: ${errorDetails}`);
                            this.sendMessage({
                                type: 'operationComplete',
                                operation: 'installOperator',
                                success: false,
                                message: errorDetails
                            });
                            throw new Error(errorDetails);
                        }

                        // Release is deployed successfully
                        const hasApiKey = params.values && params.values.includes('apiKey:');
                        const successMessage = hasApiKey
                            ? 'Kube9 Operator installed successfully! Pro features enabled!'
                            : 'Kube9 Operator installed successfully! Add an API key to enable Pro features.';

                        vscode.window.showInformationMessage(successMessage);
                        await this.handleGetOperatorStatus();

                        this.sendMessage({
                            type: 'operationComplete',
                            operation: 'installOperator',
                            success: true,
                            message: successMessage
                        });
                    } catch (error) {
                        // Handle HelmError with structured error info
                        if (error instanceof HelmError) {
                            const errorMessage = error.suggestion 
                                ? `${error.message}. ${error.suggestion}`
                                : error.message;
                            vscode.window.showErrorMessage(`Operator installation failed: ${errorMessage}`);
                            this.sendMessage({
                                type: 'operationError',
                                operation: 'installOperator',
                                error: errorMessage,
                                errorInfo: {
                                    message: error.message,
                                    type: error.type,
                                    suggestion: error.suggestion,
                                    retryable: error.retryable
                                }
                            });
                        } else {
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            vscode.window.showErrorMessage(`Operator installation failed: ${errorMessage}`);
                            this.sendMessage({
                                type: 'operationError',
                                operation: 'installOperator',
                                error: errorMessage
                            });
                        }
                        throw error; // Re-throw to trigger outer catch
                    }
                }
            );
        } catch (error) {
            // Error already handled in withProgress callback
            // This catch ensures the error doesn't propagate further
        }
    }

    /**
     * Handle openExternalLink command.
     * Opens a URL in the default browser.
     * 
     * @param url URL to open
     */
    private async handleOpenExternalLink(url: string): Promise<void> {
        try {
            await vscode.env.openExternal(vscode.Uri.parse(url));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to open external link:', errorMessage);
            vscode.window.showErrorMessage(`Failed to open link: ${errorMessage}`);
        }
    }

    /**
     * Handle ensureKube9Repository command.
     * Ensures the kube9 repository exists and is up to date.
     */
    private async handleEnsureKube9Repository(): Promise<void> {
        try {
            await this.helmService.ensureKube9Repository();
            // Optionally update the repository list
            await this.handleListRepositories();
        } catch (error) {
            console.error('Failed to ensure kube9 repository:', error);
            if (error instanceof HelmError) {
                this.sendError(error);
            } else {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.sendError(`Failed to ensure kube9 repository: ${errorMessage}`);
            }
        }
    }

    /**
     * Handle getReleaseDetails command.
     * 
     * @param name Release name
     * @param namespace Release namespace
     */
    private async handleGetReleaseDetails(name: string, namespace: string): Promise<void> {
        try {
            const details = await this.helmService.getReleaseDetails(name, namespace);
            this.sendMessage({
                type: 'releaseDetailsLoaded',
                data: details
            });
        } catch (error) {
            console.error('Failed to get release details:', error);
            if (error instanceof HelmError) {
                this.sendError(error);
            } else {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.sendError(`Failed to get release details: ${errorMessage}`);
            }
        }
    }

    /**
     * Handle copyValue command.
     * 
     * @param value Value to copy to clipboard
     */
    private async handleCopyValue(value: string): Promise<void> {
        try {
            await vscode.env.clipboard.writeText(value);
            vscode.window.showInformationMessage('Copied to clipboard');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to copy to clipboard:', errorMessage);
            vscode.window.showErrorMessage(`Failed to copy: ${errorMessage}`);
        }
    }

    /**
     * Handle getUpgradeInfo command.
     * Fetches upgrade information (current values and available versions) for a release.
     * 
     * @param releaseName Release name
     * @param namespace Release namespace
     * @param chart Chart name
     */
    private async handleGetUpgradeInfo(releaseName: string, namespace: string, chart: string): Promise<void> {
        try {
            const upgradeInfo = await this.helmService.getUpgradeInfo(releaseName, namespace, chart);
            
            this.sendMessage({
                type: 'upgradeInfoLoaded',
                data: upgradeInfo
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.sendMessage({
                type: 'operationError',
                operation: 'getUpgradeInfo',
                error: errorMessage
            });
        }
    }

    /**
     * Handle upgradeRelease command.
     * Upgrades a Helm release with progress feedback and error handling.
     * 
     * @param params Upgrade parameters
     */
    private async handleUpgradeRelease(params: UpgradeParams): Promise<void> {
        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Upgrading ${params.releaseName}...`,
                    cancellable: false
                },
                async (progress) => {
                    progress.report({ message: 'Preparing upgrade...' });

                    try {
                        await this.helmService.upgradeRelease(params);
                        progress.report({ message: 'Upgrade complete!' });

                        vscode.window.showInformationMessage(
                            `Successfully upgraded ${params.releaseName}`
                        );

                        // Invalidate releases cache
                        this.invalidateCache('releases');

                        // Refresh releases list
                        const releases = await this.helmService.listReleases({ allNamespaces: true });
                        this.sendMessage({
                            type: 'releasesLoaded',
                            data: releases
                        });

                        this.sendMessage({
                            type: 'operationComplete',
                            operation: 'upgradeRelease',
                            success: true,
                            message: `Successfully upgraded ${params.releaseName}`
                        });
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        vscode.window.showErrorMessage(`Upgrade failed: ${errorMessage}`);
                        this.sendMessage({
                            type: 'operationError',
                            operation: 'upgradeRelease',
                            error: errorMessage
                        });
                        throw error; // Re-throw to trigger outer catch
                    }
                }
            );
        } catch (error) {
            // Error already handled in withProgress callback
            // This catch ensures the error doesn't propagate further
        }
    }

    /**
     * Handle rollbackRelease command.
     * Rolls back a Helm release with progress feedback and error handling.
     * 
     * @param name Release name
     * @param namespace Release namespace
     * @param revision Revision number to rollback to
     */
    private async handleRollbackRelease(name: string, namespace: string, revision: number): Promise<void> {
        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Rolling back ${name}...`,
                    cancellable: false
                },
                async (progress) => {
                    progress.report({ message: 'Preparing rollback...' });

                    try {
                        await this.helmService.rollbackRelease(name, namespace, revision);
                        progress.report({ message: 'Rollback complete!' });

                        vscode.window.showInformationMessage(
                            `Successfully rolled back ${name} to revision ${revision}`
                        );

                        // Invalidate releases cache
                        this.invalidateCache('releases');

                        // Refresh releases list
                        const releases = await this.helmService.listReleases({ allNamespaces: true });
                        this.sendMessage({
                            type: 'releasesLoaded',
                            data: releases
                        });

                        this.sendMessage({
                            type: 'operationComplete',
                            operation: 'rollbackRelease',
                            success: true,
                            message: `Successfully rolled back ${name} to revision ${revision}`
                        });
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        vscode.window.showErrorMessage(`Rollback failed: ${errorMessage}`);
                        this.sendMessage({
                            type: 'operationError',
                            operation: 'rollbackRelease',
                            error: errorMessage
                        });
                        throw error; // Re-throw to trigger outer catch
                    }
                }
            );
        } catch (error) {
            // Error already handled in withProgress callback
            // This catch ensures the error doesn't propagate further
        }
    }

    /**
     * Handle uninstallRelease command.
     * Uninstalls a Helm release with progress feedback and error handling.
     * 
     * @param name Release name
     * @param namespace Release namespace
     */
    private async handleUninstallRelease(name: string, namespace: string): Promise<void> {
        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Uninstalling ${name}...`,
                    cancellable: false
                },
                async (progress) => {
                    progress.report({ message: 'Preparing uninstall...' });

                    try {
                        await this.helmService.uninstallRelease(name, namespace);
                        progress.report({ message: 'Uninstall complete!' });

                        vscode.window.showInformationMessage(
                            `Successfully uninstalled ${name}`
                        );

                        // Invalidate releases cache
                        this.invalidateCache('releases');

                        // Refresh releases list
                        const releases = await this.helmService.listReleases({ allNamespaces: true });
                        this.sendMessage({
                            type: 'releasesLoaded',
                            data: releases
                        });

                        this.sendMessage({
                            type: 'operationComplete',
                            operation: 'uninstallRelease',
                            success: true,
                            message: `Successfully uninstalled ${name}`
                        });
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        vscode.window.showErrorMessage(`Uninstall failed: ${errorMessage}`);
                        this.sendMessage({
                            type: 'operationError',
                            operation: 'uninstallRelease',
                            error: errorMessage
                        });
                        throw error; // Re-throw to trigger outer catch
                    }
                }
            );
        } catch (error) {
            // Error already handled in withProgress callback
            // This catch ensures the error doesn't propagate further
        }
    }

    /**
     * Send an error message to the webview.
     * 
     * @param errorMessage Error message
     */
    /**
     * Send error message to webview.
     * Supports both simple string errors and structured HelmError instances.
     * 
     * @param error Error message string or HelmError instance
     */
    private sendError(error: string | HelmError | Error): void {
        let errorMessage: string;
        let errorInfo: { message: string; type: string; suggestion?: string; retryable: boolean } | undefined;

        if (error instanceof HelmError) {
            errorMessage = error.message;
            errorInfo = {
                message: error.message,
                type: error.type,
                suggestion: error.suggestion,
                retryable: error.retryable
            };
        } else if (error instanceof Error) {
            errorMessage = error.message;
        } else {
            errorMessage = error;
        }

        this.sendMessage({
            type: errorInfo ? 'error' : 'operationError',
            error: errorMessage,
            errorInfo: errorInfo
        });
        
        // Show error notification in VS Code
        vscode.window.showErrorMessage(errorMessage);
    }

    /**
     * Generate the HTML content for the Helm Package Manager webview.
     * Loads React bundle from webpack build output.
     * 
     * @param webview The webview instance
     * @param context The extension context
     * @returns HTML content string
     */
    private static getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext): string {
        const cspSource = webview.cspSource;

        // Get React bundle URI
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(context.extensionUri, 'media', 'helm-package-manager', 'main.js')
        );

        // Get help button resource URIs
        const helpButtonCssUri = webview.asWebviewUri(
            vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'styles', 'help-button.css')
        );
        const helpButtonJsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'scripts', 'help-button.js')
        );

        // Read help button HTML template
        const helpButtonHtmlPath = path.join(
            context.extensionPath,
            'src',
            'webview',
            'templates',
            'help-button.html'
        );
        const helpButtonHtml = fs.readFileSync(helpButtonHtmlPath, 'utf8');

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'nonce-${nonce}'; connect-src ${cspSource}; font-src ${cspSource}; img-src ${cspSource} data:;">
    <link href="${helpButtonCssUri}" rel="stylesheet">
    <title>Helm Package Manager</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 0;
            margin: 0;
        }
        #root {
            width: 100%;
            height: 100vh;
        }
    </style>
</head>
<body data-help-context="helm-package-manager">
    ${helpButtonHtml}
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
    <script nonce="${nonce}" src="${helpButtonJsUri}"></script>
</body>
</html>`;
    }
}

/**
 * Generate a random nonce for Content Security Policy.
 */
function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

