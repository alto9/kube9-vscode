import * as vscode from 'vscode';
import { HelpController } from '../help/HelpController';

/**
 * Handles help messages from webviews and routes them to HelpController.
 * Provides a reusable way to integrate contextual help into webview panels.
 */
export class WebviewHelpHandler {
    constructor(private helpController: HelpController) {}
    
    /**
     * Sets up message handler for webview help messages.
     * Listens for messages with type 'openHelp' and routes them to HelpController.
     * 
     * @param webview - The webview panel to set up message handling for
     */
    public setupHelpMessageHandler(webview: vscode.Webview): void {
        webview.onDidReceiveMessage(async (message) => {
            if (message.type === 'openHelp') {
                try {
                    await this.helpController.openContextualHelp(message.context);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error('Error handling help message:', errorMessage);
                    // Don't show error to user - help failures shouldn't break webview functionality
                }
            }
        });
    }
}

