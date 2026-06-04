import * as vscode from 'vscode';
import {
    getWebviewHeaderCssForInline,
    getWebviewHeaderStyleUri
} from './webviewHeaderStyles';

export type WebviewShellHeaderCssMode = 'inline' | 'link';

/** CSP profile for React webview shells refactored onto the shared helper. */
export type WebviewShellCspProfile = 'describe' | 'report' | 'helm';

export interface WebviewShellHtmlOptions {
    extensionContext: vscode.ExtensionContext;
    webview: vscode.Webview;
    scriptUri: vscode.Uri;
    /** Optional bundle or panel stylesheets (linked after codicons). */
    stylesUris?: vscode.Uri[];
    pageTitle: string;
    nonce: string;
    /** Applied to `#root` for shell-scoped layout rules in shipped header CSS. */
    shellClass?: string;
    headerCssMode?: WebviewShellHeaderCssMode;
    /** Extra CSS inlined after header CSS (e.g. webpack bundle styles). */
    extraInlineCss?: string;
    /** Additional scoped rules when shipped header CSS is not enough. */
    additionalInlineCss?: string;
    cspProfile?: WebviewShellCspProfile;
}

/**
 * Codicons are loaded from the extension bundle. Panels using this helper must include
 * `node_modules/@vscode/codicons/dist/codicon.css` in `localResourceRoots` when creating the webview.
 */
export function getCodiconsStyleUri(
    extensionUri: vscode.Uri,
    webview: vscode.Webview
): vscode.Uri {
    return webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css')
    );
}

function buildContentSecurityPolicy(cspSource: string, nonce: string, profile: WebviewShellCspProfile): string {
    const scriptSrc =
        profile === 'helm'
            ? `script-src ${cspSource} 'nonce-${nonce}';`
            : `script-src 'nonce-${nonce}';`;

    const extras =
        profile === 'report' || profile === 'helm'
            ? ` connect-src ${cspSource}; font-src ${cspSource}; img-src ${cspSource} data:;`
            : '';

    return `default-src 'none'; style-src ${cspSource} 'unsafe-inline'; ${scriptSrc}${extras}`;
}

function renderStyleLinks(uris: vscode.Uri[]): string {
    return uris.map((uri) => `<link href="${uri.toString()}" rel="stylesheet">`).join('\n    ');
}

function renderHeaderCss(
    extensionContext: vscode.ExtensionContext,
    webview: vscode.Webview,
    mode: WebviewShellHeaderCssMode
): { headerLink: string; headerInline: string } {
    if (mode === 'link') {
        const headerUri = getWebviewHeaderStyleUri(extensionContext.extensionUri, webview);
        return {
            headerLink: `<link href="${headerUri.toString()}" rel="stylesheet">`,
            headerInline: ''
        };
    }

    const headerCss = getWebviewHeaderCssForInline(extensionContext.extensionPath, {
        stripBlockComments: true
    });
    return {
        headerLink: '',
        headerInline: headerCss
    };
}

function renderShellClassAttr(shellClass?: string): string {
    return shellClass ? ` class="${shellClass}"` : '';
}

/**
 * Shared HTML bootstrap for React webview bundles: codicons, shipped header CSS, flex `#root`, CSP.
 */
export function getWebviewShellHtml(
    webview: vscode.Webview,
    extensionContext: vscode.ExtensionContext,
    options: WebviewShellHtmlOptions
): string {
    const {
        scriptUri,
        stylesUris = [],
        pageTitle,
        nonce,
        shellClass,
        headerCssMode = 'inline',
        extraInlineCss = '',
        additionalInlineCss = '',
        cspProfile = 'report'
    } = options;

    const cspSource = webview.cspSource;
    const codiconsUri = getCodiconsStyleUri(extensionContext.extensionUri, webview);
    const { headerLink, headerInline } = renderHeaderCss(extensionContext, webview, headerCssMode);
    const styleLinks = renderStyleLinks(stylesUris);
    const csp = buildContentSecurityPolicy(cspSource, nonce, cspProfile);

    const inlineBlocks = [headerInline, extraInlineCss, additionalInlineCss]
        .filter((block) => block.trim().length > 0)
        .join('\n        ');

    const inlineStyleTag = inlineBlocks
        ? `<style>
        ${inlineBlocks}
    </style>`
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <link href="${codiconsUri.toString()}" rel="stylesheet">
    ${headerLink}
    ${styleLinks}
    <title>${pageTitle}</title>
    ${inlineStyleTag}
</head>
<body>
    <div id="root"${renderShellClassAttr(shellClass)}></div>
    <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
}
