import * as vscode from 'vscode';
import { ClusterTreeItem } from '../tree/ClusterTreeItem';
import { extractKindFromContextValue } from '../extension';

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
}

