import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { extractKindFromContextValue, getYAMLEditorManager } from '../extension';
import { PodDescribeProvider } from '../providers/PodDescribeProvider';
import { NamespaceDescribeProvider } from '../providers/NamespaceDescribeProvider';
import { getKubernetesApiClient } from '../kubernetes/apiClient';
import { DeploymentDescribeWebview } from './DeploymentDescribeWebview';
import { KubeconfigParser } from '../kubernetes/KubeconfigParser';
import { WebviewHelpHandler } from './WebviewHelpHandler';
import { getHelpController } from '../extension';
import { NamespaceTreeItemConfig } from '../tree/items/NamespaceTreeItem';
import { setNamespace } from '../utils/kubectlContext';

/**
 * Resource information for the Describe webview.
 */
interface DescribeResourceInfo {
    kind: string;
    name: string;
    namespace?: string;
    contextName: string;
}

/**
 * Pod configuration passed from tree item to describe webview.
 */
interface PodTreeItemConfig {
    name: string;
    namespace: string;
    status?: string;
    metadata?: Record<string, unknown>;
    context: string;
}

/**
 * DescribeWebview manages a shared webview panel for displaying resource descriptions.
 * Reuses a single panel instance and updates it when different resources are described.
 */
export class DescribeWebview {
    /**
     * The single shared webview panel instance.
     * Reused for all Describe actions.
     */
    private static currentPanel: vscode.WebviewPanel | undefined;
    
    private static extensionContext: vscode.ExtensionContext | undefined;

    /**
     * Pod describe provider instance for fetching Pod data.
     * Initialized lazily when first needed.
     */
    private static podProvider: PodDescribeProvider | undefined;

    /**
     * Current Pod configuration being displayed.
     * Used for refresh operations.
     */
    private static currentPodConfig: PodTreeItemConfig | undefined;

    /**
     * Namespace describe provider instance for fetching Namespace data.
     * Initialized lazily when first needed.
     */
    private static namespaceProvider: NamespaceDescribeProvider | undefined;

    /**
     * Current Namespace configuration being displayed.
     * Used for refresh operations.
     */
    private static currentNamespaceConfig: NamespaceTreeItemConfig | undefined;

