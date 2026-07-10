import * as assert from 'assert';
import {
    reduceBusyNodeKeysForProgress,
    reduceBusyNodeKeysForResult
} from '../../../webview/argocd-application/graph/graphInteractionBusyState';

const deploymentRef = {
    kind: 'Deployment',
    name: 'api',
    namespace: 'prod'
};

suite('useGraphInteractionState busy keys', () => {
    test('tracks multiple busy node keys independently', () => {
        let busy = reduceBusyNodeKeysForProgress(new Set(), {
            phase: 'Running',
            nodeRef: deploymentRef
        });
        busy = reduceBusyNodeKeysForProgress(busy, {
            phase: 'Running',
            nodeRef: { kind: 'Service', name: 'api', namespace: 'prod' }
        });

        assert.strictEqual(busy.has('prod/Deployment/api'), true);
        assert.strictEqual(busy.has('prod/Service/api'), true);
    });

    test('Running progress adds nodeRef to busyNodeKeys', () => {
        const next = reduceBusyNodeKeysForProgress(new Set(), {
            phase: 'Running',
            nodeRef: deploymentRef
        });

        assert.strictEqual(next.has('prod/Deployment/api'), true);
    });

    test('terminal progress clears nodeRef from busyNodeKeys', () => {
        const initial = new Set(['prod/Deployment/api']);

        assert.strictEqual(
            reduceBusyNodeKeysForProgress(initial, {
                phase: 'Succeeded',
                nodeRef: deploymentRef
            }).has('prod/Deployment/api'),
            false
        );
        assert.strictEqual(
            reduceBusyNodeKeysForProgress(initial, {
                phase: 'Failed',
                nodeRef: deploymentRef
            }).has('prod/Deployment/api'),
            false
        );
    });

    test('resourceActionResult clears nodeRef from busyNodeKeys', () => {
        const initial = new Set(['prod/Deployment/api']);

        assert.strictEqual(
            reduceBusyNodeKeysForResult(initial, { nodeRef: deploymentRef }).has('prod/Deployment/api'),
            false
        );
    });

    test('progress without nodeRef leaves busyNodeKeys unchanged', () => {
        const initial = new Set(['prod/Deployment/api']);

        assert.strictEqual(
            reduceBusyNodeKeysForProgress(initial, { phase: 'Running' }),
            initial
        );
    });
});
