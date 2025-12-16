import * as vscode from 'vscode';

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
     * Create or show the Cluster Manager webview panel.
     * If a panel already exists, reveals it. Otherwise creates a new one.
     * 
     * @param extensionUri - The extension URI for loading resources
     * @returns The ClusterManagerWebview instance
     */
    public static createOrShow(extensionUri: vscode.Uri): ClusterManagerWebview {
        if (ClusterManagerWebview.currentPanel) {
            ClusterManagerWebview.currentPanel.panel.reveal();
            return ClusterManagerWebview.currentPanel;
        }

        return new ClusterManagerWebview(extensionUri);
    }

    /**
     * Private constructor to enforce singleton pattern.
     * Creates a new webview panel with placeholder content.
     * 
     * @param extensionUri - The extension URI for loading resources (will be used for loading React assets in future stories)
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private constructor(extensionUri: vscode.Uri) {
        // Create webview panel
        this.panel = vscode.window.createWebviewPanel(
            'kube9.clusterManager',
            'Cluster Manager',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Set HTML content
        this.panel.webview.html = ClusterManagerWebview.getWebviewContent(this.panel.webview);

        // Set up message handler (listener only, no message handling yet)
        this.panel.webview.onDidReceiveMessage(
            () => {
                // Message handling will be implemented in future stories
            },
            undefined,
            []
        );

        // Handle panel disposal to clear singleton reference
        this.panel.onDidDispose(
            () => {
                ClusterManagerWebview.currentPanel = undefined;
            },
            null,
            []
        );

        // Store this instance as the current panel
        ClusterManagerWebview.currentPanel = this;
    }

    /**
     * Generate the HTML content for the Cluster Manager webview.
     * Returns placeholder content for now.
     * 
     * @param webview - The webview instance
     * @returns HTML content string
     */
    private static getWebviewContent(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
    <title>Cluster Manager</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .placeholder {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }
        .placeholder-message {
            font-size: 1.5em;
            font-weight: 600;
            margin-bottom: 10px;
            color: var(--vscode-foreground);
        }
    </style>
</head>
<body>
    <div class="placeholder">
        <div class="placeholder-message">Cluster Manager - Under Construction</div>
    </div>
</body>
</html>`;
    }
}

