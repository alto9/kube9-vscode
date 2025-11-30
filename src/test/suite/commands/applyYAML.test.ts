import * as assert from 'assert';
import * as Module from 'module';
import * as vscode from 'vscode';
import * as kubectlContextModule from '../../../utils/kubectlContext';

// Store original require for restoration
const originalRequire = Module.prototype.require;

// Set up module interception variables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockExecFileResponse: { type: 'success'; stdout: string; stderr: string } | { type: 'error'; error: any } | null = null;
let execFileCalls: Array<{ command: string; args: string[] }> = [];
let isProxyActive = false;

// Track VS Code API calls
let quickPickCalls: Array<{ items: vscode.QuickPickItem[]; options?: vscode.QuickPickOptions }> = [];
let openDialogCalls: Array<vscode.OpenDialogOptions> = [];
let activeTextEditorValue: vscode.TextEditor | undefined = undefined;
let quickPickReturnValue: vscode.QuickPickItem | undefined = undefined;
let openDialogReturnValue: vscode.Uri[] | undefined = undefined;

suite('applyYAML Command Tests', () => {
    // Store original functions for restoration
    let originalGetContextInfo: typeof kubectlContextModule.getContextInfo;
    let originalWindow: typeof vscode.window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalActiveTextEditor: PropertyDescriptor | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalShowQuickPick: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalShowOpenDialog: any;
    let applyYAMLModule: typeof import('../../../commands/applyYAML');
    let applyYAMLCommand: typeof import('../../../commands/applyYAML').applyYAMLCommand;

    setup(() => {
        // Reset call tracking
        execFileCalls = [];
        quickPickCalls = [];
        openDialogCalls = [];
        activeTextEditorValue = undefined;
        quickPickReturnValue = undefined;
        openDialogReturnValue = undefined;
        mockExecFileResponse = null;

        // Store original getContextInfo
        originalGetContextInfo = kubectlContextModule.getContextInfo;

        // Mock getContextInfo
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (kubectlContextModule as any).getContextInfo = async () => {
            return {
                currentNamespace: 'default',
                contextName: 'test-context',
                clusterName: 'test-cluster',
                lastUpdated: new Date(),
                source: 'extension' as const
            };
        };

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
                            // eslint-disable-next-line @typescript-eslint/no-var-requires
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

        // Mock VS Code window APIs FIRST, before loading the module
        // This ensures the module sees our mocked window
        originalWindow = vscode.window;
        
        // Store original methods we need to override (at suite level for teardown)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalActiveTextEditor = Object.getOwnPropertyDescriptor(originalWindow, 'activeTextEditor');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalShowQuickPick = (originalWindow as any).showQuickPick;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalShowOpenDialog = (originalWindow as any).showOpenDialog;
        
        // Override methods directly on the original window object
        // This preserves all function references including showInformationMessage
        Object.defineProperty(vscode.window, 'activeTextEditor', {
            get: (): vscode.TextEditor | undefined => {
                return activeTextEditorValue;
            },
            enumerable: true,
            configurable: true
        });
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.window as any).showQuickPick = async <T extends vscode.QuickPickItem>(
            items: readonly T[] | Thenable<readonly T[]>,
            options?: vscode.QuickPickOptions
        ): Promise<T | undefined> => {
            const resolvedItems = await Promise.resolve(items);
            quickPickCalls.push({ items: [...resolvedItems], options });
            return quickPickReturnValue as T | undefined;
        };
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.window as any).showOpenDialog = async (options?: vscode.OpenDialogOptions): Promise<vscode.Uri[] | undefined> => {
            if (options) {
                openDialogCalls.push(options);
            }
            return openDialogReturnValue;
        };
        
        // Don't replace vscode.window - we're modifying it directly
        // This ensures showInformationMessage and message tracking methods remain intact

        // Clear messages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.window as any)._clearMessages();

        // Clear module cache to force reload with mocked execFile AND mocked window
        const applyYAMLPath = require.resolve('../../../commands/applyYAML');
        delete require.cache[applyYAMLPath];
        
        // Now import the module - it will use the mocked execFile AND mocked window
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        applyYAMLModule = require('../../../commands/applyYAML');
        
        // Get the command function from the reloaded module
        applyYAMLCommand = applyYAMLModule.applyYAMLCommand;
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
        
        // Restore original functions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (kubectlContextModule as any).getContextInfo = originalGetContextInfo;
        
        // Restore window methods we overrode
        if (originalActiveTextEditor) {
            Object.defineProperty(vscode.window, 'activeTextEditor', originalActiveTextEditor);
        }
        if (originalShowQuickPick) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (vscode.window as any).showQuickPick = originalShowQuickPick;
        }
        if (originalShowOpenDialog) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (vscode.window as any).showOpenDialog = originalShowOpenDialog;
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
        const fullError = Object.assign(new Error(error.message || 'Command failed'), error);
        
        mockExecFileResponse = {
            type: 'error',
            error: fullError
        };
    }

    suite('Input Resolution', () => {
        test('uses URI parameter when provided', async () => {
            const testUri = vscode.Uri.file('/test/path/deployment.yaml');
            quickPickReturnValue = { label: 'Apply', mode: 'apply' } as vscode.QuickPickItem & { mode: string };
            mockExecFileSuccess('deployment.apps/my-app created');

            await applyYAMLCommand(testUri);

            // Should not show file picker
            assert.strictEqual(openDialogCalls.length, 0, 'Should not show file picker when URI provided');
            // Should show quick pick for mode selection
            assert.strictEqual(quickPickCalls.length, 1, 'Should show quick pick for mode selection');
            // Should execute kubectl with correct file path
            assert.strictEqual(execFileCalls.length, 1, 'Should execute kubectl command');
            assert.strictEqual(execFileCalls[0].args[execFileCalls[0].args.length - 1], testUri.fsPath, 'Should use provided URI path');
        });

        test('uses active editor when no URI and YAML file open', async () => {
            const testUri = vscode.Uri.file('/test/path/service.yaml');
            const mockDocument: Partial<vscode.TextDocument> = {
                uri: testUri,
                fileName: 'service.yaml',
                languageId: 'yaml',
                getText: () => 'apiVersion: v1\nkind: Service'
            };
            const mockEditor: Partial<vscode.TextEditor> = {
                document: mockDocument as vscode.TextDocument
            };
            
            // Set active editor
            activeTextEditorValue = mockEditor as vscode.TextEditor;
            
            quickPickReturnValue = { label: 'Apply', mode: 'apply' } as vscode.QuickPickItem & { mode: string };
            mockExecFileSuccess('service/my-service created');

            await applyYAMLCommand();

            // Should not show file picker
            assert.strictEqual(openDialogCalls.length, 0, 'Should not show file picker when YAML file is open');
            // Should use active editor URI
            assert.strictEqual(execFileCalls.length, 1, 'Should execute kubectl command');
            assert.strictEqual(execFileCalls[0].args[execFileCalls[0].args.length - 1], testUri.fsPath, 'Should use active editor URI');
        });

        test('shows file picker when no URI and no YAML file', async () => {
            // No active editor
            activeTextEditorValue = undefined;
            
            const testUri = vscode.Uri.file('/test/path/manifest.yaml');
            openDialogReturnValue = [testUri];
            quickPickReturnValue = { label: 'Apply', mode: 'apply' } as vscode.QuickPickItem & { mode: string };
            mockExecFileSuccess('deployment.apps/my-app created');

            await applyYAMLCommand();

            // Should show file picker
            assert.strictEqual(openDialogCalls.length, 1, 'Should show file picker when no URI and no YAML file');
            assert.deepStrictEqual(openDialogCalls[0].filters?.['YAML files'], ['yaml', 'yml'], 'Should filter for YAML files');
            // Should use selected file
            assert.strictEqual(execFileCalls.length, 1, 'Should execute kubectl command');
            assert.strictEqual(execFileCalls[0].args[execFileCalls[0].args.length - 1], testUri.fsPath, 'Should use file picker URI');
        });

        test('cancels when file picker dismissed', async () => {
            // No active editor
            activeTextEditorValue = undefined;
            
            // File picker returns undefined (cancelled)
            openDialogReturnValue = undefined;

            await applyYAMLCommand();

            // Should not show quick pick or execute kubectl
            assert.strictEqual(quickPickCalls.length, 0, 'Should not show quick pick when file picker cancelled');
            assert.strictEqual(execFileCalls.length, 0, 'Should not execute kubectl when file picker cancelled');
        });
    });

    suite('Mode Selection', () => {
        test('shows quick pick with three options', async () => {
            const testUri = vscode.Uri.file('/test/path/deployment.yaml');
            quickPickReturnValue = { label: 'Dry Run (Server)', mode: 'dry-run-server' } as vscode.QuickPickItem & { mode: string };
            mockExecFileSuccess('deployment.apps/my-app created (dry run)');

            await applyYAMLCommand(testUri);

            // Should show quick pick
            assert.strictEqual(quickPickCalls.length, 1, 'Should show quick pick');
            const quickPickCall = quickPickCalls[0];
            assert.strictEqual(quickPickCall.items.length, 3, 'Should show three options');
            assert.strictEqual(quickPickCall.items[0].label, 'Apply', 'First option should be Apply');
            assert.strictEqual(quickPickCall.items[1].label, 'Dry Run (Server)', 'Second option should be Dry Run (Server)');
            assert.strictEqual(quickPickCall.items[2].label, 'Dry Run (Client)', 'Third option should be Dry Run (Client)');
            assert.strictEqual(quickPickCall.options?.placeHolder, 'Select apply mode', 'Should have correct placeholder');
        });

        test('cancels when quick pick dismissed', async () => {
            const testUri = vscode.Uri.file('/test/path/deployment.yaml');
            // Quick pick returns undefined (cancelled)
            quickPickReturnValue = undefined;

            await applyYAMLCommand(testUri);

            // Should not execute kubectl
            assert.strictEqual(execFileCalls.length, 0, 'Should not execute kubectl when quick pick cancelled');
        });
    });

    suite('kubectl Execution', () => {
        test('executes apply without dry-run flag', async () => {
            const testUri = vscode.Uri.file('/test/path/deployment.yaml');
            quickPickReturnValue = { label: 'Apply', mode: 'apply' } as vscode.QuickPickItem & { mode: string };
            mockExecFileSuccess('deployment.apps/my-app created');

            await applyYAMLCommand(testUri);

            // Should execute kubectl apply without dry-run flag
            assert.strictEqual(execFileCalls.length, 1, 'Should execute kubectl command');
            assert.strictEqual(execFileCalls[0].command, 'kubectl', 'Should execute kubectl');
            assert.deepStrictEqual(execFileCalls[0].args, ['apply', '-f', testUri.fsPath], 'Should use apply mode without dry-run flag');
        });

        test('executes with --dry-run=server for server mode', async () => {
            const testUri = vscode.Uri.file('/test/path/deployment.yaml');
            quickPickReturnValue = { label: 'Dry Run (Server)', mode: 'dry-run-server' } as vscode.QuickPickItem & { mode: string };
            mockExecFileSuccess('deployment.apps/my-app created (dry run)');

            await applyYAMLCommand(testUri);

            // Should execute kubectl apply with --dry-run=server
            assert.strictEqual(execFileCalls.length, 1, 'Should execute kubectl command');
            assert.deepStrictEqual(execFileCalls[0].args, ['apply', '-f', testUri.fsPath, '--dry-run=server'], 'Should use --dry-run=server flag');
        });

        test('executes with --dry-run=client for client mode', async () => {
            const testUri = vscode.Uri.file('/test/path/deployment.yaml');
            quickPickReturnValue = { label: 'Dry Run (Client)', mode: 'dry-run-client' } as vscode.QuickPickItem & { mode: string };
            mockExecFileSuccess('deployment.apps/my-app created (dry run)');

            await applyYAMLCommand(testUri);

            // Should execute kubectl apply with --dry-run=client
            assert.strictEqual(execFileCalls.length, 1, 'Should execute kubectl command');
            assert.deepStrictEqual(execFileCalls[0].args, ['apply', '-f', testUri.fsPath, '--dry-run=client'], 'Should use --dry-run=client flag');
        });
    });

    suite('Output Parsing', () => {
        test('parses single resource output', async () => {
            const testUri = vscode.Uri.file('/test/path/deployment.yaml');
            quickPickReturnValue = { label: 'Apply', mode: 'apply' } as vscode.QuickPickItem & { mode: string };
            const output = 'deployment.apps/my-app created';
            mockExecFileSuccess(output);

            // Clear messages before test
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (vscode.window as any)._clearMessages();
            
            await applyYAMLCommand(testUri);

            // Should show success notification with resource name
            // The message should be the resource string itself for single resource
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const infoMessages = (vscode.window as any)._getInfoMessages();
            assert.ok(infoMessages.length > 0, 'Should show success notification');
            // For single resource, the message is the resource string: "deployment.apps/my-app created"
            assert.ok(infoMessages.some((msg: string) => msg.includes('my-app') || msg.includes('deployment.apps')), 'Notification should contain resource name');
        });

        test('parses multi-resource output', async () => {
            const testUri = vscode.Uri.file('/test/path/multi-resource.yaml');
            quickPickReturnValue = { label: 'Apply', mode: 'apply' } as vscode.QuickPickItem & { mode: string };
            const output = 'deployment.apps/my-app created\nservice/my-service created\nconfigmap/my-config created';
            mockExecFileSuccess(output);

            // Clear messages before test
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (vscode.window as any)._clearMessages();

            await applyYAMLCommand(testUri);

            // Should show success notification with resource count
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const infoMessages = (vscode.window as any)._getInfoMessages();
            assert.ok(infoMessages.length > 0, 'Should show success notification');
            // For multiple resources, the message should be: "3 resources applied successfully"
            assert.ok(infoMessages.some((msg: string) => msg.includes('3 resources') || msg.includes('resources applied')), 'Notification should mention resource count');
        });
    });

    suite('Error Handling', () => {
        test('shows error notification on kubectl failure', async () => {
            const testUri = vscode.Uri.file('/test/path/deployment.yaml');
            quickPickReturnValue = { label: 'Apply', mode: 'apply' } as vscode.QuickPickItem & { mode: string };
            
            // Mock kubectl error
            mockExecFileError({
                code: 'ERR_KUBECTL_FAILED',
                message: 'kubectl failed',
                stderr: 'Error: resource already exists'
            });

            await applyYAMLCommand(testUri);

            // Should show error notification
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorMessages = (vscode.window as any)._getErrorMessages();
            assert.ok(errorMessages.length > 0, 'Should show error notification');
            assert.ok(errorMessages.some((msg: string) => msg.includes('Failed') || msg.includes('error') || msg.includes('cluster')), 'Error message should be shown');
        });

        test('logs error to output channel', async () => {
            const testUri = vscode.Uri.file('/test/path/deployment.yaml');
            quickPickReturnValue = { label: 'Apply', mode: 'apply' } as vscode.QuickPickItem & { mode: string };
            
            // Mock kubectl error
            const errorStderr = 'Error: resource already exists';
            mockExecFileError({
                code: 'ERR_KUBECTL_FAILED',
                message: 'kubectl failed',
                stderr: errorStderr
            });

            await applyYAMLCommand(testUri);

            // Should have created output channel and logged error
            const outputChannel = vscode.window.createOutputChannel('kube9');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const channelContent = (outputChannel as any)._getContent();
            assert.ok(channelContent.includes('Apply failed') || channelContent.includes('✗'), 'Should log error to output channel');
        });

        test('handles binary not found error', async () => {
            const testUri = vscode.Uri.file('/test/path/deployment.yaml');
            quickPickReturnValue = { label: 'Apply', mode: 'apply' } as vscode.QuickPickItem & { mode: string };
            
            // Mock kubectl binary not found
            mockExecFileError({
                code: 'ENOENT',
                message: 'kubectl not found'
            });

            await applyYAMLCommand(testUri);

            // Should show error notification
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorMessages = (vscode.window as any)._getErrorMessages();
            assert.ok(errorMessages.length > 0, 'Should show error notification for binary not found');
        });

        test('handles connection failed error', async () => {
            const testUri = vscode.Uri.file('/test/path/deployment.yaml');
            quickPickReturnValue = { label: 'Apply', mode: 'apply' } as vscode.QuickPickItem & { mode: string };
            
            // Mock connection error
            mockExecFileError({
                code: 'ERR_CONNECTION_REFUSED',
                message: 'Connection refused',
                stderr: 'Unable to connect to the server: dial tcp: connection refused'
            });

            await applyYAMLCommand(testUri);

            // Should show error notification
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorMessages = (vscode.window as any)._getErrorMessages();
            assert.ok(errorMessages.length > 0, 'Should show error notification for connection failure');
        });

        test('handles timeout error', async () => {
            const testUri = vscode.Uri.file('/test/path/deployment.yaml');
            quickPickReturnValue = { label: 'Apply', mode: 'apply' } as vscode.QuickPickItem & { mode: string };
            
            // Mock timeout error
            mockExecFileError({
                killed: true,
                signal: 'SIGTERM',
                message: 'Command timed out',
                stderr: 'Operation timed out'
            });

            await applyYAMLCommand(testUri);

            // Should show error notification
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorMessages = (vscode.window as any)._getErrorMessages();
            assert.ok(errorMessages.length > 0, 'Should show error notification for timeout');
        });
    });
});

