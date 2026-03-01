import * as assert from 'assert';
import { SecretsSubcategory } from '../../../../tree/categories/configuration/SecretsSubcategory';
import { TreeItemData } from '../../../../tree/TreeItemTypes';
import { KubectlError, KubectlErrorType } from '../../../../kubernetes/KubectlError';
import * as configurationCommandsModule from '../../../../kubectl/ConfigurationCommands';
import * as kubectlContextModule from '../../../../utils/kubectlContext';

suite('SecretsSubcategory Test Suite', () => {
    let originalGetSecrets: typeof configurationCommandsModule.ConfigurationCommands.getSecrets;
    let originalGetNamespaceForContext: typeof kubectlContextModule.getNamespaceForContext;

    const mockTreeItemData: TreeItemData = {
        context: { name: 'test-context', cluster: 'test-cluster' },
        cluster: { name: 'test-cluster', server: 'https://api.test.com:6443' }
    };

    const mockSecretResult = {
        error: undefined,
        secrets: [
            { name: 'db-secret', namespace: 'default', type: 'Opaque' },
            { name: 'api-key', namespace: 'default', type: 'Opaque' },
            { name: 'db-secret', namespace: 'production', type: 'Opaque' },
            { name: 'tls-secret', namespace: 'production', type: 'kubernetes.io/tls' }
        ]
    };

    const mockSecretResultDefaultOnly = {
        error: undefined,
        secrets: [
            { name: 'db-secret', namespace: 'default', type: 'Opaque' },
            { name: 'api-key', namespace: 'default', type: 'Opaque' }
        ]
    };

    const mockSecretResultProductionOnly = {
        error: undefined,
        secrets: [
            { name: 'db-secret', namespace: 'production', type: 'Opaque' },
            { name: 'tls-secret', namespace: 'production', type: 'kubernetes.io/tls' }
        ]
    };

    setup(() => {
        // Save original methods
        originalGetSecrets = configurationCommandsModule.ConfigurationCommands.getSecrets;
        originalGetNamespaceForContext = kubectlContextModule.getNamespaceForContext;

        // Mock getNamespaceForContext to return null by default (cluster-wide view)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (kubectlContextModule as any).getNamespaceForContext = async (): Promise<string | null> => {
            return null;
        };
    });

    teardown(() => {
        // Restore original methods
        configurationCommandsModule.ConfigurationCommands.getSecrets = originalGetSecrets;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (kubectlContextModule as any).getNamespaceForContext = originalGetNamespaceForContext;
    });

    suite('getSecretItems', () => {
        test('Should return all secrets when no namespace is set (cluster-wide view)', async () => {
            // Mock getNamespaceForContext to return null (cluster-wide view)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (kubectlContextModule as any).getNamespaceForContext = async (): Promise<string | null> => {
                return null;
            };

            configurationCommandsModule.ConfigurationCommands.getSecrets = async (
                kubeconfigPath: string,
                contextName: string,
                namespace?: string
            ) => {
                assert.strictEqual(namespace, undefined, 'Namespace should be undefined for cluster-wide view');
                return mockSecretResult;
            };

            const errorHandler = () => {
                assert.fail('Should not call error handler');
            };

            const items = await SecretsSubcategory.getSecretItems(
                mockTreeItemData,
                '/test/kubeconfig.yaml',
                errorHandler
            );

            // Should have 4 secrets (2 from default, 2 from production)
            assert.strictEqual(items.length, 4);
            
            // Verify all secrets are returned with correct namespace prefixes
            const secretNames = items.map(item => item.label as string);
            assert.ok(secretNames.includes('default/db-secret'));
            assert.ok(secretNames.includes('default/api-key'));
            assert.ok(secretNames.includes('production/db-secret'));
            assert.ok(secretNames.includes('production/tls-secret'));
        });

        test('Should return only secrets from active namespace when namespace is set', async () => {
            // Mock getNamespaceForContext to return 'default' (active namespace)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (kubectlContextModule as any).getNamespaceForContext = async (): Promise<string | null> => {
                return 'default';
            };

            configurationCommandsModule.ConfigurationCommands.getSecrets = async (
                kubeconfigPath: string,
                contextName: string,
                namespace?: string
            ) => {
                assert.strictEqual(namespace, 'default', 'Namespace should be "default"');
                return mockSecretResultDefaultOnly;
            };

            const errorHandler = () => {
                assert.fail('Should not call error handler');
            };

            const items = await SecretsSubcategory.getSecretItems(
                mockTreeItemData,
                '/test/kubeconfig.yaml',
                errorHandler
            );

            // Should have 2 secrets from default namespace
            assert.strictEqual(items.length, 2);
            
            // Verify all secrets are from default namespace
            const secretNames = items.map(item => item.label as string);
            assert.ok(secretNames.includes('default/db-secret'));
            assert.ok(secretNames.includes('default/api-key'));
            assert.ok(!secretNames.includes('production/db-secret'));
            assert.ok(!secretNames.includes('production/tls-secret'));
        });

        test('Should switch to different namespace and return filtered secrets', async () => {
            // First, mock returning secrets from default namespace
            let callCount = 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (kubectlContextModule as any).getNamespaceForContext = async (): Promise<string | null> => {
                // First call returns default, subsequent calls return production
                return callCount === 0 ? 'default' : 'production';
            };

            configurationCommandsModule.ConfigurationCommands.getSecrets = async (
                kubeconfigPath: string,
                contextName: string,
                namespace?: string
            ) => {
                callCount++;
                if (namespace === 'default') {
                    return mockSecretResultDefaultOnly;
                } else if (namespace === 'production') {
                    return mockSecretResultProductionOnly;
                } else {
                    return mockSecretResult;
                }
            };

            const errorHandler = () => {
                assert.fail('Should not call error handler');
            };

            // First call: get secrets from default namespace
            callCount = 0;
            let items = await SecretsSubcategory.getSecretItems(
                mockTreeItemData,
                '/test/kubeconfig.yaml',
                errorHandler
            );
            assert.strictEqual(items.length, 2);
            assert.ok((items[0].label as string).includes('default'));

            // Simulate namespace change by adjusting the mock
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (kubectlContextModule as any).getNamespaceForContext = async (): Promise<string | null> => {
                return 'production';
            };

            // Second call: get secrets from production namespace (simulating refresh after namespace change)
            items = await SecretsSubcategory.getSecretItems(
                mockTreeItemData,
                '/test/kubeconfig.yaml',
                errorHandler
            );
            assert.strictEqual(items.length, 2);
            assert.ok((items[0].label as string).includes('production'));
        });

        test('Should return empty array when getSecrets returns error', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (kubectlContextModule as any).getNamespaceForContext = async (): Promise<string | null> => {
                return null;
            };

            const mockError = new KubectlError(
                KubectlErrorType.ConnectionFailed,
                'kubectl error',
                'kubectl command failed',
                'test-context'
            );

            configurationCommandsModule.ConfigurationCommands.getSecrets = async () => ({
                error: mockError,
                secrets: []
            });

            let errorHandlerCalled = false;
            const errorHandler = (error: KubectlError) => {
                errorHandlerCalled = true;
                assert.strictEqual(error.message, 'kubectl error');
            };

            const items = await SecretsSubcategory.getSecretItems(
                mockTreeItemData,
                '/test/kubeconfig.yaml',
                errorHandler
            );

            assert.strictEqual(items.length, 0);
            assert.strictEqual(errorHandlerCalled, true);
        });

        test('Should return empty array when no secrets found', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (kubectlContextModule as any).getNamespaceForContext = async (): Promise<string | null> => {
                return null;
            };

            configurationCommandsModule.ConfigurationCommands.getSecrets = async () => ({
                error: undefined,
                secrets: []
            });

            const errorHandler = (error: KubectlError) => {
                assert.fail(`Should not call error handler: ${error.message}`);
            };

            const items = await SecretsSubcategory.getSecretItems(
                mockTreeItemData,
                '/test/kubeconfig.yaml',
                errorHandler
            );

            assert.strictEqual(items.length, 0);
        });

        test('Should set correct properties on secret tree items', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (kubectlContextModule as any).getNamespaceForContext = async (): Promise<string | null> => {
                return 'default';
            };

            configurationCommandsModule.ConfigurationCommands.getSecrets = async () => mockSecretResultDefaultOnly;

            const errorHandler = () => {};

            const items = await SecretsSubcategory.getSecretItems(
                mockTreeItemData,
                '/test/kubeconfig.yaml',
                errorHandler
            );

            assert.strictEqual(items.length, 2);

            // Verify first item properties
            const firstItem = items[0];
            assert.strictEqual(firstItem.type, 'secret');
            assert.strictEqual(firstItem.contextValue, 'resource:Secret');
            assert.strictEqual(typeof firstItem.description, 'string');
            assert.ok((firstItem.description as string).includes('Opaque'));
            
            // tooltip can be string or MarkdownString
            let tooltipStr = '';
            if (typeof firstItem.tooltip === 'string') {
                tooltipStr = firstItem.tooltip;
            } else if (firstItem.tooltip && typeof firstItem.tooltip === 'object' && 'value' in firstItem.tooltip) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tooltipStr = (firstItem.tooltip as any).value;
            }
            assert.ok(tooltipStr.includes('db-secret'));
            assert.ok(tooltipStr.includes('default'));
            assert.ok(firstItem.command !== undefined);
            assert.strictEqual(firstItem.command?.command, 'kube9.describeResource');
        });

        test('Should handle getNamespaceForContext error by fetching all secrets', async () => {
            // Mock getNamespaceForContext to throw an error
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (kubectlContextModule as any).getNamespaceForContext = async (): Promise<string | null> => {
                throw new Error('Failed to get namespace');
            };

            configurationCommandsModule.ConfigurationCommands.getSecrets = async (
                kubeconfigPath: string,
                contextName: string,
                namespace?: string
            ) => {
                // Should pass undefined to get all secrets
                assert.strictEqual(namespace, undefined, 'Should pass undefined when error getting namespace');
                return {
                    error: undefined,
                    secrets: mockSecretResult.secrets
                };
            };

            const errorHandler = () => {};

            const items = await SecretsSubcategory.getSecretItems(
                mockTreeItemData,
                '/test/kubeconfig.yaml',
                errorHandler
            );

            // Should return all secrets as fallback
            assert.strictEqual(items.length, 4);
        });
    });

    suite('Namespace Change Scenarios', () => {
        test('Should update secrets when switching from cluster-wide view to specific namespace', async () => {
            let currentNamespace: string | null = null;

            // Mock getNamespaceForContext to return current namespace state
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (kubectlContextModule as any).getNamespaceForContext = async (): Promise<string | null> => {
                return currentNamespace;
            };

            configurationCommandsModule.ConfigurationCommands.getSecrets = async (
                kubeconfigPath: string,
                contextName: string,
                namespace?: string
            ) => {
                if (namespace === 'default') {
                    return mockSecretResultDefaultOnly;
                } else if (namespace === 'production') {
                    return mockSecretResultProductionOnly;
                } else {
                    return mockSecretResult;
                }
            };

            const errorHandler = () => {};

            // Step 1: Cluster-wide view (no namespace set)
            currentNamespace = null;
            let items = await SecretsSubcategory.getSecretItems(
                mockTreeItemData,
                '/test/kubeconfig.yaml',
                errorHandler
            );
            assert.strictEqual(items.length, 4, 'Should have all 4 secrets in cluster-wide view');

            // Step 2: Switch to default namespace
            currentNamespace = 'default';
            items = await SecretsSubcategory.getSecretItems(
                mockTreeItemData,
                '/test/kubeconfig.yaml',
                errorHandler
            );
            assert.strictEqual(items.length, 2, 'Should have 2 secrets in default namespace');

            // Step 3: Switch to production namespace
            currentNamespace = 'production';
            items = await SecretsSubcategory.getSecretItems(
                mockTreeItemData,
                '/test/kubeconfig.yaml',
                errorHandler
            );
            assert.strictEqual(items.length, 2, 'Should have 2 secrets in production namespace');

            // Step 4: Switch back to cluster-wide view
            currentNamespace = null;
            items = await SecretsSubcategory.getSecretItems(
                mockTreeItemData,
                '/test/kubeconfig.yaml',
                errorHandler
            );
            assert.strictEqual(items.length, 4, 'Should have all 4 secrets again in cluster-wide view');
        });

        test('Should keep secrets filtered when switching between namespaces', async () => {
            let currentNamespace: string | null = 'default';

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (kubectlContextModule as any).getNamespaceForContext = async (): Promise<string | null> => {
                return currentNamespace;
            };

            configurationCommandsModule.ConfigurationCommands.getSecrets = async (
                kubeconfigPath: string,
                contextName: string,
                namespace?: string
            ) => {
                if (namespace === 'default') {
                    return mockSecretResultDefaultOnly;
                } else if (namespace === 'production') {
                    return mockSecretResultProductionOnly;
                } else {
                    return mockSecretResult;
                }
            };

            const errorHandler = () => {};

            // Start in default namespace
            let items = await SecretsSubcategory.getSecretItems(
                mockTreeItemData,
                '/test/kubeconfig.yaml',
                errorHandler
            );
            const defaultSecrets = items.map(item => item.label as string);
            assert.ok(defaultSecrets.every(name => name.startsWith('default/')));

            // Switch to production
            currentNamespace = 'production';
            items = await SecretsSubcategory.getSecretItems(
                mockTreeItemData,
                '/test/kubeconfig.yaml',
                errorHandler
            );
            const productionSecrets = items.map(item => item.label as string);
            assert.ok(productionSecrets.every(name => name.startsWith('production/')));

            // Verify they're different sets
            assert.notStrictEqual(defaultSecrets[0], productionSecrets[0]);
        });
    });
});
