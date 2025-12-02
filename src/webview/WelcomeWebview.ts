import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GlobalState } from '../state/GlobalState';

/**
 * WelcomeWebview displays a welcome screen on first activation.
 * Provides quick start guide, authentication instructions, and links to resources.
 */
export class WelcomeWebview {
    private static currentPanel: vscode.WebviewPanel | undefined;
    private static extensionContext: vscode.ExtensionContext | undefined;

    /**
     * Show the welcome webview panel.
     * Creates a new panel or reveals the existing one.
     * 
     * @param context - The VS Code extension context
     */
    public static show(context: vscode.ExtensionContext): void {
        // Store the extension context for later use
        WelcomeWebview.extensionContext = context;

        const column = vscode.ViewColumn.One;

        // If we already have a panel, show it
        if (WelcomeWebview.currentPanel) {
            WelcomeWebview.currentPanel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'kube9Welcome',
            'Welcome to Kube9 VS Code',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'src', 'webview')
                ]
            }
        );

        WelcomeWebview.currentPanel = panel;

        // Set the webview's HTML content
        panel.webview.html = WelcomeWebview.getWebviewContent(panel.webview, context);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'dismiss': {
                        // Update global state to remember the user dismissed the welcome screen
                        const globalState = GlobalState.getInstance();
                        await globalState.setWelcomeScreenDismissed(message.doNotShowAgain);
                        panel.dispose();
                        break;
                    }
                    case 'openPortal':
                        // Open the kube9 website in external browser
                        vscode.env.openExternal(vscode.Uri.parse('https://kube9.io'));
                        break;

                    case 'openDocs':
                        // Open the kube9 documentation in external browser
                        vscode.env.openExternal(vscode.Uri.parse('https://kube9.io/docs'));
                        break;

                    case 'openExternal':
                        // Open any external URL (must be HTTPS for security)
                        if (message.url && message.url.startsWith('https://')) {
                            vscode.env.openExternal(vscode.Uri.parse(message.url));
                        }
                        break;

                    case 'openSettings':
                        // Open VS Code settings for kube9 extension
                        vscode.commands.executeCommand('workbench.action.openSettings', 'kube9');
                        break;
                }
            },
            undefined,
            context.subscriptions
        );

        // Handle panel disposal
        panel.onDidDispose(
            () => {
                WelcomeWebview.currentPanel = undefined;
            },
            null,
            context.subscriptions
        );
    }

    /**
     * Generate the HTML content for the welcome webview.
     * Loads the HTML from the external welcome.html file.
     * 
     * @param webview - The webview instance
     * @param context - The extension context
     * @returns HTML content string
     */
    private static getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext): string {
        try {
            // Get the path to the HTML file
            const htmlPath = path.join(context.extensionPath, 'src', 'webview', 'welcome.html');
            
            // Read the HTML file
            let htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // Replace CSP source placeholders if needed
            // The HTML file has 'unsafe-inline' but we could make it more secure with nonces in the future
            htmlContent = htmlContent.replace(
                /content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';"/,
                `content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';"`
            );
            
            return htmlContent;
        } catch (error) {
            // Fallback error message if HTML file cannot be loaded
            console.error('Failed to load welcome.html:', error);
            return `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Error</title>
                </head>
                <body>
                    <h1>Error Loading Welcome Screen</h1>
                    <p>Unable to load the welcome screen. Please try restarting VS Code.</p>
                    <p>Error: ${error instanceof Error ? error.message : String(error)}</p>
                </body>
                </html>
            `;
        }
    }
}

