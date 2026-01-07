import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getHelpController } from '../extension';
import { WebviewHelpHandler } from './WebviewHelpHandler';

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
            async (message) => {
                // Message handlers will be implemented in later stories
                console.log('Helm Package Manager received message:', message);
            },
            null,
            context.subscriptions
        );
        this.disposables.push(messageDisposable);
    }

    /**
     * Generate the HTML content for the Helm Package Manager webview.
     * Creates a minimal skeleton with CSP headers and help button infrastructure.
     * The React app will be added in story 004.
     * 
     * @param webview The webview instance
     * @param context The extension context
     * @returns HTML content string
     */
    private static getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext): string {
        const cspSource = webview.cspSource;

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

