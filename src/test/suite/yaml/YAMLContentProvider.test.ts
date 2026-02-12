import * as assert from 'assert';
import * as yaml from 'js-yaml';
import { filterManagedFieldsForDisplay, YAMLContentProvider } from '../../../yaml/YAMLContentProvider';

/**
 * Unit tests for YAMLContentProvider.
 * Tests managedFields filtering for View YAML output.
 */
suite('YAMLContentProvider', () => {
    suite('filterManagedFieldsForDisplay', () => {
        test('should remove managedFields from resource metadata', () => {
            const resource = {
                apiVersion: 'v1',
                kind: 'Pod',
                metadata: {
                    name: 'test-pod',
                    namespace: 'default',
                    managedFields: [
                        { manager: 'kube-controller-manager', fieldsType: 'FieldsV1', fieldsV1: {} }
                    ]
                },
                spec: { containers: [] }
            };

            filterManagedFieldsForDisplay(resource);

            assert.strictEqual(resource.metadata.managedFields, undefined);
            assert.strictEqual(resource.metadata.name, 'test-pod');
            assert.strictEqual(resource.metadata.namespace, 'default');
        });

        test('should handle resource without metadata', () => {
            const resource = { apiVersion: 'v1', kind: 'Pod', spec: {} };
            assert.doesNotThrow(() => filterManagedFieldsForDisplay(resource));
        });

        test('should handle resource without managedFields', () => {
            const resource = {
                apiVersion: 'v1',
                kind: 'Pod',
                metadata: { name: 'test-pod', namespace: 'default' },
                spec: {}
            };
            const originalMetadata = { ...resource.metadata };

            filterManagedFieldsForDisplay(resource);

            assert.deepStrictEqual(resource.metadata, originalMetadata);
        });

        test('should handle null and undefined', () => {
            assert.doesNotThrow(() => filterManagedFieldsForDisplay(null));
            assert.doesNotThrow(() => filterManagedFieldsForDisplay(undefined));
        });

        test('should not include managedFields in serialized YAML output', () => {
            const resource = {
                apiVersion: 'v1',
                kind: 'Pod',
                metadata: {
                    name: 'test-pod',
                    namespace: 'default',
                    managedFields: [{ manager: 'kubectl', fieldsType: 'FieldsV1' }]
                },
                spec: { containers: [] }
            };

            filterManagedFieldsForDisplay(resource);
            const yamlOutput = yaml.dump(resource);

            assert.ok(!yamlOutput.includes('managedFields'), 'YAML output should not contain managedFields');
            assert.ok(yamlOutput.includes('apiVersion'), 'YAML output should retain required fields');
            assert.ok(yamlOutput.includes('kind'), 'YAML output should retain required fields');
            assert.ok(yamlOutput.includes('metadata'), 'YAML output should retain required fields');
            assert.ok(yamlOutput.includes('spec'), 'YAML output should retain required fields');
        });
    });

    suite('fetchYAML', () => {
        test('should export YAMLContentProvider class', () => {
            const provider = new YAMLContentProvider();
            assert.ok(provider instanceof YAMLContentProvider);
            assert.strictEqual(typeof provider.fetchYAML, 'function');
        });
    });
});