    /**
     * Show the Describe webview for a resource.
     * Creates a new panel if none exists, or reuses and updates the existing panel.
     * 
     * @param context The VS Code extension context
     * @param resourceInfo Information about the resource to describe
     */
    public static show(
        context: vscode.ExtensionContext,
        resourceInfo: DescribeResourceInfo
    ): void {
        // Store the extension context for later use
        DescribeWebview.extensionContext = context;

        // If we already have a panel, reuse it and update the content
        if (DescribeWebview.currentPanel) {
            DescribeWebview.updatePanel(resourceInfo);
            DescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create title with resource kind and name
        const title = `${resourceInfo.kind} / ${resourceInfo.name}`;

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9Describe',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        DescribeWebview.currentPanel = panel;

        // Set the webview's HTML content
        panel.webview.html = DescribeWebview.getWebviewContent(resourceInfo, panel.webview);

        // Handle panel disposal - clear shared state
        panel.onDidDispose(
            () => {
                DescribeWebview.currentPanel = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Update an existing panel with new resource information.
     * 
     * @param resourceInfo Information about the resource to describe
     */
    private static updatePanel(resourceInfo: DescribeResourceInfo): void {
        if (!DescribeWebview.currentPanel) {
            return;
        }

        // Update panel title
        const title = `${resourceInfo.kind} / ${resourceInfo.name}`;
        DescribeWebview.currentPanel.title = title;

        // Update panel content
        DescribeWebview.currentPanel.webview.html = DescribeWebview.getWebviewContent(resourceInfo, DescribeWebview.currentPanel.webview);
    }

    /**
     * Get the shared webview panel instance (if it exists).
     * Used by other webview managers to check for and reuse the shared panel.
     * 
     * @returns The current panel or undefined
     */
    public static getSharedPanel(): vscode.WebviewPanel | undefined {
        return DescribeWebview.currentPanel;
    }

    /**
     * Set the shared webview panel instance.
     * Used by other webview managers to register their panel as the shared instance.
     * 
     * @param panel The panel to set as shared
     */
    public static setSharedPanel(panel: vscode.WebviewPanel | undefined): void {
        DescribeWebview.currentPanel = panel;
    }

    /**
     * Generate the HTML content for the Describe webview.
     * Shows a stub "Coming soon" message.
     * 
     * @param resourceInfo Information about the resource being described
     * @returns HTML content string
     */
    private static getWebviewContent(resourceInfo: DescribeResourceInfo, webview: vscode.Webview): string {
        const resourceDisplay = resourceInfo.namespace
            ? `${resourceInfo.kind} "${resourceInfo.name}" in namespace "${resourceInfo.namespace}"`
            : `${resourceInfo.kind} "${resourceInfo.name}"`;

        // Get help button resources if extension context is available
        let helpButtonCssUri = '';
        let helpButtonJsUri = '';
        let helpButtonHtml = '';
        let nonce = '';
        const cspSource = webview.cspSource;

        if (DescribeWebview.extensionContext) {
            helpButtonCssUri = webview.asWebviewUri(
                vscode.Uri.joinPath(DescribeWebview.extensionContext.extensionUri, 'src', 'webview', 'styles', 'help-button.css')
            ).toString();
            helpButtonJsUri = webview.asWebviewUri(
                vscode.Uri.joinPath(DescribeWebview.extensionContext.extensionUri, 'src', 'webview', 'scripts', 'help-button.js')
            ).toString();
            
            const helpButtonHtmlPath = path.join(
                DescribeWebview.extensionContext.extensionPath,
                'src',
                'webview',
                'templates',
                'help-button.html'
            );
            helpButtonHtml = fs.readFileSync(helpButtonHtmlPath, 'utf8');
            
            nonce = getNonce();
        }

        const helpButtonCssLink = helpButtonCssUri ? `<link href="${helpButtonCssUri}" rel="stylesheet">` : '';
        const helpButtonScript = helpButtonJsUri ? `<script nonce="${nonce}" src="${helpButtonJsUri}"></script>` : '';
        const cspScriptSrc = nonce ? `script-src 'nonce-${nonce}';` : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${cspSource}; ${cspScriptSrc}">
    ${helpButtonCssLink}
    <title>Describe: ${DescribeWebview.escapeHtml(resourceInfo.kind)} / ${DescribeWebview.escapeHtml(resourceInfo.name)}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        h1 {
            margin-top: 0;
            font-size: 1.5em;
            font-weight: 600;
            color: var(--vscode-foreground);
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .coming-soon {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }
        .coming-soon-message {
            font-size: 1.2em;
            margin-bottom: 10px;
        }
        .resource-info {
            font-size: 0.9em;
            opacity: 0.8;
            margin-top: 20px;
        }
    </style>
</head>
<body data-help-context="describe-webview">
    ${helpButtonHtml}
    <h1>${DescribeWebview.escapeHtml(resourceInfo.kind)} / ${DescribeWebview.escapeHtml(resourceInfo.name)}</h1>
    <div class="coming-soon">
        <div class="coming-soon-message">Coming soon</div>
        <div class="resource-info">Resource: ${DescribeWebview.escapeHtml(resourceDisplay)}</div>
    </div>
    ${helpButtonScript}
</body>
</html>`;
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

    /**
     * Show the Describe webview from a tree item.
     * Extracts resource information from the tree item and opens the webview.
     * 
     * @param context The VS Code extension context
     * @param treeItem The tree item to describe
     */
    public static async showFromTreeItem(
        context: vscode.ExtensionContext,
        treeItem: ClusterTreeItem
    ): Promise<void> {
        // Extract resource information from tree item
        if (!treeItem || !treeItem.resourceData) {
            vscode.window.showErrorMessage('Unable to describe: missing resource data');
            return;
        }

        // Extract kind from contextValue (e.g., "Pod" from "resource:Pod")
        const kind = extractKindFromContextValue(treeItem.contextValue);

        // Extract resource name
        const name = treeItem.resourceData.resourceName || (treeItem.label as string);

        // Extract namespace
        const namespace = treeItem.resourceData.namespace;

        // Extract context name
        const contextName = treeItem.resourceData.context.name;

        // Route to specialized webviews
        if (kind === 'Deployment') {
            // Validate namespace (deployments are always namespaced)
            if (!namespace) {
                vscode.window.showErrorMessage('Unable to describe deployment: namespace is required');
                return;
            }
            
            // Get kubeconfig path
            const kubeconfigPath = KubeconfigParser.getKubeconfigPath();
            
            // Call DeploymentDescribeWebview (async)
            await DeploymentDescribeWebview.show(
                context,
                name,
                namespace,
                kubeconfigPath,
                contextName
            );
            return;
        }

        // Show the Describe webview for other resource types
        DescribeWebview.show(context, {
            kind,
            name,
            namespace,
            contextName
        });
    }

    /**
     * Show the Describe webview for a Pod resource.
     * Creates a new panel if none exists, or reuses and updates the existing panel.
     * 
     * @param context The VS Code extension context
     * @param podConfig Pod configuration with name, namespace, and context
     */
    public static async showPodDescribe(
        context: vscode.ExtensionContext,
        podConfig: PodTreeItemConfig
    ): Promise<void> {
        // Store the extension context for later use
        DescribeWebview.extensionContext = context;
        DescribeWebview.currentPodConfig = podConfig;

        // Initialize Pod provider if not already initialized
        if (!DescribeWebview.podProvider) {
            const k8sClient = getKubernetesApiClient();
            DescribeWebview.podProvider = new PodDescribeProvider(k8sClient);
        }

        // If we already have a panel, reuse it and update the content
        if (DescribeWebview.currentPanel) {
            await DescribeWebview.updatePodPanel(podConfig);
            DescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create title with Pod name
        const title = `Pod / ${podConfig.name}`;

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9Describe',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        DescribeWebview.currentPanel = panel;

        // Set the webview's HTML content
        panel.webview.html = DescribeWebview.getPodWebviewContent(panel.webview, podConfig);

        // Set up message handling
        DescribeWebview.setupMessageHandling(panel, context);

        // Set up help message handling
        const helpHandler = new WebviewHelpHandler(getHelpController());
        helpHandler.setupHelpMessageHandler(panel.webview);

        // Fetch and send Pod data
        await DescribeWebview.loadPodData(podConfig, panel);

        // Handle panel disposal - clear all describe webview state
        panel.onDidDispose(
            () => {
                DescribeWebview.currentPanel = undefined;
                DescribeWebview.currentPodConfig = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Update an existing panel with new Pod information.
     * 
     * @param podConfig Pod configuration
     */
    private static async updatePodPanel(podConfig: PodTreeItemConfig): Promise<void> {
        if (!DescribeWebview.currentPanel) {
            return;
        }

        // Update panel title
        const title = `Pod / ${podConfig.name}`;
        DescribeWebview.currentPanel.title = title;
        DescribeWebview.currentPodConfig = podConfig;

        // Update panel content
        DescribeWebview.currentPanel.webview.html = DescribeWebview.getPodWebviewContent(DescribeWebview.currentPanel.webview, podConfig);

        // Reload Pod data
        await DescribeWebview.loadPodData(podConfig, DescribeWebview.currentPanel);
    }

    /**
     * Load Pod data and send it to the webview.
     * 
     * @param podConfig Pod configuration
     * @param panel Webview panel to send data to
     */
    private static async loadPodData(
        podConfig: PodTreeItemConfig,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        if (!DescribeWebview.podProvider) {
            return;
        }

        try {
            const podData = await DescribeWebview.podProvider.getPodDetails(
                podConfig.name,
                podConfig.namespace,
                podConfig.context
            );

            panel.webview.postMessage({
                command: 'updatePodData',
                data: podData
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            panel.webview.postMessage({
                command: 'showError',
                data: {
                    message: `Failed to load Pod details: ${errorMessage}`
                }
            });
        }
    }

    /**
     * Set up bidirectional message handling between extension and webview.
     * 
     * @param panel The webview panel
     * @param context The extension context
     */
    private static setupMessageHandling(
        panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext
    ): void {
        panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'refresh':
                        // Re-fetch data based on current resource type
                        if (DescribeWebview.currentPodConfig) {
                            await DescribeWebview.loadPodData(
                                DescribeWebview.currentPodConfig,
                                panel
                            );
                        } else if (DescribeWebview.currentNamespaceConfig) {
                            await DescribeWebview.loadNamespaceData(
                                DescribeWebview.currentNamespaceConfig,
                                panel
                            );
                        }
                        break;

                    case 'viewYaml':
                        await DescribeWebview.openYamlEditor();
                        break;

                    case 'setDefaultNamespace':
                        if (message.data && message.data.namespace) {
                            await DescribeWebview.setDefaultNamespace(message.data.namespace);
                        } else {
                            vscode.window.showErrorMessage('Invalid namespace data in setDefaultNamespace message');
                        }
                        break;

                    case 'navigateToResource':
                        if (message.data && message.data.resourceType && message.data.namespace) {
                            await DescribeWebview.navigateToResource(
                                message.data.resourceType,
                                message.data.namespace
                            );
                        } else {
                            vscode.window.showErrorMessage('Invalid resource data in navigateToResource message');
                        }
                        break;

                    case 'openTerminal':
                        // TODO: Implement terminal opening functionality
                        vscode.window.showInformationMessage('Open terminal functionality coming soon');
                        break;

                    case 'startPortForward':
                        // TODO: Implement port forwarding functionality
                        vscode.window.showInformationMessage('Port forwarding functionality coming soon');
                        break;

                    default:
                        console.warn('Unknown message command:', message.command);
                }
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Open YAML editor for the current namespace.
     * Uses the current namespace configuration to build a ResourceIdentifier.
     */
    private static async openYamlEditor(): Promise<void> {
        if (!DescribeWebview.currentNamespaceConfig) {
            vscode.window.showErrorMessage('No namespace is currently being displayed');
            return;
        }

        try {
            const namespaceConfig = DescribeWebview.currentNamespaceConfig;
            
            // Build ResourceIdentifier for namespace
            // Namespaces are cluster-scoped, so namespace field is undefined
            const resource = {
                kind: 'Namespace',
                name: namespaceConfig.name,
                namespace: undefined, // Namespaces are cluster-scoped
                apiVersion: 'v1',
                cluster: namespaceConfig.context
            };

            console.log('Opening YAML editor for namespace:', resource);

            // Get YAML editor manager and open editor
            const yamlEditorManager = getYAMLEditorManager();
            await yamlEditorManager.openYAMLEditor(resource);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to open YAML editor for namespace:', errorMessage);
            vscode.window.showErrorMessage(`Failed to open YAML editor: ${errorMessage}`);
        }
    }

    /**
     * Set the default namespace in kubectl context.
     * 
     * @param namespace The namespace name to set as default
     */
    private static async setDefaultNamespace(namespace: string): Promise<void> {
        if (!DescribeWebview.currentNamespaceConfig) {
            vscode.window.showErrorMessage('No namespace context available');
            return;
        }

        try {
            const namespaceConfig = DescribeWebview.currentNamespaceConfig;
            const contextName = namespaceConfig.context;

            // Set namespace in kubectl context
            const success = await setNamespace(namespace, contextName);
            
            if (success) {
                vscode.window.showInformationMessage(`Default namespace set to: ${namespace}`);
                // Refresh tree view to reflect the change
                await vscode.commands.executeCommand('kube9.refreshTree');
            } else {
                vscode.window.showErrorMessage(`Failed to set default namespace: ${namespace}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to set default namespace:', errorMessage);
            vscode.window.showErrorMessage(`Failed to set default namespace: ${errorMessage}`);
        }
    }

    /**
     * Navigate tree view to show a specific resource type in a namespace.
     * 
     * @param resourceType The resource type to navigate to (e.g., 'pods', 'deployments')
     * @param namespace The namespace name
     */
    private static async navigateToResource(resourceType: string, namespace: string): Promise<void> {
        if (!DescribeWebview.currentNamespaceConfig) {
            vscode.window.showErrorMessage('No namespace context available');
            return;
        }

        try {
            const namespaceConfig = DescribeWebview.currentNamespaceConfig;
            const contextName = namespaceConfig.context;

            // Convert resource type to proper kind (e.g., 'pods' -> 'Pod')
            const kind = resourceType.charAt(0).toUpperCase() + resourceType.slice(1).toLowerCase();
            
            // Execute navigate command
            await vscode.commands.executeCommand('kube9.navigateToResource', {
                clusterContext: contextName,
                kind: kind,
                name: '', // We're navigating to a resource type, not a specific resource
                namespace: namespace
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Failed to navigate to resource:', errorMessage);
            vscode.window.showErrorMessage(`Failed to navigate to resource: ${errorMessage}`);
        }
    }

    /**
     * Generate the HTML content for the Pod Describe webview.
     * Loads React bundle from webpack build output.
     * 
     * @param webview The webview instance
     * @param podConfig Pod configuration
     * @returns HTML content string
     */
    private static getPodWebviewContent(webview: vscode.Webview, podConfig: PodTreeItemConfig): string {
        if (!DescribeWebview.extensionContext) {
            // Fallback if extension context is not available
            return this.getFallbackHtml(podConfig);
        }

        const cspSource = webview.cspSource;
        const escapedPodName = DescribeWebview.escapeHtml(podConfig.name);
        
        // Get React bundle URI
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(DescribeWebview.extensionContext.extensionUri, 'dist', 'media', 'pod-describe', 'index.js')
        );

        // Get help button resource URIs
        const helpButtonCssUri = webview.asWebviewUri(
            vscode.Uri.joinPath(DescribeWebview.extensionContext.extensionUri, 'src', 'webview', 'styles', 'help-button.css')
        );
        const helpButtonJsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(DescribeWebview.extensionContext.extensionUri, 'src', 'webview', 'scripts', 'help-button.js')
        );

        // Read help button HTML template
        const helpButtonHtmlPath = path.join(
            DescribeWebview.extensionContext.extensionPath,
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
    <title>Pod / ${escapedPodName}</title>
</head>
<body data-help-context="describe-webview">
    ${helpButtonHtml}
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
    <script nonce="${nonce}" src="${helpButtonJsUri}"></script>
</body>
</html>`;
    }

    /**
     * Fallback HTML content if template files cannot be loaded.
     * 
     * @param podConfig Pod configuration
     * @returns Fallback HTML content string
     */
    private static getFallbackHtml(podConfig: PodTreeItemConfig): string {
        const escapedPodName = DescribeWebview.escapeHtml(podConfig.name);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>Pod / ${escapedPodName}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .error {
            padding: 20px;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            color: var(--vscode-errorForeground);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>Pod / ${escapedPodName}</h1>
    <div class="error">
        Failed to load webview template. Please check that dist/media/pod-describe/index.js exists.
    </div>
</body>
</html>`;
    }

    /**
     * Show the Describe webview for a Namespace resource.
     * Creates a new panel if none exists, or reuses and updates the existing panel.
     * 
     * @param context The VS Code extension context
     * @param namespaceConfig Namespace configuration with name, status, metadata, and context
     */
    public static async showNamespaceDescribe(
        context: vscode.ExtensionContext,
        namespaceConfig: NamespaceTreeItemConfig
    ): Promise<void> {
        // Store the extension context for later use
        DescribeWebview.extensionContext = context;
        DescribeWebview.currentNamespaceConfig = namespaceConfig;

        // Initialize Namespace provider if not already initialized
        if (!DescribeWebview.namespaceProvider) {
            const k8sClient = getKubernetesApiClient();
            DescribeWebview.namespaceProvider = new NamespaceDescribeProvider(k8sClient);
        }

        // If we already have a panel, reuse it and update the content
        if (DescribeWebview.currentPanel) {
            await DescribeWebview.updateNamespacePanel(namespaceConfig);
            DescribeWebview.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create title with Namespace name
        const title = `Namespace / ${namespaceConfig.name}`;

        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9Describe',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        DescribeWebview.currentPanel = panel;

        // Set the webview's HTML content
        panel.webview.html = DescribeWebview.getNamespaceWebviewContent(panel.webview, namespaceConfig);

        // Set up message handling
        DescribeWebview.setupMessageHandling(panel, context);

        // Fetch and send Namespace data
        await DescribeWebview.loadNamespaceData(namespaceConfig, panel);

        // Handle panel disposal - clear all describe webview state
        panel.onDidDispose(
            () => {
                DescribeWebview.currentPanel = undefined;
                DescribeWebview.currentNamespaceConfig = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Update an existing panel with new Namespace information.
     * 
     * @param namespaceConfig Namespace configuration
     */
    private static async updateNamespacePanel(namespaceConfig: NamespaceTreeItemConfig): Promise<void> {
        if (!DescribeWebview.currentPanel) {
            return;
        }

        // Update panel title
        const title = `Namespace / ${namespaceConfig.name}`;
        DescribeWebview.currentPanel.title = title;
        DescribeWebview.currentNamespaceConfig = namespaceConfig;

        // Update panel content
        DescribeWebview.currentPanel.webview.html = DescribeWebview.getNamespaceWebviewContent(DescribeWebview.currentPanel.webview, namespaceConfig);

        // Reload Namespace data
        await DescribeWebview.loadNamespaceData(namespaceConfig, DescribeWebview.currentPanel);
    }

    /**
     * Load Namespace data and send it to the webview.
     * 
     * @param namespaceConfig Namespace configuration
     * @param panel Webview panel to send data to
     */
    private static async loadNamespaceData(
        namespaceConfig: NamespaceTreeItemConfig,
        panel: vscode.WebviewPanel
    ): Promise<void> {
        if (!DescribeWebview.namespaceProvider) {
            return;
        }

        try {
            const namespaceData = await DescribeWebview.namespaceProvider.getNamespaceDetails(
                namespaceConfig.name,
                namespaceConfig.context
            );

            panel.webview.postMessage({
                command: 'updateNamespaceData',
                data: namespaceData
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            panel.webview.postMessage({
                command: 'showError',
                data: {
                    message: `Failed to load Namespace details: ${errorMessage}`
                }
            });
        }
    }

    /**
     * Generate the HTML content for the Namespace Describe webview.
     * Placeholder HTML ready for React bundle injection in story 007.
     * 
     * @param webview The webview instance
     * @param namespaceConfig Namespace configuration
     * @returns HTML content string
     */
    private static getNamespaceWebviewContent(webview: vscode.Webview, namespaceConfig: NamespaceTreeItemConfig): string {
        if (!DescribeWebview.extensionContext) {
            // Fallback if extension context is not available
            return this.getNamespaceFallbackHtml(namespaceConfig);
        }

        const cspSource = webview.cspSource;
        const escapedNamespaceName = DescribeWebview.escapeHtml(namespaceConfig.name);
        
        // Get React bundle URI
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(DescribeWebview.extensionContext.extensionUri, 'dist', 'media', 'describe', 'index.js')
        );

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Namespace / ${escapedNamespaceName}</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    /**
     * Fallback HTML content if extension context is not available.
     * 
     * @param namespaceConfig Namespace configuration
     * @returns Fallback HTML content string
     */
    private static getNamespaceFallbackHtml(namespaceConfig: NamespaceTreeItemConfig): string {
        const escapedNamespaceName = DescribeWebview.escapeHtml(namespaceConfig.name);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>Namespace / ${escapedNamespaceName}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .error {
            padding: 20px;
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            color: var(--vscode-errorForeground);
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>Namespace / ${escapedNamespaceName}</h1>
    <div class="error">
        Failed to load webview template. Extension context is not available.
    </div>
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

