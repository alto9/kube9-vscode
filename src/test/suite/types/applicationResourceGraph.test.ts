import * as assert from 'assert';
import {
    buildApplicationRootNodeId,
    computeStructureVersion,
    type ResourceGraphEdge,
    type ResourceGraphNode
} from '../../../types/applicationResourceGraph';

function rootNode(overrides: Partial<ResourceGraphNode> = {}): ResourceGraphNode {
    return {
        id: buildApplicationRootNodeId('argocd', 'guestbook'),
        role: 'application',
        resourceKey: null,
        status: { syncStatus: 'Synced', healthStatus: 'Healthy' },
        label: 'guestbook',
        kindLabel: 'Application',
        ...overrides
    };
}

function managedNode(id = 'res:guestbook/Deployment/ui'): ResourceGraphNode {
    return {
        id,
        role: 'managed_resource',
        resourceKey: { namespace: 'guestbook', kind: 'Deployment', name: 'ui' },
        status: { syncStatus: 'Synced', healthStatus: 'Healthy' },
        label: 'ui',
        kindLabel: 'Deployment'
    };
}

suite('applicationResourceGraph computeStructureVersion', () => {
    test('is deterministic for the same node and edge sets', () => {
        const nodes = [rootNode(), managedNode()];
        const edges: ResourceGraphEdge[] = [
            {
                id: `${nodes[0].id}->${nodes[1].id}:manages`,
                source: nodes[0].id,
                target: nodes[1].id,
                relationship: 'manages'
            }
        ];

        const first = computeStructureVersion({ nodes, edges });
        const second = computeStructureVersion({ nodes, edges });

        assert.strictEqual(first, second);
        assert.match(first, /^[a-f0-9]{64}$/);
    });

    test('does not change when only status or labels change on existing ids', () => {
        const nodes = [rootNode(), managedNode()];
        const edges = [{ source: nodes[0].id, target: nodes[1].id }];

        const baseVersion = computeStructureVersion({ nodes, edges });
        const relabeledNodes = [
            rootNode({
                label: 'guestbook-renamed',
                status: { syncStatus: 'OutOfSync', healthStatus: 'Degraded', message: 'drift' }
            }),
            managedNode('res:guestbook/Deployment/ui')
        ];

        assert.strictEqual(
            computeStructureVersion({ nodes: relabeledNodes, edges }),
            baseVersion
        );
    });

    test('changes when a managed node is added or removed', () => {
        const root = rootNode();
        const deployment = managedNode('res:guestbook/Deployment/ui');
        const service = managedNode('res:guestbook/Service/ui');
        const edges = [{ source: root.id, target: deployment.id }];

        const withDeployment = computeStructureVersion({ nodes: [root, deployment], edges });
        const withBoth = computeStructureVersion({
            nodes: [root, deployment, service],
            edges: [...edges, { source: root.id, target: service.id }]
        });

        assert.notStrictEqual(withDeployment, withBoth);
    });

    test('changes when an edge endpoint changes', () => {
        const root = rootNode();
        const deployment = managedNode('res:guestbook/Deployment/ui');
        const service = managedNode('res:guestbook/Service/ui');

        const deploymentEdge = computeStructureVersion({
            nodes: [root, deployment, service],
            edges: [{ source: root.id, target: deployment.id }]
        });
        const serviceEdge = computeStructureVersion({
            nodes: [root, deployment, service],
            edges: [{ source: root.id, target: service.id }]
        });

        assert.notStrictEqual(deploymentEdge, serviceEdge);
    });
});
