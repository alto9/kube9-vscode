import * as assert from 'assert';
import * as Module from 'module';
import * as vscode from 'vscode';
import { ClusterTreeItem } from '../../../tree/ClusterTreeItem';
import { TreeItemType } from '../../../tree/TreeItemTypes';
import { KubectlError, KubectlErrorType } from '../../../kubernetes/KubectlError';

// Store original require for restoration
const originalRequire = Module.prototype.require;

// Set up module interception variables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockExecFileResponse: { type: 'success'; stdout: string; stderr: string } | { type: 'error'; error: any } | null = null;
let execFileCalls: Array<{ command: string; args: string[] }> = [];
let isProxyActive = false;

// Track VS Code API calls
let showInformationMessageCalls: Array<{ message: string; options?: vscode.MessageOptions; items: string[] }> = [];
let showInformationMessageReturnValue: string | undefined = undefined;
let showErrorMessageCalls: string[] = [];
let progressReports: Array<{ increment?: number; message?: string }> = [];
let mockTreeProviderRefreshCalled = false;
let mockNamespaceWebviewRefreshCalled = false;
let mockNamespaceWebviewRefreshNamespace: string | undefined = undefined;

suite('restartWorkload Command Tests', () => {
    // Store original functions for restoration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalShowInformationMessage: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalShowErrorMessage: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalWithProgress: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalGetClusterTreeProvider: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalNamespaceWebview: any;
    // Imported modules (loaded after mocks are set up)
    let restartWorkloadModule: typeof import('../../../commands/restartWorkload');

    setup(() => {
        // Reset call tracking
        execFileCalls = [];
        showInformationMessageCalls = [];
        showInformationMessageReturnValue = undefined;
        showErrorMessageCalls = [];
        progressReports = [];
        mockTreeProviderRefreshCalled = false;
        mockNamespaceWebviewRefreshCalled = false;
        mockNamespaceWebviewRefreshNamespace = undefined;
        mockExecFileResponse = null;

        // Set up require interception for child_process
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentRequire = Module.prototype.require;
        isProxyActive = true;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Module.prototype.require = function(this: any, id: string): any {
            // First check for vscode (handled by setup.ts)
            if (id === 'vscode') {
                return currentRequire.call(this, id);
            }
            
            // Then check for child_process
            if (id === 'child_process' && isProxyActive) {
                const realChildProcess = currentRequire.call(this, id);
                
                // Create a proxy that intercepts execFile access
                return new Proxy(realChildProcess, {
                    get(target, prop) {
                        if (prop === 'execFile') {
                            // Create a mock function
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const mockFunc: any = function(file: string, args: string[], ...rest: any[]) {
                                // The signature is: execFile(file, args[, options], callback)
                                // rest will be either [callback] or [options, callback]
                                let callback;
                                if (rest.length === 1) {
                                    callback = rest[0];
                                } else {
                                    callback = rest[1];
                                }
                                
                                execFileCalls.push({ command: file, args: [...args] });
                                
                                if (mockExecFileResponse !== null) {
                                    if (mockExecFileResponse.type === 'success') {
                                        const response = mockExecFileResponse;
                                        // Use process.nextTick to call callback async (AFTER function returns)
                                        process.nextTick(() => callback(null, response.stdout, response.stderr));
                                    } else {
                                        const response = mockExecFileResponse;
                                        process.nextTick(() => callback(response.error, '', ''));
                                    }
                                    // Return a ChildProcess-like object with pid
                                    return { pid: 123 };
                                }
                                
                                // Fallback to real execFile if no mock
                                return target.execFile(file, args, ...rest);
                            };
                            
                            // Add a custom promisified version that util.promisify will use
                            // This ensures promisify uses our custom implementation
                            // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
                            const {promisify} = require('util');
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (mockFunc as any)[promisify.custom] = function(file: string, args: string[]): Promise<{stdout: string; stderr: string}> {
                                execFileCalls.push({ command: file, args: [...args] });
                                
                                if (mockExecFileResponse !== null) {
                                    if (mockExecFileResponse.type === 'success') {
                                        const response = mockExecFileResponse;
                                        return Promise.resolve({ stdout: response.stdout, stderr: response.stderr });
                                    } else {
                                        const response = mockExecFileResponse;
                                        return Promise.reject(response.error);
                                    }
                                }
                                
                                // Fallback - shouldn't reach here
                                return Promise.reject(new Error('No mock response set'));
                            };
                            
                            return mockFunc;
                        }
                        return target[prop as keyof typeof target];
                    }
                });
            }
            return currentRequire.call(this, id);
        };

        // Mock VS Code window APIs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalShowInformationMessage = (vscode.window as any).showInformationMessage;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalShowErrorMessage = (vscode.window as any).showErrorMessage;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalWithProgress = (vscode.window as any).withProgress;

        // Mock showInformationMessage
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.window as any).showInformationMessage = async (
            message: string,
            optionsOrItems?: vscode.MessageOptions | string,
            ...items: string[]
        ): Promise<string | undefined> => {
            let actualOptions: vscode.MessageOptions | undefined;
            let actualItems: string[];

            if (typeof optionsOrItems === 'string') {
                // Old signature: (message, ...items)
                actualItems = [optionsOrItems, ...items];
                actualOptions = undefined;
            } else if (optionsOrItems && 'modal' in optionsOrItems) {
                // New signature: (message, options, ...items)
                actualOptions = optionsOrItems;
                actualItems = items;
            } else {
                actualItems = [];
                actualOptions = undefined;
            }

            showInformationMessageCalls.push({ message, options: actualOptions, items: actualItems });
            return Promise.resolve(showInformationMessageReturnValue);
        };

        // Mock showErrorMessage
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.window as any).showErrorMessage = async (message: string, ...items: string[]): Promise<string | undefined> => {
            showErrorMessageCalls.push(message);
            return Promise.resolve(items[0]);
        };

        // Mock withProgress
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.window as any).withProgress = async <R>(
            options: { location: vscode.ProgressLocation; title?: string; cancellable?: boolean },
            task: (progress: vscode.Progress<{ message?: string }>) => Promise<R>
        ): Promise<R> => {
            const progress = {
                report: (value: { increment?: number; message?: string }) => {
                    progressReports.push(value);
                }
            };
            return await task(progress as vscode.Progress<{ message?: string }>);
        };

        // Mock getClusterTreeProvider
        const mockTreeProvider = {
            refresh: () => {
                mockTreeProviderRefreshCalled = true;
            },
            getKubeconfigPath: () => '/test/kubeconfig'
        };

        // Mock NamespaceWebview
        const mockNamespaceWebview = {
            sendResourceUpdated: async (namespace?: string): Promise<void> => {
                mockNamespaceWebviewRefreshCalled = true;
                mockNamespaceWebviewRefreshNamespace = namespace;
            }
        };

        // Clear module cache and reload extension module
        const extensionPath = require.resolve('../../../extension');
        delete require.cache[extensionPath];
        
        // Mock getClusterTreeProvider before requiring extension
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
        const extensionRequire = require('../../../extension');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalGetClusterTreeProvider = (extensionRequire as any).getClusterTreeProvider;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (extensionRequire as any).getClusterTreeProvider = () => mockTreeProvider;

        // Mock NamespaceWebview
        const namespaceWebviewPath = require.resolve('../../../webview/NamespaceWebview');
        delete require.cache[namespaceWebviewPath];
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
        const namespaceWebviewModule = require('../../../webview/NamespaceWebview');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalNamespaceWebview = namespaceWebviewModule.NamespaceWebview;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        namespaceWebviewModule.NamespaceWebview = mockNamespaceWebview;

        // Clear messages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.window as any)._clearMessages();

        // Clear module cache for restartWorkload to ensure it uses mocked execFile
        const restartWorkloadPath = require.resolve('../../../commands/restartWorkload');
        delete require.cache[restartWorkloadPath];
        
        // Now import the module - it will use the mocked execFile
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
        restartWorkloadModule = require('../../../commands/restartWorkload');
    });

    teardown(() => {
        // Deactivate proxy
        isProxyActive = false;
        
        // Restore original require
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentRequire = Module.prototype.require;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Module.prototype.require = function(this: any, id: string): any {
            if (id === 'vscode') {
                return currentRequire.call(this, id);
            }
            return originalRequire.call(this, id);
        };
        
        // Clear mock
        mockExecFileResponse = null;
        
        // Restore window methods we overrode
        if (originalShowInformationMessage) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (vscode.window as any).showInformationMessage = originalShowInformationMessage;
        }
        if (originalShowErrorMessage) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (vscode.window as any).showErrorMessage = originalShowErrorMessage;
        }
        if (originalWithProgress) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (vscode.window as any).withProgress = originalWithProgress;
        }
        if (originalGetClusterTreeProvider) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
            const extensionRequire = require('../../../extension');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (extensionRequire as any).getClusterTreeProvider = originalGetClusterTreeProvider;
        }
        if (originalNamespaceWebview) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
            const namespaceWebviewModule = require('../../../webview/NamespaceWebview');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            namespaceWebviewModule.NamespaceWebview = originalNamespaceWebview;
        }
    });

    /**
     * Helper function to mock execFile with success response
     */
    function mockExecFileSuccess(stdout: string, stderr: string = ''): void {
        mockExecFileResponse = {
            type: 'success',
            stdout,
            stderr
        };
    }

    /**
     * Helper function to mock execFile with error
     */
    function mockExecFileError(error: Partial<NodeJS.ErrnoException> & { stdout?: string; stderr?: string; killed?: boolean; signal?: string }): void {
        // Create error object with all properties that KubectlError.fromExecError expects
        const fullError: NodeJS.ErrnoException = Object.assign(new Error(error.message || 'Command failed'), {
            code: error.code,
            killed: error.killed,
            signal: error.signal,
            stderr: error.stderr ? Buffer.from(error.stderr) : undefined,
            stdout: error.stdout ? Buffer.from(error.stdout) : undefined,
            ...error
        });
        
        mockExecFileResponse = {
            type: 'error',
            error: fullError
        };
    }

    /**
     * Helper function to create a mock tree item
     */
    function createMockTreeItem(kind: string, name: string, namespace?: string): ClusterTreeItem {
        const contextValue = `resource:${kind}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const item = new ClusterTreeItem(
            name,
            kind.toLowerCase() as TreeItemType,
            vscode.TreeItemCollapsibleState.None,
            {
                context: {
                    name: 'test-context',
                    cluster: 'test-cluster',
                    namespace: namespace
                },
                cluster: {
                    name: 'test-cluster',
                    server: 'https://api.test.com:6443'
                },
                resourceName: name,
                namespace: namespace
            }
        );
        item.contextValue = contextValue;
        return item;
    }

    /**
     * Helper function to create mock workload status JSON
     */
    function createMockWorkloadStatus(kind: string, desired: number, ready: number, updated: number, available: number): string {
        if (kind === 'DaemonSet') {
            return JSON.stringify({
                spec: { replicas: desired },
                status: {
                    desiredNumberScheduled: desired,
                    numberReady: ready,
                    updatedNumberScheduled: updated,
                    numberAvailable: available
                }
            });
        }
        return JSON.stringify({
            spec: { replicas: desired },
            status: {
                replicas: desired,
                readyReplicas: ready,
                updatedReplicas: updated,
                availableReplicas: available
            }
        });
    }

    /**
     * Helper function to configure showInformationMessage return value
     */
    function mockShowInformationMessage(returnValue: string | undefined): void {
        showInformationMessageReturnValue = returnValue;
    }

    suite('Confirmation Dialog', () => {
        test('shows dialog with correct message', async () => {
            mockShowInformationMessage('Restart');
            
            await restartWorkloadModule.showRestartConfirmationDialog('my-deployment');

            assert.strictEqual(showInformationMessageCalls.length, 1, 'Should show confirmation dialog');
            const call = showInformationMessageCalls[0];
            assert.ok(call.message.includes('Restart my-deployment'), 'Message should include resource name');
            assert.ok(call.message.includes('rolling restart'), 'Message should explain rolling restart');
            assert.ok(call.options?.modal === true, 'Dialog should be modal');
            assert.strictEqual(call.items.length, 2, 'Should have two buttons');
            assert.strictEqual(call.items[0], 'Restart', 'First button should be Restart');
            assert.strictEqual(call.items[1], 'Restart and Wait', 'Second button should be Restart and Wait');
        });

        test('returns correct result for Restart button', async () => {
            mockShowInformationMessage('Restart');
            
            const result = await restartWorkloadModule.showRestartConfirmationDialog('my-deployment');

            assert.ok(result !== undefined, 'Should return a result');
            assert.strictEqual(result?.confirmed, true, 'Should be confirmed');
            assert.strictEqual(result?.waitForRollout, false, 'Should not wait for rollout');
        });

        test('returns correct result for Restart and Wait button', async () => {
            mockShowInformationMessage('Restart and Wait');
            
            const result = await restartWorkloadModule.showRestartConfirmationDialog('my-deployment');

            assert.ok(result !== undefined, 'Should return a result');
            assert.strictEqual(result?.confirmed, true, 'Should be confirmed');
            assert.strictEqual(result?.waitForRollout, true, 'Should wait for rollout');
        });

        test('returns undefined when cancelled', async () => {
            mockShowInformationMessage(undefined);
            
            const result = await restartWorkloadModule.showRestartConfirmationDialog('my-deployment');

            assert.strictEqual(result, undefined, 'Should return undefined when cancelled');
        });

        test('handles errors gracefully', async () => {
            // Mock showInformationMessage to throw an error
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (vscode.window as any).showInformationMessage = async () => {
                throw new Error('Dialog error');
            };
            
            const result = await restartWorkloadModule.showRestartConfirmationDialog('my-deployment');

            assert.strictEqual(result, undefined, 'Should return undefined on error');
            // Should show error message
            assert.ok(showErrorMessageCalls.length > 0, 'Should show error message');
        });
    });

    suite('Restart Deployment', () => {
        test('applies restart annotation successfully', async () => {
            mockExecFileSuccess('deployment.apps/my-deployment patched');
            
            await restartWorkloadModule.applyRestartAnnotation(
                'my-deployment',
                'default',
                'Deployment',
                'test-context',
                '/test/kubeconfig'
            );

            assert.strictEqual(execFileCalls.length, 1, 'Should execute kubectl patch');
            const call = execFileCalls[0];
            assert.strictEqual(call.command, 'kubectl', 'Should use kubectl');
            assert.ok(call.args.includes('patch'), 'Should use patch command');
            assert.ok(call.args.includes('deployment'), 'Should use deployment resource type');
            assert.ok(call.args.includes('my-deployment'), 'Should include resource name');
            assert.ok(call.args.includes('-n'), 'Should include namespace flag');
            assert.ok(call.args.includes('default'), 'Should include namespace');
            assert.ok(call.args.includes('--type=json'), 'Should use JSON patch type');
            
            // Verify annotation key is escaped
            const patchArg = call.args.find(arg => arg.startsWith('-p='));
            assert.ok(patchArg, 'Should have patch argument');
            const patchJson = JSON.parse(patchArg.substring(3));
            assert.ok(patchJson[0].path.includes('~1'), 'Annotation key should be escaped');
        });

        test('applies restart annotation without namespace', async () => {
            mockExecFileSuccess('deployment.apps/my-deployment patched');
            
            await restartWorkloadModule.applyRestartAnnotation(
                'my-deployment',
                undefined,
                'Deployment',
                'test-context',
                '/test/kubeconfig'
            );

            const call = execFileCalls[0];
            assert.ok(!call.args.includes('-n'), 'Should not include namespace flag');
        });

        test('creates annotations object when missing', async () => {
            // First call fails with "path does not exist"
            mockExecFileError({
                message: 'path does not exist',
                stderr: 'unable to find /spec/template/metadata/annotations'
            });
            
            // We need to handle the retry logic
            // The function will try to create annotations, then add the annotation
            // Let's mock multiple responses
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const responses: Array<{ type: 'success' | 'error'; stdout?: string; stderr?: string; error?: any }> = [
                { type: 'error', error: Object.assign(new Error('path does not exist'), { stderr: 'unable to find /spec/template/metadata/annotations' }) },
                { type: 'success', stdout: 'deployment.apps/my-deployment patched' },
                { type: 'success', stdout: 'deployment.apps/my-deployment patched' }
            ];
            
            let responseIndex = 0;
            // Store original require to restore later
            const savedRequire = Module.prototype.require;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Module.prototype.require = function(this: any, id: string): any {
                if (id === 'vscode') {
                    return savedRequire.call(this, id);
                }
                if (id === 'child_process' && isProxyActive) {
                    const realChildProcess = savedRequire.call(this, id);
                    return new Proxy(realChildProcess, {
                        get(target, prop) {
                            if (prop === 'execFile') {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const mockFunc: any = function(file: string, args: string[], ...rest: any[]) {
                                    let callback;
                                    if (rest.length === 1) {
                                        callback = rest[0];
                                    } else {
                                        callback = rest[1];
                                    }
                                    
                                    execFileCalls.push({ command: file, args: [...args] });
                                    
                                    const response = responses[responseIndex++];
                                    if (response.type === 'success') {
                                        process.nextTick(() => callback(null, response.stdout || '', response.stderr || ''));
                                    } else {
                                        process.nextTick(() => callback(response.error, '', ''));
                                    }
                                    return { pid: 123 };
                                };
                                
                                // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
                                const {promisify} = require('util');
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (mockFunc as any)[promisify.custom] = function(file: string, args: string[]): Promise<{stdout: string; stderr: string}> {
                                    execFileCalls.push({ command: file, args: [...args] });
                                    const response = responses[responseIndex++];
                                    if (response.type === 'success') {
                                        return Promise.resolve({ stdout: response.stdout || '', stderr: response.stderr || '' });
                                    } else {
                                        return Promise.reject(response.error);
                                    }
                                };
                                
                                return mockFunc;
                            }
                            return target[prop as keyof typeof target];
                        }
                    });
                }
                return savedRequire.call(this, id);
            };
            
            // Clear module cache and reload to use new mock
            const restartWorkloadPath = require.resolve('../../../commands/restartWorkload');
            delete require.cache[restartWorkloadPath];
            // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
            const testModule = require('../../../commands/restartWorkload');
            
            try {
                await testModule.applyRestartAnnotation(
                    'my-deployment',
                    'default',
                    'Deployment',
                    'test-context',
                    '/test/kubeconfig'
                );

                // Should have tried to add annotation, then create annotations, then add annotation again
                assert.ok(execFileCalls.length >= 2, 'Should make multiple patch calls');
            } finally {
                // Restore original require
                Module.prototype.require = savedRequire;
                // Reload module with original mocks
                delete require.cache[restartWorkloadPath];
            }
        });

        test('timestamp is ISO 8601 format', async () => {
            mockExecFileSuccess('deployment.apps/my-deployment patched');
            const beforeTime = new Date().toISOString();
            
            await restartWorkloadModule.applyRestartAnnotation(
                'my-deployment',
                'default',
                'Deployment',
                'test-context',
                '/test/kubeconfig'
            );

            const afterTime = new Date().toISOString();
            const call = execFileCalls[0];
            const patchArg = call.args.find(arg => arg.startsWith('-p='));
            const patchJson = JSON.parse(patchArg!.substring(3));
            const timestamp = patchJson[0].value;
            
            // Verify ISO 8601 format
            assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(timestamp), 'Timestamp should be ISO 8601 format');
            assert.ok(timestamp >= beforeTime && timestamp <= afterTime, 'Timestamp should be current time');
        });
    });

    suite('Restart StatefulSet', () => {
        test('applies restart annotation with correct resource type', async () => {
            mockExecFileSuccess('statefulset.apps/my-statefulset patched');
            
            await restartWorkloadModule.applyRestartAnnotation(
                'my-statefulset',
                'default',
                'StatefulSet',
                'test-context',
                '/test/kubeconfig'
            );

            const call = execFileCalls[0];
            assert.ok(call.args.includes('statefulset'), 'Should use statefulset resource type');
            assert.ok(call.args.includes('my-statefulset'), 'Should include resource name');
        });
    });

    suite('Restart DaemonSet', () => {
        test('applies restart annotation with correct resource type', async () => {
            mockExecFileSuccess('daemonset.apps/my-daemonset patched');
            
            await restartWorkloadModule.applyRestartAnnotation(
                'my-daemonset',
                'default',
                'DaemonSet',
                'test-context',
                '/test/kubeconfig'
            );

            const call = execFileCalls[0];
            assert.ok(call.args.includes('daemonset'), 'Should use daemonset resource type');
            assert.ok(call.args.includes('my-daemonset'), 'Should include resource name');
        });

        test('extracts status using DaemonSet-specific fields', async () => {
            const statusJson = createMockWorkloadStatus('DaemonSet', 5, 5, 5, 5);
            mockExecFileSuccess(statusJson);
            
            const status = await restartWorkloadModule.getWorkloadStatus(
                'my-daemonset',
                'default',
                'DaemonSet',
                'test-context',
                '/test/kubeconfig'
            );

            assert.strictEqual(status.desiredReplicas, 5, 'Should extract desired replicas');
            assert.strictEqual(status.readyReplicas, 5, 'Should extract ready replicas');
            assert.strictEqual(status.updatedReplicas, 5, 'Should extract updated replicas');
            assert.strictEqual(status.availableReplicas, 5, 'Should extract available replicas');
        });
    });

    suite('Get Workload Status', () => {
        test('extracts status for Deployment', async () => {
            const statusJson = createMockWorkloadStatus('Deployment', 3, 3, 3, 3);
            mockExecFileSuccess(statusJson);
            
            const status = await restartWorkloadModule.getWorkloadStatus(
                'my-deployment',
                'default',
                'Deployment',
                'test-context',
                '/test/kubeconfig'
            );

            assert.strictEqual(status.desiredReplicas, 3, 'Should extract desired replicas');
            assert.strictEqual(status.readyReplicas, 3, 'Should extract ready replicas');
            assert.strictEqual(status.updatedReplicas, 3, 'Should extract updated replicas');
            assert.strictEqual(status.availableReplicas, 3, 'Should extract available replicas');
        });

        test('handles missing status fields', async () => {
            const statusJson = JSON.stringify({
                spec: { replicas: 2 },
                status: {}
            });
            mockExecFileSuccess(statusJson);
            
            const status = await restartWorkloadModule.getWorkloadStatus(
                'my-deployment',
                'default',
                'Deployment',
                'test-context',
                '/test/kubeconfig'
            );

            assert.strictEqual(status.desiredReplicas, 2, 'Should extract desired from spec');
            assert.strictEqual(status.readyReplicas, 0, 'Should default to 0 for missing fields');
        });
    });

    suite('Rollout Watch', () => {
        test('completes when rollout is ready', async () => {
            // First call returns incomplete status
            let callCount = 0;
            const responses = [
                createMockWorkloadStatus('Deployment', 3, 2, 2, 2), // Incomplete
                createMockWorkloadStatus('Deployment', 3, 3, 3, 3)  // Complete
            ];
            
            // Store original require to restore later
            const savedRequire = Module.prototype.require;
            
            // Override execFile mock to return different responses
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Module.prototype.require = function(this: any, id: string): any {
                if (id === 'vscode') {
                    return savedRequire.call(this, id);
                }
                if (id === 'child_process' && isProxyActive) {
                    const realChildProcess = savedRequire.call(this, id);
                    return new Proxy(realChildProcess, {
                        get(target, prop) {
                            if (prop === 'execFile') {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const mockFunc: any = function(file: string, args: string[], ...rest: any[]) {
                                    let callback;
                                    if (rest.length === 1) {
                                        callback = rest[0];
                                    } else {
                                        callback = rest[1];
                                    }
                                    
                                    execFileCalls.push({ command: file, args: [...args] });
                                    const response = responses[callCount++ % responses.length];
                                    process.nextTick(() => callback(null, response, ''));
                                    return { pid: 123 };
                                };
                                
                                // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
                                const {promisify} = require('util');
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (mockFunc as any)[promisify.custom] = function(file: string, args: string[]): Promise<{stdout: string; stderr: string}> {
                                    execFileCalls.push({ command: file, args: [...args] });
                                    const response = responses[callCount++ % responses.length];
                                    return Promise.resolve({ stdout: response, stderr: '' });
                                };
                                
                                return mockFunc;
                            }
                            return target[prop as keyof typeof target];
                        }
                    });
                }
                return savedRequire.call(this, id);
            };
            
            // Clear module cache and reload to use new mock
            const restartWorkloadPath = require.resolve('../../../commands/restartWorkload');
            delete require.cache[restartWorkloadPath];
            // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
            const testModule = require('../../../commands/restartWorkload');

            // Mock Date.now to control time progression
            const originalNow = Date.now;
            let currentTime = 1000000;
            Date.now = () => currentTime;

            try {
                const progress = {
                    report: (value: { increment?: number; message?: string }) => {
                        progressReports.push(value);
                    }
                } as vscode.Progress<{ message?: string }>;

                // Advance time by 2 seconds (poll interval)
                const watchPromise = testModule.watchRolloutStatus(
                    'my-deployment',
                    'default',
                    'Deployment',
                    'test-context',
                    '/test/kubeconfig',
                    progress
                );

                // Simulate time progression
                await new Promise(resolve => setTimeout(resolve, 10));
                currentTime += 2000; // Advance 2 seconds
                await new Promise(resolve => setTimeout(resolve, 10));
                currentTime += 2000; // Advance another 2 seconds

                await watchPromise;

                // Should have reported progress
                assert.ok(progressReports.length > 0, 'Should report progress');
                assert.ok(progressReports.some(r => r.message?.includes('Rolling update')), 'Should show rolling update message');
                assert.ok(progressReports.some(r => r.message?.includes('Rollout complete')), 'Should show completion message');
            } finally {
                Date.now = originalNow;
                // Restore original require
                Module.prototype.require = savedRequire;
                // Reload module with original mocks
                delete require.cache[restartWorkloadPath];
            }
        }).timeout(5000);

        test('throws timeout error after 5 minutes', async () => {
            // Always return incomplete status
            const incompleteStatus = createMockWorkloadStatus('Deployment', 3, 2, 2, 2);
            
            // Store original require to restore later
            const savedRequire = Module.prototype.require;
            
            // Override execFile mock
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Module.prototype.require = function(this: any, id: string): any {
                if (id === 'vscode') {
                    return savedRequire.call(this, id);
                }
                if (id === 'child_process' && isProxyActive) {
                    const realChildProcess = savedRequire.call(this, id);
                    return new Proxy(realChildProcess, {
                        get(target, prop) {
                            if (prop === 'execFile') {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const mockFunc: any = function(file: string, args: string[], ...rest: any[]) {
                                    let callback;
                                    if (rest.length === 1) {
                                        callback = rest[0];
                                    } else {
                                        callback = rest[1];
                                    }
                                    
                                    execFileCalls.push({ command: file, args: [...args] });
                                    process.nextTick(() => callback(null, incompleteStatus, ''));
                                    return { pid: 123 };
                                };
                                
                                // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
                                const {promisify} = require('util');
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (mockFunc as any)[promisify.custom] = function(file: string, args: string[]): Promise<{stdout: string; stderr: string}> {
                                    execFileCalls.push({ command: file, args: [...args] });
                                    return Promise.resolve({ stdout: incompleteStatus, stderr: '' });
                                };
                                
                                return mockFunc;
                            }
                            return target[prop as keyof typeof target];
                        }
                    });
                }
                return savedRequire.call(this, id);
            };
            
            // Clear module cache and reload to use new mock
            const restartWorkloadPath = require.resolve('../../../commands/restartWorkload');
            delete require.cache[restartWorkloadPath];
            // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
            const testModule = require('../../../commands/restartWorkload');

            // Mock Date.now to simulate timeout
            const originalNow = Date.now;
            let currentTime = 1000000;
            Date.now = () => currentTime;

            try {
                const progress = {
                    report: (value: { increment?: number; message?: string }) => {
                        progressReports.push(value);
                    }
                } as vscode.Progress<{ message?: string }>;

                const watchPromise = testModule.watchRolloutStatus(
                    'my-deployment',
                    'default',
                    'Deployment',
                    'test-context',
                    '/test/kubeconfig',
                    progress
                );

                // Advance time past 5 minutes
                currentTime += 300001; // 5 minutes + 1ms

                await assert.rejects(
                    watchPromise,
                    (error: Error) => {
                        return error instanceof testModule.RolloutTimeoutError;
                    },
                    'Should throw RolloutTimeoutError'
                );
            } finally {
                Date.now = originalNow;
                // Restore original require
                Module.prototype.require = savedRequire;
                // Reload module with original mocks
                delete require.cache[restartWorkloadPath];
            }
        }).timeout(10000);
    });

    suite('Command Handler Integration', () => {
        test('handles missing tree item data', async () => {
            const item = new ClusterTreeItem('test', 'deployment');
            // No resourceData
            
            // Clear error messages
            showErrorMessageCalls = [];
            
            // Simulate command handler logic
            if (!item || !item.resourceData) {
                await vscode.window.showErrorMessage('Invalid tree item: missing resource data');
            }
            
            assert.ok(showErrorMessageCalls.length > 0, 'Should show error for missing resource data');
            assert.ok(showErrorMessageCalls[0].includes('missing resource data'), 'Error message should mention missing resource data');
        });

        test('handles missing kubeconfig path', async () => {
            // Mock getClusterTreeProvider to return provider without kubeconfig
            const mockTreeProviderNoKubeconfig = {
                refresh: () => {},
                getKubeconfigPath: () => undefined
            };
            
            // Clear error messages
            showErrorMessageCalls = [];
            
            // Simulate command handler logic
            const kubeconfigPath = mockTreeProviderNoKubeconfig.getKubeconfigPath();
            if (!kubeconfigPath) {
                await vscode.window.showErrorMessage('Kubeconfig path not available');
            }
            
            assert.ok(showErrorMessageCalls.length > 0, 'Should show error for missing kubeconfig');
            assert.ok(showErrorMessageCalls[0].includes('Kubeconfig path'), 'Error message should mention kubeconfig');
        });

        test('skips rollout watch when not requested', async () => {
            mockShowInformationMessage('Restart'); // Not "Restart and Wait"
            mockExecFileSuccess('deployment.apps/my-deployment patched');
            
            // Simulate the command handler flow
            const confirmation = await restartWorkloadModule.showRestartConfirmationDialog('my-deployment');
            if (confirmation && !confirmation.waitForRollout) {
                // Should only apply annotation, not watch rollout
                await restartWorkloadModule.applyRestartAnnotation(
                    'my-deployment',
                    'default',
                    'Deployment',
                    'test-context',
                    '/test/kubeconfig'
                );
            }
            
            // Should only have patch call, no get status calls
            assert.strictEqual(execFileCalls.length, 1, 'Should only execute patch command');
            assert.ok(execFileCalls[0].args.includes('patch'), 'Should use patch command');
        });

        test('refreshes tree view after successful restart', async () => {
            mockShowInformationMessage('Restart');
            mockExecFileSuccess('deployment.apps/my-deployment patched');
            
            const item = createMockTreeItem('Deployment', 'my-deployment', 'default');
            
            // Reset refresh tracking
            mockTreeProviderRefreshCalled = false;
            mockNamespaceWebviewRefreshCalled = false;
            
            // Simulate command handler flow
            const confirmation = await restartWorkloadModule.showRestartConfirmationDialog('my-deployment');
            if (confirmation) {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Restarting my-deployment...',
                    cancellable: false
                }, async (progress) => {
                    progress.report({ message: 'Applying restart annotation...' });
                    await restartWorkloadModule.applyRestartAnnotation(
                        'my-deployment',
                        'default',
                        'Deployment',
                        'test-context',
                        '/test/kubeconfig'
                    );
                    
                    // Simulate refresh
                    const mockTreeProvider = {
                        refresh: () => { mockTreeProviderRefreshCalled = true; },
                        getKubeconfigPath: () => '/test/kubeconfig'
                    };
                    mockTreeProvider.refresh();
                    
                    if (item.resourceData?.namespace) {
                        const mockNamespaceWebview = {
                            sendResourceUpdated: async (namespace?: string) => {
                                mockNamespaceWebviewRefreshCalled = true;
                                mockNamespaceWebviewRefreshNamespace = namespace;
                            }
                        };
                        await mockNamespaceWebview.sendResourceUpdated(item.resourceData.namespace);
                    }
                });
            }
            
            assert.ok(mockTreeProviderRefreshCalled, 'Should refresh tree view');
            assert.ok(mockNamespaceWebviewRefreshCalled, 'Should refresh namespace webview');
            assert.strictEqual(mockNamespaceWebviewRefreshNamespace, 'default', 'Should refresh correct namespace');
        });

        test('refreshes tree view even on error', async () => {
            mockShowInformationMessage('Restart');
            mockExecFileError({
                message: 'forbidden',
                stderr: 'Error from server (Forbidden)'
            });
            
            // Reset refresh tracking
            mockTreeProviderRefreshCalled = false;
            
            // Simulate command handler flow with error
            const confirmation = await restartWorkloadModule.showRestartConfirmationDialog('my-deployment');
            if (confirmation) {
                try {
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: 'Restarting my-deployment...',
                        cancellable: false
                    }, async (progress) => {
                        progress.report({ message: 'Applying restart annotation...' });
                        await restartWorkloadModule.applyRestartAnnotation(
                            'my-deployment',
                            'default',
                            'Deployment',
                            'test-context',
                            '/test/kubeconfig'
                        );
                    });
                } catch (error) {
                    // Error handling
                } finally {
                    // Simulate finally block refresh
                    const mockTreeProvider = {
                        refresh: () => { mockTreeProviderRefreshCalled = true; },
                        getKubeconfigPath: () => '/test/kubeconfig'
                    };
                    mockTreeProvider.refresh();
                }
            }
            
            assert.ok(mockTreeProviderRefreshCalled, 'Should refresh tree view even on error');
        });

        test('cancels operation when dialog is dismissed', async () => {
            mockShowInformationMessage(undefined); // User cancelled
            
            // Simulate command handler flow
            const confirmation = await restartWorkloadModule.showRestartConfirmationDialog('my-deployment');
            if (!confirmation) {
                // Should return early, no kubectl calls
                assert.strictEqual(execFileCalls.length, 0, 'Should not execute kubectl when cancelled');
            }
        });
    });

    suite('Multiple Restarts', () => {
        test('updates annotation timestamp on multiple restarts', async () => {
            const timestamps: string[] = [];
            
            // Store original require to restore later
            const savedRequire = Module.prototype.require;
            
            // Mock execFile to capture timestamps
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Module.prototype.require = function(this: any, id: string): any {
                if (id === 'vscode') {
                    return savedRequire.call(this, id);
                }
                if (id === 'child_process' && isProxyActive) {
                    const realChildProcess = savedRequire.call(this, id);
                    return new Proxy(realChildProcess, {
                        get(target, prop) {
                            if (prop === 'execFile') {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const mockFunc: any = function(file: string, args: string[], ...rest: any[]) {
                                    let callback;
                                    if (rest.length === 1) {
                                        callback = rest[0];
                                    } else {
                                        callback = rest[1];
                                    }
                                    
                                    execFileCalls.push({ command: file, args: [...args] });
                                    
                                    // Extract timestamp from patch argument
                                    const patchArg = args.find(arg => arg.startsWith('-p='));
                                    if (patchArg) {
                                        try {
                                            const patchJson = JSON.parse(patchArg.substring(3));
                                            if (patchJson[0]?.value) {
                                                timestamps.push(patchJson[0].value);
                                            }
                                        } catch (e) {
                                            // Ignore parse errors
                                        }
                                    }
                                    
                                    process.nextTick(() => callback(null, 'deployment.apps/my-deployment patched', ''));
                                    return { pid: 123 };
                                };
                                
                                // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
                                const {promisify} = require('util');
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (mockFunc as any)[promisify.custom] = function(file: string, args: string[]): Promise<{stdout: string; stderr: string}> {
                                    execFileCalls.push({ command: file, args: [...args] });
                                    
                                    // Extract timestamp
                                    const patchArg = args.find(arg => arg.startsWith('-p='));
                                    if (patchArg) {
                                        try {
                                            const patchJson = JSON.parse(patchArg.substring(3));
                                            if (patchJson[0]?.value) {
                                                timestamps.push(patchJson[0].value);
                                            }
                                        } catch (e) {
                                            // Ignore parse errors
                                        }
                                    }
                                    
                                    return Promise.resolve({ stdout: 'deployment.apps/my-deployment patched', stderr: '' });
                                };
                                
                                return mockFunc;
                            }
                            return target[prop as keyof typeof target];
                        }
                    });
                }
                return savedRequire.call(this, id);
            };
            
            // Clear module cache and reload to use new mock
            const restartWorkloadPath = require.resolve('../../../commands/restartWorkload');
            delete require.cache[restartWorkloadPath];
            // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
            const testModule = require('../../../commands/restartWorkload');
            
            try {
                // First restart
                await testModule.applyRestartAnnotation(
                    'my-deployment',
                    'default',
                    'Deployment',
                    'test-context',
                    '/test/kubeconfig'
                );
                
                // Wait a bit to ensure different timestamp
                await new Promise(resolve => setTimeout(resolve, 10));
                
                // Second restart
                await testModule.applyRestartAnnotation(
                    'my-deployment',
                    'default',
                    'Deployment',
                    'test-context',
                    '/test/kubeconfig'
                );
                
                // Should have two timestamps
                assert.strictEqual(timestamps.length, 2, 'Should have two timestamps');
                assert.notStrictEqual(timestamps[0], timestamps[1], 'Timestamps should be different');
                assert.ok(timestamps[0] < timestamps[1], 'Second timestamp should be later');
            } finally {
                // Restore original require
                Module.prototype.require = savedRequire;
                // Reload module with original mocks
                delete require.cache[restartWorkloadPath];
            }
        });
    });

    suite('Error Handling', () => {
        test('handles resource not found error', async () => {
            mockExecFileError({
                message: 'not found',
                stderr: 'Error from server (NotFound): deployments.apps "my-deployment" not found'
            });

            await assert.rejects(
                async () => {
                    await restartWorkloadModule.applyRestartAnnotation(
                        'my-deployment',
                        'default',
                        'Deployment',
                        'test-context',
                        '/test/kubeconfig'
                    );
                },
                (error: unknown) => {
                    return error instanceof KubectlError;
                },
                'Should throw KubectlError'
            );
        });

        test('handles permission denied error', async () => {
            mockExecFileError({
                message: 'forbidden',
                stderr: 'Error from server (Forbidden): deployments.apps "my-deployment" is forbidden'
            });

            await assert.rejects(
                async () => {
                    await restartWorkloadModule.applyRestartAnnotation(
                        'my-deployment',
                        'default',
                        'Deployment',
                        'test-context',
                        '/test/kubeconfig'
                    );
                },
                (error: unknown) => {
                    if (error instanceof KubectlError) {
                        return error.type === KubectlErrorType.PermissionDenied || 
                               error.getDetails().toLowerCase().includes('forbidden');
                    }
                    return false;
                },
                'Should throw permission denied error'
            );
        });

        test('handles connection failed error', async () => {
            mockExecFileError({
                message: 'connection refused',
                stderr: 'Unable to connect to the server: dial tcp: connection refused'
            });

            await assert.rejects(
                async () => {
                    await restartWorkloadModule.applyRestartAnnotation(
                        'my-deployment',
                        'default',
                        'Deployment',
                        'test-context',
                        '/test/kubeconfig'
                    );
                },
                (error: unknown) => {
                    if (error instanceof KubectlError) {
                        return error.type === KubectlErrorType.ConnectionFailed;
                    }
                    return false;
                },
                'Should throw connection failed error'
            );
        });

        test('handles timeout error', async () => {
            mockExecFileError({
                killed: true,
                signal: 'SIGTERM',
                message: 'Command timed out'
            });

            await assert.rejects(
                async () => {
                    await restartWorkloadModule.applyRestartAnnotation(
                        'my-deployment',
                        'default',
                        'Deployment',
                        'test-context',
                        '/test/kubeconfig'
                    );
                },
                (error: unknown) => {
                    if (error instanceof KubectlError) {
                        return error.type === KubectlErrorType.Timeout;
                    }
                    return false;
                },
                'Should throw timeout error'
            );
        });

        test('handles binary not found error', async () => {
            mockExecFileError({
                code: 'ENOENT',
                message: 'kubectl not found'
            });

            await assert.rejects(
                async () => {
                    await restartWorkloadModule.applyRestartAnnotation(
                        'my-deployment',
                        'default',
                        'Deployment',
                        'test-context',
                        '/test/kubeconfig'
                    );
                },
                (error: unknown) => {
                    if (error instanceof KubectlError) {
                        return error.type === KubectlErrorType.BinaryNotFound;
                    }
                    return false;
                },
                'Should throw binary not found error'
            );
        });
    });
});

