import * as assert from 'assert';
import * as Module from 'module';

// Store original require for restoration
const originalRequire = Module.prototype.require;

// Set up module interception variables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockGetConfigMapResponse: { configMap: any; error?: any } | null = null;
const mockKubeconfigPath = '/test/kubeconfig';
const mockNamespace = 'test-namespace';
let getConfigMapCalls: Array<{ name: string; namespace: string; context: string }> = [];
let resolverCalls: Array<string> = [];
let isProxyActive = false;

suite('AIRecommendationsQuery Test Suite', () => {
    const TEST_CONTEXT = 'test-context';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let getAIRecommendations: (clusterContext: string) => Promise<any>;

    setup(() => {
        // Reset call tracking
        getConfigMapCalls = [];
        resolverCalls = [];
        mockGetConfigMapResponse = null;
        isProxyActive = true;

        // Set up require interception
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentRequire = Module.prototype.require;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Module.prototype.require = function(this: any, id: string): any {
            // First check for vscode (handled by setup.ts)
            if (id === 'vscode') {
                return currentRequire.apply(this, [id]);
            }

            // Intercept ConfigurationCommands
            if (id.endsWith('kubectl/ConfigurationCommands')) {
                const originalModule = currentRequire.apply(this, [id]);
                
                return {
                    ...originalModule,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    ConfigurationCommands: {
                        ...originalModule.ConfigurationCommands,
                        getConfigMap: async (
                            name: string,
                            namespace: string,
                            kubeconfigPath: string,
                            contextName: string
                        ) => {
                            if (isProxyActive) {
                                getConfigMapCalls.push({ name, namespace, context: contextName });
                                
                                if (mockGetConfigMapResponse) {
                                    return mockGetConfigMapResponse;
                                }
                                
                                return { configMap: null, error: { type: 'NoMock', message: 'No mock configured' } };
                            } else {
                                return originalModule.ConfigurationCommands.getConfigMap(name, namespace, kubeconfigPath, contextName);
                            }
                        }
                    }
                };
            }

            // Intercept KubeconfigParser
            if (id.endsWith('kubernetes/KubeconfigParser')) {
                const originalModule = currentRequire.apply(this, [id]);
                
                return {
                    ...originalModule,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    KubeconfigParser: {
                        ...originalModule.KubeconfigParser,
                        getKubeconfigPath: () => {
                            if (isProxyActive) {
                                return mockKubeconfigPath;
                            } else {
                                return originalModule.KubeconfigParser.getKubeconfigPath();
                            }
                        }
                    }
                };
            }

            // Intercept OperatorNamespaceResolver
            if (id.endsWith('services/OperatorNamespaceResolver')) {
                const originalModule = currentRequire.apply(this, [id]);
                
                return {
                    ...originalModule,
                    getOperatorNamespaceResolver: () => {
                        if (isProxyActive) {
                            return {
                                resolveNamespace: async (clusterContext: string) => {
                                    resolverCalls.push(clusterContext);
                                    return mockNamespace;
                                }
                            };
                        } else {
                            return originalModule.getOperatorNamespaceResolver();
                        }
                    }
                };
            }

            // For all other modules, use original require
            return currentRequire.apply(this, [id]);
        };

        // Clear module cache to force reload with mocked modules
        delete require.cache[require.resolve('../../../dashboard/AIRecommendationsQuery')];
        
        // Load the module with mocks in place
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const AIRecommendationsModule = require('../../../dashboard/AIRecommendationsQuery');
        getAIRecommendations = AIRecommendationsModule.getAIRecommendations;
    });

    teardown(() => {
        // Restore original require
        Module.prototype.require = originalRequire;
        isProxyActive = false;
        
        // Clear module cache
        delete require.cache[require.resolve('../../../dashboard/AIRecommendationsQuery')];
    });

    suite('getAIRecommendations', () => {
        test('should return recommendations when ConfigMap exists', async () => {
            // Mock ConfigMap response with recommendations
            const mockRecommendations = {
                items: [
                    {
                        id: 'rec-1',
                        type: 'optimization',
                        severity: 'high',
                        title: 'Optimize Pod Resources',
                        description: 'Some pods are over-provisioned',
                        actionable: true,
                        actionUrl: 'https://example.com/action'
                    },
                    {
                        id: 'rec-2',
                        type: 'security',
                        severity: 'medium',
                        title: 'Update Security Policies',
                        description: 'Security policies need updating',
                        actionable: false
                    }
                ],
                insights: [
                    {
                        id: 'insight-1',
                        category: 'Performance',
                        summary: 'Cluster is performing well',
                        details: 'No issues detected'
                    }
                ]
            };

            mockGetConfigMapResponse = {
                configMap: {
                    metadata: { name: 'kube9-ai-recommendations' },
                    data: {
                        recommendations: JSON.stringify(mockRecommendations)
                    }
                }
            };

            const result = await getAIRecommendations(TEST_CONTEXT);

            assert.strictEqual(result !== null, true, 'Result should not be null');
            assert.strictEqual(result?.recommendations.length, 2, 'Should have 2 recommendations');
            assert.strictEqual(result?.recommendations[0].id, 'rec-1');
            assert.strictEqual(result?.recommendations[0].type, 'optimization');
            assert.strictEqual(result?.recommendations[0].severity, 'high');
            assert.strictEqual(result?.recommendations[0].title, 'Optimize Pod Resources');
            assert.strictEqual(result?.insights?.length, 1, 'Should have 1 insight');
            assert.strictEqual(result?.insights?.[0].category, 'Performance');

            // Verify resolver was called with correct context
            assert.strictEqual(resolverCalls.length, 1);
            assert.strictEqual(resolverCalls[0], TEST_CONTEXT, 'Resolver should be called with test context');
            
            // Verify getConfigMap was called with correct parameters
            assert.strictEqual(getConfigMapCalls.length, 1);
            assert.strictEqual(getConfigMapCalls[0].name, 'kube9-ai-recommendations');
            assert.strictEqual(getConfigMapCalls[0].namespace, mockNamespace, 'Should use resolved namespace');
            assert.strictEqual(getConfigMapCalls[0].context, TEST_CONTEXT);
        });

        test('should return null when ConfigMap does not exist', async () => {
            // Mock ConfigMap not found
            mockGetConfigMapResponse = {
                error: { type: 'NotFound', message: 'ConfigMap not found' },
                configMap: null
            };

            const result = await getAIRecommendations(TEST_CONTEXT);

            assert.strictEqual(result, null, 'Should return null when ConfigMap not found');
        });

        test('should return null when ConfigMap has no data field', async () => {
            // Mock ConfigMap with no data
            mockGetConfigMapResponse = {
                configMap: {
                    metadata: { name: 'kube9-ai-recommendations' }
                }
            };

            const result = await getAIRecommendations(TEST_CONTEXT);

            assert.strictEqual(result, null, 'Should return null when ConfigMap has no data');
        });

        test('should return null when ConfigMap has no recommendations field', async () => {
            // Mock ConfigMap with data but no recommendations
            mockGetConfigMapResponse = {
                configMap: {
                    metadata: { name: 'kube9-ai-recommendations' },
                    data: {
                        otherData: 'value'
                    }
                }
            };

            const result = await getAIRecommendations(TEST_CONTEXT);

            assert.strictEqual(result, null, 'Should return null when ConfigMap has no recommendations field');
        });

        test('should handle JSON parse errors gracefully', async () => {
            // Mock ConfigMap with invalid JSON
            mockGetConfigMapResponse = {
                configMap: {
                    metadata: { name: 'kube9-ai-recommendations' },
                    data: {
                        recommendations: 'invalid json {'
                    }
                }
            };

            const result = await getAIRecommendations(TEST_CONTEXT);

            assert.strictEqual(result, null, 'Should return null when JSON parsing fails');
        });

        test('should handle empty recommendations array', async () => {
            // Mock ConfigMap with empty recommendations
            const mockRecommendations = {
                items: [],
                insights: []
            };

            mockGetConfigMapResponse = {
                configMap: {
                    metadata: { name: 'kube9-ai-recommendations' },
                    data: {
                        recommendations: JSON.stringify(mockRecommendations)
                    }
                }
            };

            const result = await getAIRecommendations(TEST_CONTEXT);

            assert.strictEqual(result !== null, true, 'Result should not be null');
            assert.strictEqual(result?.recommendations.length, 0, 'Should have 0 recommendations');
            assert.strictEqual(result?.insights, undefined, 'Insights should be undefined when empty');
        });

        test('should validate recommendation fields and apply defaults', async () => {
            // Mock ConfigMap with incomplete recommendation data
            const mockRecommendations = {
                items: [
                    {
                        id: 'rec-1',
                        type: 'invalid-type', // Invalid type
                        severity: 'critical', // Invalid severity
                        // Missing title, description, actionable
                    }
                ]
            };

            mockGetConfigMapResponse = {
                configMap: {
                    metadata: { name: 'kube9-ai-recommendations' },
                    data: {
                        recommendations: JSON.stringify(mockRecommendations)
                    }
                }
            };

            const result = await getAIRecommendations(TEST_CONTEXT);

            assert.strictEqual(result !== null, true, 'Result should not be null');
            assert.strictEqual(result?.recommendations.length, 1);
            assert.strictEqual(result?.recommendations[0].type, 'optimization', 'Should default to optimization');
            assert.strictEqual(result?.recommendations[0].severity, 'medium', 'Should default to medium');
            assert.strictEqual(result?.recommendations[0].title, 'Untitled Recommendation', 'Should use default title');
            assert.strictEqual(result?.recommendations[0].description, '', 'Should use empty description');
            assert.strictEqual(result?.recommendations[0].actionable, false, 'Should default to false');
        });

        test('should only include insights when present', async () => {
            // Mock ConfigMap with recommendations but no insights
            const mockRecommendations = {
                items: [
                    {
                        id: 'rec-1',
                        type: 'cost',
                        severity: 'low',
                        title: 'Cost Optimization',
                        description: 'Reduce costs',
                        actionable: true
                    }
                ]
                // No insights field
            };

            mockGetConfigMapResponse = {
                configMap: {
                    metadata: { name: 'kube9-ai-recommendations' },
                    data: {
                        recommendations: JSON.stringify(mockRecommendations)
                    }
                }
            };

            const result = await getAIRecommendations(TEST_CONTEXT);

            assert.strictEqual(result !== null, true, 'Result should not be null');
            assert.strictEqual(result?.recommendations.length, 1);
            assert.strictEqual(result?.insights, undefined, 'Insights should be undefined when not present');
        });
    });
});

