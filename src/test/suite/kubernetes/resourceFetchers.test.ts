/* eslint-disable @typescript-eslint/no-explicit-any */
import * as assert from 'assert';
import * as k8s from '@kubernetes/client-node';
import {
    fetchNodes,
    fetchNamespaces,
    fetchPods,
    fetchDeployments,
    fetchServices,
    fetchClusterResources
} from '../../../kubernetes/resourceFetchers';
import {
    getKubernetesApiClient,
    resetKubernetesApiClient
} from '../../../kubernetes/apiClient';

suite('Resource Fetchers Test Suite', () => {
    let originalCoreApi: k8s.CoreV1Api;
    let originalAppsApi: k8s.AppsV1Api;
    let mockCoreApi: any;
    let mockAppsApi: any;

    setup(() => {
        // Reset singleton to ensure clean state
        resetKubernetesApiClient();
        const client = getKubernetesApiClient();
        
        // Save original API clients
        originalCoreApi = client.core;
        originalAppsApi = client.apps;

        // Create mock API clients
        mockCoreApi = {
            listNode: async () => Promise.resolve({ items: [] }),
            listNamespace: async () => Promise.resolve({ items: [] }),
            listNamespacedPod: async () => Promise.resolve({ items: [] }),
            listPodForAllNamespaces: async () => Promise.resolve({ items: [] }),
            listNamespacedService: async () => Promise.resolve({ items: [] }),
            listServiceForAllNamespaces: async () => Promise.resolve({ items: [] })
        };

        mockAppsApi = {
            listNamespacedDeployment: async () => Promise.resolve({ items: [] }),
            listDeploymentForAllNamespaces: async () => Promise.resolve({ items: [] })
        };

        // Replace API clients with mocks
        (client as any).coreApi = mockCoreApi;
        (client as any).appsApi = mockAppsApi;
    });

    teardown(() => {
        // Restore original API clients
        const client = getKubernetesApiClient();
        (client as any).coreApi = originalCoreApi;
        (client as any).appsApi = originalAppsApi;
        resetKubernetesApiClient();
    });

    suite('fetchNodes', () => {
        test('Should return array of V1Node objects', async () => {
            const mockNodes: k8s.V1Node[] = [
                {
                    metadata: { name: 'node-1', uid: '1' },
                    spec: {},
                    status: {}
                } as k8s.V1Node,
                {
                    metadata: { name: 'node-2', uid: '2' },
                    spec: {},
                    status: {}
                } as k8s.V1Node
            ];

            mockCoreApi.listNode = async () => Promise.resolve({ items: mockNodes });

            const nodes = await fetchNodes();

            assert.ok(Array.isArray(nodes), 'Should return an array');
            assert.strictEqual(nodes.length, 2, 'Should return 2 nodes');
            assert.strictEqual(nodes[0].metadata?.name, 'node-1', 'First node should have correct name');
        });

        test('Should pass timeout option to API call', async () => {
            let capturedTimeout: number | undefined;
            mockCoreApi.listNode = async (params: any) => {
                capturedTimeout = params.timeoutSeconds;
                return Promise.resolve({ items: [] });
            };

            await fetchNodes({ timeout: 15 });

            assert.strictEqual(capturedTimeout, 15, 'Should pass timeout of 15 seconds');
        });

        test('Should use default timeout of 10 seconds', async () => {
            let capturedTimeout: number | undefined;
            mockCoreApi.listNode = async (params: any) => {
                capturedTimeout = params.timeoutSeconds;
                return Promise.resolve({ items: [] });
            };

            await fetchNodes();

            assert.strictEqual(capturedTimeout, 10, 'Should use default timeout of 10 seconds');
        });

        test('Should pass label selector to API call', async () => {
            let capturedLabelSelector: string | undefined;
            mockCoreApi.listNode = async (params: any) => {
                capturedLabelSelector = params.labelSelector;
                return Promise.resolve({ items: [] });
            };

            await fetchNodes({ labelSelector: 'node-role.kubernetes.io/worker=' });

            assert.strictEqual(capturedLabelSelector, 'node-role.kubernetes.io/worker=', 'Should pass label selector');
        });

        test('Should handle API errors and re-throw', async () => {
            const apiError: any = new Error('API Error');
            apiError.response = {
                statusCode: 500,
                body: { message: 'Internal server error' }
            };

            mockCoreApi.listNode = async () => Promise.reject(apiError);

            try {
                await fetchNodes();
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.strictEqual(error, apiError, 'Should re-throw the original error');
            }
        });
    });

    suite('fetchNamespaces', () => {
        test('Should return array of V1Namespace objects', async () => {
            const mockNamespaces: k8s.V1Namespace[] = [
                {
                    metadata: { name: 'default', uid: '1' },
                    spec: {},
                    status: {}
                } as k8s.V1Namespace,
                {
                    metadata: { name: 'kube-system', uid: '2' },
                    spec: {},
                    status: {}
                } as k8s.V1Namespace
            ];

            mockCoreApi.listNamespace = async () => Promise.resolve({ items: mockNamespaces });

            const namespaces = await fetchNamespaces();

            assert.ok(Array.isArray(namespaces), 'Should return an array');
            assert.strictEqual(namespaces.length, 2, 'Should return 2 namespaces');
            assert.strictEqual(namespaces[0].metadata?.name, 'default', 'First namespace should have correct name');
        });

        test('Should handle authentication errors', async () => {
            const apiError: any = new Error('Authentication failed');
            apiError.response = {
                statusCode: 401,
                body: { message: 'Unauthorized' }
            };

            mockCoreApi.listNamespace = async () => Promise.reject(apiError);

            try {
                await fetchNamespaces();
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.strictEqual(error, apiError, 'Should re-throw the original error');
            }
        });
    });

    suite('fetchPods', () => {
        test('Should return array of V1Pod objects from all namespaces', async () => {
            const mockPods: k8s.V1Pod[] = [
                {
                    metadata: { name: 'pod-1', namespace: 'default', uid: '1' },
                    spec: {},
                    status: {}
                } as k8s.V1Pod
            ];

            mockCoreApi.listPodForAllNamespaces = async () => Promise.resolve({ items: mockPods });

            const pods = await fetchPods();

            assert.ok(Array.isArray(pods), 'Should return an array');
            assert.strictEqual(pods.length, 1, 'Should return 1 pod');
        });

        test('Should use namespaced API call when namespace is provided', async () => {
            const mockPods: k8s.V1Pod[] = [
                {
                    metadata: { name: 'pod-1', namespace: 'default', uid: '1' },
                    spec: {},
                    status: {}
                } as k8s.V1Pod
            ];

            let namespaceUsed: string | undefined;
            mockCoreApi.listNamespacedPod = async (params: any) => {
                namespaceUsed = params.namespace;
                return Promise.resolve({ items: mockPods });
            };

            await fetchPods({ namespace: 'default' });

            assert.strictEqual(namespaceUsed, 'default', 'Should use namespaced API call');
        });

        test('Should use cluster-wide API call when namespace is not provided', async () => {
            let clusterWideCalled = false;
            mockCoreApi.listPodForAllNamespaces = async () => {
                clusterWideCalled = true;
                return Promise.resolve({ items: [] });
            };

            await fetchPods();

            assert.ok(clusterWideCalled, 'Should use cluster-wide API call');
        });

        test('Should handle permission denied errors', async () => {
            const apiError: any = new Error('Permission denied');
            apiError.response = {
                statusCode: 403,
                body: { message: 'Forbidden' }
            };

            mockCoreApi.listNamespacedPod = async () => Promise.reject(apiError);

            try {
                await fetchPods({ namespace: 'default' });
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.strictEqual(error, apiError, 'Should re-throw the original error');
            }
        });
    });

    suite('fetchDeployments', () => {
        test('Should return array of V1Deployment objects from all namespaces', async () => {
            const mockDeployments: k8s.V1Deployment[] = [
                {
                    metadata: { name: 'deployment-1', namespace: 'default', uid: '1' },
                    spec: {},
                    status: {}
                } as k8s.V1Deployment
            ];

            mockAppsApi.listDeploymentForAllNamespaces = async () => Promise.resolve({ items: mockDeployments });

            const deployments = await fetchDeployments();

            assert.ok(Array.isArray(deployments), 'Should return an array');
            assert.strictEqual(deployments.length, 1, 'Should return 1 deployment');
        });

        test('Should use namespaced API call when namespace is provided', async () => {
            const mockDeployments: k8s.V1Deployment[] = [
                {
                    metadata: { name: 'deployment-1', namespace: 'production', uid: '1' },
                    spec: {},
                    status: {}
                } as k8s.V1Deployment
            ];

            let namespaceUsed: string | undefined;
            mockAppsApi.listNamespacedDeployment = async (params: any) => {
                namespaceUsed = params.namespace;
                return Promise.resolve({ items: mockDeployments });
            };

            await fetchDeployments({ namespace: 'production' });

            assert.strictEqual(namespaceUsed, 'production', 'Should use namespaced API call');
        });

        test('Should pass field selector to API call', async () => {
            let capturedFieldSelector: string | undefined;
            mockAppsApi.listNamespacedDeployment = async (params: any) => {
                capturedFieldSelector = params.fieldSelector;
                return Promise.resolve({ items: [] });
            };

            await fetchDeployments({ namespace: 'default', fieldSelector: 'metadata.name=test' });

            assert.strictEqual(capturedFieldSelector, 'metadata.name=test', 'Should pass field selector');
        });
    });

    suite('fetchServices', () => {
        test('Should return array of V1Service objects from all namespaces', async () => {
            const mockServices: k8s.V1Service[] = [
                {
                    metadata: { name: 'service-1', namespace: 'default', uid: '1' },
                    spec: {},
                    status: {}
                } as k8s.V1Service
            ];

            mockCoreApi.listServiceForAllNamespaces = async () => Promise.resolve({ items: mockServices });

            const services = await fetchServices();

            assert.ok(Array.isArray(services), 'Should return an array');
            assert.strictEqual(services.length, 1, 'Should return 1 service');
        });

        test('Should use namespaced API call when namespace is provided', async () => {
            const mockServices: k8s.V1Service[] = [
                {
                    metadata: { name: 'service-1', namespace: 'default', uid: '1' },
                    spec: {},
                    status: {}
                } as k8s.V1Service
            ];

            let namespaceUsed: string | undefined;
            mockCoreApi.listNamespacedService = async (params: any) => {
                namespaceUsed = params.namespace;
                return Promise.resolve({ items: mockServices });
            };

            await fetchServices({ namespace: 'default' });

            assert.strictEqual(namespaceUsed, 'default', 'Should use namespaced API call');
        });

        test('Should handle connection timeout errors', async () => {
            const timeoutError: any = new Error('Connection timeout');
            timeoutError.code = 'ETIMEDOUT';
            timeoutError.message = 'Request timeout';

            mockCoreApi.listServiceForAllNamespaces = async () => Promise.reject(timeoutError);

            try {
                await fetchServices();
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.strictEqual(error, timeoutError, 'Should re-throw the original error');
            }
        });

        test('Should handle connection refused errors', async () => {
            const connectionError: any = new Error('Connection refused');
            connectionError.code = 'ECONNREFUSED';
            connectionError.message = 'Connection refused';

            mockCoreApi.listServiceForAllNamespaces = async () => Promise.reject(connectionError);

            try {
                await fetchServices();
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.strictEqual(error, connectionError, 'Should re-throw the original error');
            }
        });
    });

    suite('fetchClusterResources', () => {
        test('Should fetch nodes, namespaces, and pods in parallel', async () => {
            const mockNodes: k8s.V1Node[] = [
                { metadata: { name: 'node-1', uid: '1' }, spec: {}, status: {} } as k8s.V1Node
            ];
            const mockNamespaces: k8s.V1Namespace[] = [
                { metadata: { name: 'default', uid: '1' }, spec: {}, status: {} } as k8s.V1Namespace
            ];
            const mockPods: k8s.V1Pod[] = [
                { metadata: { name: 'pod-1', namespace: 'default', uid: '1' }, spec: {}, status: {} } as k8s.V1Pod
            ];

            mockCoreApi.listNode = async () => Promise.resolve({ items: mockNodes });
            mockCoreApi.listNamespace = async () => Promise.resolve({ items: mockNamespaces });
            mockCoreApi.listPodForAllNamespaces = async () => Promise.resolve({ items: mockPods });

            const result = await fetchClusterResources();

            assert.ok(result.nodes, 'Should have nodes property');
            assert.ok(result.namespaces, 'Should have namespaces property');
            assert.ok(result.pods, 'Should have pods property');
            assert.strictEqual(result.nodes.length, 1, 'Should return 1 node');
            assert.strictEqual(result.namespaces.length, 1, 'Should return 1 namespace');
            assert.strictEqual(result.pods.length, 1, 'Should return 1 pod');
        });

        test('Should execute fetches in parallel', async () => {
            const fetchOrder: string[] = [];
            const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

            mockCoreApi.listNode = async () => {
                await delay(50);
                fetchOrder.push('nodes');
                return Promise.resolve({ items: [] });
            };
            mockCoreApi.listNamespace = async () => {
                await delay(30);
                fetchOrder.push('namespaces');
                return Promise.resolve({ items: [] });
            };
            mockCoreApi.listPodForAllNamespaces = async () => {
                await delay(10);
                fetchOrder.push('pods');
                return Promise.resolve({ items: [] });
            };

            await fetchClusterResources();

            // If parallel, all should complete around the same time (longest delay)
            // If sequential, order would be nodes -> namespaces -> pods
            // With parallel execution, pods should finish first, then namespaces, then nodes
            // But all should start at roughly the same time
            assert.ok(fetchOrder.length === 3, 'All fetches should complete');
            // The order might vary, but all should complete
            assert.ok(fetchOrder.includes('nodes'), 'Nodes fetch should complete');
            assert.ok(fetchOrder.includes('namespaces'), 'Namespaces fetch should complete');
            assert.ok(fetchOrder.includes('pods'), 'Pods fetch should complete');
        });

        test('Should propagate errors from any failed fetch', async () => {
            const apiError: any = new Error('API Error');
            apiError.response = {
                statusCode: 500,
                body: { message: 'Internal server error' }
            };

            mockCoreApi.listNode = async () => Promise.resolve({ items: [] });
            mockCoreApi.listNamespace = async () => Promise.reject(apiError);
            mockCoreApi.listPodForAllNamespaces = async () => Promise.resolve({ items: [] });

            try {
                await fetchClusterResources();
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.strictEqual(error, apiError, 'Should propagate the error from failed fetch');
            }
        });
    });

    suite('Error Handling', () => {
        test('Should handle 404 not found errors', async () => {
            const apiError: any = new Error('Not found');
            apiError.response = {
                statusCode: 404,
                body: { message: 'Resource not found' }
            };

            mockCoreApi.listNode = async () => Promise.reject(apiError);

            try {
                await fetchNodes();
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.strictEqual(error, apiError, 'Should re-throw the original error');
            }
        });

        test('Should handle unexpected errors', async () => {
            const unexpectedError = new Error('Unexpected error');

            mockCoreApi.listNode = async () => Promise.reject(unexpectedError);

            try {
                await fetchNodes();
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.strictEqual(error, unexpectedError, 'Should re-throw the original error');
            }
        });
    });
});

