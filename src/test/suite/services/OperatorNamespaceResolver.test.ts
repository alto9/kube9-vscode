import * as assert from 'assert';
import * as k8s from '@kubernetes/client-node';
import * as vscode from '../../mocks/vscode';
import {
    OperatorNamespaceResolver,
    getOperatorNamespaceResolver,
    resetOperatorNamespaceResolver
} from '../../../services/OperatorNamespaceResolver';
import {
    getKubernetesApiClient,
    resetKubernetesApiClient
} from '../../../kubernetes/apiClient';

interface MockCoreApi {
    readNamespacedConfigMap: (params: { name: string; namespace: string }) => Promise<k8s.V1ConfigMap>;
    listNamespacedPod: (params: { namespace: string; labelSelector?: string }) => Promise<{ items: k8s.V1Pod[] }>;
}

interface MockWorkspaceConfiguration {
    _setConfig: (key: string, value: unknown) => void;
    _clearConfig: () => void;
}

suite('OperatorNamespaceResolver Test Suite', () => {
    let resolver: OperatorNamespaceResolver;
    let mockCoreApi: MockCoreApi;
    let originalCoreApi: k8s.CoreV1Api;

    setup(() => {
        // Reset singleton
        resetOperatorNamespaceResolver();
        resetKubernetesApiClient();

        // Create resolver instance
        resolver = new OperatorNamespaceResolver();

        // Get API client and mock its core API
        const apiClient = getKubernetesApiClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalCoreApi = (apiClient as any).coreApi;

        // Create mock Core API
        mockCoreApi = {
            readNamespacedConfigMap: async () => Promise.reject(new Error('Not found')),
            listNamespacedPod: async () => Promise.resolve({ items: [] })
        };

        // Replace API client's core API with mock
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (apiClient as any).coreApi = mockCoreApi;

        // Mock setContext to avoid recreating API clients (which requires valid kubeconfig context)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (apiClient as any).setContext = () => {
            // No-op: we're already using mocked API clients
        };

        // Clear VS Code configuration
        (vscode.workspace._getConfiguration() as MockWorkspaceConfiguration)._clearConfig();
    });

    teardown(() => {
        // Restore original API client
        const apiClient = getKubernetesApiClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (apiClient as any).coreApi = originalCoreApi;
        resetKubernetesApiClient();
        resetOperatorNamespaceResolver();

        // Clear VS Code configuration
        (vscode.workspace._getConfiguration() as MockWorkspaceConfiguration)._clearConfig();
    });

    suite('Singleton Pattern', () => {
        test('Should return the same instance on multiple calls', () => {
            const resolver1 = getOperatorNamespaceResolver();
            const resolver2 = getOperatorNamespaceResolver();

            assert.strictEqual(resolver1, resolver2, 'getOperatorNamespaceResolver should return the same instance');
        });

        test('Should create new instance after reset', () => {
            const resolver1 = getOperatorNamespaceResolver();
            resetOperatorNamespaceResolver();
            const resolver2 = getOperatorNamespaceResolver();

            assert.notStrictEqual(resolver1, resolver2, 'Should create new instance after reset');
        });
    });

    suite('Cache Management', () => {
        test('Should cache resolved namespace', async () => {
            // Mock ConfigMap with namespace field
            mockCoreApi.readNamespacedConfigMap = async (params: { name: string; namespace: string }) => {
                return Promise.resolve({
                    metadata: { name: params.name, namespace: params.namespace },
                    data: { namespace: 'kube9-custom', status: 'enabled' }
                } as k8s.V1ConfigMap);
            };

            const namespace1 = await resolver.resolveNamespace('test-cluster');
            const namespace2 = await resolver.resolveNamespace('test-cluster');

            assert.strictEqual(namespace1, namespace2, 'Should return cached namespace on second call');
            assert.strictEqual(namespace1, 'kube9-custom', 'Should return namespace from ConfigMap');
        });

        test('Should return cached namespace without API call', () => {
            // Manually set cache
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (resolver as any).namespaceCache.set('test-cluster', 'cached-namespace');

            const cached = resolver.getCachedNamespace('test-cluster');
            assert.strictEqual(cached, 'cached-namespace', 'Should return cached namespace');
        });

        test('Should return undefined for non-cached namespace', () => {
            const cached = resolver.getCachedNamespace('non-existent-cluster');
            assert.strictEqual(cached, undefined, 'Should return undefined for non-cached namespace');
        });

        test('Should invalidate cache for specific cluster', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (resolver as any).namespaceCache.set('test-cluster', 'test-namespace');
            resolver.invalidateCache('test-cluster');

            const cached = resolver.getCachedNamespace('test-cluster');
            assert.strictEqual(cached, undefined, 'Should clear cache for specific cluster');
        });

        test('Should clear all cached namespaces', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (resolver as any).namespaceCache.set('cluster1', 'ns1');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (resolver as any).namespaceCache.set('cluster2', 'ns2');
            resolver.clearCache();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            assert.strictEqual((resolver as any).namespaceCache.size, 0, 'Should clear all cached namespaces');
        });
    });

    suite('Three-Tier Resolution', () => {
        test('Should use ConfigMap namespace when available', async () => {
            mockCoreApi.readNamespacedConfigMap = async (params: { name: string; namespace: string }) => {
                if (params.namespace === 'kube9-system') {
                    return Promise.resolve({
                        metadata: { name: params.name, namespace: params.namespace },
                        data: { namespace: 'kube9-custom', status: 'enabled' }
                    } as k8s.V1ConfigMap);
                }
                return Promise.reject(new Error('Not found'));
            };

            const namespace = await resolver.resolveNamespace('test-cluster');
            assert.strictEqual(namespace, 'kube9-custom', 'Should use namespace from ConfigMap');
        });

        test('Should fall back to settings when ConfigMap not found', async () => {
            // Mock ConfigMap not found
            mockCoreApi.readNamespacedConfigMap = async () => {
                return Promise.reject(new Error('Not found'));
            };

            // Set VS Code settings (key is 'operatorNamespace' because getConfiguration('kube9') returns scoped config)
            (vscode.workspace._getConfiguration() as MockWorkspaceConfiguration)._setConfig('operatorNamespace', 'my-kube9');

            const namespace = await resolver.resolveNamespace('test-cluster');
            assert.strictEqual(namespace, 'my-kube9', 'Should use namespace from settings');
        });

        test('Should fall back to default when ConfigMap and settings not available', async () => {
            // Mock ConfigMap not found
            mockCoreApi.readNamespacedConfigMap = async () => {
                return Promise.reject(new Error('Not found'));
            };

            // No settings configured

            const namespace = await resolver.resolveNamespace('test-cluster');
            assert.strictEqual(namespace, 'kube9-system', 'Should fall back to default namespace');
        });

        test('Should use per-cluster settings when object config provided', async () => {
            // Mock ConfigMap not found
            mockCoreApi.readNamespacedConfigMap = async () => {
                return Promise.reject(new Error('Not found'));
            };

            // Set per-cluster settings (key is 'operatorNamespace' because getConfiguration('kube9') returns scoped config)
            (vscode.workspace._getConfiguration() as MockWorkspaceConfiguration)._setConfig('operatorNamespace', {
                'production': 'kube9-prod',
                'staging': 'kube9-staging'
            });

            const prodNamespace = await resolver.resolveNamespace('production');
            const stagingNamespace = await resolver.resolveNamespace('staging');

            assert.strictEqual(prodNamespace, 'kube9-prod', 'Should use production namespace from settings');
            assert.strictEqual(stagingNamespace, 'kube9-staging', 'Should use staging namespace from settings');
        });

        test('Should use string settings for all clusters when object config missing cluster', async () => {
            // Mock ConfigMap not found
            mockCoreApi.readNamespacedConfigMap = async () => {
                return Promise.reject(new Error('Not found'));
            };

            // Set string settings (applies to all clusters) (key is 'operatorNamespace' because getConfiguration('kube9') returns scoped config)
            (vscode.workspace._getConfiguration() as MockWorkspaceConfiguration)._setConfig('operatorNamespace', 'global-namespace');

            const namespace1 = await resolver.resolveNamespace('cluster1');
            const namespace2 = await resolver.resolveNamespace('cluster2');

            assert.strictEqual(namespace1, 'global-namespace', 'Should use global namespace for cluster1');
            assert.strictEqual(namespace2, 'global-namespace', 'Should use global namespace for cluster2');
        });
    });

    suite('ConfigMap Discovery', () => {
        test('Should try settings namespace first in bootstrap strategy', async () => {
            const triedNamespaces: string[] = [];

            // Set settings namespace (key is 'operatorNamespace' because getConfiguration('kube9') returns scoped config)
            (vscode.workspace._getConfiguration() as MockWorkspaceConfiguration)._setConfig('operatorNamespace', 'settings-ns');

            mockCoreApi.readNamespacedConfigMap = async (params: { name: string; namespace: string }) => {
                triedNamespaces.push(params.namespace);
                if (params.namespace === 'settings-ns') {
                    return Promise.resolve({
                        metadata: { name: params.name, namespace: params.namespace },
                        data: { namespace: 'settings-ns', status: 'enabled' }
                    } as k8s.V1ConfigMap);
                }
                return Promise.reject(new Error('Not found'));
            };

            const namespace = await resolver.resolveNamespace('test-cluster');

            assert.strictEqual(namespace, 'settings-ns', 'Should use settings namespace');
            assert.ok(triedNamespaces.includes('settings-ns'), 'Should try settings namespace first');
        });

        test('Should try default namespace when settings namespace fails', async () => {
            const triedNamespaces: string[] = [];

            // No settings configured

            mockCoreApi.readNamespacedConfigMap = async (params: { name: string; namespace: string }) => {
                triedNamespaces.push(params.namespace);
                if (params.namespace === 'kube9-system') {
                    return Promise.resolve({
                        metadata: { name: params.name, namespace: params.namespace },
                        data: { namespace: 'kube9-system', status: 'enabled' }
                    } as k8s.V1ConfigMap);
                }
                return Promise.reject(new Error('Not found'));
            };

            const namespace = await resolver.resolveNamespace('test-cluster');

            assert.strictEqual(namespace, 'kube9-system', 'Should use default namespace');
            assert.ok(triedNamespaces.includes('kube9-system'), 'Should try default namespace');
        });

        test('Should use namespace field from ConfigMap when present', async () => {
            mockCoreApi.readNamespacedConfigMap = async (params: { name: string; namespace: string }) => {
                return Promise.resolve({
                    metadata: { name: params.name, namespace: 'kube9-system' },
                    data: { namespace: 'kube9-custom', status: 'enabled' }
                } as k8s.V1ConfigMap);
            };

            const namespace = await resolver.resolveNamespace('test-cluster');
            assert.strictEqual(namespace, 'kube9-custom', 'Should use namespace field from ConfigMap data');
        });

        test('Should use ConfigMap namespace when namespace field not present', async () => {
            mockCoreApi.readNamespacedConfigMap = async (params: { name: string; namespace: string }) => {
                // Return ConfigMap found in the namespace being searched
                return Promise.resolve({
                    metadata: { name: params.name, namespace: params.namespace },
                    data: { status: 'enabled' } // No namespace field
                } as k8s.V1ConfigMap);
            };

            const namespace = await resolver.resolveNamespace('test-cluster');
            // When ConfigMap is found but has no namespace field in data, it returns the namespace where it was found
            assert.strictEqual(namespace, 'kube9-system', 'Should use namespace where ConfigMap was found when data.namespace not present');
        });

        test('Should handle ConfigMap not found gracefully', async () => {
            mockCoreApi.readNamespacedConfigMap = async () => {
                return Promise.reject(new Error('Not found'));
            };

            // Set settings as fallback (key is 'operatorNamespace' because getConfiguration('kube9') returns scoped config)
            (vscode.workspace._getConfiguration() as MockWorkspaceConfiguration)._setConfig('operatorNamespace', 'settings-ns');

            const namespace = await resolver.resolveNamespace('test-cluster');
            assert.strictEqual(namespace, 'settings-ns', 'Should fall back to settings when ConfigMap not found');
        });
    });

    suite('Settings Access', () => {
        test('Should return null when settings not configured', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const namespace = (resolver as any).getNamespaceFromSettings('test-cluster');
            assert.strictEqual(namespace, null, 'Should return null when settings not configured');
        });

        test('Should return string value when string config provided', () => {
            (vscode.workspace._getConfiguration() as MockWorkspaceConfiguration)._setConfig('operatorNamespace', 'my-namespace');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const namespace = (resolver as any).getNamespaceFromSettings('test-cluster');
            assert.strictEqual(namespace, 'my-namespace', 'Should return string value');
        });

        test('Should return cluster-specific value when object config provided', () => {
            (vscode.workspace._getConfiguration() as MockWorkspaceConfiguration)._setConfig('operatorNamespace', {
                'cluster1': 'ns1',
                'cluster2': 'ns2'
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const namespace1 = (resolver as any).getNamespaceFromSettings('cluster1');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const namespace2 = (resolver as any).getNamespaceFromSettings('cluster2');
            assert.strictEqual(namespace1, 'ns1', 'Should return cluster1 namespace');
            assert.strictEqual(namespace2, 'ns2', 'Should return cluster2 namespace');
        });

        test('Should return null when object config missing cluster key', () => {
            (vscode.workspace._getConfiguration() as MockWorkspaceConfiguration)._setConfig('operatorNamespace', {
                'cluster1': 'ns1'
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const namespace = (resolver as any).getNamespaceFromSettings('cluster2');
            assert.strictEqual(namespace, null, 'Should return null for missing cluster key');
        });
    });

    suite('Namespace Validation', () => {
        test('Should return true when operator pod found', async () => {
            mockCoreApi.listNamespacedPod = async () => {
                return Promise.resolve({
                    items: [
                        {
                            metadata: {
                                name: 'kube9-operator-123',
                                labels: { app: 'kube9-operator' }
                            }
                        } as k8s.V1Pod
                    ]
                });
            };

            const isValid = await resolver.validateNamespace('test-cluster', 'kube9-system');
            assert.strictEqual(isValid, true, 'Should return true when operator pod found');
        });

        test('Should return false when operator pod not found', async () => {
            mockCoreApi.listNamespacedPod = async () => {
                return Promise.resolve({ items: [] });
            };

            const isValid = await resolver.validateNamespace('test-cluster', 'kube9-system');
            assert.strictEqual(isValid, false, 'Should return false when operator pod not found');
        });

        test('Should return false when API call fails', async () => {
            mockCoreApi.listNamespacedPod = async () => {
                return Promise.reject(new Error('API error'));
            };

            const isValid = await resolver.validateNamespace('test-cluster', 'kube9-system');
            assert.strictEqual(isValid, false, 'Should return false when API call fails');
        });

        test('Should filter pods by label selector', async () => {
            let labelSelectorUsed: string | undefined;
            mockCoreApi.listNamespacedPod = async (params: { namespace: string; labelSelector?: string }) => {
                labelSelectorUsed = params.labelSelector;
                return Promise.resolve({
                    items: [
                        {
                            metadata: {
                                name: 'kube9-operator-123',
                                labels: { app: 'kube9-operator' }
                            }
                        } as k8s.V1Pod
                    ]
                });
            };

            await resolver.validateNamespace('test-cluster', 'kube9-system');
            assert.strictEqual(labelSelectorUsed, 'app=kube9-operator', 'Should use correct label selector');
        });
    });

    suite('Error Handling', () => {
        test('Should handle API errors gracefully and fall back', async () => {
            // Mock API error (not 404)
            mockCoreApi.readNamespacedConfigMap = async () => {
                return Promise.reject(new Error('Permission denied'));
            };

            // Set settings as fallback (key is 'operatorNamespace' because getConfiguration('kube9') returns scoped config)
            (vscode.workspace._getConfiguration() as MockWorkspaceConfiguration)._setConfig('operatorNamespace', 'settings-ns');

            const namespace = await resolver.resolveNamespace('test-cluster');
            assert.strictEqual(namespace, 'settings-ns', 'Should fall back to settings on API error');
        });

        test('Should handle missing ConfigMap data gracefully', async () => {
            mockCoreApi.readNamespacedConfigMap = async () => {
                return Promise.resolve({
                    metadata: { name: 'kube9-operator-status', namespace: 'kube9-system' },
                    data: undefined // No data field
                } as k8s.V1ConfigMap);
            };

            // Set settings as fallback (key is 'operatorNamespace' because getConfiguration('kube9') returns scoped config)
            (vscode.workspace._getConfiguration() as MockWorkspaceConfiguration)._setConfig('operatorNamespace', 'settings-ns');

            const namespace = await resolver.resolveNamespace('test-cluster');
            assert.strictEqual(namespace, 'settings-ns', 'Should fall back to settings when ConfigMap has no data');
        });
    });
});

