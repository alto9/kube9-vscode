import * as assert from 'assert';
import * as vscode from 'vscode';
import * as k8s from '@kubernetes/client-node';
import { ClusterTreeItem } from '../../../tree/ClusterTreeItem';
import { TreeItemData } from '../../../tree/TreeItemTypes';
import { NamespaceTreeItem } from '../../../tree/items/NamespaceTreeItem';
import {
    PodTreeItem,
    PodInfo,
    PodStatus
} from '../../../tree/items/PodTreeItem';
import { resolveSpecializedDescribeFromTreeItem } from '../../../webview/describeTreeRouting';

const sampleContextName = 'ctx-1';

function baseResourceData(overrides: {
    namespace?: string;
    resourceName?: string;
} = {}): TreeItemData {
    return {
        context: { name: sampleContextName, cluster: 'cluster-1' },
        cluster: { name: 'cluster-1', server: 'https://example.test' },
        namespace: overrides.namespace,
        resourceName: overrides.resourceName
    };
}

suite('describeTreeRouting (context-menu Describe parity)', () => {
    test('Pod + PodTreeItem preserves status', () => {
        const podInfo: PodInfo = {
            name: 'p1',
            namespace: 'ns-a',
            status: 'Running' as PodStatus
        };
        const item = new PodTreeItem(podInfo, baseResourceData({ namespace: 'ns-a', resourceName: 'p1' }));

        const r = resolveSpecializedDescribeFromTreeItem(item);
        assert.strictEqual(r?.kind, 'pod');
        if (r?.kind === 'pod') {
            assert.strictEqual(r.podConfig.namespace, 'ns-a');
            assert.strictEqual(r.podConfig.context, sampleContextName);
            assert.strictEqual(r.podConfig.status, 'Running');
        }
    });

    test('Pod plain ClusterTreeItem uses Unknown status when not PodTreeItem', () => {
        const item = new ClusterTreeItem(
            'plain-pod',
            'pod',
            vscode.TreeItemCollapsibleState.None,
            baseResourceData({ namespace: 'ns-b', resourceName: 'plain-pod' })
        );
        item.contextValue = 'resource:Pod';

        const r = resolveSpecializedDescribeFromTreeItem(item);
        assert.strictEqual(r?.kind, 'pod');
        if (r?.kind === 'pod') {
            assert.strictEqual(r.podConfig.status, 'Unknown');
        }
    });

    test('Pod without namespace is skip', () => {
        const item = new ClusterTreeItem(
            'broken',
            'pod',
            vscode.TreeItemCollapsibleState.None,
            baseResourceData({ resourceName: 'broken' })
        );
        item.contextValue = 'resource:Pod';

        const r = resolveSpecializedDescribeFromTreeItem(item);
        assert.deepStrictEqual(r, { kind: 'skip', reason: 'missing-namespace' });
    });

    test('Namespace from namespace:active contextValue routes by tree type', () => {
        const item = new ClusterTreeItem(
            'kube-system',
            'namespace',
            vscode.TreeItemCollapsibleState.None,
            baseResourceData()
        );
        item.contextValue = 'namespace:active';

        const r = resolveSpecializedDescribeFromTreeItem(item);
        assert.strictEqual(r?.kind, 'namespace');
        if (r?.kind === 'namespace') {
            assert.strictEqual(r.namespaceConfig.name, 'kube-system');
            assert.strictEqual(r.namespaceConfig.context, sampleContextName);
            assert.strictEqual(r.namespaceConfig.metadata.name, 'kube-system');
        }
    });

    test('NamespaceTreeItem uses stored status and metadata', () => {
        const meta: k8s.V1ObjectMeta = {
            name: 'demo',
            uid: 'abc',
            annotations: {}
        };
        const statusPh: k8s.V1NamespaceStatus = {
            phase: 'Terminating'
        };
        const nsItem = new NamespaceTreeItem(
            {
                name: 'demo',
                status: statusPh,
                metadata: meta,
                context: sampleContextName
            },
            baseResourceData({ resourceName: 'demo' })
        );

        const r = resolveSpecializedDescribeFromTreeItem(nsItem);
        assert.strictEqual(r?.kind, 'namespace');
        if (r?.kind === 'namespace') {
            assert.strictEqual(r.namespaceConfig.status.phase, 'Terminating');
            assert.strictEqual(r.namespaceConfig.metadata.uid, 'abc');
        }
    });

    test('CronJob requires namespace', () => {
        const item = new ClusterTreeItem(
            'cj',
            'cronjob',
            vscode.TreeItemCollapsibleState.None,
            baseResourceData({ resourceName: 'cj' })
        );
        item.contextValue = 'resource:CronJob';

        assert.deepStrictEqual(resolveSpecializedDescribeFromTreeItem(item), {
            kind: 'skip',
            reason: 'missing-namespace'
        });
    });

    test('CronJob with namespace routes', () => {
        const item = new ClusterTreeItem(
            'cj',
            'cronjob',
            vscode.TreeItemCollapsibleState.None,
            baseResourceData({ namespace: 'ns', resourceName: 'cj' })
        );
        item.contextValue = 'resource:CronJob';

        const r = resolveSpecializedDescribeFromTreeItem(item);
        assert.deepStrictEqual(r, {
            kind: 'cronjob',
            name: 'cj',
            namespace: 'ns',
            context: sampleContextName
        });
    });

    test('Node routes cluster-scoped', () => {
        const item = new ClusterTreeItem(
            'node-1',
            'nodes',
            vscode.TreeItemCollapsibleState.None,
            baseResourceData({ resourceName: 'node-1' })
        );
        item.contextValue = 'resource:Node';

        const r = resolveSpecializedDescribeFromTreeItem(item);
        assert.deepStrictEqual(r, {
            kind: 'node',
            name: 'node-1',
            context: sampleContextName
        });
    });

    test('Deployment is not specialized here', () => {
        const item = new ClusterTreeItem(
            'd1',
            'deployment',
            vscode.TreeItemCollapsibleState.None,
            baseResourceData({ namespace: 'ns', resourceName: 'd1' })
        );
        item.contextValue = 'resource:Deployment';

        assert.strictEqual(resolveSpecializedDescribeFromTreeItem(item), undefined);
    });
});
