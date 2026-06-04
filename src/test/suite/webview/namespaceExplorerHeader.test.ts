import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

const WEBVIEW_SRC = path.join(process.cwd(), 'src', 'webview');

suite('namespaceExplorerHeader @unit', () => {
    test('namespace.html uses single webview-header row without duplicate title band', () => {
        const html = fs.readFileSync(path.join(WEBVIEW_SRC, 'namespace.html'), 'utf8');

        assert.ok(html.includes('webview-header namespace-explorer-header'));
        assert.ok(html.includes('id="namespace-header-title"'));
        assert.ok(html.includes('codicon-file-code'));
        assert.ok(html.includes('webview-header-action-btn'));
        assert.ok(!html.includes('class="namespace-header"'));
        assert.ok(!html.includes('class="namespace-title"'));
        assert.ok(!html.includes('id="namespace-title"'));
        assert.ok(!html.includes('class="namespace-header"'));
        assert.ok(html.includes('<h2>Workloads</h2>'));
    });

    test('NamespaceWebview injects shipped header assets and media roots', () => {
        const source = fs.readFileSync(path.join(WEBVIEW_SRC, 'NamespaceWebview.ts'), 'utf8');

        assert.ok(source.includes('buildLegacyDescribeHeadAssets'));
        assert.ok(source.includes('getLegacyDescribeLocalResourceRoots'));
        assert.ok(source.includes('NAMESPACE_ACTIONS_CLASS'));
        assert.ok(!source.includes('{{CSP_SOURCE}}'));
    });
});
