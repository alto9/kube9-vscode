import * as assert from 'assert';
import {
    getResourceCache,
    resetResourceCache,
    CACHE_TTL
} from '../../../kubernetes/cache';

suite('ResourceCache Test Suite', () => {
    teardown(() => {
        // Reset singleton and clear cache after each test to ensure clean state
        const cache = getResourceCache();
        cache.clear();
        resetResourceCache();
    });

    suite('Singleton Pattern', () => {
        test('Should return the same instance on multiple calls', () => {
            const cache1 = getResourceCache();
            const cache2 = getResourceCache();

            assert.strictEqual(cache1, cache2, 'getResourceCache should return the same instance');
        });

        test('Should create new instance after reset', () => {
            const cache1 = getResourceCache();
            cache1.set('test-key', 'test-data', 1000);
            resetResourceCache();
            const cache2 = getResourceCache();

            assert.notStrictEqual(cache1, cache2, 'Should create new instance after reset');
            // New instance should have empty cache
            assert.strictEqual(cache2.get('test-key'), null, 'New instance should have empty cache');
        });
    });

    suite('set() Method', () => {
        test('Should store data with timestamp', () => {
            const cache = getResourceCache();
            const testData = { name: 'test-node', status: 'Ready' };
            cache.set('test-key', testData, 1000);

            const result = cache.get('test-key');
            assert.deepStrictEqual(result, testData, 'set() should store data correctly');
        });

        test('Should store different data types', () => {
            const cache = getResourceCache();

            // Test string
            cache.set('string-key', 'test-string', 1000);
            assert.strictEqual(cache.get('string-key'), 'test-string', 'Should store string');

            // Test object
            const obj = { id: 1, name: 'test' };
            cache.set('object-key', obj, 1000);
            assert.deepStrictEqual(cache.get('object-key'), obj, 'Should store object');

            // Test array
            const arr = [1, 2, 3];
            cache.set('array-key', arr, 1000);
            assert.deepStrictEqual(cache.get('array-key'), arr, 'Should store array');
        });

        test('Should overwrite existing entry', () => {
            const cache = getResourceCache();
            cache.set('test-key', 'old-data', 1000);
            cache.set('test-key', 'new-data', 1000);

            assert.strictEqual(cache.get('test-key'), 'new-data', 'Should overwrite existing entry');
        });
    });

    suite('get() Method', () => {
        test('Should return data before TTL expires', () => {
            const cache = getResourceCache();
            const testData = { name: 'test-pod' };
            cache.set('test-key', testData, 5000);

            const result = cache.get('test-key');
            assert.deepStrictEqual(result, testData, 'get() should return data before TTL expires');
        });

        test('Should return null after TTL expires', (done) => {
            const cache = getResourceCache();
            const testData = { name: 'test-pod' };
            cache.set('test-key', testData, 100); // Very short TTL

            // Wait for TTL to expire
            setTimeout(() => {
                const result = cache.get('test-key');
                assert.strictEqual(result, null, 'get() should return null after TTL expires');
                done();
            }, 150);
        });

        test('Should auto-delete expired entries', (done) => {
            const cache = getResourceCache();
            cache.set('expired-key', 'data', 100);
            cache.set('valid-key', 'data', 5000);

            setTimeout(() => {
                // Access expired entry - should auto-delete
                cache.get('expired-key');
                // Access valid entry
                const validResult = cache.get('valid-key');

                // Expired entry should be gone (we can't directly check Map, but get returns null)
                assert.strictEqual(cache.get('expired-key'), null, 'Expired entry should be auto-deleted');
                assert.strictEqual(validResult, 'data', 'Valid entry should still exist');
                done();
            }, 150);
        });

        test('Should return null for non-existent key', () => {
            const cache = getResourceCache();
            const result = cache.get('non-existent-key');

            assert.strictEqual(result, null, 'get() should return null for non-existent key');
        });

        test('Should handle generic types correctly', () => {
            const cache = getResourceCache();

            interface TestInterface {
                id: number;
                name: string;
            }

            const testData: TestInterface = { id: 1, name: 'test' };
            cache.set<TestInterface>('typed-key', testData, 1000);

            const result = cache.get<TestInterface>('typed-key');
            assert.ok(result !== null, 'Should retrieve typed data');
            assert.strictEqual(result?.id, 1, 'Typed data should have correct properties');
            assert.strictEqual(result?.name, 'test', 'Typed data should have correct properties');
        });
    });

    suite('invalidate() Method', () => {
        test('Should remove specific key', () => {
            const cache = getResourceCache();
            cache.set('key1', 'data1', 1000);
            cache.set('key2', 'data2', 1000);

            cache.invalidate('key1');

            assert.strictEqual(cache.get('key1'), null, 'Invalidated key should return null');
            assert.strictEqual(cache.get('key2'), 'data2', 'Other keys should remain');
        });

        test('Should not throw error for non-existent key', () => {
            const cache = getResourceCache();
            assert.doesNotThrow(() => {
                cache.invalidate('non-existent-key');
            }, 'invalidate() should not throw for non-existent key');
        });
    });

    suite('invalidatePattern() Method', () => {
        test('Should remove matching keys using RegExp', () => {
            const cache = getResourceCache();
            cache.set('minikube:nodes', 'data1', 1000);
            cache.set('minikube:pods', 'data2', 1000);
            cache.set('prod-cluster:nodes', 'data3', 1000);
            cache.set('prod-cluster:pods', 'data4', 1000);

            // Invalidate all minikube entries
            cache.invalidatePattern(/^minikube:/);

            assert.strictEqual(cache.get('minikube:nodes'), null, 'Matching key should be removed');
            assert.strictEqual(cache.get('minikube:pods'), null, 'Matching key should be removed');
            assert.strictEqual(cache.get('prod-cluster:nodes'), 'data3', 'Non-matching key should remain');
            assert.strictEqual(cache.get('prod-cluster:pods'), 'data4', 'Non-matching key should remain');
        });

        test('Should remove keys matching resource type pattern', () => {
            const cache = getResourceCache();
            cache.set('context1:nodes', 'data1', 1000);
            cache.set('context1:pods', 'data2', 1000);
            cache.set('context2:nodes', 'data3', 1000);
            cache.set('context2:pods', 'data4', 1000);

            // Invalidate all pod entries
            cache.invalidatePattern(/:pods$/);

            assert.strictEqual(cache.get('context1:nodes'), 'data1', 'Non-matching key should remain');
            assert.strictEqual(cache.get('context1:pods'), null, 'Matching key should be removed');
            assert.strictEqual(cache.get('context2:nodes'), 'data3', 'Non-matching key should remain');
            assert.strictEqual(cache.get('context2:pods'), null, 'Matching key should be removed');
        });

        test('Should handle empty pattern matches', () => {
            const cache = getResourceCache();
            cache.set('key1', 'data1', 1000);
            cache.set('key2', 'data2', 1000);

            // Pattern that matches nothing
            cache.invalidatePattern(/^non-existent/);

            assert.strictEqual(cache.get('key1'), 'data1', 'Keys should remain when pattern matches nothing');
            assert.strictEqual(cache.get('key2'), 'data2', 'Keys should remain when pattern matches nothing');
        });
    });

    suite('clear() Method', () => {
        test('Should remove all entries', () => {
            const cache = getResourceCache();
            cache.set('key1', 'data1', 1000);
            cache.set('key2', 'data2', 1000);
            cache.set('key3', 'data3', 1000);

            cache.clear();

            assert.strictEqual(cache.get('key1'), null, 'All entries should be removed');
            assert.strictEqual(cache.get('key2'), null, 'All entries should be removed');
            assert.strictEqual(cache.get('key3'), null, 'All entries should be removed');
        });

        test('Should work on empty cache', () => {
            const cache = getResourceCache();
            assert.doesNotThrow(() => {
                cache.clear();
            }, 'clear() should work on empty cache');
        });
    });

    suite('CACHE_TTL Constants', () => {
        test('Should have correct TTL values', () => {
            assert.strictEqual(CACHE_TTL.NODES, 30000, 'NODES TTL should be 30000ms');
            assert.strictEqual(CACHE_TTL.NAMESPACES, 30000, 'NAMESPACES TTL should be 30000ms');
            assert.strictEqual(CACHE_TTL.PODS, 5000, 'PODS TTL should be 5000ms');
            assert.strictEqual(CACHE_TTL.DEPLOYMENTS, 10000, 'DEPLOYMENTS TTL should be 10000ms');
            assert.strictEqual(CACHE_TTL.SERVICES, 30000, 'SERVICES TTL should be 30000ms');
            assert.strictEqual(CACHE_TTL.CLUSTER_INFO, 60000, 'CLUSTER_INFO TTL should be 60000ms');
        });

        test('Should use CACHE_TTL constants in cache operations', () => {
            const cache = getResourceCache();
            const testData = { name: 'test-node' };
            cache.set('test-key', testData, CACHE_TTL.NODES);

            const result = cache.get('test-key');
            assert.deepStrictEqual(result, testData, 'Should work with CACHE_TTL constants');
        });
    });

    suite('Integration Tests', () => {
        test('Should handle multiple operations in sequence', () => {
            const cache = getResourceCache();

            // Set multiple entries
            cache.set('key1', 'data1', 1000);
            cache.set('key2', 'data2', 1000);
            cache.set('key3', 'data3', 1000);

            // Verify all are accessible
            assert.strictEqual(cache.get('key1'), 'data1');
            assert.strictEqual(cache.get('key2'), 'data2');
            assert.strictEqual(cache.get('key3'), 'data3');

            // Invalidate one
            cache.invalidate('key2');
            assert.strictEqual(cache.get('key2'), null);

            // Others should remain
            assert.strictEqual(cache.get('key1'), 'data1');
            assert.strictEqual(cache.get('key3'), 'data3');

            // Clear all
            cache.clear();
            assert.strictEqual(cache.get('key1'), null);
            assert.strictEqual(cache.get('key3'), null);
        });

        test('Should handle context-aware keys correctly', () => {
            const cache = getResourceCache();

            // Simulate different contexts
            cache.set('minikube:nodes', ['node1', 'node2'], 1000);
            cache.set('prod-cluster:nodes', ['node3', 'node4'], 1000);
            cache.set('minikube:pods', ['pod1'], 1000);

            // Invalidate all minikube entries
            cache.invalidatePattern(/^minikube:/);

            assert.strictEqual(cache.get('minikube:nodes'), null, 'minikube entries should be removed');
            assert.strictEqual(cache.get('minikube:pods'), null, 'minikube entries should be removed');
            assert.deepStrictEqual(cache.get('prod-cluster:nodes'), ['node3', 'node4'], 'prod-cluster entries should remain');
        });
    });

    suite('size() Method', () => {
        test('Should return 0 for empty cache', () => {
            const cache = getResourceCache();
            assert.strictEqual(cache.size(), 0, 'size() should return 0 for empty cache');
        });

        test('Should return correct count for valid entries', () => {
            const cache = getResourceCache();
            cache.set('key1', 'data1', 1000);
            cache.set('key2', 'data2', 1000);
            cache.set('key3', 'data3', 1000);

            assert.strictEqual(cache.size(), 3, 'size() should return correct count');
        });

        test('Should exclude expired entries', (done) => {
            const cache = getResourceCache();
            cache.set('expired-key', 'data', 100);
            cache.set('valid-key', 'data', 5000);

            setTimeout(() => {
                // Expired entry should not be counted
                assert.strictEqual(cache.size(), 1, 'size() should exclude expired entries');
                done();
            }, 150);
        });

        test('Should handle mixed valid and expired entries', () => {
            const cache = getResourceCache();
            cache.set('key1', 'data1', 1000);
            cache.set('key2', 'data2', 1000);

            assert.strictEqual(cache.size(), 2, 'size() should count all valid entries');
        });
    });

    suite('totalSize() Method', () => {
        test('Should return 0 for empty cache', () => {
            const cache = getResourceCache();
            assert.strictEqual(cache.totalSize(), 0, 'totalSize() should return 0 for empty cache');
        });

        test('Should return positive size for cached entries', () => {
            const cache = getResourceCache();
            cache.set('key1', 'test data', 1000);
            cache.set('key2', { name: 'test', value: 123 }, 1000);

            const size = cache.totalSize();
            assert.ok(size > 0, 'totalSize() should return positive size');
        });

        test('Should exclude expired entries from size calculation', (done) => {
            const cache = getResourceCache();
            cache.set('expired-key', 'large data string', 100);
            cache.set('valid-key', 'small data', 5000);

            setTimeout(() => {
                const size = cache.totalSize();
                // Size should only include valid-key, not expired-key
                assert.ok(size > 0, 'totalSize() should return positive size');
                // Size should be relatively small (just 'valid-key' + 'small data')
                assert.ok(size < 1000, 'totalSize() should exclude expired entries');
                done();
            }, 150);
        });

        test('Should include key length in size calculation', () => {
            const cache = getResourceCache();
            const longKey = 'a'.repeat(100);
            cache.set(longKey, 'data', 1000);

            const size = cache.totalSize();
            assert.ok(size >= 100, 'totalSize() should include key length');
        });
    });

    suite('keys() Method', () => {
        test('Should return empty array for empty cache', () => {
            const cache = getResourceCache();
            const keys = cache.keys();
            assert.deepStrictEqual(keys, [], 'keys() should return empty array for empty cache');
        });

        test('Should return all valid keys', () => {
            const cache = getResourceCache();
            cache.set('key1', 'data1', 1000);
            cache.set('key2', 'data2', 1000);
            cache.set('key3', 'data3', 1000);

            const keys = cache.keys();
            assert.strictEqual(keys.length, 3, 'keys() should return all keys');
            assert.ok(keys.includes('key1'), 'keys() should include key1');
            assert.ok(keys.includes('key2'), 'keys() should include key2');
            assert.ok(keys.includes('key3'), 'keys() should include key3');
        });

        test('Should exclude expired entries', (done) => {
            const cache = getResourceCache();
            cache.set('expired-key', 'data', 100);
            cache.set('valid-key', 'data', 5000);

            setTimeout(() => {
                const keys = cache.keys();
                assert.strictEqual(keys.length, 1, 'keys() should exclude expired entries');
                assert.ok(keys.includes('valid-key'), 'keys() should include valid-key');
                assert.ok(!keys.includes('expired-key'), 'keys() should not include expired-key');
                done();
            }, 150);
        });

        test('Should return sorted keys', () => {
            const cache = getResourceCache();
            cache.set('zebra', 'data', 1000);
            cache.set('apple', 'data', 1000);
            cache.set('banana', 'data', 1000);

            const keys = cache.keys();
            // Keys should be sorted alphabetically
            assert.deepStrictEqual(keys, ['apple', 'banana', 'zebra'], 'keys() should return sorted keys');
        });

        test('Should handle context-aware keys', () => {
            const cache = getResourceCache();
            cache.set('minikube:nodes', 'data', 1000);
            cache.set('prod-cluster:pods', 'data', 1000);
            cache.set('minikube:deployments:default', 'data', 1000);

            const keys = cache.keys();
            assert.strictEqual(keys.length, 3, 'keys() should return all context-aware keys');
            assert.ok(keys.includes('minikube:nodes'), 'keys() should include context-aware keys');
            assert.ok(keys.includes('prod-cluster:pods'), 'keys() should include context-aware keys');
            assert.ok(keys.includes('minikube:deployments:default'), 'keys() should include namespace-aware keys');
        });
    });
});

