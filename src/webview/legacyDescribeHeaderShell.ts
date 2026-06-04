import * as vscode from 'vscode';
import { getHelpController, isHelpControllerReady } from '../extension';
import { WebviewHelpHandler } from './WebviewHelpHandler';
import { getCodiconsStyleUri } from './webviewShellHtml';
import { getWebviewHeaderStyleUri } from './webviewHeaderStyles';

/** Default help topic for legacy workload describe panels. */
export const LEGACY_DESCRIBE_HELP_CONTEXT = 'describe-webview';

export interface LegacyDescribeHeaderActionOptions {
    /** When false, omit View YAML (e.g. coming-soon stub). Default true. */
    showViewYaml?: boolean;
    /** When false, omit Refresh. Default true. */
    showRefresh?: boolean;
    /** When set, renders Help and wires `openHelp` via legacy header script. */
    helpContext?: string;
    refreshButtonId?: string;
    viewYamlButtonId?: string;
    helpButtonId?: string;
}

export interface LegacyDescribeHeaderOptions extends LegacyDescribeHeaderActionOptions {
    /** Inner HTML for the h1 (caller escapes untrusted values). */
    titleInnerHtml: string;
}

export interface LegacyDescribeDocumentShellOptions {
    webview: vscode.Webview;
    extensionUri: vscode.Uri;
    pageTitle: string;
    /** Full body markup (embed {@link buildLegacyHeaderFragment} inside `.container` when needed). */
    bodyHtml: string;
    /** Panel-specific CSS (exclude header chrome; use shipped webview-header.css). */
    panelCss?: string;
    /** Script body placed before closing `</body>` (wrapped in IIFE when `wrapScript` is true). */
    script?: string;
    /** When true (default), wraps `script` in an IIFE. */
    wrapScript?: boolean;
}

/** Registers legacy `{ command: 'openHelp' }` help handling when the extension host initialized HelpController. */
export function setupLegacyDescribeHelpHandler(webview: vscode.Webview): void {
    if (!isHelpControllerReady()) {
        return;
    }
    const helpHandler = new WebviewHelpHandler(getHelpController());
    helpHandler.setupHelpMessageHandler(webview);
}

/** `localResourceRoots` for legacy describe panels (shipped header + codicons). */
export function getLegacyDescribeLocalResourceRoots(extensionUri: vscode.Uri): vscode.Uri[] {
    return [vscode.Uri.joinPath(extensionUri, 'media')];
}

/** Linked stylesheet tags and CSP for legacy panels not yet on {@link buildLegacyDescribeDocumentShell}. */
export function buildLegacyDescribeHeadAssets(
    webview: vscode.Webview,
    extensionUri: vscode.Uri
): { headerLink: string; codiconsLink: string; csp: string } {
    const cspSource = webview.cspSource;
    const headerUri = getWebviewHeaderStyleUri(extensionUri, webview).toString();
    const codiconsUri = getCodiconsStyleUri(extensionUri, webview).toString();
    return {
        headerLink: `<link href="${headerUri}" rel="stylesheet">`,
        codiconsLink: `<link href="${codiconsUri}" rel="stylesheet">`,
        csp: `default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'unsafe-inline'; font-src ${cspSource};`
    };
}

/** Webview panel options shared by legacy workload describe generators. */
export function getLegacyDescribeWebviewPanelOptions(
    extensionUri: vscode.Uri
): vscode.WebviewPanelOptions & vscode.WebviewOptions {
    return {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: getLegacyDescribeLocalResourceRoots(extensionUri)
    };
}

function codiconClass(icon: string): string {
    return icon.startsWith('codicon-') ? icon : `codicon-${icon}`;
}

function renderHeaderActionButton(
    id: string,
    label: string,
    icon: string,
    extraClass = ''
): string {
    const className = ['webview-header-action-btn', extraClass].filter(Boolean).join(' ');
    return `<button type="button" id="${id}" class="${className}" aria-label="${label}">
                <span class="codicon ${codiconClass(icon)}" aria-hidden="true"></span>
                <span class="webview-header-action-label">${label}</span>
            </button>`;
}

/**
 * Markup aligned with React {@link WebviewHeader} (`.webview-header` + action buttons).
 */
