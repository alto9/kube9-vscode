import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getHelpController } from '../extension';
import { WebviewHelpHandler } from './WebviewHelpHandler';
import { HelmService } from '../services/HelmService';
import { KubeconfigParser } from '../kubernetes/KubeconfigParser';
import { WebviewToExtensionMessage, ExtensionToWebviewMessage } from './helm-package-manager/types';
import { ClusterConnectivity } from '../kubernetes/ClusterConnectivity';
import { getContextInfo } from '../utils/kubectlContext';

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
     * Create or show the Helm Package Manager webview panel.
     * If a panel already exists, reveals it. Otherwise creates a new one.
     * 
     * @param context The VS Code extension context
     */
    public static createOrShow(context: vscode.ExtensionContext): void {
        // Store the extension context for later use
        HelmPackageManagerPanel.extensionContext = context;

        // If we already have a panel, reuse it and reveal it
        if (HelmPackageManagerPanel.currentPanel) {
            HelmPackageManagerPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'helmPackageManager',
            'Helm Package Manager',
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

        // Set the webview's HTML content
        this.panel.webview.html = HelmPackageManagerPanel.getWebviewContent(this.panel.webview, context);

        // Set up message handling
        this.setWebviewMessageListeners(context);

        // Set up help message handling
        const helpHandler = new WebviewHelpHandler(getHelpController());
        helpHandler.setupHelpMessageHandler(this.panel.webview);

        // Handle panel disposal - clear shared state
        this.panel.onDidDispose(
            () => {
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

                        case 'ready':
                            // Webview is ready, load initial repository list
                            await this.handleListRepositories();
                            break;

                        default:
                            console.log('Helm Package Manager received unknown message:', message);
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error('Error handling message:', errorMessage);
                    this.sendError(errorMessage);
                }
            },
            null,
            context.subscriptions
        );
        this.disposables.push(messageDisposable);
    }

    /**
     * Handle listRepositories command.
     */
    private async handleListRepositories(): Promise<void> {
        try {
            const repositories = await this.helmService.listRepositories();
            this.sendMessage({
                type: 'repositoriesLoaded',
                data: repositories
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.sendError(`Failed to list repositories: ${errorMessage}`);
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

            // Refresh repository list
            const updated = await this.helmService.listRepositories();
            this.sendMessage({
                type: 'repositoriesLoaded',
                data: updated
            });

            // Show success notification
            vscode.window.showInformationMessage(`Repository '${name}' updated successfully`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.sendError(`Failed to update repository: ${errorMessage}`);
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

            // Refresh repository list
            const updated = await this.helmService.listRepositories();
            this.sendMessage({
                type: 'repositoriesLoaded',
                data: updated
            });

            // Show success notification
            vscode.window.showInformationMessage(`Repository '${name}' removed successfully`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.sendError(`Failed to remove repository: ${errorMessage}`);
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
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.sendError(`Failed to search charts: ${errorMessage}`);
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
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Check for chart not found error specifically
            const lowerError = errorMessage.toLowerCase();
            if (lowerError.includes('not found') || lowerError.includes('chart not found')) {
                this.sendError(`Chart '${chart}' not found. Please verify the chart name and repository.`);
            } else {
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
     * Send a message to the webview.
     * 
     * @param message Message to send
     */
    private sendMessage(message: ExtensionToWebviewMessage): void {
        this.panel.webview.postMessage(message);
    }

    /**
     * Send an error message to the webview.
     * 
     * @param errorMessage Error message
     */
    private sendError(errorMessage: string): void {
        this.sendMessage({
            type: 'operationError',
            error: errorMessage
        });
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
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
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

