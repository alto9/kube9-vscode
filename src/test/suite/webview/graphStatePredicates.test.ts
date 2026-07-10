import * as assert from 'assert';
import {
    buildApplicationRootNodeId,
    computeStructureVersion,
    type ApplicationResourceGraph,
    type ResourceGraphNode
} from '../../../types/applicationResourceGraph';
import {
    deriveGraphMerging,
    isGraphEmptyManaged,
    isGraphInitialLoad,
    shouldHideGraphTopologyAffordances,
    shouldShowGraphTopologyAffordances,
    type GraphPresentationContext
} from '../../../webview/argocd-application/graph/graphStatePredicates';

function rootOnlyGraph(topologyMode: 'full' | 'limited' = 'full'): ApplicationResourceGraph {
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

function graphWithManagedResources(options?: {
    topologyMode?: 'full' | 'limited';
    truncated?: boolean;
}): ApplicationResourceGraph {
    const root = rootOnlyGraph(options?.topologyMode ?? 'full').nodes[0];
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
        ...rootOnlyGraph(options?.topologyMode ?? 'full'),
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

function context(overrides: Partial<GraphPresentationContext>): GraphPresentationContext {
    return {
        resourceGraph: null,
        graphError: null,
        graphMerging: false,
        sessionError: false,
        ...overrides
    };
}

suite('graph state predicates', () => {
    test('initial load when graph is null and no error', () => {
        assert.strictEqual(isGraphInitialLoad(context({})), true);
    });

    test('not initial load when graph exists', () => {
        assert.strictEqual(
            isGraphInitialLoad(context({ resourceGraph: graphWithManagedResources() })),
            false
        );
    });

    test('not initial load when graph error is set', () => {
        assert.strictEqual(
            isGraphInitialLoad(context({ graphError: 'Resource graph rebuild failed' })),
            false
        );
    });

    test('not initial load during merge even without graph replacement', () => {
        assert.strictEqual(
            isGraphInitialLoad(
                context({ resourceGraph: graphWithManagedResources(), graphMerging: true })
            ),
            false
        );
    });

    test('empty managed when root-only graph is loaded', () => {
        assert.strictEqual(isGraphEmptyManaged(context({ resourceGraph: rootOnlyGraph() })), true);
    });

    test('not empty managed when managed resources exist', () => {
        assert.strictEqual(
            isGraphEmptyManaged(context({ resourceGraph: graphWithManagedResources() })),
            false
        );
    });

    test('hide affordances during initial load', () => {
        assert.strictEqual(shouldHideGraphTopologyAffordances(context({})), true);
    });

    test('hide affordances during merge', () => {
        assert.strictEqual(
            shouldHideGraphTopologyAffordances(
                context({ resourceGraph: graphWithManagedResources(), graphMerging: true })
            ),
            true
        );
    });

    test('hide affordances for root-only empty graph', () => {
        assert.strictEqual(
            shouldHideGraphTopologyAffordances(context({ resourceGraph: rootOnlyGraph('limited') })),
            true
        );
    });

    test('show affordances when loaded with limited topology and managed nodes', () => {
        const loaded = context({
            resourceGraph: graphWithManagedResources({ topologyMode: 'limited' })
        });
        assert.strictEqual(shouldHideGraphTopologyAffordances(loaded), false);
        assert.strictEqual(shouldShowGraphTopologyAffordances(loaded), true);
    });

    test('show grouping affordance when loaded with large application', () => {
        const managed: ResourceGraphNode[] = Array.from({ length: 45 }, (_, index) => ({
            id: `res:guestbook/Deployment/app-${index}`,
            role: 'managed_resource' as const,
            resourceKey: { namespace: 'guestbook', kind: 'Deployment', name: `app-${index}` },
            status: { syncStatus: 'Synced' as const, healthStatus: 'Healthy' as const },
            label: `app-${index}`,
            kindLabel: 'Deployment'
        }));
        const root = graphWithManagedResources().nodes[0];
        const loaded = context({
            resourceGraph: {
                ...graphWithManagedResources(),
                nodes: [root, ...managed],
                edges: managed.map((node) => ({
                    id: `${root.id}->${node.id}:manages`,
                    source: root.id,
                    target: node.id,
                    relationship: 'manages' as const
                }))
            }
        });
        assert.strictEqual(shouldShowGraphTopologyAffordances(loaded), true);
    });

    test('hide affordances when graph error is set', () => {
        assert.strictEqual(
            shouldHideGraphTopologyAffordances(
                context({
                    resourceGraph: graphWithManagedResources(),
                    graphError: 'failed'
                })
            ),
            true
        );
    });

    test('deriveGraphMerging is true only when a prior graph exists', () => {
        const graph = graphWithManagedResources();
        assert.strictEqual(deriveGraphMerging(null, true, false, false), false);
        assert.strictEqual(deriveGraphMerging(graph, true, false, false), true);
        assert.strictEqual(deriveGraphMerging(graph, false, false, false), false);
        assert.strictEqual(deriveGraphMerging(graph, false, true, false), true);
        assert.strictEqual(deriveGraphMerging(graph, false, false, true), true);
    });
});