export function buildLegacyHeaderFragment(options: LegacyDescribeHeaderOptions): string {
    const {
        titleInnerHtml,
        showViewYaml = true,
        showRefresh = true,
        helpContext = LEGACY_DESCRIBE_HELP_CONTEXT,
        refreshButtonId = 'refresh-btn',
        viewYamlButtonId = 'view-yaml-btn',
        helpButtonId = 'help-btn'
    } = options;

    const actions: string[] = [];
    if (showRefresh) {
        actions.push(renderHeaderActionButton(refreshButtonId, 'Refresh', 'refresh'));
    }
    if (showViewYaml) {
        actions.push(renderHeaderActionButton(viewYamlButtonId, 'View YAML', 'file-code'));
    }
    if (helpContext) {
        actions.push(
            renderHeaderActionButton(
                helpButtonId,
                'Help',
                'question',
                'webview-header-help-btn'
            )
        );
    }

    const actionsHtml = actions.length ? actions.join('\n                ') : '';

    return `<header class="webview-header">
            <div class="webview-header-title">
                <h1>${titleInnerHtml}</h1>
            </div>
            <div class="webview-header-actions">
                ${actionsHtml}
            </div>
        </header>`;
}

/**
 * Inline listeners for legacy header buttons (Refresh, View YAML, Help).
 */
export function buildLegacyHeaderActionScript(options: LegacyDescribeHeaderActionOptions = {}): string {
    const {
        showViewYaml = true,
        showRefresh = true,
        helpContext = LEGACY_DESCRIBE_HELP_CONTEXT,
        refreshButtonId = 'refresh-btn',
        viewYamlButtonId = 'view-yaml-btn',
        helpButtonId = 'help-btn'
    } = options;

    const blocks: string[] = [];
    if (showRefresh) {
        blocks.push(`        var refreshBtn = document.getElementById('${refreshButtonId}');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                vscode.postMessage({ command: 'refresh' });
            });
        }`);
    }
    if (showViewYaml) {
        blocks.push(`        var yamlBtn = document.getElementById('${viewYamlButtonId}');
        if (yamlBtn) {
            yamlBtn.addEventListener('click', function() {
                vscode.postMessage({ command: 'viewYaml' });
            });
        }`);
    }
    if (helpContext) {
        const contextJson = JSON.stringify(helpContext);
        blocks.push(`        var helpBtn = document.getElementById('${helpButtonId}');
        if (helpBtn) {
            helpBtn.addEventListener('click', function() {
                vscode.postMessage({ command: 'openHelp', context: ${contextJson} });
            });
        }`);
    }

    return blocks.join('\n');
}

const LEGACY_SHELL_LAYOUT_CSS = `
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 0;
            margin: 0;
        }
        .legacy-describe-shell {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }
        .legacy-describe-shell > .webview-header {
            flex-shrink: 0;
        }
        .legacy-describe-body {
            flex: 1 1 auto;
        }
`;

/**
 * Full HTML document for legacy describe generators: CSP, shipped header CSS, codicons, shared header.
 */
export function buildLegacyDescribeDocumentShell(options: LegacyDescribeDocumentShellOptions): string {
    const { webview, extensionUri, pageTitle, bodyHtml, panelCss = '', script = '', wrapScript = true } =
        options;

    const cspSource = webview.cspSource;
    const headerUri = getWebviewHeaderStyleUri(extensionUri, webview);
    const codiconsUri = getCodiconsStyleUri(extensionUri, webview);

    const scriptBlock =
        script.trim().length > 0
            ? wrapScript
                ? `<script>
    (function() {
        var vscode = acquireVsCodeApi();
${script}
    })();
    </script>`
                : `<script>${script}</script>`
            : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'unsafe-inline'; font-src ${cspSource};">
    <link href="${headerUri.toString()}" rel="stylesheet">
    <link href="${codiconsUri.toString()}" rel="stylesheet">
    <title>${pageTitle}</title>
    <style>
${LEGACY_SHELL_LAYOUT_CSS}
${panelCss}
    </style>
</head>
<body>
    <div class="legacy-describe-shell">
        <div class="legacy-describe-body">
${bodyHtml}
        </div>
    </div>
    ${scriptBlock}
</body>
</html>`;
}
