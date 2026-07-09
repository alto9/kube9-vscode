import * as assert from 'assert';
import * as k8s from '@kubernetes/client-node';
import { getKubernetesApiClient, resetKubernetesApiClient } from '../../../kubernetes/apiClient';

interface PatchCall {
    resource: k8s.KubernetesObject;
    dryRun?: string;
    patchStrategy?: k8s.PatchStrategy;
}

let patchCalls: PatchCall[] = [];
const originalMakeApiClient = k8s.KubernetesObjectApi.makeApiClient;

suite('strategicMergePatch', () => {
    setup(() => {
        patchCalls = [];
        resetKubernetesApiClient();

        k8s.KubernetesObjectApi.makeApiClient = (() => ({
            patch: async (
                spec: k8s.KubernetesObject,
                _pretty?: string,
                dryRun?: string,
                _fieldManager?: string,
                _force?: boolean,
                patchStrategy?: k8s.PatchStrategy
            ) => {
                patchCalls.push({ resource: spec, dryRun, patchStrategy });
                return spec;
            }
        })) as unknown as typeof k8s.KubernetesObjectApi.makeApiClient;

        const apiClient = getKubernetesApiClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (apiClient as any).setContext = () => {
            // strategicMergePatch calls setContext; no cluster needed in unit tests
        };
    });

    teardown(() => {
        k8s.KubernetesObjectApi.makeApiClient = originalMakeApiClient;
        resetKubernetesApiClient();
    });

    test('uses StrategicMergePatch Content-Type strategy and merge object body', async () => {
        const modulePath = require.resolve('../../../kubernetes/strategicMergePatch');
        delete require.cache[modulePath];
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
        const { strategicMergePatch } = require('../../../kubernetes/strategicMergePatch');

        const resource = {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: { name: 'test-deploy', namespace: 'kube9-system' },
            spec: {
                template: {
                    metadata: {
                        annotations: {
                            'kubectl.kubernetes.io/restartedAt': '2026-07-09T12:00:00.000Z'
                        }
                    }
                }
            }
        } as k8s.KubernetesObject;

        await strategicMergePatch(resource, 'test-context');

        assert.strictEqual(patchCalls.length, 1, 'Should invoke KubernetesObjectApi.patch once');
        assert.strictEqual(
            patchCalls[0].patchStrategy,
            k8s.PatchStrategy.StrategicMergePatch,
            'Should use application/strategic-merge-patch+json'
        );
        assert.deepStrictEqual(patchCalls[0].resource, resource, 'Should send merge object body');
    });

    test('forwards dryRun query parameter', async () => {
        const modulePath = require.resolve('../../../kubernetes/strategicMergePatch');
        delete require.cache[modulePath];
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
        const { strategicMergePatch } = require('../../../kubernetes/strategicMergePatch');

        const resource = {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: { name: 'test-deploy', namespace: 'default' },
            spec: { replicas: 3 }
        } as k8s.KubernetesObject;

        await strategicMergePatch(resource, 'test-context', 'All');

        assert.strictEqual(patchCalls.length, 1);
        assert.strictEqual(patchCalls[0].dryRun, 'All');
    });
});
