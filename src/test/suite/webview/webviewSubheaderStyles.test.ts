import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

function resolveWebviewHeaderCssPath(): string {
    const candidates = [
        path.join(process.cwd(), 'src', 'webview', 'styles', 'webview-header.css'),
        path.join(process.cwd(), 'media', 'styles', 'webview-header.css')
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    throw new Error(
        `webview-header.css not found (tried: ${candidates.join(', ')})`
    );
}

suite('webviewSubheaderStyles', () => {
    test('webview-header.css defines subheader row tokens', () => {
        const css = fs.readFileSync(resolveWebviewHeaderCssPath(), 'utf8');
        assert.ok(css.includes('.webview-subheader'), 'missing .webview-subheader');
        assert.ok(css.includes('.webview-subheader-actions'), 'missing .webview-subheader-actions');
        assert.ok(
            css.includes('var(--vscode-editor-background)'),
            'subheader should use editor background'
        );
        assert.ok(css.includes('var(--vscode-panel-border)'), 'subheader should use panel border');
    });
});
