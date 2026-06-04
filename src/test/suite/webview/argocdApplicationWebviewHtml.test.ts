import * as assert from 'assert';
import * as vscode from 'vscode';
import { ArgoCDApplicationWebviewProvider } from '../../../webview/ArgoCDApplicationWebviewProvider';

suite('ArgoCDApplicationWebviewProvider HTML shell', () => {
    function makeWebview(): vscode.Webview {
        return {
            cspSource: 'vscode-webview://test',
            asWebviewUri: (uri: vscode.Uri) => uri
        } as vscode.Webview;
    }

    test('getWebviewContent links codicons and shipped header CSS with font-src CSP', () => {
        const extensionContext = {
            extensionUri: vscode.Uri.file('/tmp/kube9-vscode')
        } as vscode.ExtensionContext;
        const webview = makeWebview();

        const getWebviewContent = (
            ArgoCDApplicationWebviewProvider as unknown as {
                getWebviewContent: (
                    w: vscode.Webview,
                    c: vscode.ExtensionContext
                ) => string;
            }
        ).getWebviewContent;

        const html = getWebviewContent(webview, extensionContext);

        assert.ok(html.includes('codicon.css'), 'expected codicons stylesheet link');
        assert.ok(
            html.includes('media/styles/webview-header.css'),
            'expected shipped webview-header.css link'
        );
        assert.ok(html.includes('font-src'), 'expected font-src in CSP for codicon fonts');
        assert.ok(!html.includes('src/webview/styles/webview-header.css'));
    });
});
