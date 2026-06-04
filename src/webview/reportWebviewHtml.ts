import * as vscode from 'vscode';
import { getWebviewShellHtml } from './webviewShellHtml';

/**
 * HTML document for React report webviews that use WebviewHeader (codicons, shared header CSS, flex root).
 */
export function getReportWebviewHtml(
    webview: vscode.Webview,
    extensionContext: vscode.ExtensionContext,
    options: {
        scriptUri: vscode.Uri;
        stylesUri: vscode.Uri;
        pageTitle: string;
        nonce: string;
        /** Root class on the React shell (e.g. health-report, waf-report) */
        shellClass: string;
    }
): string {
    const { scriptUri, stylesUri, pageTitle, nonce, shellClass } = options;

    return getWebviewShellHtml(webview, extensionContext, {
        extensionContext,
        webview,
        scriptUri,
        stylesUris: [stylesUri],
        pageTitle,
        nonce,
        shellClass,
        headerCssMode: 'inline',
        cspProfile: 'report'
    });
}
