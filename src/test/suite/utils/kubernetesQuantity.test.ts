import * as assert from 'assert';
import { parseKubernetesQuantity, formatQuantity } from '../../../utils/kubernetesQuantity';

suite('kubernetesQuantity Tests', () => {
    suite('parseKubernetesQuantity', () => {
        suite('cores unit', () => {
            test('should parse plain numbers for cores', () => {
                assert.strictEqual(parseKubernetesQuantity('4', 'cores'), 4);
                assert.strictEqual(parseKubernetesQuantity('8', 'cores'), 8);
                assert.strictEqual(parseKubernetesQuantity('0', 'cores'), 0);
            });

            test('should parse millicores', () => {
                assert.strictEqual(parseKubernetesQuantity('100m', 'cores'), 0.1);
                assert.strictEqual(parseKubernetesQuantity('500m', 'cores'), 0.5);
                assert.strictEqual(parseKubernetesQuantity('1000m', 'cores'), 1);
                assert.strictEqual(parseKubernetesQuantity('250m', 'cores'), 0.25);
            });

            test('should parse decimal cores', () => {
                assert.strictEqual(parseKubernetesQuantity('2.5', 'cores'), 2.5);
                assert.strictEqual(parseKubernetesQuantity('0.5', 'cores'), 0.5);
            });

            test('should handle empty string for cores', () => {
                assert.ok(isNaN(parseKubernetesQuantity('', 'cores')));
            });

            test('should handle invalid format for cores', () => {
                assert.strictEqual(parseKubernetesQuantity('invalid', 'cores'), NaN);
            });
        });

        suite('bytes unit', () => {
            test('should parse plain numbers for bytes', () => {
                assert.strictEqual(parseKubernetesQuantity('1024', 'bytes'), 1024);
                assert.strictEqual(parseKubernetesQuantity('0', 'bytes'), 0);
            });

            test('should parse Ki suffix', () => {
                assert.strictEqual(parseKubernetesQuantity('1Ki', 'bytes'), 1024);
                assert.strictEqual(parseKubernetesQuantity('2Ki', 'bytes'), 2048);
                assert.strictEqual(parseKubernetesQuantity('512Ki', 'bytes'), 512 * 1024);
            });

            test('should parse Mi suffix', () => {
                assert.strictEqual(parseKubernetesQuantity('1Mi', 'bytes'), 1024 ** 2);
                assert.strictEqual(parseKubernetesQuantity('2Mi', 'bytes'), 2 * (1024 ** 2));
            });

            test('should parse Gi suffix', () => {
                assert.strictEqual(parseKubernetesQuantity('1Gi', 'bytes'), 1024 ** 3);
                assert.strictEqual(parseKubernetesQuantity('8Gi', 'bytes'), 8 * (1024 ** 3));
            });

            test('should parse Ti suffix', () => {
                assert.strictEqual(parseKubernetesQuantity('1Ti', 'bytes'), 1024 ** 4);
                assert.strictEqual(parseKubernetesQuantity('2Ti', 'bytes'), 2 * (1024 ** 4));
            });

            test('should parse Pi suffix', () => {
                assert.strictEqual(parseKubernetesQuantity('1Pi', 'bytes'), 1024 ** 5);
            });

            test('should parse Ei suffix', () => {
                assert.strictEqual(parseKubernetesQuantity('1Ei', 'bytes'), 1024 ** 6);
            });

            test('should parse decimal values with suffixes', () => {
                assert.strictEqual(parseKubernetesQuantity('1.5Gi', 'bytes'), 1.5 * (1024 ** 3));
                assert.strictEqual(parseKubernetesQuantity('0.5Mi', 'bytes'), 0.5 * (1024 ** 2));
            });

            test('should handle empty string for bytes', () => {
                assert.strictEqual(parseKubernetesQuantity('', 'bytes'), 0);
            });

            test('should handle invalid format for bytes', () => {
                assert.strictEqual(parseKubernetesQuantity('invalid', 'bytes'), 0);
                assert.strictEqual(parseKubernetesQuantity('10X', 'bytes'), 0); // Invalid suffix
            });
        });

        suite('count unit', () => {
            test('should parse plain numbers for counts', () => {
                assert.strictEqual(parseKubernetesQuantity('10', 'count'), 10);
                assert.strictEqual(parseKubernetesQuantity('0', 'count'), 0);
                assert.strictEqual(parseKubernetesQuantity('100', 'count'), 100);
            });

            test('should parse decimal counts as integers', () => {
                assert.strictEqual(parseKubernetesQuantity('10.5', 'count'), 10);
                assert.strictEqual(parseKubernetesQuantity('99.9', 'count'), 99);
            });

            test('should handle empty string for counts', () => {
                assert.ok(isNaN(parseKubernetesQuantity('', 'count')));
            });

            test('should handle invalid format for counts', () => {
                assert.strictEqual(parseKubernetesQuantity('invalid', 'count'), NaN);
            });
        });
    });

    suite('formatQuantity', () => {
        suite('cores unit', () => {
            test('should format cores with 2 decimals', () => {
                assert.strictEqual(formatQuantity(2.5, 'cores'), '2.50 cores');
                assert.strictEqual(formatQuantity(4, 'cores'), '4.00 cores');
                assert.strictEqual(formatQuantity(0.1, 'cores'), '0.10 cores');
                assert.strictEqual(formatQuantity(8.75, 'cores'), '8.75 cores');
            });

            test('should handle zero cores', () => {
                assert.strictEqual(formatQuantity(0, 'cores'), '0.00 cores');
            });

            test('should handle very small cores', () => {
                assert.strictEqual(formatQuantity(0.001, 'cores'), '0.00 cores');
                assert.strictEqual(formatQuantity(0.01, 'cores'), '0.01 cores');
            });
        });

        suite('bytes unit', () => {
            test('should format bytes in B unit', () => {
                assert.strictEqual(formatQuantity(512, 'bytes'), '512.00 B');
                assert.strictEqual(formatQuantity(0, 'bytes'), '0.00 B');
            });

            test('should format bytes in KiB unit', () => {
                assert.strictEqual(formatQuantity(1024, 'bytes'), '1.00 KiB');
                assert.strictEqual(formatQuantity(2048, 'bytes'), '2.00 KiB');
                assert.strictEqual(formatQuantity(1536, 'bytes'), '1.50 KiB');
            });

            test('should format bytes in MiB unit', () => {
                assert.strictEqual(formatQuantity(1024 * 1024, 'bytes'), '1.00 MiB');
                assert.strictEqual(formatQuantity(2 * 1024 * 1024, 'bytes'), '2.00 MiB');
            });

            test('should format bytes in GiB unit', () => {
                assert.strictEqual(formatQuantity(1024 ** 3, 'bytes'), '1.00 GiB');
                assert.strictEqual(formatQuantity(8 * (1024 ** 3), 'bytes'), '8.00 GiB');
            });

            test('should format bytes in TiB unit', () => {
                assert.strictEqual(formatQuantity(1024 ** 4, 'bytes'), '1.00 TiB');
            });

            test('should handle very large bytes', () => {
                const largeValue = 1024 ** 4 * 2;
                assert.strictEqual(formatQuantity(largeValue, 'bytes'), '2.00 TiB');
            });

            test('should handle values just below unit thresholds', () => {
                assert.strictEqual(formatQuantity(1023, 'bytes'), '1023.00 B');
                // 1024 * 1024 - 1 = 1048575 bytes = 1023.999... KiB, rounds to 1024.00 KiB
                const result = formatQuantity(1024 * 1024 - 1, 'bytes');
                assert.ok(result === '1023.00 KiB' || result === '1024.00 KiB', `Expected 1023.00 KiB or 1024.00 KiB, got ${result}`);
            });
        });

        suite('count unit', () => {
            test('should format counts as integers', () => {
                assert.strictEqual(formatQuantity(10, 'count'), '10');
                assert.strictEqual(formatQuantity(0, 'count'), '0');
                assert.strictEqual(formatQuantity(100, 'count'), '100');
            });

            test('should format decimal counts as strings', () => {
                assert.strictEqual(formatQuantity(10.5, 'count'), '10.5');
                assert.strictEqual(formatQuantity(99.9, 'count'), '99.9');
            });
        });
    });
});

