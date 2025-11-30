import * as assert from 'assert';
import * as path from 'path';
import { ClusterConnectivity } from '../../../kubernetes/ClusterConnectivity';
import { ClusterStatus } from '../../../kubernetes/ClusterTypes';

suite('ClusterConnectivity Test Suite @requires-k8s', () => {
    // Path to test kubeconfig fixture
    const testKubeconfigPath = path.join(__dirname, '../../fixtures/valid-kubeconfig.yaml');

    test('checkConnectivity - returns Disconnected for unreachable cluster', async () => {
        // The 'production' context in the test fixture points to an unreachable cluster
        const result = await ClusterConnectivity.checkConnectivity(testKubeconfigPath, 'production');
        assert.strictEqual(result.status, ClusterStatus.Disconnected, 'Unreachable cluster should return Disconnected status');
        assert.ok(result.error, 'Should include error information');
    });

    test('checkConnectivity - handles invalid context name', async () => {
        // Non-existent context should fail
        const result = await ClusterConnectivity.checkConnectivity(testKubeconfigPath, 'nonexistent-context');
        assert.strictEqual(result.status, ClusterStatus.Disconnected, 'Invalid context should return Disconnected status');
        assert.ok(result.error, 'Should include error information');
    });

    test('checkConnectivity - handles invalid kubeconfig path', async () => {
        // Non-existent kubeconfig file
        const result = await ClusterConnectivity.checkConnectivity('/nonexistent/kubeconfig.yaml', 'minikube');
        assert.strictEqual(result.status, ClusterStatus.Disconnected, 'Invalid kubeconfig path should return Disconnected status');
        assert.ok(result.error, 'Should include error information');
    });

    test('checkMultipleConnectivity - checks multiple clusters', async () => {
        const contextNames = [
            'minikube',
            'production',
            'staging'
        ];
        
        const results = await ClusterConnectivity.checkMultipleConnectivity(testKubeconfigPath, contextNames);
        
        assert.strictEqual(results.length, 3, 'Should return results for all contexts');
        assert.strictEqual(results[0].status, ClusterStatus.Disconnected, 'First context should be disconnected');
        assert.strictEqual(results[1].status, ClusterStatus.Disconnected, 'Second context should be disconnected');
        assert.strictEqual(results[2].status, ClusterStatus.Disconnected, 'Third context should be disconnected');
        assert.ok(results[0].error, 'First result should include error information');
        assert.ok(results[1].error, 'Second result should include error information');
        assert.ok(results[2].error, 'Third result should include error information');
    });

    test('checkMultipleConnectivity - handles empty array', async () => {
        const results = await ClusterConnectivity.checkMultipleConnectivity(testKubeconfigPath, []);
        assert.strictEqual(results.length, 0, 'Should return empty array for empty input');
    });
});

