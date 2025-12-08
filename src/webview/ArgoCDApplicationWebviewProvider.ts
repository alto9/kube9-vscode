import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ArgoCDService } from '../services/ArgoCDService';
import { ClusterTreeProvider } from '../tree/ClusterTreeProvider';
import { ArgoCDApplication, ArgoCDNotFoundError, ArgoCDPermissionError, SyncStatus, HealthStatus } from '../types/argocd';

/**
 * Message types sent from webview to extension.
 */
interface WebviewMessage {
    type: 'sync' | 'refresh' | 'hardRefresh' | 'viewInTree' | 'navigateToResource' | 'ready';
    kind?: string;
    name?: string;
    namespace?: string;
}

/**
 * Message types sent from extension to webview.
 */
interface ExtensionMessage {
    type: 'applicationData' | 'updateStatus' | 'operationProgress' | 'error';
    data?: ArgoCDApplication;
    syncStatus?: SyncStatus;
    healthStatus?: HealthStatus;
    phase?: string;
    message?: string;
}

/**
 * Information stored with each webview panel.
 */
interface PanelInfo {
    /** The webview panel */
    panel: vscode.WebviewPanel;
    /** Application name */
    applicationName: string;
    /** Application namespace */
    namespace: string;
    /** Kubernetes context */
    context: string;
}

/**
 * ArgoCDApplicationWebviewProvider manages webview panels for ArgoCD Applications.
 * Creates panels, loads application data, and handles message communication.
 */
export class ArgoCDApplicationWebviewProvider {
    /**
     * Map of open webview panels keyed by "context:namespace:name".
     * Allows reusing existing panels when the same application is opened again.
     */
    private static openPanels: Map<string, PanelInfo> = new Map();

    /**
     * Show the ArgoCD application webview for a specific application.
     * Creates a new panel or reuses an existing one.
     * 
     * @param extensionContext The VS Code extension context
     * @param argoCDService The ArgoCD service instance
     * @param treeProvider The cluster tree provider instance
     * @param applicationName The name of the ArgoCD application
     * @param namespace The namespace containing the application
     * @param context The Kubernetes context name
     */
    public static async showApplication(
        extensionContext: vscode.ExtensionContext,
        argoCDService: ArgoCDService,
        treeProvider: ClusterTreeProvider,
        applicationName: string,
        namespace: string,
        context: string
    ): Promise<void> {
        // Create a unique key for this application panel
        const panelKey = `${context}:${namespace}:${applicationName}`;

        // If we already have a panel for this application, reveal it
        const existingPanelInfo = ArgoCDApplicationWebviewProvider.openPanels.get(panelKey);
        if (existingPanelInfo) {
            existingPanelInfo.panel.reveal(vscode.ViewColumn.One);
            // Reload data in case it changed
            await ArgoCDApplicationWebviewProvider.loadApplicationData(
                argoCDService,
                applicationName,
                namespace,
                context,
                existingPanelInfo.panel
            );
            return;
        }

        // Create title for the panel
        const title = `ArgoCD: ${applicationName}`;

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9.argocdApplication',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionContext.extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionContext.extensionUri, 'out')
                ]
            }
        );

        // Store the panel and its context
        ArgoCDApplicationWebviewProvider.openPanels.set(panelKey, {
            panel,
            applicationName,
            namespace,
            context
        });

        // Set the webview's HTML content
        panel.webview.html = ArgoCDApplicationWebviewProvider.getWebviewContent(
            panel.webview,
            extensionContext
        );

        // Load application data
        await ArgoCDApplicationWebviewProvider.loadApplicationData(
            argoCDService,
            applicationName,
            namespace,
            context,
            panel
        );

        // Set up message handlers
        ArgoCDApplicationWebviewProvider.setupMessageHandlers(
            panel,
            argoCDService,
            treeProvider,
            applicationName,
            namespace,
            context,
            extensionContext
        );

        // Handle panel disposal
        panel.onDidDispose(
            () => {
                ArgoCDApplicationWebviewProvider.openPanels.delete(panelKey);
            },
            null,
            extensionContext.subscriptions
        );
    }

    /**
     * Generate the HTML content for the ArgoCD application webview.
     * Loads React bundle from media directory and includes CSS styles.
     * 
     * @param webview The webview instance
     * @param extensionContext The extension context for resolving URIs
     * @returns HTML content string
     */
    private static getWebviewContent(
        webview: vscode.Webview,
        extensionContext: vscode.ExtensionContext
    ): string {
        // Get the webview URI for CSP
        const cspSource = webview.cspSource;

        // Get React bundle URI
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(extensionContext.extensionUri, 'media', 'argocd-application', 'main.js')
        );

        // Read CSS file
        let cssContent = '';
        try {
            const cssPath = path.join(extensionContext.extensionPath, 'src', 'webview', 'argocd-application', 'styles.css');
            cssContent = fs.readFileSync(cssPath, 'utf8');
        } catch (error) {
            console.error('Failed to load CSS file:', error);
            // Fallback to minimal styles if CSS file cannot be loaded
            cssContent = `
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 0;
                    margin: 0;
                }
                #root {
                    min-height: 100vh;
                }
            `;
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource};">
    <title>ArgoCD Application</title>
    <style>
        ${cssContent}
    </style>
