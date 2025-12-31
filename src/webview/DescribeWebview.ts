import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { extractKindFromContextValue } from '../extension';
import { PodDescribeProvider } from '../providers/PodDescribeProvider';
import { getKubernetesApiClient } from '../kubernetes/apiClient';

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
        panel.webview.html = DescribeWebview.getWebviewContent(resourceInfo);

        // Handle panel disposal
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
        DescribeWebview.currentPanel.webview.html = DescribeWebview.getWebviewContent(resourceInfo);
    }

    /**
     * Generate the HTML content for the Describe webview.
     * Shows a stub "Coming soon" message.
     * 
     * @param resourceInfo Information about the resource being described
     * @returns HTML content string
     */
    private static getWebviewContent(resourceInfo: DescribeResourceInfo): string {
        const resourceDisplay = resourceInfo.namespace
            ? `${resourceInfo.kind} "${resourceInfo.name}" in namespace "${resourceInfo.namespace}"`
            : `${resourceInfo.kind} "${resourceInfo.name}"`;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
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
<body>
    <h1>${DescribeWebview.escapeHtml(resourceInfo.kind)} / ${DescribeWebview.escapeHtml(resourceInfo.name)}</h1>
    <div class="coming-soon">
        <div class="coming-soon-message">Coming soon</div>
        <div class="resource-info">Resource: ${DescribeWebview.escapeHtml(resourceDisplay)}</div>
    </div>
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
    public static showFromTreeItem(
        context: vscode.ExtensionContext,
        treeItem: ClusterTreeItem
    ): void {
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

        // Show the Describe webview
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

        // Fetch and send Pod data
        await DescribeWebview.loadPodData(podConfig, panel);

        // Handle panel disposal
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
                if (!DescribeWebview.currentPodConfig) {
                    return;
                }

                switch (message.command) {
                    case 'refresh':
                        // Re-fetch Pod data and send update
                        await DescribeWebview.loadPodData(
                            DescribeWebview.currentPodConfig,
                            panel
                        );
                        break;

                    case 'viewYaml':
                        // TODO: Implement YAML view functionality
                        vscode.window.showInformationMessage('View YAML functionality coming soon');
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

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>Pod / ${escapedPodName}</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
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

