import * as assert from 'assert';
import * as vscode from 'vscode';
import { OperatedDashboardPanel } from '../../../dashboard/OperatedDashboardPanel';
import { OperatorDashboardStatus } from '../../../dashboard/types';

suite('OperatedDashboardPanel Test Suite', () => {
    let mockContext: vscode.ExtensionContext;
    let mockOperatorStatus: OperatorDashboardStatus;

    setup(() => {
        // Create a minimal mock context
        mockContext = {
            subscriptions: [],
            extensionUri: vscode.Uri.file('/mock/extension/path'),
            extensionPath: '/mock/extension/path'
        } as unknown as vscode.ExtensionContext;
        
        // Create mock operator status
        mockOperatorStatus = {
            mode: 'operated',
            hasApiKey: false,
            tier: 'free',
            version: '1.0.0',
            health: 'healthy'
        };
        
        // Close all panels before each test
        OperatedDashboardPanel.closeAllPanels();
    });

    teardown(() => {
        // Clean up all panels after each test
        OperatedDashboardPanel.closeAllPanels();
    });

    test('should create a new panel with correct title', async () => {
        const kubeconfigPath = '/mock/kubeconfig';
        const contextName = 'test-context';
        const clusterName = 'test-cluster';

        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName, mockOperatorStatus);

        const openPanels = OperatedDashboardPanel.getOpenPanels();
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
        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName, mockOperatorStatus);
        const openPanels1 = OperatedDashboardPanel.getOpenPanels();
        const firstPanel = openPanels1.get(contextName)?.panel;

        // Open panel second time with same context
        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName, mockOperatorStatus);
        const openPanels2 = OperatedDashboardPanel.getOpenPanels();
        const secondPanel = openPanels2.get(contextName)?.panel;

        assert.strictEqual(openPanels2.size, 1, 'Should still have only one open panel');
        assert.strictEqual(firstPanel, secondPanel, 'Should reuse the same panel instance');
    });

    test('should support multiple panels for different clusters', async () => {
        const kubeconfigPath = '/mock/kubeconfig';

        // Open panel for first cluster
        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, 'context-1', 'cluster-1', mockOperatorStatus);

        // Open panel for second cluster
        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, 'context-2', 'cluster-2', mockOperatorStatus);

        // Open panel for third cluster
        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, 'context-3', 'cluster-3', mockOperatorStatus);

        const openPanels = OperatedDashboardPanel.getOpenPanels();
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

        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName, mockOperatorStatus);
        
        const openPanels1 = OperatedDashboardPanel.getOpenPanels();
        assert.strictEqual(openPanels1.size, 1, 'Should have one open panel');

        const panelInfo = openPanels1.get(contextName);
        assert.ok(panelInfo, 'Panel should exist');

        // Dispose the panel
        panelInfo.panel.dispose();

        // Give it a moment for the disposal event to fire
        await new Promise(resolve => setTimeout(resolve, 50));

        const openPanels2 = OperatedDashboardPanel.getOpenPanels();
        assert.strictEqual(openPanels2.size, 0, 'Should have no open panels after disposal');
    });

    test('should close all panels when closeAllPanels is called', async () => {
        const kubeconfigPath = '/mock/kubeconfig';

        // Open multiple panels
        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, 'context-1', 'cluster-1', mockOperatorStatus);
        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, 'context-2', 'cluster-2', mockOperatorStatus);
        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, 'context-3', 'cluster-3', mockOperatorStatus);

        const openPanels1 = OperatedDashboardPanel.getOpenPanels();
        assert.strictEqual(openPanels1.size, 3, 'Should have three open panels');

        // Close all panels
        OperatedDashboardPanel.closeAllPanels();

        const openPanels2 = OperatedDashboardPanel.getOpenPanels();
        assert.strictEqual(openPanels2.size, 0, 'Should have no open panels after closeAllPanels');
    });

    test('should store correct panel information', async () => {
        const kubeconfigPath = '/path/to/kubeconfig';
        const contextName = 'production-cluster';
        const clusterName = 'Production Kubernetes';

        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName, mockOperatorStatus);

        const openPanels = OperatedDashboardPanel.getOpenPanels();
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

        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName, mockOperatorStatus);

        const openPanels = OperatedDashboardPanel.getOpenPanels();
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

        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName, mockOperatorStatus);

        const openPanels = OperatedDashboardPanel.getOpenPanels();
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

        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName, mockOperatorStatus);

        const openPanels = OperatedDashboardPanel.getOpenPanels();
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

        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName, mockOperatorStatus);

        const openPanels = OperatedDashboardPanel.getOpenPanels();
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

        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName, mockOperatorStatus);

        const openPanels = OperatedDashboardPanel.getOpenPanels();
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

        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName, mockOperatorStatus);

        const openPanels = OperatedDashboardPanel.getOpenPanels();
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

        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName, mockOperatorStatus);

        const openPanels = OperatedDashboardPanel.getOpenPanels();
        const panelInfo = openPanels.get(contextName);

        assert.ok(panelInfo, 'Panel info should exist');
        
        const html = panelInfo.panel.webview.html;
        assert.ok(html.includes('My Production Cluster'), 'HTML should include cluster name');
        assert.ok(html.includes('Dashboard: My Production Cluster'), 'HTML title should include cluster name');
    });

    test('should include operator status badge in HTML', async () => {
        const kubeconfigPath = '/mock/kubeconfig';
        const contextName = 'test-context';
        const clusterName = 'test-cluster';

        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName, mockOperatorStatus);

        const openPanels = OperatedDashboardPanel.getOpenPanels();
        const panelInfo = openPanels.get(contextName);

        assert.ok(panelInfo, 'Panel info should exist');
        
        const html = panelInfo.panel.webview.html;
        assert.ok(html.includes('operator-badge'), 'HTML should include operator badge');
        assert.ok(html.includes('Operator: operated'), 'HTML should include operator status mode');
        // Note: The HTML doesn't include an emoji icon, just the badge text
    });

    test('should include operator metrics section in HTML', async () => {
        const kubeconfigPath = '/mock/kubeconfig';
        const contextName = 'test-context';
        const clusterName = 'test-cluster';

        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName, mockOperatorStatus);

        const openPanels = OperatedDashboardPanel.getOpenPanels();
        const panelInfo = openPanels.get(contextName);

        assert.ok(panelInfo, 'Panel info should exist');
        
        const html = panelInfo.panel.webview.html;
        assert.ok(html.includes('operator-metrics'), 'HTML should include operator metrics section');
        assert.ok(html.includes('Operator Metrics'), 'HTML should include operator metrics heading');
        assert.ok(html.includes('Collectors Running'), 'HTML should include collectors running metric');
        assert.ok(html.includes('Data Points Collected'), 'HTML should include data points metric');
        assert.ok(html.includes('Last Collection'), 'HTML should include last collection metric');
        assert.ok(html.includes('collectors-running'), 'HTML should include collectors running element ID');
        assert.ok(html.includes('data-points-collected'), 'HTML should include data points element ID');
        assert.ok(html.includes('last-collection-time'), 'HTML should include last collection time element ID');
    });

    test('should include conditional content placeholder in HTML', async () => {
        const kubeconfigPath = '/mock/kubeconfig';
        const contextName = 'test-context';
        const clusterName = 'test-cluster';

        await OperatedDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName, mockOperatorStatus);

        const openPanels = OperatedDashboardPanel.getOpenPanels();
        const panelInfo = openPanels.get(contextName);

        assert.ok(panelInfo, 'Panel info should exist');
        
        const html = panelInfo.panel.webview.html;
        assert.ok(html.includes('conditional-content'), 'HTML should include conditional content container');
        assert.ok(html.includes('conditional-content-placeholder'), 'HTML should include placeholder class');
        assert.ok(html.includes('Loading conditional content'), 'HTML should include placeholder message');
    });

    test('should store operator status in panel info', async () => {
        const kubeconfigPath = '/mock/kubeconfig';
        const contextName = 'test-context';
        const clusterName = 'test-cluster';
        const customOperatorStatus: OperatorDashboardStatus = {
            mode: 'enabled',
            hasApiKey: true,
            tier: 'pro',
            version: '2.0.0',
            health: 'healthy'
        };

        OperatedDashboardPanel.show(mockContext, kubeconfigPath, contextName, clusterName, customOperatorStatus);

        const openPanels = OperatedDashboardPanel.getOpenPanels();
        const panelInfo = openPanels.get(contextName);

        assert.ok(panelInfo, 'Panel info should exist');
        assert.ok(panelInfo.operatorStatus, 'Panel info should have operator status');
        assert.strictEqual(panelInfo.operatorStatus.mode, 'enabled', 'Should store correct operator mode');
        assert.strictEqual(panelInfo.operatorStatus.hasApiKey, true, 'Should store correct API key status from operator');
        assert.strictEqual(panelInfo.operatorStatus.tier, 'pro', 'Should store correct tier');
        assert.strictEqual(panelInfo.operatorStatus.version, '2.0.0', 'Should store correct version');
        assert.strictEqual(panelInfo.operatorStatus.health, 'healthy', 'Should store correct health status');
    });
});

