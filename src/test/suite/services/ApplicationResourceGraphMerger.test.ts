import * as assert from 'assert';
import { buildCrdFlatApplicationResourceGraph } from '../../../services/ApplicationResourceGraphAssembler';
import { mergeApplicationResourceGraphSnapshots } from '../../../services/ApplicationResourceGraphMerger';
import {
    buildApplicationRootNodeId,
    buildManagedResourceNodeId,
    type ApplicationKey,
    type ApplicationResourceGraph
} from '../../../types/applicationResourceGraph';
import type { ArgoCDApplication, ArgoCDResource } from '../../../types/argocd';

const APPLICATION_KEY: ApplicationKey = {
    context: 'minikube',
    namespace: 'argocd',
    name: 'guestbook'
};

const OTHER_APPLICATION_KEY: ApplicationKey = {
    context: 'minikube',
    namespace: 'argocd',
    name: 'other-app'
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

function deploymentRow(overrides: Partial<ArgoCDResource> = {}): ArgoCDResource {
    return {
        kind: 'Deployment',
        name: 'guestbook-ui',
        namespace: 'guestbook',
        syncStatus: 'Synced',
        healthStatus: 'Healthy',
        ...overrides
    };
}

function serviceRow(overrides: Partial<ArgoCDResource> = {}): ArgoCDResource {
    return {
        kind: 'Service',
        name: 'guestbook-ui',
        namespace: 'guestbook',
        syncStatus: 'Synced',
        healthStatus: 'Healthy',
        ...overrides
    };
}

function assembleGraph(
    application: ArgoCDApplication,
    observedAt: string,
    applicationKey: ApplicationKey = APPLICATION_KEY
): ApplicationResourceGraph {
    return buildCrdFlatApplicationResourceGraph({
        application,
        applicationKey,
        observedAt
    }).graph;
}

suite('ApplicationResourceGraphMerger', () => {
    test('returns incoming unchanged when previous is undefined', () => {
        const incoming = assembleGraph(baseApplication({ resources: [deploymentRow()] }), '2024-06-02T00:00:00.000Z');

        const result = mergeApplicationResourceGraphSnapshots(undefined, incoming);

        assert.strictEqual(result.structureChanged, true);
        assert.strictEqual(result.graph, incoming);
    });

    test('returns incoming unchanged when ApplicationKey changes', () => {
        const previous = assembleGraph(baseApplication({ resources: [deploymentRow()] }), '2024-06-01T00:00:00.000Z');
        const incoming = assembleGraph(
            baseApplication({ resources: [deploymentRow()] }),
            '2024-06-02T00:00:00.000Z',
            OTHER_APPLICATION_KEY
        );

        const result = mergeApplicationResourceGraphSnapshots(previous, incoming);

        assert.strictEqual(result.structureChanged, true);
        assert.strictEqual(result.graph, incoming);
    });

    test('status-only tick merges attributes with structureChanged false', () => {
        const previous = assembleGraph(
            baseApplication({
                resources: [deploymentRow({ syncStatus: 'Synced', healthStatus: 'Healthy' })]
            }),
            '2024-06-01T00:00:00.000Z'
        );
        const incoming = assembleGraph(
            baseApplication({
                syncStatus: {
                    status: 'OutOfSync',
                    revision: 'abc123',
                    comparedTo: baseApplication().syncStatus.comparedTo
                },
                healthStatus: { status: 'Degraded', message: 'app degraded' },
                resources: [deploymentRow({ syncStatus: 'OutOfSync', healthStatus: 'Degraded', message: 'drift' })]
            }),
            '2024-06-02T00:00:00.000Z'
        );

        assert.strictEqual(previous.structureVersion, incoming.structureVersion);

        const result = mergeApplicationResourceGraphSnapshots(previous, incoming);

        assert.strictEqual(result.structureChanged, false);
        assert.strictEqual(result.graph.structureVersion, incoming.structureVersion);
        assert.strictEqual(result.graph.observedAt, incoming.observedAt);
        assert.strictEqual(result.graph.nodes.length, incoming.nodes.length);

        const root = result.graph.nodes.find((node) => node.role === 'application');
        assert.ok(root);
        assert.strictEqual(root.status.syncStatus, 'OutOfSync');
        assert.strictEqual(root.status.healthStatus, 'Degraded');
        assert.strictEqual(root.status.message, 'app degraded');

        const managed = result.graph.nodes.find((node) => node.role === 'managed_resource');
        assert.ok(managed);
        assert.strictEqual(managed.status.syncStatus, 'OutOfSync');
        assert.strictEqual(managed.status.healthStatus, 'Degraded');
        assert.strictEqual(managed.status.message, 'drift');
    });

    test('add managed resource is a structural replace', () => {
        const previous = assembleGraph(baseApplication({ resources: [deploymentRow()] }), '2024-06-01T00:00:00.000Z');
        const incoming = assembleGraph(
            baseApplication({ resources: [deploymentRow(), serviceRow()] }),
            '2024-06-02T00:00:00.000Z'
        );

        assert.notStrictEqual(previous.structureVersion, incoming.structureVersion);

        const result = mergeApplicationResourceGraphSnapshots(previous, incoming);

        assert.strictEqual(result.structureChanged, true);
        assert.strictEqual(result.graph, incoming);
        assert.strictEqual(result.graph.nodes.length, 3);
    });

    test('remove managed resource is a structural replace without stale nodes or edges', () => {
        const previous = assembleGraph(
            baseApplication({ resources: [deploymentRow(), serviceRow()] }),
            '2024-06-01T00:00:00.000Z'
        );
        const incoming = assembleGraph(baseApplication({ resources: [deploymentRow()] }), '2024-06-02T00:00:00.000Z');

        const result = mergeApplicationResourceGraphSnapshots(previous, incoming);

        assert.strictEqual(result.structureChanged, true);
        assert.strictEqual(result.graph, incoming);
        assert.strictEqual(result.graph.nodes.length, 2);
        assert.strictEqual(result.graph.edges.length, 1);

        const serviceNodeId = buildManagedResourceNodeId({
            namespace: 'guestbook',
            kind: 'Service',
            name: 'guestbook-ui'
        });
        assert.ok(!result.graph.nodes.some((node) => node.id === serviceNodeId));
        assert.ok(!result.graph.edges.some((edge) => edge.target === serviceNodeId));
    });

    test('kind or name change produces new node id and structural replace', () => {
        const previous = assembleGraph(baseApplication({ resources: [deploymentRow()] }), '2024-06-01T00:00:00.000Z');
        const incoming = assembleGraph(
            baseApplication({
                resources: [deploymentRow({ name: 'guestbook-api' })]
            }),
            '2024-06-02T00:00:00.000Z'
        );

        const oldNodeId = buildManagedResourceNodeId({
            namespace: 'guestbook',
            kind: 'Deployment',
            name: 'guestbook-ui'
        });
        const newNodeId = buildManagedResourceNodeId({
            namespace: 'guestbook',
            kind: 'Deployment',
            name: 'guestbook-api'
        });

        assert.notStrictEqual(oldNodeId, newNodeId);

        const result = mergeApplicationResourceGraphSnapshots(previous, incoming);

        assert.strictEqual(result.structureChanged, true);
        assert.ok(!result.graph.nodes.some((node) => node.id === oldNodeId));
        assert.ok(result.graph.nodes.some((node) => node.id === newNodeId));
    });

    test('duplicate merge calls are idempotent when incoming is unchanged', () => {
        const previous = assembleGraph(baseApplication({ resources: [deploymentRow()] }), '2024-06-01T00:00:00.000Z');
        const incoming = assembleGraph(baseApplication({ resources: [deploymentRow()] }), '2024-06-02T00:00:00.000Z');

        const first = mergeApplicationResourceGraphSnapshots(previous, incoming);
        const second = mergeApplicationResourceGraphSnapshots(first.graph, incoming);

        assert.strictEqual(first.structureChanged, false);
        assert.strictEqual(second.structureChanged, false);
        assert.deepStrictEqual(second.graph.nodes, first.graph.nodes);
        assert.deepStrictEqual(second.graph.edges, first.graph.edges);
        assert.strictEqual(second.graph.observedAt, incoming.observedAt);
    });

    test('treats matching structureVersion with different node ids as structural', () => {
        const previous = assembleGraph(baseApplication({ resources: [deploymentRow()] }), '2024-06-01T00:00:00.000Z');
        const incoming = assembleGraph(
            baseApplication({ resources: [deploymentRow(), serviceRow()] }),
            '2024-06-02T00:00:00.000Z'
        );

        incoming.structureVersion = previous.structureVersion;

        const result = mergeApplicationResourceGraphSnapshots(previous, incoming);

        assert.strictEqual(result.structureChanged, true);
        assert.strictEqual(result.graph, incoming);
    });

    test('application root always reflects incoming application-level status on attribute merge', () => {
        const previous = assembleGraph(
            baseApplication({
                syncStatus: {
                    status: 'Synced',
                    revision: 'abc123',
                    comparedTo: baseApplication().syncStatus.comparedTo
                },
                healthStatus: { status: 'Healthy' },
                resources: [deploymentRow()]
            }),
            '2024-06-01T00:00:00.000Z'
        );
        const incoming = assembleGraph(
            baseApplication({
                syncStatus: {
                    status: 'OutOfSync',
                    revision: 'def456',
                    comparedTo: baseApplication().syncStatus.comparedTo
                },
                healthStatus: { status: 'Progressing' },
                resources: [deploymentRow()]
            }),
            '2024-06-02T00:00:00.000Z'
        );

        const result = mergeApplicationResourceGraphSnapshots(previous, incoming);
        const rootId = buildApplicationRootNodeId('argocd', 'guestbook');
        const root = result.graph.nodes.find((node) => node.id === rootId);

        assert.ok(root);
        assert.strictEqual(result.structureChanged, false);
        assert.strictEqual(root.status.syncStatus, 'OutOfSync');
        assert.strictEqual(root.status.healthStatus, 'Progressing');
    });
});
