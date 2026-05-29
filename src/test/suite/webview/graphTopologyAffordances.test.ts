import * as assert from 'assert';
import {
    buildApplicationRootNodeId,
    computeStructureVersion,
    type ApplicationResourceGraph,
    type ResourceGraphNode
} from '../../../types/applicationResourceGraph';
import {
    GRAPH_TRUNCATION_AFFORDANCE_MESSAGE,
    LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE,
    OWNER_REF_TOPOLOGY_AFFORDANCE_MESSAGE,
    countManagedResourceNodes,
    getLimitedTopologyAffordanceMessage,
    hasVisibleManagedTopology,
    shouldShowLimitedTopologyAffordance,
    shouldShowTruncationAffordance
} from '../../../webview/argocd-application/graph/graphTopologyAffordanceRules';
function rootOnlyGraph(topologyMode: 'full' | 'limited' = 'limited'): ApplicationResourceGraph {
    const nodes: ResourceGraphNode[] = [
        {
            id: buildApplicationRootNodeId('argocd', 'guestbook'),
            role: 'application',
            resourceKey: null,
            status: { syncStatus: 'Synced', healthStatus: 'Healthy' },
            label: 'guestbook',
            kindLabel: 'Application'
        }
    ];

    return {
        applicationKey: { context: 'minikube', namespace: 'argocd', name: 'guestbook' },
        nodes,
        edges: [],
        topologySource: topologyMode === 'full' ? 'argocd_resource_tree' : 'crd_flat',
        topologyMode,
        structureVersion: computeStructureVersion({ nodes, edges: [] }),
        observedAt: '2026-05-28T00:00:00.000Z'
    };
}

function limitedGraphWithManagedResources(options?: { truncated?: boolean }): ApplicationResourceGraph {
    const root = rootOnlyGraph('limited').nodes[0];
    const managed: ResourceGraphNode = {
        id: 'res:guestbook/Deployment/ui',
        role: 'managed_resource',
        resourceKey: { namespace: 'guestbook', kind: 'Deployment', name: 'ui' },
        status: { syncStatus: 'Synced', healthStatus: 'Healthy' },
        label: 'ui',
        kindLabel: 'Deployment'
    };
    const nodes = [root, managed];

    return {
        ...rootOnlyGraph('limited'),
        nodes,
        edges: [
            {
                id: `${root.id}->${managed.id}:manages`,
                source: root.id,
                target: managed.id,
                relationship: 'manages'
            }
        ],
        truncated: options?.truncated,
        structureVersion: computeStructureVersion({
            nodes,
            edges: [{ source: root.id, target: managed.id }]
        })
    };
}

suite('graph topology affordances', () => {
    test('shows limited affordance when topologyMode is limited and managed resources exist', () => {
        const graph = limitedGraphWithManagedResources();
        assert.strictEqual(shouldShowLimitedTopologyAffordance(graph), true);
        assert.strictEqual(hasVisibleManagedTopology(graph), true);
        assert.strictEqual(countManagedResourceNodes(graph), 1);
    });

    test('hides limited affordance for full topology', () => {
        const graph = {
            ...limitedGraphWithManagedResources(),
            topologyMode: 'full' as const,
            topologySource: 'argocd_resource_tree' as const
        };
        assert.strictEqual(shouldShowLimitedTopologyAffordance(graph), false);
    });

    test('hides limited affordance for root-only graphs', () => {
        const graph = rootOnlyGraph('limited');
        assert.strictEqual(hasVisibleManagedTopology(graph), false);
        assert.strictEqual(shouldShowLimitedTopologyAffordance(graph), false);
    });

    test('shows truncation affordance separately from limited topology', () => {
        const graph = limitedGraphWithManagedResources({ truncated: true });
        assert.strictEqual(shouldShowLimitedTopologyAffordance(graph), true);
        assert.strictEqual(shouldShowTruncationAffordance(graph), true);
    });

    test('hides truncation affordance when truncated is false or absent', () => {
        const graph = limitedGraphWithManagedResources();
        assert.strictEqual(shouldShowTruncationAffordance(graph), false);
    });

    test('limited topology copy explains incomplete relationships', () => {
        assert.match(LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE, /parent\/child/i);
        assert.match(LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE, /resource-tree/i);
        assert.doesNotMatch(LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE, /fully equivalent/i);
    });

    test('truncation copy is distinct from limited topology copy', () => {
        assert.notStrictEqual(LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE, GRAPH_TRUNCATION_AFFORDANCE_MESSAGE);
        assert.match(GRAPH_TRUNCATION_AFFORDANCE_MESSAGE, /truncat/i);
        assert.match(GRAPH_TRUNCATION_AFFORDANCE_MESSAGE, /node limit/i);
    });

    test('owner-ref topology uses inferred relationship copy', () => {
        const graph = {
            ...limitedGraphWithManagedResources(),
            topologySource: 'kubernetes_owner_ref' as const
        };
        assert.strictEqual(getLimitedTopologyAffordanceMessage(graph), OWNER_REF_TOPOLOGY_AFFORDANCE_MESSAGE);
        assert.match(OWNER_REF_TOPOLOGY_AFFORDANCE_MESSAGE, /owner references/i);
        assert.match(OWNER_REF_TOPOLOGY_AFFORDANCE_MESSAGE, /inferred/i);
    });
});
