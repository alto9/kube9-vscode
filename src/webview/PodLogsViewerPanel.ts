import * as vscode from 'vscode';

/**
 * Interface for storing pod information.
 * Represents the current pod being viewed in the panel.
 */
interface PodInfo {
    name: string;
    namespace: string;
    container: string;
    contextName: string;
    clusterName: string;
}

/**
 * Interface for storing panel information.
 * Each panel is associated with a specific cluster context.
 */
interface PanelInfo {
    panel: vscode.WebviewPanel;
    currentPod: PodInfo;
}

/**
 * PodLogsViewerPanel manages webview panels for Pod Logs Viewer.
 * Supports multiple simultaneous panels (one per cluster).
 * Follows the FreeDashboardPanel pattern with cluster-specific registry.
 */
export class PodLogsViewerPanel {
    /**
     * Map of open webview panels keyed by contextName.
     * Allows reusing existing panels when the same cluster's logs are viewed again.
     */
    private static openPanels: Map<string, PanelInfo> = new Map();
    
    /**
     * Extension context for managing subscriptions.
     */
    private static extensionContext: vscode.ExtensionContext | undefined;

    /**
     * Show a Pod Logs Viewer webview panel.
     * Creates a new panel or reveals an existing one for the given cluster.
     * 
     * @param context - The VS Code extension context
     * @param contextName - The kubectl context name
     * @param clusterName - The display name of the cluster
     * @param podName - The name of the pod
     * @param namespace - The namespace of the pod
     * @param container - The container name (optional)
     */
    public static show(
        context: vscode.ExtensionContext,
        contextName: string,
        clusterName: string,
        podName: string,
        namespace: string,
        container: string = ''
    ): void {
        // Store the extension context for later use
        PodLogsViewerPanel.extensionContext = context;

        // Create a unique key for this panel
        const panelKey = contextName;

        // If we already have a panel for this cluster, reveal it
        const existingPanelInfo = PodLogsViewerPanel.openPanels.get(panelKey);
        if (existingPanelInfo) {
            existingPanelInfo.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        // Create a new panel
        PodLogsViewerPanel.createPanel(
            context,
            contextName,
            clusterName,
            podName,
            namespace,
            container
        );
    }

    /**
     * Create a new webview panel for pod logs.
     * 
     * @param context - The VS Code extension context
     * @param contextName - The kubectl context name
     * @param clusterName - The display name of the cluster
     * @param podName - The name of the pod
     * @param namespace - The namespace of the pod
     * @param container - The container name
     */
    private static createPanel(
        context: vscode.ExtensionContext,
        contextName: string,
        clusterName: string,
        podName: string,
        namespace: string,
        container: string
    ): void {
        // Create a new webview panel
        const panel = vscode.window.createWebviewPanel(
            'kube9PodLogs',
            `Logs: ${clusterName}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Create pod info
        const podInfo: PodInfo = {
            name: podName,
            namespace,
            container,
            contextName,
            clusterName
        };

        // Store the panel and its pod info in our map
        PodLogsViewerPanel.openPanels.set(contextName, {
            panel,
            currentPod: podInfo
        });

        // Set placeholder HTML content
        panel.webview.html = PodLogsViewerPanel.getPlaceholderHtml();

        // Handle panel disposal
        panel.onDidDispose(
            () => {
                PodLogsViewerPanel.openPanels.delete(contextName);
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Get placeholder HTML content for the webview.
     * 
     * @returns HTML string for placeholder content
     */
    private static getPlaceholderHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pod Logs Viewer</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }
        .placeholder {
            text-align: center;
        }
        h1 {
            font-size: 24px;
            margin-bottom: 10px;
        }
        p {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="placeholder">
        <h1>Pod Logs Viewer</h1>
        <p>Under Construction</p>
    </div>
</body>
</html>`;
    }
}

