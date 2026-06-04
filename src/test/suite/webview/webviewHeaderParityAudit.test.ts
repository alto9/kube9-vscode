import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

const WEBVIEW_SRC = path.join(process.cwd(), 'src', 'webview');

function readWebviewSource(relativePath: string): string {
    const fullPath = path.join(WEBVIEW_SRC, relativePath);
    assert.ok(fs.existsSync(fullPath), `expected source at ${relativePath}`);
    return fs.readFileSync(fullPath, 'utf8');
}

function assertDescribeHeaderParity(appPath: string): void {
    const source = readWebviewSource(appPath);
    assert.ok(
        source.includes('helpContext="describe-webview"'),
        `${appPath} must set describe-webview help context`
    );
    assert.ok(source.includes('codicon-refresh'), `${appPath} must use codicon-refresh on Refresh`);
    assert.ok(source.includes('codicon-file-code'), `${appPath} must use codicon-file-code on View YAML`);
    const refreshMatches = source.match(/label:\s*['"]Refresh['"]/g) ?? [];
    assert.ok(refreshMatches.length >= 1, `${appPath} must expose Refresh in header actions`);
    const yamlMatches = source.match(/label:\s*['"]View YAML['"]/g) ?? [];
    assert.ok(yamlMatches.length >= 1, `${appPath} must expose View YAML in header actions`);
}

suite('webviewHeaderParityAudit @unit', () => {
    const describeApps = [
        'pod-describe/PodDescribeApp.tsx',
        'service-describe/ServiceDescribeApp.tsx',
        'configmap-describe/ConfigMapDescribeApp.tsx',
        'secret-describe/SecretDescribeApp.tsx',
        'pvc-describe/PVCDescribeApp.tsx',
        'pv-describe/PVDescribeApp.tsx',
        'storageclass-describe/StorageClassDescribeApp.tsx',
        'crd-describe/CRDDescribeApp.tsx'
    ];

    for (const appPath of describeApps) {
        test(`${appPath} matches describe header contract`, () => {
            assertDescribeHeaderParity(appPath);
        });
    }

    test('operator health report uses themed refresh and help context', () => {
        const source = readWebviewSource('operator-health-report/index.tsx');
        assert.ok(source.includes('helpContext="operator-health-report"'));
        assert.ok(source.includes('codicon-refresh'));
    });

    test('well-architected report uses themed refresh and help context', () => {
        const source = readWebviewSource('well-architected-assessment-report/index.tsx');
        assert.ok(source.includes('helpContext="well-architected-assessment"'));
        assert.ok(source.includes('codicon-refresh'));
    });

    test('helm package manager header is help-only', () => {
        const source = readWebviewSource('helm-package-manager/HelmPackageManager.tsx');
        assert.ok(source.includes('helpContext="helm-package-manager"'));
        assert.ok(!source.includes("label: 'Refresh'"), 'Helm header must not add Refresh');
        assert.ok(!source.includes('label: "Refresh"'), 'Helm header must not add Refresh');
    });

    test('pod logs header exposes search and help with codicons shell', () => {
        const appSource = readWebviewSource('pod-logs/App.tsx');
        assert.ok(appSource.includes('helpContext="pod-logs"'));
        assert.ok(appSource.includes('codicon-search'));

        const panelSource = readWebviewSource('PodLogsViewerPanel.ts');
        assert.ok(panelSource.includes('getWebviewShellHtml'));
        assert.ok(panelSource.includes("shellClass: 'pod-logs-viewer'"));
    });

    test('describe webpack shell uses shared helper not src/styles path', () => {
        const source = readWebviewSource('DescribeWebview.ts');
        assert.ok(source.includes('getWebviewShellHtml'));
        assert.ok(!source.includes('src/webview/styles/webview-header'));
    });
});
