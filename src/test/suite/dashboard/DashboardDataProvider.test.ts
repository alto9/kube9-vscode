import * as assert from 'assert';
import * as Module from 'module';
import { DashboardDataProvider, KubectlExecFn } from '../../../dashboard/DashboardDataProvider';

// Store original require for restoration
const originalRequire = Module.prototype.require;

// Set up mock variables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockExecFileResponse: { type: 'success'; stdout: string; stderr: string } | { type: 'error'; error: any } | null = null;
let execFileCalls: Array<{ command: string; args: string[] }> = [];

/**
 * Create a mock exec function that tracks calls and returns configured responses.
 */
function createMockExecFn(): KubectlExecFn {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return async (command: string, args: string[], _options: { timeout?: number; maxBuffer?: number; env?: NodeJS.ProcessEnv }) => {
        execFileCalls.push({ command, args });
        
        if (mockExecFileResponse?.type === 'error') {
            throw mockExecFileResponse.error;
        } else if (mockExecFileResponse?.type === 'success') {
            return { stdout: mockExecFileResponse.stdout || '', stderr: mockExecFileResponse.stderr || '' };
        } else {
            throw new Error('No mock response configured');
        }
    };
}

suite('DashboardDataProvider Test Suite', () => {
    const TEST_KUBECONFIG = '/test/kubeconfig';
    const TEST_CONTEXT = 'test-context';

    setup(() => {
        // Reset call tracking
        execFileCalls = [];
        mockExecFileResponse = null;
        
        // Set up mock exec function
        DashboardDataProvider._setExecFn(createMockExecFn());
    });

    teardown(() => {
        // Reset to default exec function
        DashboardDataProvider._resetExecFn();
    });

    suite('getNamespaceCount', () => {
        test('should return correct namespace count', async () => {
            mockExecFileResponse = {
                type: 'success',
                stdout: JSON.stringify({
                    items: [
                        { metadata: { name: 'default' } },
                        { metadata: { name: 'kube-system' } },
                        { metadata: { name: 'kube-public' } }
                    ]
                }),
                stderr: ''
            };

            const count = await DashboardDataProvider.getNamespaceCount(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(count, 3);
            assert.strictEqual(execFileCalls.length, 1);
            assert.strictEqual(execFileCalls[0].command, 'kubectl');
            assert.ok(execFileCalls[0].args.includes('get'));
            assert.ok(execFileCalls[0].args.includes('namespaces'));
            assert.ok(execFileCalls[0].args.includes('--output=json'));
        });

        test('should return 0 when no namespaces exist', async () => {
            mockExecFileResponse = {
                type: 'success',
                stdout: JSON.stringify({ items: [] }),
                stderr: ''
            };

            const count = await DashboardDataProvider.getNamespaceCount(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(count, 0);
        });

        test('should return 0 on kubectl error', async () => {
            mockExecFileResponse = {
                type: 'error',
                error: new Error('kubectl command failed')
            };

            const count = await DashboardDataProvider.getNamespaceCount(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(count, 0);
        });

        test('should return 0 on malformed JSON response', async () => {
            mockExecFileResponse = {
                type: 'success',
                stdout: 'not valid json',
                stderr: ''
            };

            const count = await DashboardDataProvider.getNamespaceCount(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(count, 0);
        });
    });

    suite('getWorkloadCounts', () => {
        test('should return correct workload counts for all types', async () => {
            // Mock responses for all workload types - track call count to return different responses
            let callCount = 0;
            const responses = [
                { items: [{}, {}, {}] }, // 3 deployments
                { items: [{}, {}] }, // 2 statefulsets
                { items: [{}] }, // 1 daemonset
                { items: [{}, {}, {}, {}] }, // 4 replicasets
                { items: [{}] }, // 1 job
                { items: [] }, // 0 cronjobs
                { items: [{}, {}, {}, {}, {}] } // 5 pods
            ];

            // Set up custom exec function that returns different responses for each call
            DashboardDataProvider._setExecFn(async (command: string, args: string[]) => {
                execFileCalls.push({ command, args });
                const response = responses[callCount++];
                return { stdout: JSON.stringify(response), stderr: '' };
            });

            const counts = await DashboardDataProvider.getWorkloadCounts(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(counts.deployments, 3);
            assert.strictEqual(counts.statefulsets, 2);
            assert.strictEqual(counts.daemonsets, 1);
            assert.strictEqual(counts.replicasets, 4);
            assert.strictEqual(counts.jobs, 1);
            assert.strictEqual(counts.cronjobs, 0);
            assert.strictEqual(counts.pods, 5);
            assert.strictEqual(execFileCalls.length, 7);
        });

        test('should execute all queries in parallel', async () => {
            let simultaneousCalls = 0;
            let maxSimultaneousCalls = 0;

            // Set up exec function that tracks simultaneous calls
            DashboardDataProvider._setExecFn(async () => {
                simultaneousCalls++;
                maxSimultaneousCalls = Math.max(maxSimultaneousCalls, simultaneousCalls);
                
                // Simulate async delay
                await new Promise(resolve => setImmediate(resolve));
                simultaneousCalls--;
                
                return { stdout: JSON.stringify({ items: [] }), stderr: '' };
            });

            await DashboardDataProvider.getWorkloadCounts(TEST_KUBECONFIG, TEST_CONTEXT);

            // All 7 queries should have been initiated before any completed
            assert.strictEqual(maxSimultaneousCalls, 7);
        });

        test('should return 0 for failed queries', async () => {
            let callCount = 0;

            // Set up exec function that fails every other call
            DashboardDataProvider._setExecFn(async () => {
                callCount++;
                // Fail every other query
                if (callCount % 2 === 0) {
                    throw new Error('kubectl error');
                }
                return { stdout: JSON.stringify({ items: [{}] }), stderr: '' };
            });

            const counts = await DashboardDataProvider.getWorkloadCounts(TEST_KUBECONFIG, TEST_CONTEXT);

            // Verify that failed queries return 0 and successful ones return 1
            const countValues = Object.values(counts);
            assert.ok(countValues.some(c => c === 0), 'Some counts should be 0 (failed)');
            assert.ok(countValues.some(c => c === 1), 'Some counts should be 1 (successful)');
        });

        test('should handle all queries failing', async () => {
            mockExecFileResponse = {
                type: 'error',
                error: new Error('kubectl not available')
            };
            
            // Re-set the mock exec function with the error response
            DashboardDataProvider._setExecFn(createMockExecFn());

            const counts = await DashboardDataProvider.getWorkloadCounts(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(counts.deployments, 0);
            assert.strictEqual(counts.statefulsets, 0);
            assert.strictEqual(counts.daemonsets, 0);
            assert.strictEqual(counts.replicasets, 0);
            assert.strictEqual(counts.jobs, 0);
            assert.strictEqual(counts.cronjobs, 0);
            assert.strictEqual(counts.pods, 0);
        });
    });

    suite('getNodeInfo', () => {
        test('should return correct node info', async () => {
            mockExecFileResponse = {
                type: 'success',
                stdout: JSON.stringify({
                    items: [
                        {
                            metadata: { name: 'node1' },
                            status: {
                                conditions: [
                                    { type: 'Ready', status: 'True' }
                                ],
                                capacity: {
                                    cpu: '4',
                                    memory: '8Gi'
                                }
                            }
                        },
                        {
                            metadata: { name: 'node2' },
                            status: {
                                conditions: [
                                    { type: 'Ready', status: 'False' }
                                ],
                                capacity: {
                                    cpu: '2',
                                    memory: '4Gi'
                                }
                            }
                        }
                    ]
                }),
                stderr: ''
            };

            const nodeInfo = await DashboardDataProvider.getNodeInfo(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(nodeInfo.totalNodes, 2);
            assert.strictEqual(nodeInfo.readyNodes, 1);
            assert.strictEqual(nodeInfo.cpuCapacity, '6'); // 4 + 2
            assert.strictEqual(nodeInfo.memoryCapacity, '12.0 Gi'); // 8 + 4
        });

        test('should parse CPU in millicores format', async () => {
            mockExecFileResponse = {
                type: 'success',
                stdout: JSON.stringify({
                    items: [
                        {
                            metadata: { name: 'node1' },
                            status: {
                                conditions: [{ type: 'Ready', status: 'True' }],
                                capacity: {
                                    cpu: '500m',
                                    memory: '1Gi'
                                }
                            }
                        }
                    ]
                }),
                stderr: ''
            };

            const nodeInfo = await DashboardDataProvider.getNodeInfo(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(nodeInfo.cpuCapacity, '0.5'); // 500m = 0.5 cores
        });

        test('should parse memory in different units', async () => {
            mockExecFileResponse = {
                type: 'success',
                stdout: JSON.stringify({
                    items: [
                        {
                            metadata: { name: 'node1' },
                            status: {
                                conditions: [{ type: 'Ready', status: 'True' }],
                                capacity: {
                                    cpu: '1',
                                    memory: '1024Mi'
                                }
                            }
                        }
                    ]
                }),
                stderr: ''
            };

            const nodeInfo = await DashboardDataProvider.getNodeInfo(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(nodeInfo.memoryCapacity, '1.0 Gi'); // 1024Mi = 1Gi
        });

        test('should return default values on kubectl error', async () => {
            mockExecFileResponse = {
                type: 'error',
                error: new Error('kubectl command failed')
            };

            const nodeInfo = await DashboardDataProvider.getNodeInfo(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(nodeInfo.totalNodes, 0);
            assert.strictEqual(nodeInfo.readyNodes, 0);
            assert.strictEqual(nodeInfo.cpuCapacity, 'N/A');
            assert.strictEqual(nodeInfo.memoryCapacity, 'N/A');
        });

        test('should handle empty node list', async () => {
            mockExecFileResponse = {
                type: 'success',
                stdout: JSON.stringify({ items: [] }),
                stderr: ''
            };

            const nodeInfo = await DashboardDataProvider.getNodeInfo(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(nodeInfo.totalNodes, 0);
            assert.strictEqual(nodeInfo.readyNodes, 0);
            assert.strictEqual(nodeInfo.cpuCapacity, '0');
            assert.strictEqual(nodeInfo.memoryCapacity, '0');
        });

        test('should handle nodes without capacity information', async () => {
            mockExecFileResponse = {
                type: 'success',
                stdout: JSON.stringify({
                    items: [
                        {
                            metadata: { name: 'node1' },
                            status: {
                                conditions: [{ type: 'Ready', status: 'True' }]
                                // No capacity field
                            }
                        }
                    ]
                }),
                stderr: ''
            };

            const nodeInfo = await DashboardDataProvider.getNodeInfo(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(nodeInfo.totalNodes, 1);
            assert.strictEqual(nodeInfo.readyNodes, 1);
            assert.strictEqual(nodeInfo.cpuCapacity, '0');
            assert.strictEqual(nodeInfo.memoryCapacity, '0');
        });

        test('should count only nodes with Ready=True as ready', async () => {
            mockExecFileResponse = {
                type: 'success',
                stdout: JSON.stringify({
                    items: [
                        {
                            metadata: { name: 'node1' },
                            status: {
                                conditions: [{ type: 'Ready', status: 'True' }],
                                capacity: { cpu: '1', memory: '1Gi' }
                            }
                        },
                        {
                            metadata: { name: 'node2' },
                            status: {
                                conditions: [{ type: 'Ready', status: 'False' }],
                                capacity: { cpu: '1', memory: '1Gi' }
                            }
                        },
                        {
                            metadata: { name: 'node3' },
                            status: {
                                conditions: [{ type: 'Ready', status: 'Unknown' }],
                                capacity: { cpu: '1', memory: '1Gi' }
                            }
                        }
                    ]
                }),
                stderr: ''
            };

            const nodeInfo = await DashboardDataProvider.getNodeInfo(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(nodeInfo.totalNodes, 3);
            assert.strictEqual(nodeInfo.readyNodes, 1); // Only node1 is Ready=True
        });
    });

    suite('Integration - All methods', () => {
        test('should handle timeout errors gracefully', async () => {
            mockExecFileResponse = {
                type: 'error',
                error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })
            };

            const [namespaceCount, workloadCounts, nodeInfo] = await Promise.all([
                DashboardDataProvider.getNamespaceCount(TEST_KUBECONFIG, TEST_CONTEXT),
                DashboardDataProvider.getWorkloadCounts(TEST_KUBECONFIG, TEST_CONTEXT),
                DashboardDataProvider.getNodeInfo(TEST_KUBECONFIG, TEST_CONTEXT)
            ]);

            // All methods should return default values on timeout
            assert.strictEqual(namespaceCount, 0);
            assert.strictEqual(workloadCounts.deployments, 0);
            assert.strictEqual(nodeInfo.totalNodes, 0);
        });

        test('should all use correct kubectl command format', async () => {
            mockExecFileResponse = {
                type: 'success',
                stdout: JSON.stringify({ items: [] }),
                stderr: ''
            };

            await DashboardDataProvider.getNamespaceCount(TEST_KUBECONFIG, TEST_CONTEXT);
            await DashboardDataProvider.getNodeInfo(TEST_KUBECONFIG, TEST_CONTEXT);

            // Verify all calls include kubeconfig and context
            execFileCalls.forEach(call => {
                assert.ok(
                    call.args.some(arg => arg === `--kubeconfig=${TEST_KUBECONFIG}`),
                    'Should include kubeconfig path'
                );
                assert.ok(
                    call.args.some(arg => arg === `--context=${TEST_CONTEXT}`),
                    'Should include context name'
                );
            });
        });
    });

    suite('getOperatorDashboardData', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let mockConfigMapResult: any = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let OperatorDashboardDataProvider: any;

        setup(() => {
            // Set up require interception for ConfigurationCommands
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Module.prototype.require = function(this: any, id: string): any {
                if (id === 'vscode') {
                    return originalRequire.apply(this, [id]);
                }

                // Mock ConfigurationCommands module
                if (id.includes('ConfigurationCommands')) {
                    return {
                        ConfigurationCommands: {
                            getConfigMap: async () => {
                                return mockConfigMapResult;
                            }
                        }
                    };
                }

                return originalRequire.apply(this, [id]);
            };

            // Clear module cache and reload with mocks
            delete require.cache[require.resolve('../../../dashboard/DashboardDataProvider')];
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            OperatorDashboardDataProvider = require('../../../dashboard/DashboardDataProvider').DashboardDataProvider;
        });

        teardown(() => {
            Module.prototype.require = originalRequire;
            delete require.cache[require.resolve('../../../dashboard/DashboardDataProvider')];
        });

        test('should return operator dashboard data when ConfigMap exists', async () => {
            const mockData = {
                namespaceCount: 5,
                workloads: {
                    deployments: 10,
                    statefulsets: 3,
                    daemonsets: 2,
                    replicasets: 15,
                    jobs: 1,
                    cronjobs: 2,
                    pods: 50
                },
                nodes: {
                    totalNodes: 3,
                    readyNodes: 3,
                    cpuCapacity: '12',
                    memoryCapacity: '24.0 Gi'
                },
                operatorMetrics: {
                    collectorsRunning: 2,
                    dataPointsCollected: 1000,
                    lastCollectionTime: '2024-01-15T10:30:00Z'
                },
                lastUpdated: '2024-01-15T10:30:05Z'
            };

            mockConfigMapResult = {
                configMap: {
                    metadata: { name: 'kube9-dashboard-data', namespace: 'kube9-system' },
                    data: {
                        dashboard: JSON.stringify(mockData)
                    }
                },
                error: undefined
            };

            const result = await OperatorDashboardDataProvider.getOperatorDashboardData(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.ok(result !== null, 'Result should not be null');
            assert.strictEqual(result.namespaceCount, 5);
            assert.strictEqual(result.workloads.deployments, 10);
            assert.strictEqual(result.workloads.statefulsets, 3);
            assert.strictEqual(result.workloads.daemonsets, 2);
            assert.strictEqual(result.workloads.pods, 50);
            assert.strictEqual(result.nodes.totalNodes, 3);
            assert.strictEqual(result.nodes.readyNodes, 3);
            assert.strictEqual(result.nodes.cpuCapacity, '12');
            assert.strictEqual(result.operatorMetrics.collectorsRunning, 2);
            assert.strictEqual(result.operatorMetrics.dataPointsCollected, 1000);
            assert.ok(result.lastUpdated instanceof Date);
            assert.ok(result.operatorMetrics.lastCollectionTime instanceof Date);
        });

        test('should return null when ConfigMap does not exist', async () => {
            mockConfigMapResult = {
                configMap: null,
                error: { type: 'NotFound', message: 'ConfigMap not found' }
            };

            const result = await OperatorDashboardDataProvider.getOperatorDashboardData(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(result, null);
        });

        test('should handle JSON parse errors gracefully', async () => {
            mockConfigMapResult = {
                configMap: {
                    metadata: { name: 'kube9-dashboard-data', namespace: 'kube9-system' },
                    data: {
                        dashboard: 'invalid json {'
                    }
                },
                error: undefined
            };

            const result = await OperatorDashboardDataProvider.getOperatorDashboardData(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(result, null);
        });

        test('should handle missing fields in dashboard data', async () => {
            const incompleteData = {
                namespaceCount: 5,
                // Missing workloads
                nodes: {
                    totalNodes: 2
                    // Missing other fields
                }
                // Missing operatorMetrics and lastUpdated
            };

            mockConfigMapResult = {
                configMap: {
                    metadata: { name: 'kube9-dashboard-data', namespace: 'kube9-system' },
                    data: {
                        dashboard: JSON.stringify(incompleteData)
                    }
                },
                error: undefined
            };

            const result = await OperatorDashboardDataProvider.getOperatorDashboardData(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.ok(result !== null, 'Result should not be null even with missing fields');
            assert.strictEqual(result.namespaceCount, 5);
            // Missing workload fields should default to 0
            assert.strictEqual(result.workloads.deployments, 0);
            assert.strictEqual(result.workloads.pods, 0);
            // Missing node fields should default
            assert.strictEqual(result.nodes.totalNodes, 2);
            assert.strictEqual(result.nodes.readyNodes, 0);
            assert.strictEqual(result.nodes.cpuCapacity, 'N/A');
            // Missing operator metrics should default to 0
            assert.strictEqual(result.operatorMetrics.collectorsRunning, 0);
            assert.strictEqual(result.operatorMetrics.dataPointsCollected, 0);
            // Dates should still be Date objects (defaulting to current time)
            assert.ok(result.lastUpdated instanceof Date);
            assert.ok(result.operatorMetrics.lastCollectionTime instanceof Date);
        });

        test('should return null when ConfigMap has no data field', async () => {
            mockConfigMapResult = {
                configMap: {
                    metadata: { name: 'kube9-dashboard-data', namespace: 'kube9-system' },
                    data: null
                },
                error: undefined
            };

            const result = await OperatorDashboardDataProvider.getOperatorDashboardData(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(result, null);
        });

        test('should return null when ConfigMap has no dashboard key', async () => {
            mockConfigMapResult = {
                configMap: {
                    metadata: { name: 'kube9-dashboard-data', namespace: 'kube9-system' },
                    data: {
                        someOtherKey: 'value'
                    }
                },
                error: undefined
            };

            const result = await OperatorDashboardDataProvider.getOperatorDashboardData(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(result, null);
        });

        test('should handle unexpected errors gracefully', async () => {
            mockConfigMapResult = null; // This will cause getConfigMap to throw

            // Override mock to throw error
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Module.prototype.require = function(this: any, id: string): any {
                if (id === 'vscode') {
                    return originalRequire.apply(this, [id]);
                }

                if (id.includes('ConfigurationCommands')) {
                    return {
                        ConfigurationCommands: {
                            getConfigMap: async () => {
                                throw new Error('Unexpected error');
                            }
                        }
                    };
                }

                return originalRequire.apply(this, [id]);
            };

            // Reload module with error-throwing mock
            delete require.cache[require.resolve('../../../dashboard/DashboardDataProvider')];
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const ErrorProvider = require('../../../dashboard/DashboardDataProvider').DashboardDataProvider;

            const result = await ErrorProvider.getOperatorDashboardData(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.strictEqual(result, null);
        });

        test('should parse valid date strings correctly', async () => {
            const mockData = {
                namespaceCount: 5,
                workloads: { deployments: 1, statefulsets: 0, daemonsets: 0, replicasets: 0, jobs: 0, cronjobs: 0, pods: 1 },
                nodes: { totalNodes: 1, readyNodes: 1, cpuCapacity: '4', memoryCapacity: '8.0 Gi' },
                operatorMetrics: {
                    collectorsRunning: 1,
                    dataPointsCollected: 100,
                    lastCollectionTime: '2024-01-15T10:30:00.000Z'
                },
                lastUpdated: '2024-01-15T10:30:05.000Z'
            };

            mockConfigMapResult = {
                configMap: {
                    metadata: { name: 'kube9-dashboard-data', namespace: 'kube9-system' },
                    data: {
                        dashboard: JSON.stringify(mockData)
                    }
                },
                error: undefined
            };

            const result = await OperatorDashboardDataProvider.getOperatorDashboardData(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.ok(result !== null);
            assert.ok(result.lastUpdated instanceof Date);
            assert.strictEqual(result.lastUpdated.toISOString(), '2024-01-15T10:30:05.000Z');
            assert.ok(result.operatorMetrics.lastCollectionTime instanceof Date);
            assert.strictEqual(result.operatorMetrics.lastCollectionTime.toISOString(), '2024-01-15T10:30:00.000Z');
        });

        test('should use current date when date parsing fails', async () => {
            const mockData = {
                namespaceCount: 5,
                workloads: { deployments: 1, statefulsets: 0, daemonsets: 0, replicasets: 0, jobs: 0, cronjobs: 0, pods: 1 },
                nodes: { totalNodes: 1, readyNodes: 1, cpuCapacity: '4', memoryCapacity: '8.0 Gi' },
                operatorMetrics: {
                    collectorsRunning: 1,
                    dataPointsCollected: 100,
                    lastCollectionTime: 'invalid-date'
                },
                lastUpdated: 'also-invalid'
            };

            mockConfigMapResult = {
                configMap: {
                    metadata: { name: 'kube9-dashboard-data', namespace: 'kube9-system' },
                    data: {
                        dashboard: JSON.stringify(mockData)
                    }
                },
                error: undefined
            };

            const result = await OperatorDashboardDataProvider.getOperatorDashboardData(TEST_KUBECONFIG, TEST_CONTEXT);

            assert.ok(result !== null);
            assert.ok(result.lastUpdated instanceof Date);
            assert.ok(result.operatorMetrics.lastCollectionTime instanceof Date);
            // Both dates should be recent (within last minute)
            const now = Date.now();
            const timeDiff1 = now - result.lastUpdated.getTime();
            const timeDiff2 = now - result.operatorMetrics.lastCollectionTime.getTime();
            assert.ok(timeDiff1 < 60000, 'lastUpdated should be recent');
            assert.ok(timeDiff2 < 60000, 'lastCollectionTime should be recent');
        });
    });
});

