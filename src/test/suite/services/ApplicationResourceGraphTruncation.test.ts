import * as assert from 'assert';
import { buildCrdFlatApplicationResourceGraph } from '../../../services/ApplicationResourceGraphAssembler';
import { MAX_MANAGED_GRAPH_NODES } from '../../../services/applicationResourceGraphLimits';
import { truncateApplicationResourceGraph } from '../../../services/ApplicationResourceGraphTruncation';
import {
    buildApplicationRootNodeId,
    buildManagedResourceNodeId,
    computeStructureVersion,
    type ApplicationKey
} from '../../../types/applicationResourceGraph';
import type { ArgoCDApplication, ArgoCDResource } from '../../../types/argocd';

const APPLICATION_KEY: ApplicationKey = {
    context: 'minikube',
    namespace: 'argocd',
    name: 'guestbook'
};

function baseApplication(overrides: Partial<ArgoCDApplication> = {}): ArgoCDApplication {
    return {
        name: 'guestbook',
        namespace: 'argocd',
        project: 'default',
        createdAt: '2024-01-01T00:00:00.000Z',
        syncStatus: {
            status: 'Synced',
            revision: 'abc123',
            comparedTo: {
                source: {
                    repoURL: 'https://github.com/example/guestbook',
                    path: '.',
                    targetRevision: 'main'
                }
            }
        },
        healthStatus: {
            status: 'Healthy'
        },
        source: {
            repoURL: 'https://github.com/example/guestbook',
            path: '.',
            targetRevision: 'main'
        },
        destination: {
            server: 'https://kubernetes.default.svc',
            namespace: 'guestbook'
        },
        resources: [],
        ...overrides
    };
}

function deploymentRow(name: string, namespace = 'guestbook'): ArgoCDResource {
    return {
        kind: 'Deployment',
        name,
        namespace,
        syncStatus: 'Synced',
        healthStatus: 'Healthy'
    };
}

function managedResourceRows(count: number): ArgoCDResource[] {
    const rows: ArgoCDResource[] = [];
    for (let index = 0; index < count; index += 1) {
        rows.push(deploymentRow(`workload-${String(index).padStart(4, '0')}`));
    }
    return rows;
}

suite('ApplicationResourceGraphTruncation', () => {
    test('assembler leaves graph unchanged at 199 managed resources', () => {
        const { graph } = buildCrdFlatApplicationResourceGraph({
            application: baseApplication({ resources: managedResourceRows(199) }),
            applicationKey: APPLICATION_KEY
        });

        assert.strictEqual(graph.nodes.filter((node) => node.role === 'managed_resource').length, 199);
        assert.strictEqual(graph.nodes.length, 200);
        assert.strictEqual(graph.edges.length, 199);
        assert.notStrictEqual(graph.truncated, true);
    });

    test('assembler truncates at 201 managed resources with truncated flag', () => {
        const { graph } = buildCrdFlatApplicationResourceGraph({
            application: baseApplication({ resources: managedResourceRows(201) }),
            applicationKey: APPLICATION_KEY
        });

        assert.strictEqual(graph.truncated, true);
        assert.strictEqual(graph.nodes.filter((node) => node.role === 'managed_resource').length, 200);
        assert.strictEqual(graph.nodes.length, 201);
        assert.strictEqual(graph.edges.length, 200);
        assert.strictEqual(
            graph.structureVersion,
            computeStructureVersion({ nodes: graph.nodes, edges: graph.edges })
        );
    });

    test('truncateApplicationResourceGraph keeps deterministic managed node selection', () => {
        const resources = [
            deploymentRow('z-last', 'zebra'),
            deploymentRow('a-first', 'alpha'),
            deploymentRow('m-mid', 'middle')
        ];
        const { graph: fullGraph } = buildCrdFlatApplicationResourceGraph({
            application: baseApplication({ resources }),
            applicationKey: APPLICATION_KEY
        });

        const first = truncateApplicationResourceGraph(fullGraph, 2);
        const second = truncateApplicationResourceGraph(fullGraph, 2);

        assert.deepStrictEqual(
            first.nodes.filter((node) => node.role === 'managed_resource').map((node) => node.id),
            second.nodes.filter((node) => node.role === 'managed_resource').map((node) => node.id)
        );
        assert.deepStrictEqual(
            first.nodes
                .filter((node) => node.role === 'managed_resource')
                .map((node) => node.id),
            [
                buildManagedResourceNodeId({ namespace: 'alpha', kind: 'Deployment', name: 'a-first' }),
                buildManagedResourceNodeId({ namespace: 'middle', kind: 'Deployment', name: 'm-mid' })
            ]
        );
    });

    test('application root is always present when truncated', () => {
        const { graph } = buildCrdFlatApplicationResourceGraph({
            application: baseApplication({ resources: managedResourceRows(250) }),
            applicationKey: APPLICATION_KEY
        });

        assert.strictEqual(graph.truncated, true);
        const root = graph.nodes.find((node) => node.role === 'application');
        assert.ok(root);
        assert.strictEqual(root.id, buildApplicationRootNodeId('argocd', 'guestbook'));
    });

    test('truncateApplicationResourceGraph omits truncated when under cap', () => {
        const { graph } = buildCrdFlatApplicationResourceGraph({
            application: baseApplication({ resources: managedResourceRows(5) }),
            applicationKey: APPLICATION_KEY
        });

        const result = truncateApplicationResourceGraph(graph);
        assert.notStrictEqual(result.truncated, true);
        assert.strictEqual(result.nodes.length, graph.nodes.length);
    });

    test('product cap constant is 200 managed nodes', () => {
        assert.strictEqual(MAX_MANAGED_GRAPH_NODES, 200);
    });
});
