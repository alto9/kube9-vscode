import * as assert from 'assert';
import {
    ACTION_DEPLOYMENT_RESTART_ROLLOUT,
    ACTION_RESOURCE_NAVIGATE_TREE,
    buildResourceActionPayload,
    getOverflowActions,
    GRAPH_NAVIGATE_TREE_KINDS
} from '../../../webview/argocd-application/graph/graphNodeCapabilities';
import { NAVIGATE_TREE_SUPPORTED_KINDS } from '../../../services/KindCapabilityRegistry';
import {
    healthStatusBadgeClass,
    syncStatusBadgeClass
} from '../../../webview/argocd-application/graph/syncHealthBadgeClasses';

suite('argocd graph node capabilities', () => {
    test('Deployment managed resource includes restart and navigate actions', () => {
        const actions = getOverflowActions('managed_resource', 'Deployment');
        const actionIds = actions.map((action) => action.actionId);
        assert.ok(actionIds.includes(ACTION_DEPLOYMENT_RESTART_ROLLOUT));
        assert.ok(actionIds.includes(ACTION_RESOURCE_NAVIGATE_TREE));
    });

    test('application role returns empty overflow actions', () => {
        const actions = getOverflowActions('application', 'Application');
        assert.deepStrictEqual(actions, []);
    });

    test('unknown kind has no overflow actions', () => {
        const actions = getOverflowActions('managed_resource', 'CustomResourceDefinition');
        assert.deepStrictEqual(actions, []);
    });

    test('Job and Ingress do not expose navigate until host and tree support them', () => {
        for (const kind of ['Job', 'Ingress'] as const) {
            const actions = getOverflowActions('managed_resource', kind);
            const actionIds = actions.map((action) => action.actionId);
            assert.ok(!actionIds.includes(ACTION_RESOURCE_NAVIGATE_TREE), kind);
        }
    });

    test('webview navigate kinds match host NAVIGATE_TREE_SUPPORTED_KINDS', () => {
        assert.deepStrictEqual(
            [...GRAPH_NAVIGATE_TREE_KINDS].sort(),
            [...NAVIGATE_TREE_SUPPORTED_KINDS].sort()
        );
    });

    test('badge mapping uses expected classes for drift and unknown health', () => {
        assert.strictEqual(syncStatusBadgeClass('OutOfSync'), 'out-of-sync');
        assert.strictEqual(healthStatusBadgeClass('Degraded'), 'degraded');
        assert.strictEqual(healthStatusBadgeClass('Unknown'), 'unknown');
        assert.strictEqual(healthStatusBadgeClass(undefined), 'unknown');
    });

    test('resourceAction payload includes actionId and resource refs', () => {
        const payload = buildResourceActionPayload(ACTION_RESOURCE_NAVIGATE_TREE, {
            kind: 'Service',
            name: 'guestbook-ui',
            namespace: 'guestbook'
        });
        assert.strictEqual(payload.type, 'resourceAction');
        assert.strictEqual(payload.actionId, ACTION_RESOURCE_NAVIGATE_TREE);
        assert.strictEqual(payload.kind, 'Service');
        assert.strictEqual(payload.name, 'guestbook-ui');
        assert.strictEqual(payload.namespace, 'guestbook');
    });

    test('resourceAction payload includes apiGroup when present on resource key', () => {
        const payload = buildResourceActionPayload(ACTION_RESOURCE_NAVIGATE_TREE, {
            kind: 'Ingress',
            name: 'guestbook',
            namespace: 'guestbook',
            apiGroup: 'networking.k8s.io'
        });
        assert.strictEqual(payload.group, 'networking.k8s.io');
        assert.strictEqual('apiGroup' in payload, false);
    });
});
