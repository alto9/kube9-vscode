import * as assert from 'assert';
import { ClusterTreeItem, ClusterStatus, TreeItemType } from '../../../tree/ClusterTreeItem';
import * as vscode from '../../mocks/vscode';

suite('ClusterTreeItem Test Suite', () => {
    suite('Constructor and Basic Properties', () => {
        test('Should create a cluster tree item with required parameters', () => {
            const item = new ClusterTreeItem(
                'test-cluster',
                'cluster',
                vscode.TreeItemCollapsibleState.Collapsed
            );

            assert.strictEqual(item.label, 'test-cluster');
            assert.strictEqual(item.type, 'cluster');
            assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
            assert.strictEqual(item.contextValue, 'cluster');
        });

        test('Should create a namespace tree item', () => {
            const item = new ClusterTreeItem(
                'default',
                'namespace',
                vscode.TreeItemCollapsibleState.None
            );

            assert.strictEqual(item.label, 'default');
            assert.strictEqual(item.type, 'namespace');
            assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
            assert.strictEqual(item.contextValue, 'namespace');
        });

        test('Should create an allNamespaces tree item', () => {
            const item = new ClusterTreeItem(
                'All Namespaces',
                'allNamespaces',
                vscode.TreeItemCollapsibleState.None
            );

            assert.strictEqual(item.label, 'All Namespaces');
            assert.strictEqual(item.type, 'allNamespaces');
            assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
            assert.strictEqual(item.contextValue, 'allNamespaces');
        });

        test('Should create an info tree item', () => {
            const item = new ClusterTreeItem(
                'No clusters detected',
                'info',
                vscode.TreeItemCollapsibleState.None
            );

            assert.strictEqual(item.label, 'No clusters detected');
            assert.strictEqual(item.type, 'info');
            assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
            assert.strictEqual(item.contextValue, 'info');
        });
    });

    suite('Resource Data', () => {
        test('Should store resourceData when provided', () => {
            const resourceData = {
                context: {
                    name: 'test-context',
                    cluster: 'test-cluster',
                    namespace: 'default'
                },
                cluster: {
                    name: 'test-cluster',
                    server: 'https://api.test.com:6443'
                }
            };

            const item = new ClusterTreeItem(
                'test-cluster',
                'cluster',
                vscode.TreeItemCollapsibleState.Collapsed,
                resourceData
            );

            assert.ok(item.resourceData);
            assert.strictEqual(item.resourceData.context.name, 'test-context');
            assert.strictEqual(item.resourceData.context.cluster, 'test-cluster');
            assert.strictEqual(item.resourceData.context.namespace, 'default');
            assert.strictEqual(item.resourceData.cluster.name, 'test-cluster');
            assert.strictEqual(item.resourceData.cluster.server, 'https://api.test.com:6443');
        });

        test('Should handle resourceData without optional namespace', () => {
            const resourceData = {
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
                'test-cluster',
                'cluster',
                vscode.TreeItemCollapsibleState.Collapsed,
                resourceData
            );

            assert.ok(item.resourceData);
            assert.strictEqual(item.resourceData.context.namespace, undefined);
        });

        test('Should allow undefined resourceData', () => {
            const item = new ClusterTreeItem(
                'test-item',
                'info',
                vscode.TreeItemCollapsibleState.None
            );

            assert.strictEqual(item.resourceData, undefined);
        });
    });

    suite('Status Property', () => {
        test('Should allow setting status on cluster items', () => {
            const item = new ClusterTreeItem(
                'test-cluster',
                'cluster',
                vscode.TreeItemCollapsibleState.Collapsed
            );

            assert.strictEqual(item.status, undefined);

            item.status = ClusterStatus.Connected;
            assert.strictEqual(item.status, ClusterStatus.Connected);
        });

        test('Should support all ClusterStatus values', () => {
            const item = new ClusterTreeItem(
                'test-cluster',
                'cluster',
                vscode.TreeItemCollapsibleState.Collapsed
            );

            item.status = ClusterStatus.Connected;
            assert.strictEqual(item.status, ClusterStatus.Connected);

            item.status = ClusterStatus.Disconnected;
            assert.strictEqual(item.status, ClusterStatus.Disconnected);

            item.status = ClusterStatus.Unknown;
            assert.strictEqual(item.status, ClusterStatus.Unknown);
        });
    });

    suite('Children Property', () => {
        test('Should allow setting children array', () => {
            const parent = new ClusterTreeItem(
                'parent',
                'cluster',
                vscode.TreeItemCollapsibleState.Collapsed
            );

            const child1 = new ClusterTreeItem(
                'child1',
                'namespace',
                vscode.TreeItemCollapsibleState.None
            );

            const child2 = new ClusterTreeItem(
                'child2',
                'namespace',
                vscode.TreeItemCollapsibleState.None
            );

            assert.strictEqual(parent.children, undefined);

            parent.children = [child1, child2];
            assert.ok(Array.isArray(parent.children));
            assert.strictEqual(parent.children.length, 2);
            assert.strictEqual(parent.children[0], child1);
            assert.strictEqual(parent.children[1], child2);
        });

        test('Should allow empty children array', () => {
            const item = new ClusterTreeItem(
                'test',
                'cluster',
                vscode.TreeItemCollapsibleState.Collapsed
            );

            item.children = [];
            assert.ok(Array.isArray(item.children));
            assert.strictEqual(item.children.length, 0);
        });
    });

    suite('Collapsible States', () => {
        test('Should support None collapsible state', () => {
            const item = new ClusterTreeItem(
                'test',
                'namespace',
                vscode.TreeItemCollapsibleState.None
            );

            assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
        });

        test('Should support Collapsed collapsible state', () => {
            const item = new ClusterTreeItem(
                'test',
                'cluster',
                vscode.TreeItemCollapsibleState.Collapsed
            );

            assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
        });

        test('Should support Expanded collapsible state', () => {
            const item = new ClusterTreeItem(
                'test',
                'cluster',
                vscode.TreeItemCollapsibleState.Expanded
            );

            assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
        });

        test('Should default to None when not specified', () => {
            const item = new ClusterTreeItem(
                'test',
                'info'
            );

            assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
        });
    });

    suite('Type Checking', () => {
        test('Should correctly identify cluster type', () => {
            const item = new ClusterTreeItem(
                'test',
                'cluster',
                vscode.TreeItemCollapsibleState.Collapsed
            );

            assert.strictEqual(item.type, 'cluster');
            const typeIsCluster: boolean = item.type === 'cluster';
            assert.strictEqual(typeIsCluster, true);
        });

        test('Should correctly identify namespace type', () => {
            const item = new ClusterTreeItem(
                'test',
                'namespace',
                vscode.TreeItemCollapsibleState.None
            );

            assert.strictEqual(item.type, 'namespace');
            const typeIsNamespace: boolean = item.type === 'namespace';
            assert.strictEqual(typeIsNamespace, true);
        });

        test('Should correctly identify allNamespaces type', () => {
            const item = new ClusterTreeItem(
                'All Namespaces',
                'allNamespaces',
                vscode.TreeItemCollapsibleState.None
            );

            assert.strictEqual(item.type, 'allNamespaces');
            const typeIsAllNamespaces: boolean = item.type === 'allNamespaces';
            assert.strictEqual(typeIsAllNamespaces, true);
        });

        test('Should correctly identify info type', () => {
            const item = new ClusterTreeItem(
                'Info message',
                'info',
                vscode.TreeItemCollapsibleState.None
            );

            assert.strictEqual(item.type, 'info');
            const typeIsInfo: boolean = item.type === 'info';
            assert.strictEqual(typeIsInfo, true);
        });
    });

    suite('Context Value', () => {
        test('Should set contextValue equal to type', () => {
            const types: TreeItemType[] = ['cluster', 'namespace', 'allNamespaces', 'info'];

            types.forEach(type => {
                const item = new ClusterTreeItem(
                    'test',
                    type,
                    vscode.TreeItemCollapsibleState.None
                );

                assert.strictEqual(item.contextValue, type);
            });
        });
    });

    suite('TreeItem Extension', () => {
        test('Should extend vscode.TreeItem', () => {
            const item = new ClusterTreeItem(
                'test',
                'cluster',
                vscode.TreeItemCollapsibleState.Collapsed
            );

            // Check that it has TreeItem properties
            assert.ok('label' in item);
            assert.ok('collapsibleState' in item);
            assert.ok('contextValue' in item);
            
            // Inherited from TreeItem
            assert.ok(item instanceof vscode.TreeItem);
        });

        test('Should allow setting TreeItem properties', () => {
            const item = new ClusterTreeItem(
                'test',
                'cluster',
                vscode.TreeItemCollapsibleState.Collapsed
            );

            // Set optional TreeItem properties
            item.description = 'test-description';
            item.tooltip = 'test-tooltip';
            item.iconPath = new vscode.ThemeIcon('vm-active');

            assert.strictEqual(item.description, 'test-description');
            assert.strictEqual(item.tooltip, 'test-tooltip');
            assert.ok(item.iconPath instanceof vscode.ThemeIcon);
            assert.strictEqual((item.iconPath as vscode.ThemeIcon).id, 'vm-active');
        });

        test('Should allow setting command on TreeItem', () => {
            const item = new ClusterTreeItem(
                'test',
                'namespace',
                vscode.TreeItemCollapsibleState.None
            );

            const command = {
                command: 'kube9.describeNamespace',
                title: 'Describe Namespace',
                arguments: [item]
            };

            item.command = command;
            assert.ok(item.command);
            assert.strictEqual(item.command.command, 'kube9.describeNamespace');
            assert.strictEqual(item.command.title, 'Describe Namespace');
            assert.strictEqual(item.command.arguments?.[0], item);
        });
    });
});

