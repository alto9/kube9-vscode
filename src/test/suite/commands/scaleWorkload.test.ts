import * as assert from 'assert';
import { validateReplicaCount } from '../../../commands/scaleWorkload';

/**
 * Unit tests for replica count validation function.
 * Tests validation of both valid and invalid replica count inputs,
 * ensuring the function follows VSCode's validation pattern (undefined = valid).
 */
suite('scaleWorkload Validation Tests', () => {
    suite('validateReplicaCount', () => {
        suite('Invalid Input - Empty/Whitespace', () => {
            test('should return error for empty string', () => {
                const result = validateReplicaCount('');
                assert.strictEqual(typeof result, 'string', 'Should return error string');
                assert.ok(result !== undefined, 'Should not return undefined');
                assert.ok(result!.includes('required'), 'Error should mention required');
            });

            test('should return error for whitespace-only string', () => {
                const result = validateReplicaCount('   ');
                assert.strictEqual(typeof result, 'string', 'Should return error string');
                assert.ok(result !== undefined, 'Should not return undefined');
                assert.ok(result!.includes('required'), 'Error should mention required');
            });

            test('should return error for tab-only string', () => {
                const result = validateReplicaCount('\t');
                assert.strictEqual(typeof result, 'string', 'Should return error string');
                assert.ok(result !== undefined, 'Should not return undefined');
            });

            test('should return error for newline-only string', () => {
                const result = validateReplicaCount('\n');
                assert.strictEqual(typeof result, 'string', 'Should return error string');
                assert.ok(result !== undefined, 'Should not return undefined');
            });
        });

        suite('Invalid Input - Non-Numeric', () => {
            test('should return error for alphabetic string', () => {
                const result = validateReplicaCount('abc');
                assert.strictEqual(typeof result, 'string', 'Should return error string');
                assert.ok(result !== undefined, 'Should not return undefined');
                assert.ok(result!.includes('number'), 'Error should mention number');
            });

            test('should return error for mixed alphanumeric string', () => {
                const result = validateReplicaCount('123abc');
                assert.strictEqual(typeof result, 'string', 'Should return error string');
                assert.ok(result !== undefined, 'Should not return undefined');
            });

            test('should return error for special characters', () => {
                const result = validateReplicaCount('@#$');
                assert.strictEqual(typeof result, 'string', 'Should return error string');
                assert.ok(result !== undefined, 'Should not return undefined');
            });

            test('should return error for decimal number', () => {
                const result = validateReplicaCount('3.14');
                assert.strictEqual(typeof result, 'string', 'Should return error string');
                assert.ok(result !== undefined, 'Should not return undefined');
            });
        });

        suite('Invalid Input - Out of Range', () => {
            test('should return error for negative values', () => {
                const result = validateReplicaCount('-5');
                assert.strictEqual(typeof result, 'string', 'Should return error string');
                assert.ok(result !== undefined, 'Should not return undefined');
                assert.ok(result!.includes('positive') || result!.includes('0 or greater'), 'Error should mention positive or 0 or greater');
            });

            test('should return error for values greater than 1000', () => {
                const result = validateReplicaCount('1001');
                assert.strictEqual(typeof result, 'string', 'Should return error string');
                assert.ok(result !== undefined, 'Should not return undefined');
                assert.ok(result!.includes('1000') || result!.includes('exceed'), 'Error should mention 1000 or exceed');
            });

            test('should return error for very large values', () => {
                const result = validateReplicaCount('10000');
                assert.strictEqual(typeof result, 'string', 'Should return error string');
                assert.ok(result !== undefined, 'Should not return undefined');
            });
        });

        suite('Valid Input', () => {
            test('should return undefined for zero', () => {
                const result = validateReplicaCount('0');
                assert.strictEqual(result, undefined, 'Should return undefined for valid input');
            });

            test('should return undefined for one', () => {
                const result = validateReplicaCount('1');
                assert.strictEqual(result, undefined, 'Should return undefined for valid input');
            });

            test('should return undefined for typical value', () => {
                const result = validateReplicaCount('500');
                assert.strictEqual(result, undefined, 'Should return undefined for valid input');
            });

            test('should return undefined for maximum value (1000)', () => {
                const result = validateReplicaCount('1000');
                assert.strictEqual(result, undefined, 'Should return undefined for valid input');
            });

            test('should return undefined for small values', () => {
                const result = validateReplicaCount('2');
                assert.strictEqual(result, undefined, 'Should return undefined for valid input');
            });

            test('should return undefined for medium values', () => {
                const result = validateReplicaCount('10');
                assert.strictEqual(result, undefined, 'Should return undefined for valid input');
            });

            test('should return undefined for large valid values', () => {
                const result = validateReplicaCount('999');
                assert.strictEqual(result, undefined, 'Should return undefined for valid input');
            });
        });

        suite('Edge Cases', () => {
            test('should handle leading zeros', () => {
                const result = validateReplicaCount('007');
                assert.strictEqual(result, undefined, 'Should return undefined for valid input (leading zeros parsed correctly)');
            });

            test('should handle trailing whitespace after valid number', () => {
                // parseInt('5   ', 10) returns 5, so this should be valid
                const result = validateReplicaCount('5   ');
                assert.strictEqual(result, undefined, 'Should return undefined (parseInt handles trailing whitespace)');
            });

            test('should handle leading whitespace before valid number', () => {
                // parseInt('  5', 10) returns 5, so this should be valid
                const result = validateReplicaCount('  5');
                assert.strictEqual(result, undefined, 'Should return undefined (parseInt handles leading whitespace)');
            });

            test('should reject partial decimal input', () => {
                const result = validateReplicaCount('5.');
                assert.strictEqual(typeof result, 'string', 'Should return error string');
                assert.ok(result !== undefined, 'Should not return undefined');
            });
        });

        suite('VSCode Validation Pattern', () => {
            test('should return undefined for valid input (VSCode pattern)', () => {
                const result = validateReplicaCount('10');
                assert.strictEqual(result, undefined, 'VSCode expects undefined for valid input');
            });

            test('should return string for invalid input (VSCode pattern)', () => {
                const result = validateReplicaCount('invalid');
                assert.strictEqual(typeof result, 'string', 'VSCode expects string for invalid input');
                assert.ok(result !== undefined, 'Should not be undefined');
                assert.ok(result!.length > 0, 'Error message should not be empty');
            });
        });
    });
});

