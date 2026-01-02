import * as assert from 'assert';
import { ErrorMetrics } from '../../../errors/ErrorMetrics';
import { ErrorType } from '../../../errors/types';

suite('ErrorMetrics Test Suite', () => {
    setup(() => {
        // Reset the singleton before each test
        ErrorMetrics.reset();
    });

    teardown(() => {
        // Clean up after each test
        ErrorMetrics.reset();
    });

    suite('Singleton Pattern', () => {
        test('Should return same instance on multiple getInstance calls', () => {
            const instance1 = ErrorMetrics.getInstance();
            const instance2 = ErrorMetrics.getInstance();
            
            assert.strictEqual(instance1, instance2, 'getInstance should return the same instance');
        });

        test('Should create new instance after static reset', () => {
            const instance1 = ErrorMetrics.getInstance();
            instance1.recordError(ErrorType.CONNECTION);
            ErrorMetrics.reset();
            const instance2 = ErrorMetrics.getInstance();
            
            assert.notStrictEqual(instance1, instance2, 'reset() should create a new instance');
            // New instance should have empty counts
            assert.strictEqual(instance2.getErrorCount(ErrorType.CONNECTION), 0, 'New instance should have empty counts');
        });
    });

    suite('recordError() Method', () => {
        test('Should increment count for error type', () => {
            const metrics = ErrorMetrics.getInstance();
            
            metrics.recordError(ErrorType.CONNECTION);
            
            assert.strictEqual(metrics.getErrorCount(ErrorType.CONNECTION), 1, 'Should increment count to 1');
        });

        test('Should increment count multiple times', () => {
            const metrics = ErrorMetrics.getInstance();
            
            metrics.recordError(ErrorType.CONNECTION);
            metrics.recordError(ErrorType.CONNECTION);
            metrics.recordError(ErrorType.CONNECTION);
            
            assert.strictEqual(metrics.getErrorCount(ErrorType.CONNECTION), 3, 'Should increment count to 3');
        });

        test('Should track multiple error types independently', () => {
            const metrics = ErrorMetrics.getInstance();
            
            metrics.recordError(ErrorType.CONNECTION);
            metrics.recordError(ErrorType.RBAC);
            metrics.recordError(ErrorType.CONNECTION);
            metrics.recordError(ErrorType.API);
            
            assert.strictEqual(metrics.getErrorCount(ErrorType.CONNECTION), 2, 'CONNECTION should have count 2');
            assert.strictEqual(metrics.getErrorCount(ErrorType.RBAC), 1, 'RBAC should have count 1');
            assert.strictEqual(metrics.getErrorCount(ErrorType.API), 1, 'API should have count 1');
        });

        test('Should record all ErrorType enum values', () => {
            const metrics = ErrorMetrics.getInstance();
            
            metrics.recordError(ErrorType.CONNECTION);
            metrics.recordError(ErrorType.RBAC);
            metrics.recordError(ErrorType.NOT_FOUND);
            metrics.recordError(ErrorType.API);
            metrics.recordError(ErrorType.TIMEOUT);
            metrics.recordError(ErrorType.VALIDATION);
            metrics.recordError(ErrorType.UNEXPECTED);
            
            assert.strictEqual(metrics.getErrorCount(ErrorType.CONNECTION), 1);
            assert.strictEqual(metrics.getErrorCount(ErrorType.RBAC), 1);
            assert.strictEqual(metrics.getErrorCount(ErrorType.NOT_FOUND), 1);
            assert.strictEqual(metrics.getErrorCount(ErrorType.API), 1);
            assert.strictEqual(metrics.getErrorCount(ErrorType.TIMEOUT), 1);
            assert.strictEqual(metrics.getErrorCount(ErrorType.VALIDATION), 1);
            assert.strictEqual(metrics.getErrorCount(ErrorType.UNEXPECTED), 1);
        });
    });

    suite('getErrorCount() Method', () => {
        test('Should return 0 for unrecorded error type', () => {
            const metrics = ErrorMetrics.getInstance();
            
            assert.strictEqual(metrics.getErrorCount(ErrorType.CONNECTION), 0, 'Should return 0 for unrecorded type');
        });

        test('Should return correct count for recorded error type', () => {
            const metrics = ErrorMetrics.getInstance();
            
            metrics.recordError(ErrorType.RBAC);
            metrics.recordError(ErrorType.RBAC);
            
            assert.strictEqual(metrics.getErrorCount(ErrorType.RBAC), 2, 'Should return correct count');
        });

        test('Should return 0 after reset', () => {
            const metrics = ErrorMetrics.getInstance();
            
            metrics.recordError(ErrorType.API);
            assert.strictEqual(metrics.getErrorCount(ErrorType.API), 1, 'Should have count 1 before reset');
            
            metrics.reset();
            assert.strictEqual(metrics.getErrorCount(ErrorType.API), 0, 'Should return 0 after reset');
        });
    });

    suite('getTotalErrors() Method', () => {
        test('Should return 0 when no errors recorded', () => {
            const metrics = ErrorMetrics.getInstance();
            
            assert.strictEqual(metrics.getTotalErrors(), 0, 'Should return 0 when no errors recorded');
        });

        test('Should sum all error counts', () => {
            const metrics = ErrorMetrics.getInstance();
            
            metrics.recordError(ErrorType.CONNECTION);
            metrics.recordError(ErrorType.CONNECTION);
            metrics.recordError(ErrorType.RBAC);
            metrics.recordError(ErrorType.API);
            metrics.recordError(ErrorType.API);
            metrics.recordError(ErrorType.API);
            
            assert.strictEqual(metrics.getTotalErrors(), 6, 'Should sum all counts (2+1+3=6)');
        });

        test('Should return 0 after reset', () => {
            const metrics = ErrorMetrics.getInstance();
            
            metrics.recordError(ErrorType.TIMEOUT);
            metrics.recordError(ErrorType.VALIDATION);
            assert.strictEqual(metrics.getTotalErrors(), 2, 'Should have total 2 before reset');
            
            metrics.reset();
            assert.strictEqual(metrics.getTotalErrors(), 0, 'Should return 0 after reset');
        });
    });

    suite('reset() Instance Method', () => {
        test('Should clear all error counts', () => {
            const metrics = ErrorMetrics.getInstance();
            
            metrics.recordError(ErrorType.CONNECTION);
            metrics.recordError(ErrorType.RBAC);
            metrics.recordError(ErrorType.API);
            
            assert.strictEqual(metrics.getTotalErrors(), 3, 'Should have 3 errors before reset');
            
            metrics.reset();
            
            assert.strictEqual(metrics.getTotalErrors(), 0, 'Should have 0 errors after reset');
            assert.strictEqual(metrics.getErrorCount(ErrorType.CONNECTION), 0, 'CONNECTION count should be 0');
            assert.strictEqual(metrics.getErrorCount(ErrorType.RBAC), 0, 'RBAC count should be 0');
            assert.strictEqual(metrics.getErrorCount(ErrorType.API), 0, 'API count should be 0');
        });

        test('Should allow recording errors after reset', () => {
            const metrics = ErrorMetrics.getInstance();
            
            metrics.recordError(ErrorType.NOT_FOUND);
            metrics.reset();
            metrics.recordError(ErrorType.UNEXPECTED);
            
            assert.strictEqual(metrics.getErrorCount(ErrorType.NOT_FOUND), 0, 'NOT_FOUND should be 0 after reset');
            assert.strictEqual(metrics.getErrorCount(ErrorType.UNEXPECTED), 1, 'UNEXPECTED should be 1 after reset');
        });
    });

    suite('getSummary() Method', () => {
        test('Should return empty Record when no errors recorded', () => {
            const metrics = ErrorMetrics.getInstance();
            
            const summary = metrics.getSummary();
            
            assert.ok(typeof summary === 'object', 'Should return an object');
            assert.strictEqual(Object.keys(summary).length, 0, 'Should return empty Record');
        });

        test('Should return Record with error type strings as keys', () => {
            const metrics = ErrorMetrics.getInstance();
            
            metrics.recordError(ErrorType.CONNECTION);
            metrics.recordError(ErrorType.CONNECTION);
            metrics.recordError(ErrorType.RBAC);
            
            const summary = metrics.getSummary();
            
            assert.ok(typeof summary === 'object', 'Should return an object');
            assert.strictEqual(summary[ErrorType.CONNECTION], 2, 'CONNECTION should have count 2');
            assert.strictEqual(summary[ErrorType.RBAC], 1, 'RBAC should have count 1');
        });

        test('Should return Record with all recorded error types', () => {
            const metrics = ErrorMetrics.getInstance();
            
            metrics.recordError(ErrorType.CONNECTION);
            metrics.recordError(ErrorType.RBAC);
            metrics.recordError(ErrorType.NOT_FOUND);
            metrics.recordError(ErrorType.API);
            metrics.recordError(ErrorType.TIMEOUT);
            metrics.recordError(ErrorType.VALIDATION);
            metrics.recordError(ErrorType.UNEXPECTED);
            
            const summary = metrics.getSummary();
            
            assert.strictEqual(Object.keys(summary).length, 7, 'Should have 7 error types');
            assert.strictEqual(summary[ErrorType.CONNECTION], 1);
            assert.strictEqual(summary[ErrorType.RBAC], 1);
            assert.strictEqual(summary[ErrorType.NOT_FOUND], 1);
            assert.strictEqual(summary[ErrorType.API], 1);
            assert.strictEqual(summary[ErrorType.TIMEOUT], 1);
            assert.strictEqual(summary[ErrorType.VALIDATION], 1);
            assert.strictEqual(summary[ErrorType.UNEXPECTED], 1);
        });

        test('Should return empty Record after reset', () => {
            const metrics = ErrorMetrics.getInstance();
            
            metrics.recordError(ErrorType.API);
            metrics.recordError(ErrorType.TIMEOUT);
            
            let summary = metrics.getSummary();
            assert.strictEqual(Object.keys(summary).length, 2, 'Should have 2 types before reset');
            
            metrics.reset();
            summary = metrics.getSummary();
            assert.strictEqual(Object.keys(summary).length, 0, 'Should return empty Record after reset');
        });

        test('Should return Record with correct number values', () => {
            const metrics = ErrorMetrics.getInstance();
            
            metrics.recordError(ErrorType.CONNECTION);
            metrics.recordError(ErrorType.CONNECTION);
            metrics.recordError(ErrorType.CONNECTION);
            metrics.recordError(ErrorType.RBAC);
            
            const summary = metrics.getSummary();
            
            assert.strictEqual(typeof summary[ErrorType.CONNECTION], 'number', 'CONNECTION value should be number');
            assert.strictEqual(typeof summary[ErrorType.RBAC], 'number', 'RBAC value should be number');
            assert.strictEqual(summary[ErrorType.CONNECTION], 3, 'CONNECTION should be 3');
            assert.strictEqual(summary[ErrorType.RBAC], 1, 'RBAC should be 1');
        });
    });
});

