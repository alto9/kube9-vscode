import * as assert from 'assert';
import * as k8s from '@kubernetes/client-node';
import {
    getKubernetesApiClient,
    resetKubernetesApiClient
} from '../../../kubernetes/apiClient';

suite('KubernetesApiClient Test Suite', () => {
    teardown(() => {
        // Reset singleton after each test to ensure clean state
        resetKubernetesApiClient();
    });

    suite('Singleton Pattern', () => {
        test('Should return the same instance on multiple calls', () => {
            const client1 = getKubernetesApiClient();
            const client2 = getKubernetesApiClient();

            assert.strictEqual(client1, client2, 'getKubernetesApiClient should return the same instance');
        });

        test('Should create new instance after reset', () => {
            const client1 = getKubernetesApiClient();
            resetKubernetesApiClient();
            const client2 = getKubernetesApiClient();

            assert.notStrictEqual(client1, client2, 'Should create new instance after reset');
        });
    });

    suite('Kubeconfig Loading', () => {
        test('Should load kubeconfig from default location', () => {
            const client = getKubernetesApiClient();
            const contexts = client.getContexts();

            // Even if no contexts exist, getContexts should return an array
            assert.ok(Array.isArray(contexts), 'getContexts should return an array');
        });

        test('Should have current context set', () => {
            const client = getKubernetesApiClient();
            const currentContext = client.getCurrentContext();

            // Current context may be empty string if no context is set, but should be a string
            assert.ok(typeof currentContext === 'string', 'getCurrentContext should return a string');
        });
    });

    suite('Context Management', () => {
        test('Should return array of contexts', () => {
            const client = getKubernetesApiClient();
            const contexts = client.getContexts();

            assert.ok(Array.isArray(contexts), 'getContexts should return an array');
            // Verify contexts have expected structure if any exist
            if (contexts.length > 0) {
                const context = contexts[0];
                assert.ok(typeof context.name === 'string', 'Context should have name property');
            }
        });

        test('Should return current context name', () => {
            const client = getKubernetesApiClient();
            const currentContext = client.getCurrentContext();

            assert.ok(typeof currentContext === 'string', 'getCurrentContext should return a string');
        });

        test('Should switch context when setContext is called', () => {
            const client = getKubernetesApiClient();
            const contexts = client.getContexts();

            // Only test context switching if we have multiple contexts
            if (contexts.length > 1) {
                const originalContext = client.getCurrentContext();
                const newContext = contexts.find(ctx => ctx.name !== originalContext);

                if (newContext) {
                    client.setContext(newContext.name);
                    const updatedContext = client.getCurrentContext();

                    assert.strictEqual(
                        updatedContext,
                        newContext.name,
                        'setContext should update the current context'
                    );
                }
            } else {
                // If only one or no contexts, just verify the method doesn't throw
                if (contexts.length === 1) {
                    client.setContext(contexts[0].name);
                    assert.ok(true, 'setContext should work with single context');
                } else {
                    // Skip test if no contexts available
                    assert.ok(true, 'No contexts available for testing');
                }
            }
        });
    });

    suite('API Client Getters', () => {
        test('Should return CoreV1Api instance', () => {
            const client = getKubernetesApiClient();
            const coreApi = client.core;

            assert.ok(coreApi instanceof k8s.CoreV1Api, 'core getter should return CoreV1Api instance');
        });

        test('Should return AppsV1Api instance', () => {
            const client = getKubernetesApiClient();
            const appsApi = client.apps;

            assert.ok(appsApi instanceof k8s.AppsV1Api, 'apps getter should return AppsV1Api instance');
        });

        test('Should return BatchV1Api instance', () => {
            const client = getKubernetesApiClient();
            const batchApi = client.batch;

            assert.ok(batchApi instanceof k8s.BatchV1Api, 'batch getter should return BatchV1Api instance');
        });

        test('Should return NetworkingV1Api instance', () => {
            const client = getKubernetesApiClient();
            const networkingApi = client.networking;

            assert.ok(
                networkingApi instanceof k8s.NetworkingV1Api,
                'networking getter should return NetworkingV1Api instance'
            );
        });
    });

    suite('API Client Recreation on Context Switch', () => {
        test('Should recreate API clients when context changes', () => {
            const client = getKubernetesApiClient();
            const contexts = client.getContexts();

            if (contexts.length > 1) {
                const originalCoreApi = client.core;
                const currentContextName = client.getCurrentContext();
                const newContext = contexts.find(ctx => ctx.name !== currentContextName);

                if (newContext) {
                    client.setContext(newContext.name);
                    const newCoreApi = client.core;

                    // API clients should be recreated (different instances)
                    assert.notStrictEqual(
                        originalCoreApi,
                        newCoreApi,
                        'API clients should be recreated when context changes'
                    );
                }
            } else {
                // Skip test if not enough contexts
                assert.ok(true, 'Not enough contexts to test API client recreation');
            }
        });
    });

    suite('Reset Function', () => {
        test('Should allow creating new instance after reset', () => {
            const client1 = getKubernetesApiClient();

            resetKubernetesApiClient();
            const client2 = getKubernetesApiClient();

            // New instance should be created
            assert.notStrictEqual(client1, client2, 'resetKubernetesApiClient should allow new instance creation');
            // New instance should still load kubeconfig correctly
            assert.ok(typeof client2.getCurrentContext() === 'string', 'New instance should load kubeconfig');
        });
    });
});

