import * as vscode from 'vscode';

/**
 * HealthReportPanel displays a placeholder webview for the Kube9 Operator Health report.
 * Shows a loading message indicating that operator status is being loaded.
 */
export class HealthReportPanel {
    private static currentPanel: vscode.WebviewPanel | undefined;
    private static extensionContext: vscode.ExtensionContext | undefined;

    /**
     * Show the Health Report webview panel.
     * Creates a new panel or reveals the existing one.
     * 
     * @param context - The VS Code extension context
     */
    public static show(context: vscode.ExtensionContext): void {
        // Store the extension context for later use
        HealthReportPanel.extensionContext = context;

        const column = vscode.ViewColumn.One;

        // If we already have a panel, show it
        if (HealthReportPanel.currentPanel) {
            HealthReportPanel.currentPanel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'kube9.operatorHealthReport',
            'Kube9 Operator Health',
            column,
            {
                enableScripts: false,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'src', 'webview')
                ]
            }
        );

        HealthReportPanel.currentPanel = panel;

        // Set the webview's HTML content
        panel.webview.html = HealthReportPanel.getWebviewContent(panel.webview);

        // Handle panel disposal
        panel.onDidDispose(
            () => {
                HealthReportPanel.currentPanel = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Generate the HTML content for the Health Report webview.
     * Returns inline HTML with a styled loading message.
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
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline';">
    <title>Kube9 Operator Health</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 40px;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            box-sizing: border-box;
        }
        .container {
            text-align: center;
            max-width: 600px;
        }
        .icon {
            font-size: 64px;
            margin-bottom: 24px;
            opacity: 0.6;
        }
        h1 {
            font-size: 28px;
            font-weight: 600;
            margin: 0 0 16px 0;
            color: var(--vscode-foreground);
        }
        p {
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 24px 0;
            color: var(--vscode-descriptionForeground);
        }
        .refresh-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            font-size: 14px;
            border-radius: 2px;
            cursor: pointer;
            margin-top: 16px;
        }
        .refresh-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .refresh-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🩺</div>
        <h1>Kube9 Operator Health</h1>
        <p>Loading operator status...</p>
        <button class="refresh-button" disabled>Refresh</button>
    </div>
</body>
</html>`;
    }
}

