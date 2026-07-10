import * as assert from 'assert';
import * as vscode from '../../mocks/vscode';
import { ClusterTreeProvider } from '../../../tree/ClusterTreeProvider';
import { ClusterTreeItem } from '../../../tree/ClusterTreeItem';
import { ParsedKubeconfig } from '../../../kubernetes/KubeconfigParser';
import { TreeItemData } from '../../../tree/TreeItemTypes';
import { resetKubernetesApiClient } from '../../../kubernetes/apiClient';

function resourceData(overrides: Partial<TreeItemData> = {}): TreeItemData {
    return {
        context: { name: 'context-1', cluster: 'test-cluster-1' },
        cluster: { name: 'test-cluster-1', server: 'https://api.test1.com:6443' },
        ...overrides
    };
}

function treeItem(
    label: string,
    type: ClusterTreeItem['type'],
    data?: TreeItemData
): ClusterTreeItem {
    return new ClusterTreeItem(label, type, vscode.TreeItemCollapsibleState.Collapsed, data);
}

function mockKubeconfig(): ParsedKubeconfig {
    return {
        filePath: '/test/kubeconfig.yaml',
        clusters: [{ name: 'test-cluster-1', server: 'https://api.test1.com:6443' }],
        contexts: [{ name: 'context-1', cluster: 'test-cluster-1', user: 'user-1' }],
        users: [{ name: 'user-1' }],
        currentContext: 'context-1'
    };
}

suite('ClusterTreeProvider reveal', () => {
    let provider: ClusterTreeProvider;
    let providerInternals: {
        clusterItemsCache: Map<string, ClusterTreeItem>;
        getCategoryChildren: (category: ClusterTreeItem) => Promise<ClusterTreeItem[]>;
        treeView: { reveal: (item: ClusterTreeItem) => Promise<void> };
    };
    let revealedItem: ClusterTreeItem | undefined;
    let focusCommandCalls = 0;

    setup(() => {
        resetKubernetesApiClient();
        revealedItem = undefined;
        focusCommandCalls = 0;

        provider = new ClusterTreeProvider();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        providerInternals = provider as any;
        provider.setKubeconfig(mockKubeconfig());

        const clusterItem = treeItem('context-1', 'cluster', resourceData());
        providerInternals.clusterItemsCache.set('context-1', clusterItem);

        providerInternals.getCategoryChildren = async () => [];

        (vscode.commands as unknown as { _registerCommand: (id: string, fn: () => Promise<void>) => void })
            ._registerCommand('kube9ClusterView.focus', async () => {
                focusCommandCalls += 1;
            });

        const mockTreeView = {
            reveal: async (item: ClusterTreeItem) => {
                revealedItem = item;
            }
        };
        providerInternals.treeView = mockTreeView;
    });

    teardown(() => {
        provider.dispose();
    });

    test('revealTreeResource maps Deployment to workloads/deployments', async () => {
        const deployment = treeItem(
            'guestbook-ui',
            'deployment',
            resourceData({ resourceName: 'guestbook-ui', namespace: 'guestbook' })
        );

        providerInternals.getCategoryChildren = async (category) => {
            if (category.type === 'workloads') {
                return [treeItem('Deployments', 'deployments', resourceData())];
            }
            if (category.type === 'deployments') {
                return [deployment];
            }
            return [];
        };

        const revealed = await provider.revealTreeResource('Deployment', 'guestbook-ui', 'guestbook');

        assert.strictEqual(revealed, true);
        assert.strictEqual(revealedItem, deployment);
        assert.strictEqual(focusCommandCalls, 1);
    });

    test('revealTreeResource maps Service to networking/services', async () => {
        const service = treeItem(
            'guestbook-svc',
            'service',
            resourceData({ resourceName: 'guestbook-svc', namespace: 'guestbook' })
        );

        providerInternals.getCategoryChildren = async (category) => {
            if (category.type === 'networking') {
                return [treeItem('Services', 'services', resourceData())];
            }
            if (category.type === 'services') {
                return [service];
            }
            return [];
        };

        const revealed = await provider.revealTreeResource('Service', 'guestbook-svc', 'guestbook');

        assert.strictEqual(revealed, true);
        assert.strictEqual(revealedItem, service);
    });

    test('revealTreeResource maps ConfigMap to configuration/configmaps', async () => {
        const configMap = treeItem(
            'guestbook-config',
            'configmap',
            resourceData({ resourceName: 'guestbook-config', namespace: 'guestbook' })
        );

        providerInternals.getCategoryChildren = async (category) => {
            if (category.type === 'configuration') {
                return [treeItem('ConfigMaps', 'configmaps', resourceData())];
            }
            if (category.type === 'configmaps') {
                return [configMap];
            }
            return [];
        };

        const revealed = await provider.revealTreeResource('ConfigMap', 'guestbook-config', 'guestbook');

        assert.strictEqual(revealed, true);
        assert.strictEqual(revealedItem, configMap);
    });

    test('revealTreeResource returns false when resource is missing', async () => {
        providerInternals.getCategoryChildren = async (category) => {
            if (category.type === 'workloads') {
                return [treeItem('Deployments', 'deployments', resourceData())];
            }
            if (category.type === 'deployments') {
                return [];
            }
            return [];
        };

        const revealed = await provider.revealTreeResource('Deployment', 'missing', 'guestbook');

        assert.strictEqual(revealed, false);
        assert.strictEqual(revealedItem, undefined);
    });

    test('revealTreeApplication finds argocdApplication by name and namespace', async () => {
        const application = treeItem(
            'guestbook',
            'argocdApplication',
            resourceData({ resourceName: 'guestbook', namespace: 'argocd' })
        );

        providerInternals.getCategoryChildren = async (category) => {
            if (category.type === 'argocd') {
                return [application];
            }
            return [];
        };

        const cluster = providerInternals.clusterItemsCache.get('context-1');
        assert.ok(cluster);
        cluster.argoCDInstalled = true;

        const revealed = await provider.revealTreeApplication('guestbook', 'argocd');

        assert.strictEqual(revealed, true);
        assert.strictEqual(revealedItem, application);
        assert.strictEqual(focusCommandCalls, 1);
    });

    test('revealTreeApplication returns false when application is missing', async () => {
        providerInternals.getCategoryChildren = async (category) => {
            if (category.type === 'argocd') {
                return [];
            }
            return [];
        };

        const cluster = providerInternals.clusterItemsCache.get('context-1');
        assert.ok(cluster);
        cluster.argoCDInstalled = true;

        const revealed = await provider.revealTreeApplication('guestbook', 'argocd');

        assert.strictEqual(revealed, false);
        assert.strictEqual(revealedItem, undefined);
    });
});
