import * as assert from 'assert';
import * as k8s from '@kubernetes/client-node';
import { transformDaemonSetData } from '../../../webview/daemonSetDataTransformer';

suite('daemonSetDataTransformer', () => {
    test('derives scheduling counts and pod rows from DaemonSet and Pods', () => {
        const ds: k8s.V1DaemonSet = {
            metadata: { name: 'ds1', namespace: 'ns1', uid: 'uid-ds', creationTimestamp: new Date('2020-01-01T00:00:00Z') },
            spec: {
                selector: { matchLabels: { app: 'x' } },
                template: {
                    spec: {
                        containers: [{ name: 'c1', image: 'img:v1' }]
                    }
                }
            },
            status: {
                desiredNumberScheduled: 2,
                currentNumberScheduled: 2,
                numberReady: 1,
                numberAvailable: 1,
                numberUnavailable: 1,
                numberMisscheduled: 0,
                updatedNumberScheduled: 2
            }
        };

        const podOwned: k8s.V1Pod = {
            metadata: {
                name: 'ds1-aaa',
                namespace: 'ns1',
                ownerReferences: [
                    { apiVersion: 'apps/v1', kind: 'DaemonSet', name: 'ds1', uid: 'uid-ds' }
                ],
                creationTimestamp: new Date('2020-01-02T00:00:00Z')
            },
            spec: { nodeName: 'node-a', containers: [] },
            status: {
                phase: 'Running',
                containerStatuses: [
                    { name: 'c1', ready: true, restartCount: 0, image: 'img:v1', imageID: 'docker://img' }
                ]
            }
        };

        const out = transformDaemonSetData(ds, [podOwned], undefined, 'forbidden: nodes', [], undefined, undefined);

        assert.strictEqual(out.replicaCounts.desiredScheduled, 2);
        assert.strictEqual(out.replicaCounts.ready, 1);
        assert.strictEqual(out.pods.length, 1);
        assert.strictEqual(out.pods[0].node, 'node-a');
        assert.strictEqual(out.pods[0].ready, '1/1');
        assert.ok(out.nodeCoverageLimitedMessage?.includes('Node coverage'));
        assert.strictEqual(out.podTemplate.containers.length, 1);
        assert.strictEqual(out.podTemplate.containers[0].image, 'img:v1');
    });

    test('builds node coverage when nodes list succeeds', () => {
        const ds: k8s.V1DaemonSet = {
            metadata: { name: 'ds1', namespace: 'ns1', uid: 'uid-ds', creationTimestamp: new Date() },
            spec: {
                selector: { matchLabels: { app: 'x' } },
                template: {
                    metadata: { labels: { app: 'x' } },
                    spec: {
                        nodeSelector: { disktype: 'ssd' },
                        containers: [{ name: 'c1', image: 'img:v1' }]
                    }
                }
            },
            status: {
                desiredNumberScheduled: 1,
                currentNumberScheduled: 1,
                numberReady: 1,
                numberAvailable: 1,
                numberUnavailable: 0,
                numberMisscheduled: 0,
                updatedNumberScheduled: 1
            }
        };

        const node: k8s.V1Node = {
            metadata: { name: 'n1', labels: { disktype: 'ssd' } }
        };

        const pod: k8s.V1Pod = {
            metadata: {
                name: 'p1',
                namespace: 'ns1',
                ownerReferences: [{ apiVersion: 'apps/v1', kind: 'DaemonSet', name: 'ds1', uid: 'uid-ds' }],
                creationTimestamp: new Date()
            },
            spec: { nodeName: 'n1', containers: [] },
            status: {
                phase: 'Running',
                containerStatuses: [
                    { name: 'c1', ready: true, restartCount: 1, image: 'img:v1', imageID: 'docker://img' }
                ]
            }
        };

        const out = transformDaemonSetData(ds, [pod], [node], undefined, [], undefined, undefined);

        assert.strictEqual(out.nodeCoverage.length, 1);
        assert.strictEqual(out.nodeCoverage[0].state, 'ready');
        assert.strictEqual(out.nodeCoverage[0].podName, 'p1');
        assert.strictEqual(out.pods[0].restartCount, 1);
    });
});
