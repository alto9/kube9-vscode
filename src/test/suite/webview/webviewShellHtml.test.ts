import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { getCodiconsStyleUri, getWebviewShellHtml } from '../../../webview/webviewShellHtml';

suite('webviewShellHtml', () => {
    function makeContext(extensionPath: string): vscode.ExtensionContext {
        return {
            extensionPath,
            extensionUri: vscode.Uri.file(extensionPath)
        } as vscode.ExtensionContext;
    }

    function makeWebview(): vscode.Webview {
        return {
            cspSource: 'vscode-webview://test',
            asWebviewUri: (uri: vscode.Uri) => uri
        } as vscode.Webview;
    }

    test('includes codicons, inline header CSS, and shell class on #root', () => {
        const extensionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'kube9-shell-'));
        const stylesDir = path.join(extensionPath, 'media', 'styles');
        fs.mkdirSync(stylesDir, { recursive: true });
        fs.writeFileSync(
            path.join(stylesDir, 'webview-header.css'),
            '.webview-header { display: flex; }',
            'utf8'
        );

        const context = makeContext(extensionPath);
        const webview = makeWebview();
        const scriptUri = vscode.Uri.joinPath(context.extensionUri, 'media', 'app', 'main.js');

        const html = getWebviewShellHtml(webview, context, {
            extensionContext: context,
            webview,
            scriptUri,
            pageTitle: 'Test Panel',
            nonce: 'test-nonce',
            shellClass: 'health-report',
            headerCssMode: 'inline',
            cspProfile: 'report'
        });

        assert.ok(html.includes('codicon.css'));
        assert.ok(html.includes('.webview-header { display: flex; }'));
        assert.ok(html.includes('<div id="root" class="health-report">'));
        assert.ok(html.includes("script-src 'nonce-test-nonce'"));
        assert.ok(html.includes('connect-src'));
    });

    test('getCodiconsStyleUri points at bundled codicons css', () => {
        const extensionUri = vscode.Uri.file(path.join(os.tmpdir(), 'kube9-ext'));
        const webview = makeWebview();
        const uri = getCodiconsStyleUri(extensionUri, webview);
        assert.ok(uri.fsPath.includes(path.join('node_modules', '@vscode', 'codicons', 'dist', 'codicon.css')));
    });

    test('link header mode emits header stylesheet link', () => {
        const extensionPath = fs.mkdtempSync(path.join(os.tmpdir(), 'kube9-shell-link-'));
        const stylesDir = path.join(extensionPath, 'media', 'styles');
        fs.mkdirSync(stylesDir, { recursive: true });
        fs.writeFileSync(path.join(stylesDir, 'webview-header.css'), '.webview-header {}', 'utf8');

        const context = makeContext(extensionPath);
        const webview = makeWebview();
        const html = getWebviewShellHtml(webview, context, {
            extensionContext: context,
            webview,
            scriptUri: vscode.Uri.joinPath(context.extensionUri, 'main.js'),
            pageTitle: 'Link mode',
            nonce: 'n',
            headerCssMode: 'link',
            cspProfile: 'describe'
        });

        assert.ok(html.includes('media/styles/webview-header.css'));
        assert.ok(!html.includes('<style>'));
    });
});
