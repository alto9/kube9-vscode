import * as assert from 'assert';
import * as k8s from '@kubernetes/client-node';
import { CRDDescribeProvider } from '../../../providers/CRDDescribeProvider';
import type { KubernetesApiClient } from '../../../kubernetes/apiClient';

function minimalNamespacedCRD(metadataName: string): k8s.V1CustomResourceDefinition {
    return {
        apiVersion: 'apiextensions.k8s.io/v1',
        kind: 'CustomResourceDefinition',
        metadata: {
            name: metadataName,
            creationTimestamp: new Date('2020-01-01T00:00:00.000Z')
        },
        spec: {
            group: 'example.com',
            scope: 'Namespaced',
            names: {
                plural: 'widgets',
                singular: 'widget',
                kind: 'Widget',
                categories: ['all']
            },
            versions: [
                {
                    name: 'v1',
                    served: true,
                    storage: true,
                    schema: {
                        openAPIV3Schema: {
                            type: 'object',
                            properties: {
                                spec: { type: 'object' }
                            }
                        }
                    }
                }
            ]
        },
        status: {
            conditions: [
                {
                    type: 'Established',
                    status: 'True',
                    reason: 'Initial',
                    message: 'ok'
                }
            ]
        }
    };
}

suite('CRDDescribeProvider', () => {
    test('returns overview and instances for namespaced CRD', async () => {
        const crd = minimalNamespacedCRD('widgets.example.com');

        let listCalls = 0;
        const mockClient = {
            setContext: (): void => {
                /**/
            },
            apiextensions: {
                readCustomResourceDefinition: async (opts: { name: string }): Promise<k8s.V1CustomResourceDefinition> => {
                    assert.strictEqual(opts.name, 'widgets.example.com');
                    return crd;
                }
            },
            customObjects: {
                listCustomObjectForAllNamespaces: async (req: {
                    group: string;
                    version: string;
                    plural: string;
                }): Promise<{ items: unknown[] }> => {
                    listCalls += 1;
                    assert.strictEqual(req.group, 'example.com');
                    assert.strictEqual(req.version, 'v1');
                    assert.strictEqual(req.plural, 'widgets');
                    return {
                        items: [{ metadata: { name: 'w1', namespace: 'demo' } }]
                    };
                },
                listClusterCustomObject: async (): Promise<{ items: unknown[] }> => {
                    assert.fail('unexpected cluster-wide list');
                }
            }
        } as unknown as KubernetesApiClient;

        const provider = new CRDDescribeProvider(mockClient);
        const data = await provider.getCRDDetails('widgets.example.com', 'test-context');

        assert.strictEqual(data.overview.kind, 'Widget');
        assert.strictEqual(data.overview.scope, 'Namespaced');
        assert.strictEqual(listCalls, 1);
        assert.strictEqual(data.instances.sample.length, 1);
        assert.strictEqual(data.instances.sample[0].namespace, 'demo');
        assert.strictEqual(data.conditions.length, 1);
        assert.ok(data.yaml.includes('CustomResourceDefinition'));
        assert.strictEqual(data.schemas.length, 1);
        assert.ok(data.schemas[0].schemaText.includes('"type": "object"'));
    });

    test('lists cluster-scoped instances', async () => {
        const crd = minimalNamespacedCRD('clusterwidgets.example.com');
        crd.spec!.scope = 'Cluster';

        const mockClient = {
            setContext: (): void => {
                /**/
            },
            apiextensions: {
                readCustomResourceDefinition: async (): Promise<k8s.V1CustomResourceDefinition> => crd
            },
            customObjects: {
                listCustomObjectForAllNamespaces: async (): Promise<{ items: unknown[] }> => {
                    assert.fail('unexpected namespaced-wide list');
                },
                listClusterCustomObject: async (): Promise<{ items: unknown[] }> => ({
                    items: [{ metadata: { name: 'cw1' } }]
                })
            }
        } as unknown as KubernetesApiClient;

        const provider = new CRDDescribeProvider(mockClient);
        const data = await provider.getCRDDetails('clusterwidgets.example.com', 'ctx');

        assert.strictEqual(data.instances.scope, 'Cluster');
        assert.strictEqual(data.instances.sample[0].name, 'cw1');
        assert.strictEqual(data.instances.sample[0].namespace, undefined);
    });
});
