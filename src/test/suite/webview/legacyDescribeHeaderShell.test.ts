import * as assert from 'assert';
import * as vscode from 'vscode';
import {
    buildLegacyDescribeDocumentShell,
    buildLegacyDescribeHeadAssets,
    buildLegacyHeaderActionScript,
    buildLegacyHeaderFragment,
    LEGACY_DESCRIBE_HELP_CONTEXT
} from '../../../webview/legacyDescribeHeaderShell';

suite('legacyDescribeHeaderShell @unit', () => {
    const extensionUri = vscode.Uri.file('/tmp/kube9-extension');

    test('buildLegacyHeaderFragment uses shared webview-header classes and codicons', () => {
        const html = buildLegacyHeaderFragment({
            titleInnerHtml: 'Deployment / <span id="deployment-name">app</span>'
        });

        assert.ok(html.includes('class="webview-header"'));
        assert.ok(html.includes('codicon-refresh'));
        assert.ok(html.includes('codicon-file-code'));
        assert.ok(html.includes('codicon-question'));
        assert.ok(html.includes('id="refresh-btn"'));
        assert.ok(html.includes('id="view-yaml-btn"'));
        assert.ok(html.includes('id="help-btn"'));
    });

    test('buildLegacyHeaderActionScript posts legacy openHelp command', () => {
        const script = buildLegacyHeaderActionScript({
            helpContext: LEGACY_DESCRIBE_HELP_CONTEXT,
            showRefresh: false
        });

        assert.ok(script.includes("command: 'viewYaml'"));
        assert.ok(script.includes("command: 'openHelp', context: \"describe-webview\""));
        assert.ok(!script.includes("command: 'refresh'"));
    });

    test('buildLegacyDescribeDocumentShell links shipped header and codicon CSS', () => {
        const webview = {
            cspSource: 'vscode-webview://authority',
            asWebviewUri: (uri: vscode.Uri) => uri
        } as vscode.Webview;

        const html = buildLegacyDescribeDocumentShell({
            webview,
            extensionUri,
            pageTitle: 'Test',
            bodyHtml: '<div class="container">body</div>',
            panelCss: '.container { padding: 0; }',
            script: '/* noop */',
            wrapScript: false
        });

        assert.ok(html.includes('webview-header.css'));
        assert.ok(html.includes('codicon.css'));
        assert.ok(!html.includes('src/webview/styles/webview-header.css'));
        assert.ok(html.includes('font-src vscode-webview://authority'));
    });

    test('buildLegacyDescribeHeadAssets matches document shell CSP profile', () => {
        const webview = {
            cspSource: 'vscode-webview://authority',
            asWebviewUri: (uri: vscode.Uri) => uri
        } as vscode.Webview;

        const { csp, headerLink, codiconsLink } = buildLegacyDescribeHeadAssets(webview, extensionUri);
        assert.ok(csp.includes("style-src vscode-webview://authority 'unsafe-inline'"));
        assert.ok(headerLink.includes('webview-header.css'));
        assert.ok(codiconsLink.includes('codicon.css'));
    });
});
