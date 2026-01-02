import * as assert from 'assert';
import * as vscode from '../../mocks/vscode';
import { OutputPanelLogger } from '../../../errors/OutputPanelLogger';
import { ErrorType, ErrorSeverity, ErrorDetails } from '../../../errors/types';

suite('OutputPanelLogger Test Suite', () => {
    setup(() => {
        // Reset the singleton before each test
        OutputPanelLogger.reset();
    });

    teardown(() => {
        // Clean up after each test
        OutputPanelLogger.reset();
    });

    test('Should return same instance on multiple getInstance calls', () => {
        const instance1 = OutputPanelLogger.getInstance();
        const instance2 = OutputPanelLogger.getInstance();
        
        assert.strictEqual(instance1, instance2, 'getInstance should return the same instance');
    });

    test('Should create output channel with correct name', () => {
        OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9');
        
        assert.ok(outputChannel, 'Output channel should be created');
        assert.strictEqual(outputChannel.name, 'kube9', 'Output channel should be named "kube9"');
    });

    test('log() should format message with timestamp and level prefix', () => {
        const logger = OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
        
        logger.log('Test message', 'info');
        
        const content = outputChannel._getContent();
        assert.ok(content.includes('[INFO]'), 'Should include level prefix');
        assert.ok(content.includes('Test message'), 'Should include message');
        // Check for ISO timestamp format (YYYY-MM-DD)
        assert.ok(/\d{4}-\d{2}-\d{2}/.test(content), 'Should include ISO timestamp');
    });

    test('log() should use default level "info" when not specified', () => {
        const logger = OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
        
        logger.log('Test message');
        
        const content = outputChannel._getContent();
        assert.ok(content.includes('[INFO]'), 'Should default to INFO level');
    });

    test('log() should format different log levels correctly', () => {
        const logger = OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
        
        logger.log('Error message', 'error');
        logger.log('Warning message', 'warn');
        logger.log('Debug message', 'debug');
        
        const content = outputChannel._getContent();
        assert.ok(content.includes('[ERROR]'), 'Should include ERROR level');
        assert.ok(content.includes('[WARN]'), 'Should include WARN level');
        assert.ok(content.includes('[DEBUG]'), 'Should include DEBUG level');
    });

    test('logError() should format ErrorDetails with separators', () => {
        const logger = OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
        
        const details: ErrorDetails = {
            type: ErrorType.CONNECTION,
            severity: ErrorSeverity.ERROR,
            message: 'Failed to connect to cluster'
        };
        
        logger.logError(details);
        
        const content = outputChannel._getContent();
        assert.ok(content.includes('='.repeat(80)), 'Should include separator lines');
        assert.ok(content.includes('ERROR: Failed to connect to cluster'), 'Should include error message');
        assert.ok(content.includes('Type: CONNECTION'), 'Should include error type');
        assert.ok(content.includes('Severity: error'), 'Should include severity');
    });

    test('logError() should include timestamp in ISO format', () => {
        const logger = OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
        
        const details: ErrorDetails = {
            type: ErrorType.API,
            severity: ErrorSeverity.ERROR,
            message: 'API error occurred'
        };
        
        logger.logError(details);
        
        const content = outputChannel._getContent();
        // Check for ISO timestamp format (YYYY-MM-DDTHH:mm:ss.sssZ)
        assert.ok(/Timestamp: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(content), 'Should include ISO timestamp');
    });

    test('logError() should include status code when present', () => {
        const logger = OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
        
        const details: ErrorDetails = {
            type: ErrorType.API,
            severity: ErrorSeverity.ERROR,
            message: 'API error',
            statusCode: 404
        };
        
        logger.logError(details);
        
        const content = outputChannel._getContent();
        assert.ok(content.includes('Status Code: 404'), 'Should include status code');
    });

    test('logError() should not include status code when absent', () => {
        const logger = OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
        
        const details: ErrorDetails = {
            type: ErrorType.CONNECTION,
            severity: ErrorSeverity.ERROR,
            message: 'Connection error'
        };
        
        logger.logError(details);
        
        const content = outputChannel._getContent();
        assert.ok(!content.includes('Status Code:'), 'Should not include status code when absent');
    });

    test('logError() should format context as JSON when present', () => {
        const logger = OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
        
        const details: ErrorDetails = {
            type: ErrorType.RBAC,
            severity: ErrorSeverity.WARNING,
            message: 'Permission denied',
            context: {
                cluster: 'test-cluster',
                namespace: 'default',
                resourceType: 'Pod',
                resourceName: 'test-pod'
            }
        };
        
        logger.logError(details);
        
        const content = outputChannel._getContent();
        assert.ok(content.includes('Context:'), 'Should include context label');
        assert.ok(content.includes('"cluster": "test-cluster"'), 'Should include formatted context JSON');
        assert.ok(content.includes('"namespace": "default"'), 'Should include namespace in context');
    });

    test('logError() should not include context section when absent', () => {
        const logger = OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
        
        const details: ErrorDetails = {
            type: ErrorType.TIMEOUT,
            severity: ErrorSeverity.ERROR,
            message: 'Operation timed out'
        };
        
        logger.logError(details);
        
        const content = outputChannel._getContent();
        assert.ok(!content.includes('Context:'), 'Should not include context section when absent');
    });

    test('logError() should include technical details when present', () => {
        const logger = OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
        
        const details: ErrorDetails = {
            type: ErrorType.API,
            severity: ErrorSeverity.ERROR,
            message: 'API error',
            technicalDetails: 'Connection timeout after 30 seconds'
        };
        
        logger.logError(details);
        
        const content = outputChannel._getContent();
        assert.ok(content.includes('Technical Details:'), 'Should include technical details label');
        assert.ok(content.includes('Connection timeout after 30 seconds'), 'Should include technical details');
    });

    test('logError() should not include technical details section when absent', () => {
        const logger = OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
        
        const details: ErrorDetails = {
            type: ErrorType.VALIDATION,
            severity: ErrorSeverity.WARNING,
            message: 'Validation error'
        };
        
        logger.logError(details);
        
        const content = outputChannel._getContent();
        assert.ok(!content.includes('Technical Details:'), 'Should not include technical details section when absent');
    });

    test('logError() should include stack trace when error object present', () => {
        const logger = OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
        
        const error = new Error('Test error');
        error.stack = 'Error: Test error\n    at test.js:1:1';
        
        const details: ErrorDetails = {
            type: ErrorType.UNEXPECTED,
            severity: ErrorSeverity.ERROR,
            message: 'Unexpected error',
            error: error
        };
        
        logger.logError(details);
        
        const content = outputChannel._getContent();
        assert.ok(content.includes('Stack Trace:'), 'Should include stack trace label');
        assert.ok(content.includes('Error: Test error'), 'Should include stack trace content');
    });

    test('logError() should not include stack trace section when error.stack absent', () => {
        const logger = OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
        
        const error = new Error('Test error');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (error as any).stack;
        
        const details: ErrorDetails = {
            type: ErrorType.UNEXPECTED,
            severity: ErrorSeverity.ERROR,
            message: 'Unexpected error',
            error: error
        };
        
        logger.logError(details);
        
        const content = outputChannel._getContent();
        assert.ok(!content.includes('Stack Trace:'), 'Should not include stack trace section when stack absent');
    });

    test('logError() should format complete error details correctly', () => {
        const logger = OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
        
        const error = new Error('Complete error');
        error.stack = 'Error: Complete error\n    at test.js:1:1';
        
        const details: ErrorDetails = {
            type: ErrorType.NOT_FOUND,
            severity: ErrorSeverity.WARNING,
            message: 'Resource not found',
            statusCode: 404,
            context: {
                cluster: 'test-cluster',
                namespace: 'default',
                resourceType: 'Pod',
                resourceName: 'missing-pod'
            },
            technicalDetails: 'Resource was deleted or never existed',
            error: error
        };
        
        logger.logError(details);
        
        const content = outputChannel._getContent();
        // Verify all sections are present
        assert.ok(content.includes('ERROR: Resource not found'), 'Should include error message');
        assert.ok(content.includes('Type: NOT_FOUND'), 'Should include type');
        assert.ok(content.includes('Severity: warning'), 'Should include severity');
        assert.ok(content.includes('Status Code: 404'), 'Should include status code');
        assert.ok(content.includes('Context:'), 'Should include context');
        assert.ok(content.includes('Technical Details:'), 'Should include technical details');
        assert.ok(content.includes('Stack Trace:'), 'Should include stack trace');
        // Verify separators
        const separatorCount = (content.match(/={80}/g) || []).length;
        assert.ok(separatorCount >= 2, 'Should include at least 2 separator lines');
    });

    test('show() should call outputChannel.show()', () => {
        const logger = OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { show(): void };
        let showCalled = false;
        
        // Override show method to track calls
        const originalShow = outputChannel.show;
        outputChannel.show = () => {
            showCalled = true;
            originalShow.call(outputChannel);
        };
        
        logger.show();
        
        assert.ok(showCalled, 'show() should call outputChannel.show()');
    });

    test('dispose() should call outputChannel.dispose()', () => {
        const logger = OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { dispose(): void };
        let disposeCalled = false;
        
        // Override dispose method to track calls
        const originalDispose = outputChannel.dispose;
        outputChannel.dispose = () => {
            disposeCalled = true;
            originalDispose.call(outputChannel);
        };
        
        logger.dispose();
        
        assert.ok(disposeCalled, 'dispose() should call outputChannel.dispose()');
    });

    test('reset() should clear singleton instance', () => {
        const instance1 = OutputPanelLogger.getInstance();
        OutputPanelLogger.reset();
        const instance2 = OutputPanelLogger.getInstance();
        
        assert.notStrictEqual(instance1, instance2, 'reset() should create a new instance');
    });

    test('reset() should dispose existing instance', () => {
        OutputPanelLogger.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { dispose(): void };
        let disposeCalled = false;
        
        // Override dispose method to track calls
        const originalDispose = outputChannel.dispose;
        outputChannel.dispose = () => {
            disposeCalled = true;
            originalDispose.call(outputChannel);
        };
        
        OutputPanelLogger.reset();
        
        assert.ok(disposeCalled, 'reset() should dispose existing instance');
    });
});

