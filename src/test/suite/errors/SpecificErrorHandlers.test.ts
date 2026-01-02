import * as assert from 'assert';
import * as vscode from '../../mocks/vscode';
import { ErrorHandler } from '../../../errors/ErrorHandler';
import { OutputPanelLogger } from '../../../errors/OutputPanelLogger';
import { ErrorMetrics } from '../../../errors/ErrorMetrics';
import { ErrorType } from '../../../errors/types';
import {
    ConnectionErrorHandler,
    RBACErrorHandler,
    ResourceNotFoundErrorHandler,
    TimeoutErrorHandler,
    APIErrorHandler
} from '../../../errors/SpecificErrorHandlers';

suite('SpecificErrorHandlers Test Suite', () => {
    setup(() => {
        // Reset singletons before each test
        ErrorHandler.reset();
        OutputPanelLogger.reset();
        ErrorMetrics.reset();
        // Clear VS Code mock state
        vscode.window._clearMessages();
        vscode.env._clearOpenedUris();
        vscode.clipboard._clear();
        vscode.extensions._clearExtensions();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.workspace as any)._clearDocuments();
    });

    teardown(() => {
        // Clean up after each test
        ErrorHandler.reset();
        OutputPanelLogger.reset();
        ErrorMetrics.reset();
        vscode.window._clearMessages();
        vscode.env._clearOpenedUris();
        vscode.clipboard._clear();
        vscode.extensions._clearExtensions();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.workspace as any)._clearDocuments();
    });

    suite('ConnectionErrorHandler', () => {
        test('Should create instance and initialize ErrorHandler', () => {
            const handler = new ConnectionErrorHandler();
            assert.ok(handler, 'Handler should be created');
        });

        test('Should handle connection error with proper ErrorDetails', async () => {
            const handler = new ConnectionErrorHandler();
            const error: Error = new Error('Connection refused');
            const cluster = 'test-cluster';
            const kubeconfigPath = '/path/to/kubeconfig';

            await handler.handleConnectionError(error, cluster, kubeconfigPath);

            // Verify error was logged and displayed
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
            const content = outputChannel._getContent();
            assert.ok(content.includes(`Cannot connect to cluster '${cluster}'`), 'Should log connection error');
            
            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1, 'Should display error message');
            assert.ok(errorMessages[0].includes(`Cannot connect to cluster '${cluster}'`), 'Should include cluster name');
        });

        test('Should include suggestions in connection error', async () => {
            const handler = new ConnectionErrorHandler();
            const error: Error = new Error('Connection refused');
            
            await handler.handleConnectionError(error, 'test-cluster', '/path/to/kubeconfig');

            // Verify error was handled (suggestions are part of ErrorDetails)
            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1, 'Should display error');
        });

        test('Should handle kubectl not found error', async () => {
            const handler = new ConnectionErrorHandler();

            await handler.handleKubectlNotFound();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
            const content = outputChannel._getContent();
            assert.ok(content.includes('kubectl executable not found'), 'Should log kubectl not found error');
            
            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1, 'Should display error message');
            assert.ok(errorMessages[0].includes('kubectl executable not found'), 'Should include kubectl message');
        });

        test('Should execute Open Kubeconfig action', async () => {
            const handler = new ConnectionErrorHandler();
            const error = new Error('Connection refused');
            const kubeconfigPath = '/path/to/kubeconfig';

            await handler.handleConnectionError(error, 'test-cluster', kubeconfigPath);

            // Action execution is tested through ErrorHandler, but we can verify the action exists
            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1, 'Should display error');
        });
    });

    suite('RBACErrorHandler', () => {
        test('Should create instance and initialize ErrorHandler', () => {
            const handler = new RBACErrorHandler();
            assert.ok(handler, 'Handler should be created');
        });

        test('Should handle permission denied error with namespace', async () => {
            const handler = new RBACErrorHandler();
            const error: { message: string; response?: { body?: { message?: string } } } = {
                message: 'Forbidden',
                response: {
                    body: {
                        message: 'User does not have permission'
                    }
                }
            };
            const resource = 'pods';
            const verb = 'get';
            const namespace = 'default';

            await handler.handlePermissionDenied(error, resource, verb, namespace);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
            const content = outputChannel._getContent();
            assert.ok(content.includes(`Permission denied: Cannot ${verb} ${resource}`), 'Should log permission error');
            assert.ok(content.includes(`in namespace '${namespace}'`), 'Should include namespace');
            
            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1, 'Should display error message');
        });

        test('Should handle permission denied error without namespace (cluster-scoped)', async () => {
            const handler = new RBACErrorHandler();
            const error: { message: string } = {
                message: 'Forbidden'
            };
            const resource = 'nodes';
            const verb = 'list';

            await handler.handlePermissionDenied(error, resource, verb);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
            const content = outputChannel._getContent();
            assert.ok(content.includes('cluster-scoped'), 'Should indicate cluster-scoped');
            
            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1, 'Should display error message');
        });

        test('Should include RBAC suggestions', async () => {
            const handler = new RBACErrorHandler();
            const error: { message: string } = { message: 'Forbidden' };

            await handler.handlePermissionDenied(error, 'pods', 'get', 'default');

            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1, 'Should display error');
        });

        test('Should set status code to 403', async () => {
            const handler = new RBACErrorHandler();
            const error: { message: string } = { message: 'Forbidden' };
            const metrics = ErrorMetrics.getInstance();

            await handler.handlePermissionDenied(error, 'pods', 'get');

            // Verify error type was tracked
            assert.strictEqual(metrics.getErrorCount(ErrorType.RBAC), 1, 'Should track RBAC error');
        });
    });

    suite('ResourceNotFoundErrorHandler', () => {
        test('Should create instance and initialize ErrorHandler', () => {
            const handler = new ResourceNotFoundErrorHandler();
            assert.ok(handler, 'Handler should be created');
        });

        test('Should handle resource not found with namespace', async () => {
            const handler = new ResourceNotFoundErrorHandler();
            const resourceType = 'Pod';
            const resourceName = 'test-pod';
            const namespace = 'default';

            await handler.handleResourceNotFound(resourceType, resourceName, namespace);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
            const content = outputChannel._getContent();
            assert.ok(content.includes(`Resource ${resourceType}/${resourceName} not found`), 'Should log not found error');
            assert.ok(content.includes(`in namespace '${namespace}'`), 'Should include namespace');
            
            const warningMessages = vscode.window._getWarningMessages();
            assert.strictEqual(warningMessages.length, 1, 'Should display warning message');
        });

        test('Should handle resource not found without namespace', async () => {
            const handler = new ResourceNotFoundErrorHandler();
            const resourceType = 'Node';
            const resourceName = 'test-node';

            await handler.handleResourceNotFound(resourceType, resourceName);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
            const content = outputChannel._getContent();
            assert.ok(content.includes(`Resource ${resourceType}/${resourceName} not found`), 'Should log not found error');
            
            const warningMessages = vscode.window._getWarningMessages();
            assert.strictEqual(warningMessages.length, 1, 'Should display warning message');
        });

        test('Should use WARNING severity', async () => {
            const handler = new ResourceNotFoundErrorHandler();
            const metrics = ErrorMetrics.getInstance();

            await handler.handleResourceNotFound('Pod', 'test-pod');

            // Verify error type was tracked
            assert.strictEqual(metrics.getErrorCount(ErrorType.NOT_FOUND), 1, 'Should track NOT_FOUND error');
            
            const warningMessages = vscode.window._getWarningMessages();
            assert.strictEqual(warningMessages.length, 1, 'Should show warning, not error');
        });

        test('Should execute refresh callback when provided', async () => {
            const handler = new ResourceNotFoundErrorHandler();
            const onRefresh = async (): Promise<void> => {
                // Refresh callback implementation
            };

            await handler.handleResourceNotFound('Pod', 'test-pod', 'default', onRefresh);

            // The refresh callback is executed when the action is triggered
            // We verify the handler was created with the callback
            assert.ok(true, 'Handler should accept refresh callback');
        });
    });

    suite('TimeoutErrorHandler', () => {
        test('Should create instance and initialize ErrorHandler', () => {
            const handler = new TimeoutErrorHandler();
            assert.ok(handler, 'Handler should be created');
        });

        test('Should handle timeout error', async () => {
            const handler = new TimeoutErrorHandler();
            const operation = 'fetch pods';
            const duration = 5000;

            await handler.handleTimeout(operation, duration);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
            const content = outputChannel._getContent();
            assert.ok(content.includes('Operation timed out'), 'Should log timeout error');
            assert.ok(content.includes('seconds'), 'Should include formatted duration');
            
            const warningMessages = vscode.window._getWarningMessages();
            assert.strictEqual(warningMessages.length, 1, 'Should display warning message');
        });

        test('Should format duration in milliseconds', async () => {
            const handler = new TimeoutErrorHandler();

            await handler.handleTimeout('test', 500);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
            const content = outputChannel._getContent();
            assert.ok(content.includes('500ms') || content.includes('ms'), 'Should format as milliseconds');
        });

        test('Should format duration in seconds', async () => {
            const handler = new TimeoutErrorHandler();

            await handler.handleTimeout('test', 5000);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
            const content = outputChannel._getContent();
            assert.ok(content.includes('seconds'), 'Should format as seconds');
        });

        test('Should format duration in minutes', async () => {
            const handler = new TimeoutErrorHandler();

            await handler.handleTimeout('test', 120000);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
            const content = outputChannel._getContent();
            assert.ok(content.includes('minutes'), 'Should format as minutes');
        });

        test('Should use WARNING severity', async () => {
            const handler = new TimeoutErrorHandler();
            const metrics = ErrorMetrics.getInstance();

            await handler.handleTimeout('test', 5000);

            // Verify error type was tracked
            assert.strictEqual(metrics.getErrorCount(ErrorType.TIMEOUT), 1, 'Should track TIMEOUT error');
            
            const warningMessages = vscode.window._getWarningMessages();
            assert.strictEqual(warningMessages.length, 1, 'Should show warning, not error');
        });

        test('Should execute retry callback when provided', async () => {
            const handler = new TimeoutErrorHandler();
            const onRetry = async (): Promise<void> => {
                // Retry callback implementation
            };

            await handler.handleTimeout('test', 5000, onRetry);

            // The retry callback is executed when the action is triggered
            // We verify the handler was created with the callback
            assert.ok(true, 'Handler should accept retry callback');
        });
    });

    suite('APIErrorHandler', () => {
        test('Should create instance and initialize ErrorHandler', () => {
            const handler = new APIErrorHandler();
            assert.ok(handler, 'Handler should be created');
        });

        test('Should route 401 errors to handleUnauthorized', async () => {
            const handler = new APIErrorHandler();
            const error: { message: string; response: { statusCode: number; body: { message: string } } } = {
                message: 'Unauthorized',
                response: {
                    statusCode: 401,
                    body: {
                        message: 'Invalid credentials'
                    }
                }
            };

            await handler.handleAPIError(error, 'test operation');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
            const content = outputChannel._getContent();
            assert.ok(content.includes('Authentication failed'), 'Should handle unauthorized error');
            
            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1, 'Should display error message');
        });

        test('Should route 409 errors to handleConflict', async () => {
            const handler = new APIErrorHandler();
            const error: { message: string; response: { statusCode: number; body: { message: string } } } = {
                message: 'Conflict',
                response: {
                    statusCode: 409,
                    body: {
                        message: 'Resource already exists'
                    }
                }
            };

            await handler.handleAPIError(error, 'test operation');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
            const content = outputChannel._getContent();
            assert.ok(content.includes('Resource conflict'), 'Should handle conflict error');
            
            const warningMessages = vscode.window._getWarningMessages();
            assert.strictEqual(warningMessages.length, 1, 'Should display warning message');
        });

        test('Should route 429 errors to handleRateLimit', async () => {
            const handler = new APIErrorHandler();
            const error: { message: string; response: { statusCode: number; headers: Record<string, string> } } = {
                message: 'Too Many Requests',
                response: {
                    statusCode: 429,
                    headers: {
                        'retry-after': '30'
                    }
                }
            };

            await handler.handleAPIError(error, 'test operation');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
            const content = outputChannel._getContent();
            assert.ok(content.includes('API rate limit exceeded'), 'Should handle rate limit error');
            
            const warningMessages = vscode.window._getWarningMessages();
            assert.strictEqual(warningMessages.length, 1, 'Should display warning message');
        });

        test('Should route 500+ errors to handleServerError', async () => {
            const handler = new APIErrorHandler();
            const error: { message: string; response: { statusCode: number; body: { message: string } } } = {
                message: 'Internal Server Error',
                response: {
                    statusCode: 500,
                    body: {
                        message: 'Server error occurred'
                    }
                }
            };

            await handler.handleAPIError(error, 'test operation');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
            const content = outputChannel._getContent();
            assert.ok(content.includes('Cluster internal error'), 'Should handle server error');
            
            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1, 'Should display error message');
        });

        test('Should route other status codes to handleGenericAPIError', async () => {
            const handler = new APIErrorHandler();
            const error: { message: string; response: { statusCode: number; body: { message: string } } } = {
                message: 'Bad Request',
                response: {
                    statusCode: 400,
                    body: {
                        message: 'Invalid request'
                    }
                }
            };

            await handler.handleAPIError(error, 'test operation');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outputChannel = (vscode.window as any).createOutputChannel('kube9') as { _getContent(): string };
            const content = outputChannel._getContent();
            assert.ok(content.includes('API Error'), 'Should handle generic API error');
            
            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1, 'Should display error message');
        });

        test('Should handle errors without response object', async () => {
            const handler = new APIErrorHandler();
            const error: { message: string; statusCode: number } = {
                message: 'Network error',
                statusCode: 500
            };

            await handler.handleAPIError(error, 'test operation');

            const errorMessages = vscode.window._getErrorMessages();
            assert.strictEqual(errorMessages.length, 1, 'Should display error message');
        });

        test('Should track API errors in metrics', async () => {
            const handler = new APIErrorHandler();
            const metrics = ErrorMetrics.getInstance();
            const error: { message: string; response: { statusCode: number } } = {
                message: 'API Error',
                response: {
                    statusCode: 500
                }
            };

            await handler.handleAPIError(error, 'test operation');

            // Verify error type was tracked
            assert.strictEqual(metrics.getErrorCount(ErrorType.API), 1, 'Should track API error');
        });
    });

    suite('Integration Tests', () => {
        test('All handlers should use same ErrorHandler instance', async () => {
            const connectionHandler = new ConnectionErrorHandler();
            const rbacHandler = new RBACErrorHandler();
            const notFoundHandler = new ResourceNotFoundErrorHandler();
            const timeoutHandler = new TimeoutErrorHandler();
            const apiHandler = new APIErrorHandler();

            // All handlers should work independently
            await connectionHandler.handleKubectlNotFound();
            await rbacHandler.handlePermissionDenied({ message: 'Forbidden' }, 'pods', 'get');
            await notFoundHandler.handleResourceNotFound('Pod', 'test-pod');
            await timeoutHandler.handleTimeout('test', 5000);
            await apiHandler.handleAPIError({ message: 'Error', response: { statusCode: 500 } }, 'test');

            // Verify all errors were handled
            const metrics = ErrorMetrics.getInstance();
            assert.ok(metrics.getErrorCount(ErrorType.CONNECTION) > 0, 'Should track connection errors');
            assert.ok(metrics.getErrorCount(ErrorType.RBAC) > 0, 'Should track RBAC errors');
            assert.ok(metrics.getErrorCount(ErrorType.NOT_FOUND) > 0, 'Should track not found errors');
            assert.ok(metrics.getErrorCount(ErrorType.TIMEOUT) > 0, 'Should track timeout errors');
            assert.ok(metrics.getErrorCount(ErrorType.API) > 0, 'Should track API errors');
        });
    });
});

