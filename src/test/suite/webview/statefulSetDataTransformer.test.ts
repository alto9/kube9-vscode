import * as assert from 'assert';
import * as k8s from '@kubernetes/client-node';
import { transformStatefulSetData } from '../../../webview/statefulSetDataTransformer';

suite('statefulSetDataTransformer', () => {
    test('shapes overview, ordinal pods, and PVC naming', () => {
        const sts: k8s.V1StatefulSet = {
            metadata: {
                name: 'web',
                namespace: 'ns1',
                creationTimestamp: new Date('2020-01-01T00:00:00.000Z'),
                generation: 2,
                labels: { app: 'web' }
            },
            spec: {
                replicas: 2,
                serviceName: 'web',
                selector: { matchLabels: { app: 'web' } },
                template: {
                    spec: {
                        containers: [{ name: 'nginx', image: 'nginx:1.25' }]
                    }
                },
                volumeClaimTemplates: [
                    {
                        metadata: { name: 'data' },
                        spec: {
                            accessModes: ['ReadWriteOnce'],
                            resources: { requests: { storage: '1Gi' } }
                        }
                    }
                ],
                updateStrategy: { type: 'RollingUpdate', rollingUpdate: { partition: 0 } },
                podManagementPolicy: 'OrderedReady'
            },
            status: {
                replicas: 2,
                readyReplicas: 1,
                currentReplicas: 2,
                updatedReplicas: 2,
                observedGeneration: 2,
                currentRevision: 'web-abc',
                updateRevision: 'web-def',
                collisionCount: 0
            }
        };

        const pods: k8s.V1Pod[] = [
            {
                metadata: {
                    name: 'web-0',
                    namespace: 'ns1',
                    creationTimestamp: new Date('2020-01-02T00:00:00.000Z')
                },
                spec: { nodeName: 'node-a', containers: [] },
                status: {
                    phase: 'Running',
                    conditions: [{ type: 'Ready', status: 'True' }],
                    containerStatuses: [
                        {
                            name: 'nginx',
                            restartCount: 0,
                            image: 'nginx:1.25',
                            imageID: 'docker.io/library/nginx@sha256:abc',
                            ready: true
                        }
                    ]
                }
            }
        ];

        const pvcs: k8s.V1PersistentVolumeClaim[] = [
            {
                metadata: { name: 'data-web-0', namespace: 'ns1' },
                spec: { storageClassName: 'standard' },
                status: { phase: 'Bound', capacity: { storage: '1Gi' } }
            }
        ];

        const data = transformStatefulSetData(sts, pods, pvcs, []);

        assert.strictEqual(data.overview.replicas, 2);
        assert.strictEqual(data.overview.serviceName, 'web');
        assert.strictEqual(data.overview.selectorDisplay, 'app=web');
        assert.strictEqual(data.replicaStatus.ready, 1);
        assert.strictEqual(data.ordinalPods.length, 2);
        assert.strictEqual(data.ordinalPods[0].podPresent, true);
        assert.strictEqual(data.ordinalPods[0].phase, 'Running');
        assert.strictEqual(data.ordinalPods[1].podPresent, false);

        assert.strictEqual(data.ordinalPvcs.length, 2);
        const p0 = data.ordinalPvcs.find(r => r.ordinal === 0 && r.templateName === 'data');
        assert.ok(p0);
        assert.strictEqual(p0!.found, true);
        assert.strictEqual(p0!.phase, 'Bound');

        const p1 = data.ordinalPvcs.find(r => r.ordinal === 1 && r.templateName === 'data');
        assert.ok(p1);
        assert.strictEqual(p1!.found, false);
    });

    test('honors spec.ordinals.start for pod and PVC rows', () => {
        const sts: k8s.V1StatefulSet = {
            metadata: {
                name: 'web',
                namespace: 'ns1',
                creationTimestamp: new Date('2020-01-01T00:00:00.000Z')
            },
            spec: {
                replicas: 2,
                ordinals: { start: 3 },
                serviceName: 'web',
                selector: { matchLabels: { app: 'web' } },
                template: { spec: { containers: [{ name: 'nginx', image: 'nginx' }] } },
                volumeClaimTemplates: [
                    {
                        metadata: { name: 'data' },
                        spec: {
                            accessModes: ['ReadWriteOnce'],
                            resources: { requests: { storage: '1Gi' } }
                        }
                    }
                ]
            },
            status: { replicas: 2, readyReplicas: 2, currentReplicas: 2, updatedReplicas: 2 }
        };

        const pods: k8s.V1Pod[] = [
            {
                metadata: { name: 'web-3', namespace: 'ns1' },
                spec: { nodeName: 'node-a', containers: [] },
                status: { phase: 'Running', conditions: [{ type: 'Ready', status: 'True' }] }
            },
            {
                metadata: { name: 'web-4', namespace: 'ns1' },
                spec: { nodeName: 'node-b', containers: [] },
                status: { phase: 'Running', conditions: [{ type: 'Ready', status: 'True' }] }
            }
        ];

        const pvcs: k8s.V1PersistentVolumeClaim[] = [
            {
                metadata: { name: 'data-web-3', namespace: 'ns1' },
                status: { phase: 'Bound', capacity: { storage: '1Gi' } }
            },
            {
                metadata: { name: 'data-web-4', namespace: 'ns1' },
                status: { phase: 'Bound', capacity: { storage: '1Gi' } }
            }
        ];

        const data = transformStatefulSetData(sts, pods, pvcs, []);

        assert.deepStrictEqual(
            data.ordinalPods.map(r => r.ordinal),
            [3, 4]
        );
        assert.strictEqual(data.ordinalPods[0].expectedPodName, 'web-3');
        assert.strictEqual(data.ordinalPods[1].expectedPodName, 'web-4');
        assert.deepStrictEqual(
            data.ordinalPvcs.map(r => ({ ordinal: r.ordinal, pvcName: r.pvcName, found: r.found })),
            [
                { ordinal: 3, pvcName: 'data-web-3', found: true },
                { ordinal: 4, pvcName: 'data-web-4', found: true }
            ]
        );
    });
});
