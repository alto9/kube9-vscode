/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
import * as assert from 'assert';
import * as Module from 'module';
import { ArgoCDService } from '../../../services/ArgoCDService';
import { OperatorStatusClient } from '../../../services/OperatorStatusClient';
import { ArgoCDApplication } from '../../../types/argocd';

// Store original require for restoration
const originalRequire = Module.prototype.require;

// Set up mock variables
let mockExecFileResponse: { type: 'success'; stdout: string; stderr: string } | { type: 'error'; error: any } | null = null;
let execFileCalls: Array<{ command: string; args: string[] }> = [];
let isProxyActive = false;

/**
 * Set mock response for execFile calls
 */
function setMockExecFileResponse(response: { type: 'success'; stdout: string; stderr: string } | { type: 'error'; error: any } | null): void {
    mockExecFileResponse = response;
}

/**
 * Clear mock response
 */
function clearMockExecFileResponse(): void {
    mockExecFileResponse = null;
}

suite('ArgoCDService Test Suite', () => {
    const TEST_KUBECONFIG = '/test/kubeconfig';
    const TEST_CONTEXT = 'test-context';
    const TEST_NAMESPACE = 'argocd';

    let mockOperatorStatusClient: OperatorStatusClient;
    let service: ArgoCDService;

    // Mock CRD data for testing
    const createMockCRD = (overrides?: any): any => {
        return {
            metadata: {
                name: 'test-app',
                namespace: TEST_NAMESPACE,
                creationTimestamp: '2025-01-01T00:00:00Z',
                ...overrides?.metadata
            },
            spec: {
                project: 'default',
                source: {
                    repoURL: 'https://github.com/test/repo',
                    path: 'app',
                    targetRevision: 'main',
                    ...overrides?.spec?.source
                },
                destination: {
                    server: 'https://kubernetes.default.svc',
                    namespace: 'default',
                    ...overrides?.spec?.destination
                },
                ...overrides?.spec
            },
            status: {
                sync: {
                    status: 'Synced',
                    revision: 'abc123def456',
                    ...overrides?.status?.sync
                },
                health: {
                    status: 'Healthy',
                    message: 'All resources healthy',
                    ...overrides?.status?.health
                },
                resources: [
                    {
                        kind: 'Deployment',
                        name: 'test-deployment',
                        namespace: 'default',
                        status: 'Synced',
                        health: {
                            status: 'Healthy'
                        }
                    },
                    ...(overrides?.status?.resources || [])
                ],
                operationState: {
                    phase: 'Succeeded',
                    message: 'Sync completed',
                    startedAt: '2025-01-01T00:00:00Z',
                    finishedAt: '2025-01-01T00:01:00Z',
                    syncResult: {
                        resources: [
                            {
                                kind: 'Deployment',
                                name: 'test-deployment',
                                namespace: 'default',
                                status: 'Synced'
                            }
                        ],
                        revision: 'abc123def456'
                    },
                    ...overrides?.status?.operationState
                },
                ...overrides?.status
            },
            ...overrides
        };
    };

    setup(() => {
        // Reset call tracking
        execFileCalls = [];
        clearMockExecFileResponse();
        isProxyActive = true;

        // Intercept require calls to mock child_process.execFile
        Module.prototype.require = function(id: string) {
            const currentRequire = originalRequire.bind(this);
            
            // Check for child_process module
            if (id === 'child_process' && isProxyActive) {
                const realChildProcess = currentRequire(id);
                
                // Create a proxy that intercepts execFile access
                return new Proxy(realChildProcess, {
                    get(target, prop) {
                        if (prop === 'execFile') {
                            const mockFunc: any = function(file: string, args: string[], ...rest: any[]) {
                                // The signature is: execFile(file, args[, options], callback)
                                // rest will be either [callback] or [options, callback]
                                let callback;
                                if (rest.length === 1) {
                                    callback = rest[0];
                                } else {
                                    callback = rest[1];
                                }
                                
                                execFileCalls.push({ command: file, args: [...args] });
                                
                                if (mockExecFileResponse !== null) {
                                    if (mockExecFileResponse.type === 'success') {
                                        const response = mockExecFileResponse;
                                        process.nextTick(() => callback(null, response.stdout, response.stderr));
                                    } else {
                                        const response = mockExecFileResponse;
                                        process.nextTick(() => callback(response.error, '', ''));
                                    }
                                    return { pid: 123 };
                                }
                                
                                // Fallback to real execFile if no mock
                                return target.execFile(file, args, ...rest);
                            };
                            
                            // Add a custom promisified version that util.promisify will use
                            const { promisify } = require('util');
                            (mockFunc as any)[promisify.custom] = function(file: string, args: string[]): Promise<{stdout: string; stderr: string}> {
                                execFileCalls.push({ command: file, args: [...args] });
                                
                                // Handle different kubectl commands
                                if (file === 'kubectl' && args.includes('get') && args.includes('crd')) {
                                    // CRD check - return CRD exists
                                    return Promise.resolve({
                                        stdout: JSON.stringify({ metadata: { name: 'applications.argoproj.io' } }),
                                        stderr: ''
                                    });
                                }
                                
                                if (mockExecFileResponse !== null) {
                                    if (mockExecFileResponse.type === 'success') {
                                        const response = mockExecFileResponse;
                                        return Promise.resolve({ stdout: response.stdout, stderr: response.stderr });
                                    } else {
                                        const response = mockExecFileResponse;
                                        return Promise.reject(response.error);
                                    }
                                }
                                
                                // Fallback - shouldn't reach here
                                return Promise.reject(new Error('No mock response set'));
                            };
                            
                            return mockFunc;
                        }
                        return target[prop as keyof typeof target];
                    }
                });
            }
            return currentRequire(id);
        };

        // Create mock operator status client
        mockOperatorStatusClient = {
            getStatus: async () => ({
                status: {
                    argocd: {
                        detected: true,
                        namespace: TEST_NAMESPACE,
                        version: 'v2.8.4',
                        lastChecked: new Date().toISOString()
                    }
                },
                timestamp: Date.now(),
                mode: 'operated' as const
            })
        } as any;

        // Clear module cache to force reload with mocked execFile
        const argoCDServicePath = require.resolve('../../../services/ArgoCDService');
        delete require.cache[argoCDServicePath];
        
        // Now import the module - it will use the mocked execFile
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ArgoCDServiceModule = require('../../../services/ArgoCDService');
        
        // Create service instance using the reloaded module
        service = new ArgoCDServiceModule.ArgoCDService(mockOperatorStatusClient, TEST_KUBECONFIG);
    });

    teardown(() => {
        // Restore original require
        Module.prototype.require = originalRequire;
        isProxyActive = false;
        
        // Clear caches
        service.clearAllCache();
        service.clearAllApplicationCache();
        
        // Clear mock
        clearMockExecFileResponse();
    });

    suite('parseApplication (via getApplication)', () => {
        test('Should parse complete CRD data correctly', async () => {
            const mockCRD = createMockCRD();
            
            // Set mock response
            setMockExecFileResponse({
                type: 'success',
                stdout: JSON.stringify(mockCRD),
                stderr: ''
            });

            const result = await service.getApplication('test-app', TEST_NAMESPACE, TEST_CONTEXT);

                assert.ok(result);
                assert.strictEqual(result.name, 'test-app');
                assert.strictEqual(result.namespace, TEST_NAMESPACE);
                assert.strictEqual(result.project, 'default');
                assert.strictEqual(result.createdAt, '2025-01-01T00:00:00Z');
                assert.strictEqual(result.syncStatus.status, 'Synced');
                assert.strictEqual(result.syncStatus.revision, 'abc123def456');
                assert.strictEqual(result.healthStatus.status, 'Healthy');
                assert.strictEqual(result.source.repoURL, 'https://github.com/test/repo');
                assert.strictEqual(result.destination.server, 'https://kubernetes.default.svc');
                assert.strictEqual(result.resources.length, 1);
                assert.ok(result.lastOperation);
                assert.strictEqual(result.lastOperation?.phase, 'Succeeded');
                assert.strictEqual(result.syncedAt, '2025-01-01T00:01:00Z');
        });

        test('Should handle missing optional fields gracefully', async () => {
            const mockCRD = createMockCRD({
                status: {
                    operationState: undefined,
                    resources: []
                }
            });

            setMockExecFileResponse({
                type: 'success',
                stdout: JSON.stringify(mockCRD),
                stderr: ''
            });

            const result = await service.getApplication('test-app', TEST_NAMESPACE, TEST_CONTEXT);

            assert.ok(result);
            assert.strictEqual(result.resources.length, 0);
            assert.strictEqual(result.lastOperation, undefined);
            assert.strictEqual(result.syncedAt, undefined);
        });

        test('Should handle missing sync status with defaults', async () => {
            const mockCRD = createMockCRD({
                status: {
                    sync: undefined
                }
            });

            setMockExecFileResponse({
                type: 'success',
                stdout: JSON.stringify(mockCRD),
                stderr: ''
            });

            const result = await service.getApplication('test-app', TEST_NAMESPACE, TEST_CONTEXT);

            assert.ok(result);
            assert.strictEqual(result.syncStatus.status, 'Unknown');
            assert.strictEqual(result.syncStatus.revision, '');
        });

        test('Should handle missing health status with defaults', async () => {
            const mockCRD = createMockCRD({
                status: {
                    health: undefined
                }
            });

            setMockExecFileResponse({
                type: 'success',
                stdout: JSON.stringify(mockCRD),
                stderr: ''
            });

            const result = await service.getApplication('test-app', TEST_NAMESPACE, TEST_CONTEXT);

            assert.ok(result);
            assert.strictEqual(result.healthStatus.status, 'Unknown');
        });

        test('Should throw error for missing required fields', async () => {
            const mockCRD = {
                metadata: {
                    namespace: TEST_NAMESPACE
                    // Missing name
                },
                spec: {
                    // Missing source and destination
                }
            };

            setMockExecFileResponse({
                type: 'success',
                stdout: JSON.stringify(mockCRD),
                stderr: ''
            });

            await assert.rejects(
                async () => await service.getApplication('test-app', TEST_NAMESPACE, TEST_CONTEXT),
                /missing required field/
            );
        });
    });

    suite('parseResources (via getApplication)', () => {
        test('Should parse resources array correctly', async () => {
            const mockCRD = createMockCRD({
                status: {
                    resources: [
                        {
                            kind: 'Deployment',
                            name: 'deployment-1',
                            namespace: 'default',
                            status: 'Synced',
                            health: {
                                status: 'Healthy'
                            },
                            message: 'Resource synced',
                            requiresPruning: false
                        },
                        {
                            kind: 'Service',
                            name: 'service-1',
                            namespace: 'default',
                            status: 'OutOfSync',
                            health: {
                                status: 'Degraded'
                            },
                            requiresPruning: true
                        }
                    ]
                }
            });

            setMockExecFileResponse({
                type: 'success',
                stdout: JSON.stringify(mockCRD),
                stderr: ''
            });

            const result = await service.getApplication('test-app', TEST_NAMESPACE, TEST_CONTEXT);

            assert.strictEqual(result.resources.length, 2);
            assert.strictEqual(result.resources[0].kind, 'Deployment');
            assert.strictEqual(result.resources[0].syncStatus, 'Synced');
            assert.strictEqual(result.resources[0].healthStatus, 'Healthy');
            assert.strictEqual(result.resources[1].kind, 'Service');
            assert.strictEqual(result.resources[1].syncStatus, 'OutOfSync');
            assert.strictEqual(result.resources[1].healthStatus, 'Degraded');
            assert.strictEqual(result.resources[1].requiresPruning, true);
        });

        test('Should handle empty resources array', async () => {
            const mockCRD = createMockCRD({
                status: {
                    resources: []
                }
            });

            setMockExecFileResponse({
                type: 'success',
                stdout: JSON.stringify(mockCRD),
                stderr: ''
            });

            const result = await service.getApplication('test-app', TEST_NAMESPACE, TEST_CONTEXT);

            assert.strictEqual(result.resources.length, 0);
        });
    });

    suite('parseOperation (via getApplication)', () => {
        test('Should parse operation state correctly', async () => {
            const mockCRD = createMockCRD({
                status: {
                    operationState: {
                        phase: 'Succeeded',
                        message: 'Sync completed successfully',
                        startedAt: '2025-01-01T00:00:00Z',
                        finishedAt: '2025-01-01T00:01:00Z',
                        syncResult: {
                            resources: [
                                {
                                    kind: 'Deployment',
                                    name: 'test-deployment',
                                    namespace: 'default',
                                    status: 'Synced',
                                    message: 'Applied successfully',
                                    hookPhase: 'Succeeded'
                                }
                            ],
                            revision: 'abc123def456'
                        }
                    }
                }
            });

            setMockExecFileResponse({
                type: 'success',
                stdout: JSON.stringify(mockCRD),
                stderr: ''
            });

            const result = await service.getApplication('test-app', TEST_NAMESPACE, TEST_CONTEXT);

            assert.ok(result.lastOperation);
            assert.strictEqual(result.lastOperation?.phase, 'Succeeded');
            assert.strictEqual(result.lastOperation?.message, 'Sync completed successfully');
            assert.strictEqual(result.lastOperation?.startedAt, '2025-01-01T00:00:00Z');
            assert.strictEqual(result.lastOperation?.finishedAt, '2025-01-01T00:01:00Z');
            assert.ok(result.lastOperation?.syncResult);
            assert.strictEqual(result.lastOperation?.syncResult?.revision, 'abc123def456');
            assert.strictEqual(result.lastOperation?.syncResult?.resources.length, 1);
        });

        test('Should return undefined for missing operation state', async () => {
            const mockCRD = createMockCRD({
                status: {
                    operationState: undefined
                }
            });

            setMockExecFileResponse({
                type: 'success',
                stdout: JSON.stringify(mockCRD),
                stderr: ''
            });

            const result = await service.getApplication('test-app', TEST_NAMESPACE, TEST_CONTEXT);

            assert.strictEqual(result.lastOperation, undefined);
        });
    });

    suite('getApplications', () => {
        test('Should return typed ArgoCDApplication array', async () => {
            const mockCRD1 = createMockCRD({ metadata: { name: 'app-1' } });
            const mockCRD2 = createMockCRD({ metadata: { name: 'app-2' } });

            setMockExecFileResponse({
                type: 'success',
                stdout: JSON.stringify({
                    items: [mockCRD1, mockCRD2]
                }),
                stderr: ''
            });

            const result = await service.getApplications(TEST_CONTEXT, true);

            assert.ok(Array.isArray(result));
            assert.strictEqual(result.length, 2);
            assert.ok(result[0] instanceof Object);
            assert.strictEqual(result[0].name, 'app-1');
            assert.strictEqual(result[1].name, 'app-2');
            
            // Type check
            const typedResult: ArgoCDApplication[] = result;
            assert.ok(typedResult);
        });

        test('Should handle parsing errors gracefully', async () => {
            const mockCRD1 = createMockCRD({ metadata: { name: 'app-1' } });
            const invalidCRD = { metadata: {} }; // Missing required fields

            setMockExecFileResponse({
                type: 'success',
                stdout: JSON.stringify({
                    items: [mockCRD1, invalidCRD]
                }),
                stderr: ''
            });

            const result = await service.getApplications(TEST_CONTEXT, true);

            // Should return only valid parsed applications
            assert.ok(Array.isArray(result));
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'app-1');
        });
    });

    suite('Status code validation', () => {
        test('Should validate sync status codes', async () => {
            const testCases = [
                { input: 'Synced', expected: 'Synced' },
                { input: 'OutOfSync', expected: 'OutOfSync' },
                { input: 'Unknown', expected: 'Unknown' },
                { input: 'InvalidStatus', expected: 'Unknown' }
            ];

            for (const testCase of testCases) {
                const mockCRD = createMockCRD({
                    status: {
                        sync: {
                            status: testCase.input,
                            revision: 'abc123'
                        }
                    }
                });

                setMockExecFileResponse({
                    type: 'success',
                    stdout: JSON.stringify(mockCRD),
                    stderr: ''
                });

                const result = await service.getApplication('test-app', TEST_NAMESPACE, TEST_CONTEXT);
                assert.strictEqual(result.syncStatus.status, testCase.expected);
            }
        });

        test('Should validate health status codes', async () => {
            const testCases = [
                { input: 'Healthy', expected: 'Healthy' },
                { input: 'Degraded', expected: 'Degraded' },
                { input: 'Progressing', expected: 'Progressing' },
                { input: 'InvalidStatus', expected: 'Unknown' }
            ];

            for (const testCase of testCases) {
                const mockCRD = createMockCRD({
                    status: {
                        health: {
                            status: testCase.input
                        }
                    }
                });

                setMockExecFileResponse({
                    type: 'success',
                    stdout: JSON.stringify(mockCRD),
                    stderr: ''
                });

                const result = await service.getApplication('test-app', TEST_NAMESPACE, TEST_CONTEXT);
                assert.strictEqual(result.healthStatus.status, testCase.expected);
            }
        });
    });
});

