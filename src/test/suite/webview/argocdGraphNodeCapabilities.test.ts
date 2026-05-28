import * as assert from 'assert';
import {
    ACTION_DEPLOYMENT_RESTART_ROLLOUT,
    ACTION_RESOURCE_NAVIGATE_TREE,
    buildResourceActionPayload,
    getOverflowActions
} from '../../../webview/argocd-application/graph/graphNodeCapabilities';
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

    test('application role only exposes view in tree', () => {
        const actions = getOverflowActions('application', 'Application');
        assert.strictEqual(actions.length, 1);
        assert.strictEqual(actions[0].messageType, 'viewInTree');
        assert.strictEqual(actions[0].label, 'View in tree');
    });

    test('unknown kind has no overflow actions', () => {
        const actions = getOverflowActions('managed_resource', 'CustomResourceDefinition');
        assert.deepStrictEqual(actions, []);
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
});
