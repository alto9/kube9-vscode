import * as assert from 'assert';
import { OperatorStatusMode, OperatorStatus } from '../../../kubernetes/OperatorStatusTypes';
import { CachedOperatorStatus } from '../../../services/OperatorStatusClient';

// Import modules for mocking
import * as OperatorStatusQuery from '../../../dashboard/OperatorStatusQuery';
import * as OperatorStatusClientModule from '../../../services/OperatorStatusClient';
import * as KubeconfigParserModule from '../../../kubernetes/KubeconfigParser';

suite('OperatorStatusQuery Test Suite', () => {
    let originalGetStatus: typeof OperatorStatusClientModule.OperatorStatusClient.prototype.getStatus;
    let originalClearCache: typeof OperatorStatusClientModule.OperatorStatusClient.prototype.clearCache;
    let originalClearAllCache: typeof OperatorStatusClientModule.OperatorStatusClient.prototype.clearAllCache;
    let originalGetKubeconfigPath: typeof KubeconfigParserModule.KubeconfigParser.getKubeconfigPath;
    
    let mockGetStatusResponse: CachedOperatorStatus | null = null;
    let mockGetStatusError: Error | null = null;
    let getStatusCallCount = 0;
    let clearCacheCallCount = 0;
    let clearAllCacheCallCount = 0;

    const TEST_KUBECONFIG = '/test/kubeconfig';
    const TEST_CONTEXT = 'test-context';

    setup(() => {
        // Save original methods
        originalGetStatus = OperatorStatusClientModule.OperatorStatusClient.prototype.getStatus;
        originalClearCache = OperatorStatusClientModule.OperatorStatusClient.prototype.clearCache;
        originalClearAllCache = OperatorStatusClientModule.OperatorStatusClient.prototype.clearAllCache;
        originalGetKubeconfigPath = KubeconfigParserModule.KubeconfigParser.getKubeconfigPath;

        // Reset mock state
        mockGetStatusResponse = null;
        mockGetStatusError = null;
        getStatusCallCount = 0;
        clearCacheCallCount = 0;
        clearAllCacheCallCount = 0;

        // Mock OperatorStatusClient.getStatus
        OperatorStatusClientModule.OperatorStatusClient.prototype.getStatus = async function() {
            getStatusCallCount++;
            if (mockGetStatusError) {
                throw mockGetStatusError;
            }
            if (mockGetStatusResponse) {
                return mockGetStatusResponse;
            }
            throw new Error('No mock response configured');
        };

        // Mock OperatorStatusClient.clearCache
        OperatorStatusClientModule.OperatorStatusClient.prototype.clearCache = function() {
            clearCacheCallCount++;
        };

        // Mock OperatorStatusClient.clearAllCache
        OperatorStatusClientModule.OperatorStatusClient.prototype.clearAllCache = function() {
            clearAllCacheCallCount++;
        };

        // Mock KubeconfigParser.getKubeconfigPath
        KubeconfigParserModule.KubeconfigParser.getKubeconfigPath = () => TEST_KUBECONFIG;
    });

    teardown(() => {
        // Restore original methods
        OperatorStatusClientModule.OperatorStatusClient.prototype.getStatus = originalGetStatus;
        OperatorStatusClientModule.OperatorStatusClient.prototype.clearCache = originalClearCache;
        OperatorStatusClientModule.OperatorStatusClient.prototype.clearAllCache = originalClearAllCache;
        KubeconfigParserModule.KubeconfigParser.getKubeconfigPath = originalGetKubeconfigPath;
    });

    suite('getOperatorDashboardStatus', () => {
        test('should return null when operator not installed (basic mode)', async () => {
            mockGetStatusResponse = {
                status: null,
                timestamp: Date.now(),
                mode: OperatorStatusMode.Basic
            };

            const result = await OperatorStatusQuery.getOperatorDashboardStatus(TEST_CONTEXT);

            assert.strictEqual(result, null, 'Should return null for basic mode');
            assert.strictEqual(getStatusCallCount, 1, 'Should call getStatus once');
        });

        test('should return correct status for operated mode without API key', async () => {
            const operatorStatus: OperatorStatus = {
                mode: 'operated',
                tier: 'free',
                version: '1.0.0',
                health: 'healthy',
                lastUpdate: new Date().toISOString(),
                registered: false,
                apiKeyConfigured: false,
                error: null,
                collectionStats: {
                    totalSuccessCount: 0,
                    totalFailureCount: 0,
                    collectionsStoredCount: 0,
                    lastSuccessTime: null
                }
            };
            mockGetStatusResponse = {
                status: operatorStatus,
                timestamp: Date.now(),
                mode: OperatorStatusMode.Operated
            };

            const result = await OperatorStatusQuery.getOperatorDashboardStatus(TEST_CONTEXT);

            assert.notStrictEqual(result, null, 'Should not return null');
            assert.strictEqual(result?.mode, 'operated', 'Mode should be operated');
            assert.strictEqual(result?.hasApiKey, false, 'hasApiKey should be false');
            assert.strictEqual(result?.tier, 'free', 'Tier should be free');
            assert.strictEqual(result?.version, '1.0.0', 'Version should match');
            assert.strictEqual(result?.health, 'healthy', 'Health should be healthy');
        });

        test('should return correct status for enabled mode with API key', async () => {
            const operatorStatus: OperatorStatus = {
                mode: 'enabled',
                tier: 'pro',
                version: '2.0.0',
                health: 'healthy',
                lastUpdate: new Date().toISOString(),
                registered: true,
                apiKeyConfigured: true,
                error: null,
                clusterId: 'cluster-123',
                collectionStats: {
                    totalSuccessCount: 0,
                    totalFailureCount: 0,
                    collectionsStoredCount: 0,
                    lastSuccessTime: null
                }
            };
            mockGetStatusResponse = {
                status: operatorStatus,
                timestamp: Date.now(),
                mode: OperatorStatusMode.Enabled
            };

            const result = await OperatorStatusQuery.getOperatorDashboardStatus(TEST_CONTEXT);

            assert.notStrictEqual(result, null, 'Should not return null');
            assert.strictEqual(result?.mode, 'enabled', 'Mode should be enabled');
            assert.strictEqual(result?.hasApiKey, true, 'hasApiKey should be true');
            assert.strictEqual(result?.tier, 'pro', 'Tier should be pro');
            assert.strictEqual(result?.version, '2.0.0', 'Version should match');
            assert.strictEqual(result?.health, 'healthy', 'Health should be healthy');
        });

        test('should return correct status for degraded mode', async () => {
            const operatorStatus: OperatorStatus = {
                mode: 'operated',
                tier: 'free',
                version: '1.0.0',
                health: 'degraded',
                lastUpdate: new Date().toISOString(),
                registered: false,
                apiKeyConfigured: false,
                error: 'Operator is experiencing issues',
                collectionStats: {
                    totalSuccessCount: 0,
                    totalFailureCount: 0,
                    collectionsStoredCount: 0,
                    lastSuccessTime: null
                }
            };
            mockGetStatusResponse = {
                status: operatorStatus,
                timestamp: Date.now(),
                mode: OperatorStatusMode.Degraded
            };

            const result = await OperatorStatusQuery.getOperatorDashboardStatus(TEST_CONTEXT);

            assert.notStrictEqual(result, null, 'Should not return null');
            assert.strictEqual(result?.mode, 'degraded', 'Mode should be degraded');
            assert.strictEqual(result?.hasApiKey, false, 'hasApiKey should be false');
            assert.strictEqual(result?.health, 'degraded', 'Health should be degraded');
        });

        test('should handle enabled mode without registration as no API key', async () => {
            const operatorStatus: OperatorStatus = {
                mode: 'enabled',
                tier: 'pro',
                version: '2.0.0',
                health: 'healthy',
                lastUpdate: new Date().toISOString(),
                registered: false,
                apiKeyConfigured: false,
                error: null,
                collectionStats: {
                    totalSuccessCount: 0,
                    totalFailureCount: 0,
                    collectionsStoredCount: 0,
                    lastSuccessTime: null
                }
            };
            mockGetStatusResponse = {
                status: operatorStatus,
                timestamp: Date.now(),
                mode: OperatorStatusMode.Enabled
            };

            const result = await OperatorStatusQuery.getOperatorDashboardStatus(TEST_CONTEXT);

            assert.notStrictEqual(result, null, 'Should not return null');
            assert.strictEqual(result?.mode, 'enabled', 'Mode should be enabled');
            assert.strictEqual(result?.hasApiKey, false, 'hasApiKey should be false when not registered');
        });

        test('should handle operated mode with registration as no API key', async () => {
            const operatorStatus: OperatorStatus = {
                mode: 'operated',
                tier: 'free',
                version: '1.0.0',
                health: 'healthy',
                lastUpdate: new Date().toISOString(),
                registered: true,
                apiKeyConfigured: false,
                error: null,
                collectionStats: {
                    totalSuccessCount: 0,
                    totalFailureCount: 0,
                    collectionsStoredCount: 0,
                    lastSuccessTime: null
                }
            };
            mockGetStatusResponse = {
                status: operatorStatus,
                timestamp: Date.now(),
                mode: OperatorStatusMode.Operated
            };

            const result = await OperatorStatusQuery.getOperatorDashboardStatus(TEST_CONTEXT);

            assert.notStrictEqual(result, null, 'Should not return null');
            assert.strictEqual(result?.mode, 'operated', 'Mode should be operated');
            assert.strictEqual(result?.hasApiKey, false, 'hasApiKey should be false when not in enabled mode');
        });

        test('should handle unhealthy operator status', async () => {
            const operatorStatus: OperatorStatus = {
                mode: 'operated',
                tier: 'free',
                version: '1.0.0',
                health: 'unhealthy',
                lastUpdate: new Date().toISOString(),
                registered: false,
                apiKeyConfigured: false,
                error: 'Critical error detected',
                collectionStats: {
                    totalSuccessCount: 0,
                    totalFailureCount: 0,
                    collectionsStoredCount: 0,
                    lastSuccessTime: null
                }
            };
            mockGetStatusResponse = {
                status: operatorStatus,
                timestamp: Date.now(),
                mode: OperatorStatusMode.Degraded
            };

            const result = await OperatorStatusQuery.getOperatorDashboardStatus(TEST_CONTEXT);

            assert.notStrictEqual(result, null, 'Should not return null');
            assert.strictEqual(result?.health, 'unhealthy', 'Health should be unhealthy');
            assert.strictEqual(result?.mode, 'degraded', 'Mode should be degraded for unhealthy');
        });

        test('should return null when cached status has null operator status', async () => {
            mockGetStatusResponse = {
                status: null,
                timestamp: Date.now(),
                mode: OperatorStatusMode.Operated
            };

            const result = await OperatorStatusQuery.getOperatorDashboardStatus(TEST_CONTEXT);

            assert.strictEqual(result, null, 'Should return null when operator status is null');
        });
    });

    suite('clearOperatorStatusCache', () => {
        test('should clear cache for specific cluster', () => {
            OperatorStatusQuery.clearOperatorStatusCache(TEST_CONTEXT);

            assert.strictEqual(clearCacheCallCount, 1, 'Should call clearCache once');
        });
    });

    suite('clearAllOperatorStatusCache', () => {
        test('should clear all cached operator statuses', () => {
            OperatorStatusQuery.clearAllOperatorStatusCache();

            assert.strictEqual(clearAllCacheCallCount, 1, 'Should call clearAllCache once');
        });
    });

    suite('Error Handling', () => {
        test('should propagate errors from OperatorStatusClient', async () => {
            mockGetStatusError = new Error('Connection failed');

            try {
                await OperatorStatusQuery.getOperatorDashboardStatus(TEST_CONTEXT);
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error instanceof Error, 'Should throw an error');
                assert.strictEqual(error.message, 'Connection failed', 'Should propagate error message');
            }
        });
    });

    suite('Integration', () => {
        test('should handle multiple sequential calls efficiently', async () => {
            const operatorStatus: OperatorStatus = {
                mode: 'operated',
                tier: 'free',
                version: '1.0.0',
                health: 'healthy',
                lastUpdate: new Date().toISOString(),
                registered: false,
                apiKeyConfigured: false,
                error: null,
                collectionStats: {
                    totalSuccessCount: 0,
                    totalFailureCount: 0,
                    collectionsStoredCount: 0,
                    lastSuccessTime: null
                }
            };
            mockGetStatusResponse = {
                status: operatorStatus,
                timestamp: Date.now(),
                mode: OperatorStatusMode.Operated
            };

            // Make multiple calls
            await OperatorStatusQuery.getOperatorDashboardStatus(TEST_CONTEXT);
            await OperatorStatusQuery.getOperatorDashboardStatus(TEST_CONTEXT);
            await OperatorStatusQuery.getOperatorDashboardStatus(TEST_CONTEXT);

            // OperatorStatusClient should be called each time (it handles caching internally)
            assert.strictEqual(getStatusCallCount, 3, 'Should call getStatus for each request');
        });
    });
});

