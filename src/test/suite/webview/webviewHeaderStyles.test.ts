import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
    getWebviewHeaderCssForInline,
    getWebviewHeaderCssPath,
    getWebviewHeaderStyleUri
} from '../../../webview/webviewHeaderStyles';

suite('webviewHeaderStyles', () => {
    test('getWebviewHeaderCssPath points at media/styles', () => {
        const extensionPath = path.join(os.tmpdir(), 'kube9-test-ext');
        assert.strictEqual(
            getWebviewHeaderCssPath(extensionPath),
            path.join(extensionPath, 'media', 'styles', 'webview-header.css')
        );
    });

    test('getWebviewHeaderCssForInline returns empty and does not throw when file is missing', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kube9-header-'));
        assert.strictEqual(getWebviewHeaderCssForInline(dir), '');
    });

    test('getWebviewHeaderCssForInline reads shipped file', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kube9-header-'));
        const stylesDir = path.join(dir, 'media', 'styles');
        fs.mkdirSync(stylesDir, { recursive: true });
        const cssPath = path.join(stylesDir, 'webview-header.css');
        fs.writeFileSync(cssPath, '/* note */ .webview-header { color: red; }', 'utf8');
        assert.strictEqual(
            getWebviewHeaderCssForInline(dir, { stripBlockComments: true }).trim(),
            '.webview-header { color: red; }'
        );
    });

    test('getWebviewHeaderStyleUri uses media/styles path', () => {
        const extensionUri = vscode.Uri.file(path.join(os.tmpdir(), 'kube9-ext'));
        const webview = {
            asWebviewUri: (uri: vscode.Uri) => uri
        } as vscode.Webview;
        const uri = getWebviewHeaderStyleUri(extensionUri, webview);
        assert.ok(uri.fsPath.endsWith(path.join('media', 'styles', 'webview-header.css')));
    });
});
