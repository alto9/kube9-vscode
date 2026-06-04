import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const SHIPPED_WEBVIEW_HEADER_CSS_SEGMENTS = ['media', 'styles', 'webview-header.css'] as const;

/** Absolute path to header CSS shipped in the VSIX (`media/styles/webview-header.css`). */
export function getWebviewHeaderCssPath(extensionPath: string): string {
    return path.join(extensionPath, ...SHIPPED_WEBVIEW_HEADER_CSS_SEGMENTS);
}

/** `asWebviewUri` for panels that load header CSS via `<link>`. */
export function getWebviewHeaderStyleUri(extensionUri: vscode.Uri, webview: vscode.Webview): vscode.Uri {
    return webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, ...SHIPPED_WEBVIEW_HEADER_CSS_SEGMENTS)
    );
}

/**
 * Read shipped header CSS for inline `<style>` blocks.
 * Source of truth for edits remains `src/webview/styles/webview-header.css` (copied at build).
 */
export function getWebviewHeaderCssForInline(
    extensionPath: string,
    options?: { stripBlockComments?: boolean }
): string {
    const headerCssPath = getWebviewHeaderCssPath(extensionPath);
    if (!fs.existsSync(headerCssPath)) {
        console.warn(`[kube9] Shipped webview header CSS not found at ${headerCssPath}`);
        return '';
    }
    let css = fs.readFileSync(headerCssPath, 'utf8');
    if (options?.stripBlockComments) {
        css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    }
    return css;
}
