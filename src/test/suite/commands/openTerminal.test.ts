import * as assert from 'assert';
import * as Module from 'module';
import * as vscode from 'vscode';
import { ClusterTreeItem } from '../../../tree/ClusterTreeItem';
import { TreeItemType } from '../../../tree/TreeItemTypes';

// Store original require for restoration
const originalRequire = Module.prototype.require;

// Set up module interception variables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockExecFileResponse: { type: 'success'; stdout: string; stderr: string } | { type: 'error'; error: any } | null = null;
let execFileCalls: Array<{ command: string; args: string[] }> = [];
let isProxyActive = false;

// Track VS Code API calls
let showErrorMessageCalls: string[] = [];
let showQuickPickCalls: Array<{ items: readonly string[]; options?: vscode.QuickPickOptions }> = [];
let showQuickPickReturnValue: string | undefined = undefined;
let createTerminalCalls: Array<{ name?: string }> = [];
let terminalSendTextCalls: string[] = [];
let terminalShowCalls: number = 0;

suite('openTerminal Command Tests', () => {
    // Store original functions for restoration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalShowErrorMessage: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalShowQuickPick: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalCreateTerminal: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalGetClusterTreeProvider: any;
    // Imported modules (loaded after mocks are set up)
    let openTerminalModule: typeof import('../../../commands/openTerminal');

    setup(() => {
        // Reset call tracking
        execFileCalls = [];
        showErrorMessageCalls = [];
        showQuickPickCalls = [];
        showQuickPickReturnValue = undefined;
        createTerminalCalls = [];
        terminalSendTextCalls = [];
        terminalShowCalls = 0;
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
        originalShowErrorMessage = (vscode.window as any).showErrorMessage;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalShowQuickPick = (vscode.window as any).showQuickPick;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalCreateTerminal = (vscode.window as any).createTerminal;

        // Mock showErrorMessage
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.window as any).showErrorMessage = async (message: string, ...items: string[]): Promise<string | undefined> => {
            showErrorMessageCalls.push(message);
            return Promise.resolve(items[0]);
        };

        // Mock showQuickPick
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.window as any).showQuickPick = async <T extends vscode.QuickPickItem>(
            items: readonly T[] | Thenable<readonly T[]>,
            options?: vscode.QuickPickOptions
        ): Promise<T | undefined> => {
            const resolvedItems = await Promise.resolve(items);
            // Extract string items from QuickPickItem array
            const stringItems = resolvedItems.map(item => 
                typeof item === 'string' ? item : item.label
            );
            showQuickPickCalls.push({ items: stringItems, options });
            return showQuickPickReturnValue as T | undefined;
        };

        // Mock createTerminal
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.window as any).createTerminal = (options?: vscode.TerminalOptions): vscode.Terminal => {
            createTerminalCalls.push({ name: options?.name });
            
            // Create mock terminal object
            const mockTerminal: vscode.Terminal = {
                name: options?.name || 'Terminal',
                processId: Promise.resolve(123),
                creationOptions: options,
                exitStatus: undefined,
                state: {
                    isInteractedWith: false,
                    shell: undefined
                },
                shellIntegration: undefined,
                sendText: (text: string) => {
                    terminalSendTextCalls.push(text);
                },
                show: () => {
                    terminalShowCalls++;
                },
                hide: () => {},
                dispose: () => {}
            } as vscode.Terminal;
            
            return mockTerminal;
        };

        // Mock getClusterTreeProvider
        const mockTreeProvider = {
            getKubeconfigPath: () => '/test/kubeconfig'
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

        // Clear module cache for openTerminal to ensure it uses mocked execFile
        const openTerminalPath = require.resolve('../../../commands/openTerminal');
        delete require.cache[openTerminalPath];
        
        // Now import the module - it will use the mocked execFile
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
        openTerminalModule = require('../../../commands/openTerminal');
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
        if (originalShowErrorMessage) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (vscode.window as any).showErrorMessage = originalShowErrorMessage;
        }
        if (originalShowQuickPick) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (vscode.window as any).showQuickPick = originalShowQuickPick;
        }
        if (originalCreateTerminal) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (vscode.window as any).createTerminal = originalCreateTerminal;
        }
        if (originalGetClusterTreeProvider) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
            const extensionRequire = require('../../../extension');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (extensionRequire as any).getClusterTreeProvider = originalGetClusterTreeProvider;
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
     * Helper function to create a mock Pod tree item
     */
    function createMockPodTreeItem(podName: string, namespace: string = 'default'): ClusterTreeItem {
        const contextValue = 'resource:Pod';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const item = new ClusterTreeItem(
            podName,
            'pod' as TreeItemType,
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
                resourceName: podName,
                namespace: namespace
            }
        );
        item.contextValue = contextValue;
        return item;
    }

    /**
     * Helper function to create mock pod status JSON
     */
    function createMockPodStatus(phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown', containers: Array<{ name: string; image: string }>): string {
        return JSON.stringify({
            metadata: {
                name: 'test-pod',
                namespace: 'default'
            },
            spec: {
                containers: containers
            },
            status: {
                phase: phase
            }
        });
    }

    /**
     * Helper function to configure showQuickPick return value
     */
    function mockShowQuickPick(returnValue: string | undefined): void {
        showQuickPickReturnValue = returnValue;
    }

    suite('Tree Item Validation', () => {
        test('valid Pod tree item passes validation', async () => {
            const podStatus = createMockPodStatus('Running', [{ name: 'main', image: 'nginx' }]);
            mockExecFileSuccess(podStatus);
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            // Should not show error
            assert.strictEqual(showErrorMessageCalls.length, 0, 'Should not show error for valid Pod');
        });

        test('non-Pod resource shows error', async () => {
            const treeItem = createMockPodTreeItem('test-deployment', 'default');
            treeItem.contextValue = 'resource:Deployment';
            
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error');
            assert.ok(showErrorMessageCalls[0].includes('not a Pod'), 'Error should mention not a Pod');
        });

        test('missing resourceData shows error', async () => {
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (treeItem as any).resourceData = undefined;
            
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error');
            assert.ok(showErrorMessageCalls[0].includes('Missing resource data'), 'Error should mention missing resource data');
        });

        test('missing context name shows error', async () => {
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            if (treeItem.resourceData) {
                treeItem.resourceData.context.name = '';
            }
            
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error');
            assert.ok(showErrorMessageCalls[0].includes('Missing resource information'), 'Error should mention missing resource information');
        });

        test('missing kubeconfig path shows error', async () => {
            // Mock getClusterTreeProvider to return null kubeconfig path
            // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
            const extensionRequire = require('../../../extension');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const originalGetClusterTreeProvider = (extensionRequire as any).getClusterTreeProvider;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (extensionRequire as any).getClusterTreeProvider = () => ({
                getKubeconfigPath: () => null
            });

            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error');
            assert.ok(showErrorMessageCalls[0].includes('Kubeconfig path not available'), 'Error should mention kubeconfig path');

            // Restore original
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (extensionRequire as any).getClusterTreeProvider = originalGetClusterTreeProvider;
        });
    });

    suite('Pod Status Query', () => {
        test('successfully queries pod status with correct kubectl args', async () => {
            const podStatus = createMockPodStatus('Running', [{ name: 'main', image: 'nginx' }]);
            mockExecFileSuccess(podStatus);
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(execFileCalls.length, 1, 'Should execute kubectl command');
            const call = execFileCalls[0];
            assert.strictEqual(call.command, 'kubectl', 'Should use kubectl');
            assert.ok(call.args.includes('get'), 'Should use get command');
            assert.ok(call.args.includes('pod'), 'Should use pod resource type');
            assert.ok(call.args.includes('test-pod'), 'Should include pod name');
            assert.ok(call.args.some(arg => arg.includes('--namespace=default') || arg.includes('--namespace')), 'Should include namespace');
            assert.ok(call.args.some(arg => arg.includes('--context=test-context') || arg.includes('--context')), 'Should include context');
            assert.ok(call.args.some(arg => arg.includes('--kubeconfig=/test/kubeconfig') || arg.includes('--kubeconfig')), 'Should include kubeconfig');
            assert.ok(call.args.includes('--output=json'), 'Should use JSON output');
        });

        test('handles Running state - allows terminal creation', async () => {
            const podStatus = createMockPodStatus('Running', [{ name: 'main', image: 'nginx' }]);
            mockExecFileSuccess(podStatus);
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            // Should create terminal
            assert.strictEqual(createTerminalCalls.length, 1, 'Should create terminal for Running pod');
            assert.strictEqual(showErrorMessageCalls.length, 0, 'Should not show error');
        });

        test('handles Pending state - shows error', async () => {
            const podStatus = createMockPodStatus('Pending', [{ name: 'main', image: 'nginx' }]);
            mockExecFileSuccess(podStatus);
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error');
            assert.ok(showErrorMessageCalls[0].includes('not in Running state'), 'Error should mention not Running');
            assert.ok(showErrorMessageCalls[0].includes('Pending'), 'Error should mention current state');
        });

        test('handles Failed state - shows error', async () => {
            const podStatus = createMockPodStatus('Failed', [{ name: 'main', image: 'nginx' }]);
            mockExecFileSuccess(podStatus);
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error');
            assert.ok(showErrorMessageCalls[0].includes('not in Running state'), 'Error should mention not Running');
        });

        test('handles Succeeded state - shows error', async () => {
            const podStatus = createMockPodStatus('Succeeded', [{ name: 'main', image: 'nginx' }]);
            mockExecFileSuccess(podStatus);
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error');
            assert.ok(showErrorMessageCalls[0].includes('not in Running state'), 'Error should mention not Running');
        });

        test('handles pod not found error', async () => {
            // Use a non-ENOENT code to avoid binary not found detection
            // Pod not found errors come from kubectl with exit code 1
            mockExecFileError({
                code: '1',
                message: 'Error from server (NotFound): pods "test-pod" not found',
                stderr: 'Error from server (NotFound): pods "test-pod" not found'
            });
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error');
            assert.ok(showErrorMessageCalls[0].includes('not found'), 'Error should mention not found');
            assert.ok(showErrorMessageCalls[0].includes('test-pod'), 'Error should include pod name');
        });
    });

    suite('Container Selection', () => {
        test('single-container pod skips selection dialog', async () => {
            const podStatus = createMockPodStatus('Running', [{ name: 'main', image: 'nginx' }]);
            mockExecFileSuccess(podStatus);
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            // Should not show quick pick for single container
            assert.strictEqual(showQuickPickCalls.length, 0, 'Should not show quick pick for single container');
            // Should create terminal
            assert.strictEqual(createTerminalCalls.length, 1, 'Should create terminal');
        });

        test('multi-container pod shows quick pick', async () => {
            const podStatus = createMockPodStatus('Running', [
                { name: 'main', image: 'nginx' },
                { name: 'sidecar', image: 'sidecar:latest' }
            ]);
            mockExecFileSuccess(podStatus);
            mockShowQuickPick('sidecar');
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(showQuickPickCalls.length, 1, 'Should show quick pick for multi-container');
            const call = showQuickPickCalls[0];
            assert.strictEqual(call.items.length, 2, 'Should show both containers');
            assert.ok(call.items.includes('main'), 'Should include main container');
            assert.ok(call.items.includes('sidecar'), 'Should include sidecar container');
            assert.ok(call.options?.title === 'Select Container', 'Should have correct title');
            assert.ok(call.options?.placeHolder?.includes('container'), 'Should have container placeholder');
        });

        test('user cancels selection - no terminal created', async () => {
            const podStatus = createMockPodStatus('Running', [
                { name: 'main', image: 'nginx' },
                { name: 'sidecar', image: 'sidecar:latest' }
            ]);
            mockExecFileSuccess(podStatus);
            mockShowQuickPick(undefined); // User cancelled
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(showQuickPickCalls.length, 1, 'Should show quick pick');
            assert.strictEqual(createTerminalCalls.length, 0, 'Should not create terminal when cancelled');
            assert.strictEqual(showErrorMessageCalls.length, 0, 'Should not show error');
        });

        test('empty container list shows error', async () => {
            const podStatus = createMockPodStatus('Running', []);
            mockExecFileSuccess(podStatus);
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error');
            assert.ok(showErrorMessageCalls[0].includes('No containers found'), 'Error should mention no containers');
        });
    });

    suite('Command Building', () => {
        test('single-container command format is correct', async () => {
            const podStatus = createMockPodStatus('Running', [{ name: 'main', image: 'nginx' }]);
            mockExecFileSuccess(podStatus);
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(terminalSendTextCalls.length, 1, 'Should send command to terminal');
            const command = terminalSendTextCalls[0];
            assert.ok(command.includes('kubectl'), 'Should include kubectl');
            assert.ok(command.includes('exec'), 'Should include exec');
            assert.ok(command.includes('-it'), 'Should include -it flag');
            assert.ok(command.includes('test-pod'), 'Should include pod name');
            assert.ok(command.includes('-n default'), 'Should include namespace');
            assert.ok(command.includes('--context test-context'), 'Should include context');
            assert.ok(command.includes('-- /bin/sh'), 'Should include shell command');
            // Note: Current implementation includes -c flag even for single container
            // This is acceptable as kubectl exec works with or without -c for single container pods
            assert.ok(command.includes('-c main'), 'Should include -c flag with container name');
        });

        test('multi-container command includes -c flag', async () => {
            const podStatus = createMockPodStatus('Running', [
                { name: 'main', image: 'nginx' },
                { name: 'sidecar', image: 'sidecar:latest' }
            ]);
            mockExecFileSuccess(podStatus);
            mockShowQuickPick('sidecar');
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(terminalSendTextCalls.length, 1, 'Should send command to terminal');
            const command = terminalSendTextCalls[0];
            assert.ok(command.includes('-c sidecar'), 'Should include -c flag with container name');
        });

        test('terminal name format for single-container', async () => {
            const podStatus = createMockPodStatus('Running', [{ name: 'main', image: 'nginx' }]);
            mockExecFileSuccess(podStatus);
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(createTerminalCalls.length, 1, 'Should create terminal');
            const terminalCall = createTerminalCalls[0];
            // Note: Current implementation includes container name even for single container
            // This is acceptable for consistency
            assert.strictEqual(terminalCall.name, 'Kube9: default/test-pod (main)', 'Should have correct terminal name with container');
        });

        test('terminal name format for multi-container', async () => {
            const podStatus = createMockPodStatus('Running', [
                { name: 'main', image: 'nginx' },
                { name: 'sidecar', image: 'sidecar:latest' }
            ]);
            mockExecFileSuccess(podStatus);
            mockShowQuickPick('sidecar');
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(createTerminalCalls.length, 1, 'Should create terminal');
            const terminalCall = createTerminalCalls[0];
            assert.strictEqual(terminalCall.name, 'Kube9: default/test-pod (sidecar)', 'Should have correct terminal name with container');
        });

        test('terminal receives correct kubectl exec command via sendText', async () => {
            const podStatus = createMockPodStatus('Running', [{ name: 'main', image: 'nginx' }]);
            mockExecFileSuccess(podStatus);
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(terminalSendTextCalls.length, 1, 'Should call sendText once');
            const command = terminalSendTextCalls[0];
            assert.ok(command.startsWith('kubectl exec'), 'Command should start with kubectl exec');
        });

        test('terminal is shown via show', async () => {
            const podStatus = createMockPodStatus('Running', [{ name: 'main', image: 'nginx' }]);
            mockExecFileSuccess(podStatus);
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(terminalShowCalls, 1, 'Should call show once');
        });
    });

    suite('Error Handling', () => {
        test('kubectl not found error - shows appropriate message', async () => {
            mockExecFileError({
                code: 'ENOENT',
                message: 'spawn kubectl ENOENT'
            });
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error');
            assert.ok(showErrorMessageCalls[0].includes('kubectl not found'), 'Error should mention kubectl not found');
        });

        test('permission denied error - shows RBAC message', async () => {
            mockExecFileError({
                code: 'EPERM',
                message: 'Error from server (Forbidden): pods "test-pod" is forbidden: User cannot exec into pod',
                stderr: 'Error from server (Forbidden): pods "test-pod" is forbidden: User cannot exec into pod'
            });
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error');
            assert.ok(showErrorMessageCalls[0].includes('Permission denied'), 'Error should mention permission denied');
            assert.ok(showErrorMessageCalls[0].includes('RBAC'), 'Error should mention RBAC');
        });

        test('connection error - shows connection message', async () => {
            mockExecFileError({
                code: 'ECONNREFUSED',
                message: 'Unable to connect to the server: dial tcp: connection refused',
                stderr: 'Unable to connect to the server: dial tcp: connection refused'
            });
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error');
            assert.ok(showErrorMessageCalls[0].includes('Failed to connect'), 'Error should mention connection failure');
        });

        test('pod not found error - shows pod not found message', async () => {
            // Use exit code 1 (kubectl error) instead of ENOENT to avoid binary not found detection
            mockExecFileError({
                code: '1',
                message: 'Error from server (NotFound): pods "test-pod" not found',
                stderr: 'Error from server (NotFound): pods "test-pod" not found'
            });
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error');
            assert.ok(showErrorMessageCalls[0].includes('not found'), 'Error should mention not found');
            assert.ok(showErrorMessageCalls[0].includes('test-pod'), 'Error should include pod name');
        });

        test('generic error - shows generic error message', async () => {
            mockExecFileError({
                code: 'UNKNOWN',
                message: 'Some unexpected error occurred',
                stderr: 'Some unexpected error occurred'
            });
            
            const treeItem = createMockPodTreeItem('test-pod', 'default');
            await openTerminalModule.openTerminalCommand(treeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error');
            assert.ok(showErrorMessageCalls[0].includes('Failed to open terminal'), 'Error should mention failed to open terminal');
        });
    });
});

