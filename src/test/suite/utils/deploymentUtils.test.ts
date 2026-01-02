import * as assert from 'assert';
import {
    parseResourceValue,
    calculateAge,
    calculateRelativeTime,
    parseIntOrPercent,
    extractImageTag
} from '../../../utils/deploymentUtils';

suite('deploymentUtils Tests', () => {
    suite('parseResourceValue', () => {
        suite('CPU type', () => {
            test('should parse millicores', () => {
                const result = parseResourceValue('100m', 'cpu');
                assert.strictEqual(result.value, '0.10 cores');
                assert.strictEqual(result.raw, 0.1);
            });

            test('should parse cores', () => {
                const result = parseResourceValue('2', 'cpu');
                assert.strictEqual(result.value, '2.00 cores');
                assert.strictEqual(result.raw, 2);
            });

            test('should parse decimal cores', () => {
                const result = parseResourceValue('2.5', 'cpu');
                assert.strictEqual(result.value, '2.50 cores');
                assert.strictEqual(result.raw, 2.5);
            });

            test('should handle number input', () => {
                const result = parseResourceValue(4, 'cpu');
                assert.strictEqual(result.value, '4.00 cores');
                assert.strictEqual(result.raw, 4);
            });

            test('should handle undefined', () => {
                const result = parseResourceValue(undefined as unknown as string | number, 'cpu');
                assert.strictEqual(result.value, '0');
                assert.strictEqual(result.raw, 0);
            });

            test('should handle null', () => {
                const result = parseResourceValue(null as unknown as string | number, 'cpu');
                assert.strictEqual(result.value, '0');
                assert.strictEqual(result.raw, 0);
            });

            test('should handle empty string', () => {
                const result = parseResourceValue('', 'cpu');
                assert.strictEqual(result.value, '0');
                assert.strictEqual(result.raw, 0);
            });
        });

        suite('memory type', () => {
            test('should parse Mi suffix', () => {
                const result = parseResourceValue('128Mi', 'memory');
                assert.ok(result.value.includes('MiB'));
                assert.strictEqual(result.raw, 128 * (1024 ** 2));
            });

            test('should parse Gi suffix', () => {
                const result = parseResourceValue('1Gi', 'memory');
                assert.ok(result.value.includes('GiB'));
                assert.strictEqual(result.raw, 1024 ** 3);
            });

            test('should parse plain bytes', () => {
                const result = parseResourceValue('1024', 'memory');
                assert.ok(result.value.includes('KiB'));
                assert.strictEqual(result.raw, 1024);
            });

            test('should handle number input', () => {
                const result = parseResourceValue(1024, 'memory');
                assert.ok(result.value.includes('KiB'));
                assert.strictEqual(result.raw, 1024);
            });

            test('should handle undefined', () => {
                const result = parseResourceValue(undefined as unknown as string | number, 'memory');
                assert.strictEqual(result.value, '0');
                assert.strictEqual(result.raw, 0);
            });

            test('should handle null', () => {
                const result = parseResourceValue(null as unknown as string | number, 'memory');
                assert.strictEqual(result.value, '0');
                assert.strictEqual(result.raw, 0);
            });

            test('should handle empty string', () => {
                const result = parseResourceValue('', 'memory');
                assert.strictEqual(result.value, '0');
                assert.strictEqual(result.raw, 0);
            });
        });
    });

    suite('calculateAge', () => {
        test('should format seconds', () => {
            const now = new Date();
            const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
            const result = calculateAge(thirtySecondsAgo.toISOString());
            assert.match(result, /^\d+s$/);
            const seconds = parseInt(result.replace('s', ''));
            assert.ok(seconds >= 25 && seconds <= 35, `Expected ~30s, got ${seconds}s`);
        });

        test('should format minutes', () => {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            const result = calculateAge(fiveMinutesAgo.toISOString());
            assert.match(result, /^\d+m$/);
            const minutes = parseInt(result.replace('m', ''));
            assert.ok(minutes >= 4 && minutes <= 6, `Expected ~5m, got ${minutes}m`);
        });

        test('should format hours', () => {
            const now = new Date();
            const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
            const result = calculateAge(threeHoursAgo.toISOString());
            assert.match(result, /^\d+h$/);
            const hours = parseInt(result.replace('h', ''));
            assert.ok(hours >= 2 && hours <= 4, `Expected ~3h, got ${hours}h`);
        });

        test('should format days', () => {
            const now = new Date();
            const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
            const result = calculateAge(twoDaysAgo.toISOString());
            assert.match(result, /^\d+d$/);
            const days = parseInt(result.replace('d', ''));
            assert.ok(days >= 1 && days <= 3, `Expected ~2d, got ${days}d`);
        });

        test('should handle invalid timestamp by returning original string', () => {
            const invalidTimestamp = 'invalid-date-string';
            const result = calculateAge(invalidTimestamp);
            assert.strictEqual(result, invalidTimestamp);
        });

        test('should handle empty string', () => {
            const result = calculateAge('');
            assert.strictEqual(result, '');
        });

        test('should handle undefined', () => {
            const result = calculateAge(undefined as unknown as string);
            assert.strictEqual(result, '');
        });

        test('should handle null', () => {
            const result = calculateAge(null as unknown as string);
            assert.strictEqual(result, '');
        });

        test('should handle future date by returning 0s', () => {
            const future = new Date(Date.now() + 1000 * 60 * 60); // 1 hour in future
            const result = calculateAge(future.toISOString());
            assert.strictEqual(result, '0s');
        });

        test('should handle very recent past (less than 1 second)', () => {
            const now = new Date();
            const veryRecent = new Date(now.getTime() - 500); // 500ms ago
            const result = calculateAge(veryRecent.toISOString());
            assert.match(result, /^\d+s$/);
            const seconds = parseInt(result.replace('s', ''));
            assert.ok(seconds === 0 || seconds === 1);
        });
    });

    suite('calculateRelativeTime', () => {
        test('should format seconds ago', () => {
            const now = new Date();
            const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
            const result = calculateRelativeTime(thirtySecondsAgo.toISOString());
            assert.match(result, /^\d+s ago$/);
        });

        test('should format minutes ago', () => {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            const result = calculateRelativeTime(fiveMinutesAgo.toISOString());
            assert.match(result, /^\d+m ago$/);
        });

        test('should format hours ago', () => {
            const now = new Date();
            const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
            const result = calculateRelativeTime(threeHoursAgo.toISOString());
            assert.match(result, /^\d+h ago$/);
        });

        test('should format days ago', () => {
            const now = new Date();
            const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
            const result = calculateRelativeTime(twoDaysAgo.toISOString());
            assert.match(result, /^\d+d ago$/);
        });

        test('should handle invalid timestamp', () => {
            const invalidTimestamp = 'invalid-date-string';
            const result = calculateRelativeTime(invalidTimestamp);
            assert.strictEqual(result, invalidTimestamp);
        });

        test('should handle empty string', () => {
            const result = calculateRelativeTime('');
            assert.strictEqual(result, '');
        });

        test('should handle undefined', () => {
            const result = calculateRelativeTime(undefined as unknown as string);
            assert.strictEqual(result, '');
        });

        test('should handle null', () => {
            const result = calculateRelativeTime(null as unknown as string);
            assert.strictEqual(result, '');
        });
    });

    suite('parseIntOrPercent', () => {
        test('should parse number', () => {
            assert.strictEqual(parseIntOrPercent(5, 10), 5);
            assert.strictEqual(parseIntOrPercent(0, 10), 0);
            assert.strictEqual(parseIntOrPercent(25, 100), 25);
        });

        test('should parse percentage string', () => {
            assert.strictEqual(parseIntOrPercent('25%', 100), 25);
            assert.strictEqual(parseIntOrPercent('50%', 100), 50);
            assert.strictEqual(parseIntOrPercent('10%', 100), 10);
            assert.strictEqual(parseIntOrPercent('33%', 10), 4); // Math.ceil(3.3) = 4
        });

        test('should parse integer string', () => {
            assert.strictEqual(parseIntOrPercent('1', 10), 1);
            assert.strictEqual(parseIntOrPercent('5', 10), 5);
            assert.strictEqual(parseIntOrPercent('0', 10), 0);
        });

        test('should handle undefined', () => {
            assert.strictEqual(parseIntOrPercent(undefined, 10), 0);
        });

        test('should handle null', () => {
            assert.strictEqual(parseIntOrPercent(null, 10), 0);
        });

        test('should handle empty string', () => {
            assert.strictEqual(parseIntOrPercent('', 10), 0);
        });

        test('should handle invalid string', () => {
            assert.strictEqual(parseIntOrPercent('invalid', 10), 0);
        });

        test('should handle decimal percentage', () => {
            assert.strictEqual(parseIntOrPercent('25.5%', 100), 26); // Math.ceil(25.5) = 26
        });

        test('should handle zero base', () => {
            assert.strictEqual(parseIntOrPercent('50%', 0), 0);
        });
    });

    suite('extractImageTag', () => {
        test('should extract image and tag', () => {
            const result = extractImageTag('nginx:1.21');
            assert.strictEqual(result.image, 'nginx');
            assert.strictEqual(result.tag, '1.21');
        });

        test('should default to latest when no tag', () => {
            const result = extractImageTag('nginx');
            assert.strictEqual(result.image, 'nginx');
            assert.strictEqual(result.tag, 'latest');
        });

        test('should handle image with registry and tag', () => {
            const result = extractImageTag('registry.example.com/nginx:1.21');
            assert.strictEqual(result.image, 'registry.example.com/nginx');
            assert.strictEqual(result.tag, '1.21');
        });

        test('should handle image with multiple colons', () => {
            const result = extractImageTag('registry:5000/image:tag');
            assert.strictEqual(result.image, 'registry:5000/image');
            assert.strictEqual(result.tag, 'tag');
        });

        test('should handle image ending with colon', () => {
            const result = extractImageTag('nginx:');
            assert.strictEqual(result.image, 'nginx');
            assert.strictEqual(result.tag, 'latest');
        });

        test('should handle empty string', () => {
            const result = extractImageTag('');
            assert.strictEqual(result.image, '');
            assert.strictEqual(result.tag, 'latest');
        });

        test('should handle undefined', () => {
            const result = extractImageTag(undefined as unknown as string);
            assert.strictEqual(result.image, '');
            assert.strictEqual(result.tag, 'latest');
        });

        test('should handle null', () => {
            const result = extractImageTag(null as unknown as string);
            assert.strictEqual(result.image, '');
            assert.strictEqual(result.tag, 'latest');
        });

        test('should handle image with port and tag', () => {
            const result = extractImageTag('registry.example.com:5000/nginx:1.21');
            assert.strictEqual(result.image, 'registry.example.com:5000/nginx');
            assert.strictEqual(result.tag, '1.21');
        });
    });
});

