import * as assert from 'assert';
import { DescribeWebview } from '../../../webview/DescribeWebview';

/**
 * Regression: shared Describe panel message handlers branch on static *Config fields.
 * Opening CRD describe after PV/Pod/etc. must clear stale configs so refresh/viewYaml
 * target the CRD (PR review: stale currentPVConfig shadowed currentCRDConfig).
 */
type DescribeWebviewInternals = {
    clearAllDescribeResourceConfigs(): void;
    currentPodConfig: unknown;
    currentNamespaceConfig: unknown;
    currentPVCConfig: unknown;
    currentPVConfig: unknown;
    currentSecretConfig: unknown;
    currentServiceConfig: unknown;
    currentConfigMapConfig: unknown;
    currentStorageClassConfig: unknown;
    currentCRDConfig: { name: string; kindLabel: string; context: string } | undefined;
};

suite('DescribeWebview CRD config mutex', () => {
    teardown(() => {
        const w = DescribeWebview as unknown as DescribeWebviewInternals;
        w.clearAllDescribeResourceConfigs();
    });

    test('clearAllDescribeResourceConfigs removes stale PV before CRD is active', () => {
        const w = DescribeWebview as unknown as DescribeWebviewInternals;
        w.currentPVConfig = { name: 'pv-stale', context: 'ctx' };
        w.clearAllDescribeResourceConfigs();
        w.currentCRDConfig = { name: 'widgets.example.com', kindLabel: 'Widget', context: 'ctx' };
        assert.strictEqual(w.currentPVConfig, undefined);
        assert.strictEqual(w.currentCRDConfig.name, 'widgets.example.com');
    });

    test('clearAllDescribeResourceConfigs clears every describe binding slot', () => {
        const w = DescribeWebview as unknown as DescribeWebviewInternals;
        w.currentPodConfig = { name: 'p', namespace: 'ns', context: 'c' };
        w.currentNamespaceConfig = { stub: true };
        w.currentPVCConfig = { name: 'pvc', namespace: 'ns', context: 'c' };
        w.currentPVConfig = { name: 'pv', context: 'c' };
        w.currentSecretConfig = { name: 's', namespace: 'ns', context: 'c' };
        w.currentServiceConfig = { name: 'svc', namespace: 'ns', context: 'c' };
        w.currentConfigMapConfig = { name: 'cm', namespace: 'ns', context: 'c' };
        w.currentStorageClassConfig = { name: 'sc', context: 'c' };
        w.currentCRDConfig = { name: 'x.example.com', kindLabel: 'X', context: 'c' };
        w.clearAllDescribeResourceConfigs();
        assert.strictEqual(w.currentPodConfig, undefined);
        assert.strictEqual(w.currentNamespaceConfig, undefined);
        assert.strictEqual(w.currentPVCConfig, undefined);
        assert.strictEqual(w.currentPVConfig, undefined);
        assert.strictEqual(w.currentSecretConfig, undefined);
        assert.strictEqual(w.currentServiceConfig, undefined);
        assert.strictEqual(w.currentConfigMapConfig, undefined);
        assert.strictEqual(w.currentStorageClassConfig, undefined);
        assert.strictEqual(w.currentCRDConfig, undefined);
    });
});