</head>
<body>
    <div id="root"></div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Load application data from ArgoCDService and send it to the webview.
     * 
     * @param argoCDService The ArgoCD service instance
     * @param applicationName The name of the application
     * @param namespace The namespace containing the application
     * @param context The Kubernetes context name
     * @param panel The webview panel
     */
    private static async loadApplicationData(
        argoCDService: ArgoCDService,
        applicationName: string,
        namespace: string,
        context: string,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        try {
            const application = await argoCDService.getApplication(
                applicationName,
                namespace,
                context
            );

            // Send application data to webview
            panel.webview.postMessage({
                type: 'applicationData',
                data: application
            } as ExtensionMessage);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Send error to webview
            panel.webview.postMessage({
                type: 'error',
                message: errorMessage
            } as ExtensionMessage);

            // Show notification
            if (error instanceof ArgoCDNotFoundError) {
                vscode.window.showErrorMessage(
                    `ArgoCD Application not found: ${applicationName} in namespace ${namespace}`
                );
            } else if (error instanceof ArgoCDPermissionError) {
                vscode.window.showErrorMessage(
                    `Permission denied: Cannot access ArgoCD Application ${applicationName}`
                );
            } else {
                vscode.window.showErrorMessage(
                    `Failed to load ArgoCD Application: ${errorMessage}`
                );
            }
        }
    }

    /**
     * Set up message handlers for webview communication.
     * 
     * @param panel The webview panel
     * @param argoCDService The ArgoCD service instance
     * @param treeProvider The cluster tree provider instance
     * @param applicationName The name of the application
     * @param namespace The namespace containing the application
     * @param context The Kubernetes context name
     * @param extensionContext The VS Code extension context
     */
    private static setupMessageHandlers(
        panel: vscode.WebviewPanel,
        argoCDService: ArgoCDService,
        treeProvider: ClusterTreeProvider,
        applicationName: string,
        namespace: string,
        context: string,
        extensionContext: vscode.ExtensionContext
    ): void {
        panel.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                switch (message.type) {
                    case 'sync':
                        await ArgoCDApplicationWebviewProvider.handleSync(
                            argoCDService,
                            applicationName,
                            namespace,
                            context,
                            panel
                        );
                        break;
                    
                    case 'refresh':
                        await ArgoCDApplicationWebviewProvider.handleRefresh(
                            argoCDService,
                            applicationName,
                            namespace,
                            context,
                            panel
                        );
                        break;
                    
                    case 'hardRefresh':
                        await ArgoCDApplicationWebviewProvider.handleHardRefresh(
                            argoCDService,
                            applicationName,
                            namespace,
                            context,
                            panel
                        );
                        break;
                    
                    case 'viewInTree':
                        await ArgoCDApplicationWebviewProvider.handleViewInTree(
                            treeProvider,
                            applicationName
                        );
                        break;
                    
                    case 'navigateToResource':
                        if (message.kind && message.name && message.namespace) {
                            await ArgoCDApplicationWebviewProvider.handleNavigateToResource(
                                treeProvider,
                                message.kind,
                                message.name,
                                message.namespace
                            );
                        }
                        break;
                    
                    case 'ready':
                        // Webview is ready, data will be loaded automatically
                        console.log('ArgoCD application webview ready');
                        break;
                }
            },
            null,
            extensionContext.subscriptions
        );
    }

    /**
     * Handle sync action from webview.
     * 
     * @param argoCDService The ArgoCD service instance
     * @param applicationName The name of the application
     * @param namespace The namespace containing the application
     * @param context The Kubernetes context name
     * @param panel The webview panel
     */
    private static async handleSync(
        argoCDService: ArgoCDService,
        applicationName: string,
        namespace: string,
        context: string,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        // Show syncing state in webview
        panel.webview.postMessage({
            type: 'operationProgress',
            phase: 'Running',
            message: 'Syncing application...'
        } as ExtensionMessage);

        try {
            // Execute sync
            await argoCDService.syncApplication(applicationName, namespace, context);

            // Reload application data
            await ArgoCDApplicationWebviewProvider.loadApplicationData(
                argoCDService,
                applicationName,
                namespace,
                context,
                panel
            );

            // Show success notification
            vscode.window.showInformationMessage(
                `Successfully synced ArgoCD Application: ${applicationName}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Send error to webview
            panel.webview.postMessage({
                type: 'error',
                message: errorMessage
            } as ExtensionMessage);

            // Show error notification
            vscode.window.showErrorMessage(`Sync failed: ${errorMessage}`);
        }
    }

    /**
     * Handle refresh action from webview.
     * 
     * @param argoCDService The ArgoCD service instance
     * @param applicationName The name of the application
     * @param namespace The namespace containing the application
     * @param context The Kubernetes context name
     * @param panel The webview panel
     */
    private static async handleRefresh(
        argoCDService: ArgoCDService,
        applicationName: string,
        namespace: string,
        context: string,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        try {
            // Execute refresh
            await argoCDService.refreshApplication(applicationName, namespace, context);

            // Reload application data
            await ArgoCDApplicationWebviewProvider.loadApplicationData(
                argoCDService,
                applicationName,
                namespace,
                context,
                panel
            );

            // Show success notification
            vscode.window.showInformationMessage(
                `Successfully refreshed ArgoCD Application: ${applicationName}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Send error to webview
            panel.webview.postMessage({
                type: 'error',
                message: errorMessage
            } as ExtensionMessage);

            // Show error notification
            vscode.window.showErrorMessage(`Refresh failed: ${errorMessage}`);
        }
    }

    /**
     * Handle hard refresh action from webview.
     * 
     * @param argoCDService The ArgoCD service instance
     * @param applicationName The name of the application
     * @param namespace The namespace containing the application
     * @param context The Kubernetes context name
     * @param panel The webview panel
     */
    private static async handleHardRefresh(
        argoCDService: ArgoCDService,
        applicationName: string,
        namespace: string,
        context: string,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        // Show confirmation dialog
        const confirm = await vscode.window.showWarningMessage(
            `Hard refresh will clear cache and may take longer. Continue for ${applicationName}?`,
            'Continue',
            'Cancel'
        );

        if (confirm !== 'Continue') {
            return;
        }

        try {
            // Execute hard refresh
            await argoCDService.hardRefreshApplication(applicationName, namespace, context);

            // Reload application data
            await ArgoCDApplicationWebviewProvider.loadApplicationData(
                argoCDService,
                applicationName,
                namespace,
                context,
                panel
            );

            // Show success notification
            vscode.window.showInformationMessage(
                `Successfully hard refreshed ArgoCD Application: ${applicationName}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Send error to webview
            panel.webview.postMessage({
                type: 'error',
                message: errorMessage
            } as ExtensionMessage);

            // Show error notification
            vscode.window.showErrorMessage(`Hard refresh failed: ${errorMessage}`);
        }
    }

    /**
     * Handle view in tree action from webview.
     * Focuses the tree view and attempts to reveal the application.
     * 
     * @param treeProvider The cluster tree provider instance
     * @param applicationName The name of the application
     */
    private static async handleViewInTree(
        treeProvider: ClusterTreeProvider,
        applicationName: string
    ): Promise<void> {
        try {
            // Focus tree view
            await vscode.commands.executeCommand('kube9.treeView.focus');

            // Refresh tree to ensure ArgoCD applications are loaded
            treeProvider.refresh();

            // Note: revealApplication method may not exist yet, so we just refresh
            // This can be enhanced when tree provider methods are available
            vscode.window.showInformationMessage(
                `Tree view focused. Look for ArgoCD Application: ${applicationName}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to view in tree: ${errorMessage}`);
        }
    }

    /**
     * Handle navigate to resource action from webview.
     * Focuses the tree view and attempts to reveal the resource.
     * 
     * @param treeProvider The cluster tree provider instance
     * @param kind The resource kind
     * @param name The resource name
     * @param namespace The resource namespace
     */
    private static async handleNavigateToResource(
        treeProvider: ClusterTreeProvider,
        kind: string,
        name: string,
        namespace: string
    ): Promise<void> {
        try {
            // Focus tree view
            await vscode.commands.executeCommand('kube9.treeView.focus');

            // Refresh tree to ensure resources are loaded
            treeProvider.refresh();

            // Note: revealResource method may not exist yet, so we just refresh
            // This can be enhanced when tree provider methods are available
            vscode.window.showInformationMessage(
                `Tree view focused. Look for ${kind} ${name} in namespace ${namespace}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to navigate to resource: ${errorMessage}`);
        }
    }

    /**
     * Escape HTML special characters to prevent XSS.
     * 
     * @param unsafe The string to escape
     * @returns The escaped string
     */
    private static escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

