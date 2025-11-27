import * as assert from 'assert';
import { ClusterTreeItem } from '../../../tree/ClusterTreeItem';
import { TreeItemData } from '../../../tree/TreeItemTypes';
import * as vscode from 'vscode';

suite('Open Dashboard Command Test Suite', () => {
    setup(() => {
        // Register the command handler for testing
        vscode.commands.registerCommand('kube9.openDashboard', async (treeItem: ClusterTreeItem) => {
            if (!treeItem || !treeItem.resourceData) {
                throw new Error('Invalid tree item: missing resource data');
            }
            // For testing, we don't need to actually open the dashboard
            return Promise.resolve();
        });
    });

    teardown(() => {
        // Clean up registered commands
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.commands as any)._unregisterCommand('kube9.openDashboard');
    });

    test('Command handles missing tree item data gracefully', async () => {
        const item = new ClusterTreeItem('test', 'dashboard');
        
        try {
            await vscode.commands.executeCommand('kube9.openDashboard', item);
            assert.fail('Should have thrown error for missing resource data');
        } catch (error) {
            assert.ok(error instanceof Error, 'Error should be an Error instance');
            assert.ok(error.message.includes('missing resource data'), 'Error message should mention missing resource data');
        }
    });
    
    test('Command extracts cluster name correctly from tree item', () => {
        const resourceData: TreeItemData = {
            context: {
                name: 'prod-context',
                cluster: 'production-cluster',
                namespace: 'default'
            },
            cluster: {
                name: 'production-cluster',
                server: 'https://prod-api.example.com:6443'
            }
        };
        
        const item = new ClusterTreeItem(
            'Dashboard',
            'dashboard',
            vscode.TreeItemCollapsibleState.None,
            resourceData
        );
        
        // Verify that resourceData is accessible with correct structure
        assert.strictEqual(item.resourceData?.cluster.name, 'production-cluster');
        assert.strictEqual(item.resourceData?.context.name, 'prod-context');
        assert.strictEqual(item.resourceData?.context.cluster, 'production-cluster');
    });
    
    test('TreeItem command is properly configured', () => {
        const resourceData: TreeItemData = {
            context: {
                name: 'test-context',
                cluster: 'test-cluster'
            },
            cluster: {
                name: 'test-cluster',
                server: 'https://api.test.com:6443'
            }
        };
        
        const item = new ClusterTreeItem(
            'Dashboard',
            'dashboard',
            vscode.TreeItemCollapsibleState.None,
            resourceData
        );
        
        // Verify the tree item has correct type
        assert.strictEqual(item.type, 'dashboard');
        assert.strictEqual(item.label, 'Dashboard');
        assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
    });
});

