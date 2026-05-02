import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

function readWebviewHeaderCss(extensionPath: string): string {
    const headerCssPath = path.join(extensionPath, 'src', 'webview', 'styles', 'webview-header.css');
    if (!fs.existsSync(headerCssPath)) {
        return '';
    }
    return fs.readFileSync(headerCssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
}

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
        /** Root class on the React shell (e.g. health-report, waf-report) — used for scoped header overrides */
        shellClass: string;
    }
): string {
    const cspSource = webview.cspSource;
    const { scriptUri, stylesUri, pageTitle, nonce, shellClass } = options;
    const headerCss = readWebviewHeaderCss(extensionContext.extensionPath);
    const codiconsUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionContext.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src ${cspSource}; font-src ${cspSource}; img-src ${cspSource} data:;">
    <link href="${codiconsUri}" rel="stylesheet">
    <link href="${stylesUri}" rel="stylesheet">
    <title>${pageTitle}</title>
    <style>
        ${headerCss}
        .${shellClass} .webview-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 12px 16px !important;
            border-bottom: 1px solid var(--vscode-panel-border) !important;
            background-color: var(--vscode-editor-background) !important;
            min-height: 48px !important;
            gap: 16px !important;
            flex-shrink: 0 !important;
        }
        .${shellClass} .webview-header-title h1 {
            margin: 0 !important;
            padding: 0 !important;
            font-size: 1.5em !important;
            font-weight: 600 !important;
        }
        .${shellClass} .webview-header-actions {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            flex-shrink: 0 !important;
        }
        .${shellClass} .webview-header-action-btn {
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            padding: 6px 12px !important;
            background-color: var(--vscode-button-background) !important;
            color: var(--vscode-button-foreground) !important;
            border: none !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-size: 13px !important;
            font-family: var(--vscode-font-family) !important;
            font-weight: 500 !important;
            white-space: nowrap !important;
        }
        .${shellClass} .webview-header-action-btn:hover:not(:disabled) {
            background-color: var(--vscode-button-hoverBackground) !important;
        }
        .${shellClass} .webview-header-action-btn:disabled {
            opacity: 0.5 !important;
            cursor: not-allowed !important;
        }
        .${shellClass} .webview-header-action-label {
            line-height: 1 !important;
        }
        .${shellClass} .webview-header-help-btn .codicon {
            font-size: 16px !important;
        }
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        #root {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        .${shellClass} {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            min-height: 0;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
