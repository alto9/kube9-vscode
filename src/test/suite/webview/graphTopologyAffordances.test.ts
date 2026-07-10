import * as assert from 'assert';
import {
    buildApplicationRootNodeId,
    computeStructureVersion,
    type ApplicationResourceGraph,
    type ResourceGraphNode
} from '../../../types/applicationResourceGraph';
import {
    LARGE_APP_GROUPING_AFFORDANCE_MESSAGE,
    LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE,
    OWNER_REF_TOPOLOGY_AFFORDANCE_MESSAGE,
    countManagedResourceNodes,
    getLimitedTopologyAffordanceMessage,
    hasVisibleManagedTopology,
    shouldShowLargeAppGroupingAffordance,
    shouldShowLimitedTopologyAffordance
} from '../../../webview/argocd-application/graph/graphTopologyAffordanceRules';
import {
    GRAPH_ASSEMBLY_INVALID_ROW_BANNER_MESSAGE,
    shouldShowGraphAssemblyInfoBanner
} from '../../../webview/argocd-application/graph/graphAssemblyInfoRules';

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

function limitedGraphWithManagedResources(): ApplicationResourceGraph {
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
        structureVersion: computeStructureVersion({
            nodes,
            edges: [{ source: root.id, target: managed.id }]
        })
    };
}

function largeGraphWithManagedResources(count: number): ApplicationResourceGraph {
    const root = rootOnlyGraph('limited').nodes[0];
    const managed: ResourceGraphNode[] = Array.from({ length: count }, (_, index) => ({
        id: `res:guestbook/Deployment/app-${index}`,
        role: 'managed_resource' as const,
        resourceKey: { namespace: 'guestbook', kind: 'Deployment', name: `app-${index}` },
        status: { syncStatus: 'Synced' as const, healthStatus: 'Healthy' as const },
        label: `app-${index}`,
        kindLabel: 'Deployment'
    }));
    const nodes = [root, ...managed];
    const edges = managed.map((node) => ({
        id: `${root.id}->${node.id}:manages`,
        source: root.id,
        target: node.id,
        relationship: 'manages' as const
    }));

    return {
        ...rootOnlyGraph('limited'),
        nodes,
        edges,
        structureVersion: computeStructureVersion({ nodes, edges })
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

    test('shows large-app grouping affordance for graphs above threshold', () => {
        const graph = largeGraphWithManagedResources(45);
        assert.strictEqual(shouldShowLargeAppGroupingAffordance(graph), true);
        assert.strictEqual(shouldShowLargeAppGroupingAffordance(largeGraphWithManagedResources(10)), false);
    });

    test('limited topology copy explains incomplete relationships', () => {
        assert.match(LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE, /parent\/child/i);
        assert.match(LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE, /resource-tree/i);
        assert.doesNotMatch(LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE, /fully equivalent/i);
    });

    test('large-app grouping copy is distinct from limited topology copy', () => {
        assert.notStrictEqual(LIMITED_TOPOLOGY_AFFORDANCE_MESSAGE, LARGE_APP_GROUPING_AFFORDANCE_MESSAGE);
        assert.match(LARGE_APP_GROUPING_AFFORDANCE_MESSAGE, /grouped by kind/i);
        assert.match(LARGE_APP_GROUPING_AFFORDANCE_MESSAGE, /Details tab/i);
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

    test('shows assembly info banner only when invalid rows were skipped', () => {
        assert.strictEqual(shouldShowGraphAssemblyInfoBanner(true), true);
        assert.strictEqual(shouldShowGraphAssemblyInfoBanner(false), false);
        assert.strictEqual(shouldShowGraphAssemblyInfoBanner(undefined), false);
        assert.match(GRAPH_ASSEMBLY_INVALID_ROW_BANNER_MESSAGE, /incomplete resource rows/i);
        assert.doesNotMatch(GRAPH_ASSEMBLY_INVALID_ROW_BANNER_MESSAGE, /CRD/i);
    });
});
