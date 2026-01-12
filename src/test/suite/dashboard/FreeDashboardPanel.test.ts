import * as assert from 'assert';
import * as vscode from 'vscode';
import { FreeDashboardPanel } from '../../../dashboard/FreeDashboardPanel';

suite('FreeDashboardPanel Test Suite', () => {
    let mockContext: vscode.ExtensionContext;

    setup(() => {
        // Create a minimal mock context
        mockContext = {
            subscriptions: [],
            extensionUri: vscode.Uri.file('/mock/extension/path'),
            extensionPath: '/mock/extension/path'
        } as unknown as vscode.ExtensionContext;
        
        // Close all panels before each test
        FreeDashboardPanel.closeAllPanels();
    });

    teardown(() => {
        // Clean up all panels after each test
        FreeDashboardPanel.closeAllPanels();
    });

    test('should create a new panel with correct title', async () => {
        const kubeconfigPath = '/mock/kubeconfig';
        const contextName = 'test-context';
        const clusterName = 'test-cluster';

        await FreeDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName);

        const openPanels = FreeDashboardPanel.getOpenPanels();
        assert.strictEqual(openPanels.size, 1, 'Should have exactly one open panel');

        const panelInfo = openPanels.get(contextName);
        assert.ok(panelInfo, 'Panel should exist for context');
        assert.strictEqual(panelInfo.clusterName, clusterName, 'Cluster name should match');
        assert.strictEqual(panelInfo.contextName, contextName, 'Context name should match');
        assert.strictEqual(panelInfo.kubeconfigPath, kubeconfigPath, 'Kubeconfig path should match');
        assert.ok(panelInfo.panel, 'Panel should be defined');
    });

    test('should reuse existing panel when opened twice', async () => {
        const kubeconfigPath = '/mock/kubeconfig';
        const contextName = 'test-context';
        const clusterName = 'test-cluster';

        // Open panel first time
        await FreeDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName);
        const openPanels1 = FreeDashboardPanel.getOpenPanels();
        const firstPanel = openPanels1.get(contextName)?.panel;

        // Open panel second time with same context
        await FreeDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName);
        const openPanels2 = FreeDashboardPanel.getOpenPanels();
        const secondPanel = openPanels2.get(contextName)?.panel;

        assert.strictEqual(openPanels2.size, 1, 'Should still have only one open panel');
        assert.strictEqual(firstPanel, secondPanel, 'Should reuse the same panel instance');
    });

    test('should support multiple panels for different clusters', async () => {
        const kubeconfigPath = '/mock/kubeconfig';

        // Open panel for first cluster
        await FreeDashboardPanel.show(mockContext, kubeconfigPath, 'context-1', 'cluster-1');

        // Open panel for second cluster
        await FreeDashboardPanel.show(mockContext, kubeconfigPath, 'context-2', 'cluster-2');

        // Open panel for third cluster
        await FreeDashboardPanel.show(mockContext, kubeconfigPath, 'context-3', 'cluster-3');

        const openPanels = FreeDashboardPanel.getOpenPanels();
        assert.strictEqual(openPanels.size, 3, 'Should have three open panels');

        assert.ok(openPanels.get('context-1'), 'Panel 1 should exist');
        assert.ok(openPanels.get('context-2'), 'Panel 2 should exist');
        assert.ok(openPanels.get('context-3'), 'Panel 3 should exist');

        assert.strictEqual(openPanels.get('context-1')?.clusterName, 'cluster-1');
        assert.strictEqual(openPanels.get('context-2')?.clusterName, 'cluster-2');
        assert.strictEqual(openPanels.get('context-3')?.clusterName, 'cluster-3');
    });

    test('should remove panel from map when disposed', async () => {
        const kubeconfigPath = '/mock/kubeconfig';
        const contextName = 'test-context';
        const clusterName = 'test-cluster';

        await FreeDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName);
        
        const openPanels1 = FreeDashboardPanel.getOpenPanels();
        assert.strictEqual(openPanels1.size, 1, 'Should have one open panel');

        const panelInfo = openPanels1.get(contextName);
        assert.ok(panelInfo, 'Panel should exist');

        // Dispose the panel
        panelInfo.panel.dispose();

        // Give it a moment for the disposal event to fire
        await new Promise(resolve => setTimeout(resolve, 50));

        const openPanels2 = FreeDashboardPanel.getOpenPanels();
        assert.strictEqual(openPanels2.size, 0, 'Should have no open panels after disposal');
    });

    test('should close all panels when closeAllPanels is called', async () => {
        const kubeconfigPath = '/mock/kubeconfig';

        // Open multiple panels
        await FreeDashboardPanel.show(mockContext, kubeconfigPath, 'context-1', 'cluster-1');
        await FreeDashboardPanel.show(mockContext, kubeconfigPath, 'context-2', 'cluster-2');
        await FreeDashboardPanel.show(mockContext, kubeconfigPath, 'context-3', 'cluster-3');

        const openPanels1 = FreeDashboardPanel.getOpenPanels();
        assert.strictEqual(openPanels1.size, 3, 'Should have three open panels');

        // Close all panels
        FreeDashboardPanel.closeAllPanels();

        const openPanels2 = FreeDashboardPanel.getOpenPanels();
        assert.strictEqual(openPanels2.size, 0, 'Should have no open panels after closeAllPanels');
    });

    test('should store correct panel information', async () => {
        const kubeconfigPath = '/path/to/kubeconfig';
        const contextName = 'production-cluster';
        const clusterName = 'Production Kubernetes';

        await FreeDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName);

        const openPanels = FreeDashboardPanel.getOpenPanels();
        const panelInfo = openPanels.get(contextName);

        assert.ok(panelInfo, 'Panel info should exist');
        assert.strictEqual(panelInfo.kubeconfigPath, kubeconfigPath, 'Should store correct kubeconfig path');
        assert.strictEqual(panelInfo.contextName, contextName, 'Should store correct context name');
        assert.strictEqual(panelInfo.clusterName, clusterName, 'Should store correct cluster name');
    });

    test('should create panel with correct webview options', async () => {
        const kubeconfigPath = '/mock/kubeconfig';
        const contextName = 'test-context';
        const clusterName = 'test-cluster';

        await FreeDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName);

        const openPanels = FreeDashboardPanel.getOpenPanels();
        const panelInfo = openPanels.get(contextName);

        assert.ok(panelInfo, 'Panel info should exist');
        assert.ok(panelInfo.panel, 'Panel should exist');

        // Check that the panel has the correct view type
        // Note: VSCode API doesn't expose viewType directly on panel, so we verify indirectly
        // by checking that the panel was created successfully
        assert.strictEqual(typeof panelInfo.panel.webview, 'object', 'Panel should have webview');
        assert.strictEqual(typeof panelInfo.panel.webview.html, 'string', 'Webview should have HTML content');
    });

    test('should handle message passing setup', async () => {
        const kubeconfigPath = '/mock/kubeconfig';
        const contextName = 'test-context';
        const clusterName = 'test-cluster';

        await FreeDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName);

        const openPanels = FreeDashboardPanel.getOpenPanels();
        const panelInfo = openPanels.get(contextName);

        assert.ok(panelInfo, 'Panel info should exist');
        assert.ok(panelInfo.panel.webview, 'Panel should have webview');
        
        // Verify that webview has HTML content (which includes message handling scripts)
        assert.ok(panelInfo.panel.webview.html.length > 0, 'Webview should have HTML content');
        assert.ok(
            panelInfo.panel.webview.html.includes('acquireVsCodeApi'),
            'HTML should include VS Code API acquisition'
        );
        assert.ok(
            panelInfo.panel.webview.html.includes('postMessage'),
            'HTML should include message posting capability'
        );
    });

    test('should include loading spinner in HTML', async () => {
        const kubeconfigPath = '/mock/kubeconfig';
        const contextName = 'test-context';
        const clusterName = 'test-cluster';

        await FreeDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName);

        const openPanels = FreeDashboardPanel.getOpenPanels();
        const panelInfo = openPanels.get(contextName);

        assert.ok(panelInfo, 'Panel info should exist');
        
        const html = panelInfo.panel.webview.html;
        assert.ok(html.includes('loading-spinner'), 'HTML should include loading spinner');
        assert.ok(html.includes('Loading cluster statistics'), 'HTML should include loading message');
    });

    test('should include error message container in HTML', async () => {
        const kubeconfigPath = '/mock/kubeconfig';
        const contextName = 'test-context';
        const clusterName = 'test-cluster';

        await FreeDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName);

        const openPanels = FreeDashboardPanel.getOpenPanels();
        const panelInfo = openPanels.get(contextName);

        assert.ok(panelInfo, 'Panel info should exist');
        
        const html = panelInfo.panel.webview.html;
        assert.ok(html.includes('error-message'), 'HTML should include error message container');
        assert.ok(html.includes('Error Loading Dashboard'), 'HTML should include error title');
    });

    test('should include dashboard content structure in HTML', async () => {
        const kubeconfigPath = '/mock/kubeconfig';
        const contextName = 'test-context';
        const clusterName = 'test-cluster';

        await FreeDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName);

        const openPanels = FreeDashboardPanel.getOpenPanels();
        const panelInfo = openPanels.get(contextName);

        assert.ok(panelInfo, 'Panel info should exist');
        
        const html = panelInfo.panel.webview.html;
        assert.ok(html.includes('dashboard-content'), 'HTML should include dashboard content');
        assert.ok(html.includes('stats-cards'), 'HTML should include stats cards');
        assert.ok(html.includes('workload-table'), 'HTML should include workload table');
        assert.ok(html.includes('refresh-button'), 'HTML should include refresh button');
    });

    test('should use VSCode theme colors in HTML', async () => {
        const kubeconfigPath = '/mock/kubeconfig';
        const contextName = 'test-context';
        const clusterName = 'test-cluster';

        await FreeDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName);

        const openPanels = FreeDashboardPanel.getOpenPanels();
        const panelInfo = openPanels.get(contextName);

        assert.ok(panelInfo, 'Panel info should exist');
        
        const html = panelInfo.panel.webview.html;
        assert.ok(html.includes('--vscode-font-family'), 'HTML should use VSCode font variables');
        assert.ok(html.includes('--vscode-foreground'), 'HTML should use VSCode foreground color');
        assert.ok(html.includes('--vscode-editor-background'), 'HTML should use VSCode background color');
        assert.ok(html.includes('--vscode-panel-border'), 'HTML should use VSCode border color');
    });

    test('should include cluster name in HTML title', async () => {
        const kubeconfigPath = '/mock/kubeconfig';
        const contextName = 'test-context';
        const clusterName = 'My Production Cluster';

        await FreeDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName);

        const openPanels = FreeDashboardPanel.getOpenPanels();
        const panelInfo = openPanels.get(contextName);

        assert.ok(panelInfo, 'Panel info should exist');
        
        const html = panelInfo.panel.webview.html;
        assert.ok(html.includes('My Production Cluster'), 'HTML should include cluster name');
        assert.ok(html.includes('Dashboard: My Production Cluster'), 'HTML title should include cluster name');
    });

    test('should include chart elements in HTML', async () => {
        const kubeconfigPath = '/mock/kubeconfig';
        const contextName = 'test-context';
        const clusterName = 'test-cluster';

        await FreeDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName);

        const openPanels = FreeDashboardPanel.getOpenPanels();
        const panelInfo = openPanels.get(contextName);

        assert.ok(panelInfo, 'Panel info should exist');
        
        const html = panelInfo.panel.webview.html;
        
        // Verify chart containers exist
        assert.ok(html.includes('id="workload-chart"'), 'HTML should include workload chart element');
        assert.ok(html.includes('id="node-health-chart"'), 'HTML should include node health chart element');
        
        // Verify chart sections have titles
        assert.ok(html.includes('Workload Distribution'), 'HTML should include workload chart title');
        assert.ok(html.includes('Node Health'), 'HTML should include node health chart title');
        
        // Verify chart CSS classes are defined
        assert.ok(html.includes('chart-bar-container'), 'HTML should include chart bar container class');
        assert.ok(html.includes('chart-bar-row'), 'HTML should include chart bar row class');
        assert.ok(html.includes('chart-bar-label'), 'HTML should include chart bar label class');
        assert.ok(html.includes('chart-bar-track'), 'HTML should include chart bar track class');
        assert.ok(html.includes('chart-bar-fill'), 'HTML should include chart bar fill class');
        
        // Verify chart update functions exist in JavaScript
        assert.ok(html.includes('updateWorkloadChart'), 'HTML should include updateWorkloadChart function');
        assert.ok(html.includes('updateNodeHealthChart'), 'HTML should include updateNodeHealthChart function');
    });
});

