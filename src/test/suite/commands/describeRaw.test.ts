import * as assert from 'assert';
import * as Module from 'module';
import * as vscode from 'vscode';
import { ClusterTreeItem } from '../../../tree/ClusterTreeItem';
import { TreeItemType } from '../../../tree/TreeItemTypes';
import { KubeconfigParser } from '../../../kubernetes/KubeconfigParser';
import { DescribeRawFileSystemProvider } from '../../../commands/DescribeRawFileSystemProvider';

// Store original require for restoration
const originalRequire = Module.prototype.require;

// Set up module interception variables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockExecFileResponse: { type: 'success'; stdout: string; stderr: string } | { type: 'error'; error: any } | null = null;
let execFileCalls: Array<{ command: string; args: string[] }> = [];
let isProxyActive = false;

// Track VS Code API calls
let showErrorMessageCalls: string[] = [];
let openTextDocumentCalls: vscode.Uri[] = [];
let showTextDocumentCalls: Array<{ document: vscode.TextDocument; options?: vscode.TextDocumentShowOptions }> = [];
let openTextDocumentReturnValue: vscode.TextDocument | undefined = undefined;

suite('describeRaw Command Tests', () => {
    // Store original functions for restoration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalShowErrorMessage: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalOpenTextDocument: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalShowTextDocument: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalGetKubeconfigPath: any;
    let describeRawModule: typeof import('../../../commands/describeRaw');
    let describeRawCommand: typeof import('../../../commands/describeRaw').describeRawCommand;

    setup(() => {
        // Reset call tracking
        execFileCalls = [];
        showErrorMessageCalls = [];
        openTextDocumentCalls = [];
        showTextDocumentCalls = [];
        openTextDocumentReturnValue = undefined;
        mockExecFileResponse = null;

        // Mock KubeconfigParser.getKubeconfigPath
        originalGetKubeconfigPath = KubeconfigParser.getKubeconfigPath;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (KubeconfigParser as any).getKubeconfigPath = (): string => {
            return '/path/to/kubeconfig';
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
        originalOpenTextDocument = (vscode.workspace as any).openTextDocument;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalShowTextDocument = (vscode.window as any).showTextDocument;

        // Mock showErrorMessage
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.window as any).showErrorMessage = async (message: string, ...items: string[]): Promise<string | undefined> => {
            showErrorMessageCalls.push(message);
            return Promise.resolve(items[0]);
        };

        // Mock openTextDocument
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.workspace as any).openTextDocument = async (uri: vscode.Uri): Promise<vscode.TextDocument> => {
            openTextDocumentCalls.push(uri);
            if (openTextDocumentReturnValue) {
                return openTextDocumentReturnValue;
            }
            // Create a mock document
            return {
                uri: uri,
                fileName: uri.path,
                isUntitled: false,
                languageId: 'plaintext',
                version: 1,
                isDirty: false,
                isClosed: false,
                save: async () => Promise.resolve(false),
                eol: vscode.EndOfLine.LF,
                encoding: 'utf8',
                lineCount: 1,
                lineAt: () => ({
                    text: '',
                    range: new vscode.Range(0, 0, 0, 0),
                    rangeIncludingLineBreak: new vscode.Range(0, 0, 1, 0),
                    lineNumber: 0,
                    firstNonWhitespaceCharacterIndex: 0,
                    isEmptyOrWhitespace: true
                }),
                offsetAt: () => 0,
                positionAt: () => new vscode.Position(0, 0),
                getText: () => '',
                getWordRangeAtPosition: () => undefined,
                validateRange: () => new vscode.Range(0, 0, 0, 0),
                validatePosition: () => new vscode.Position(0, 0)
            } as vscode.TextDocument;
        };

        // Mock showTextDocument
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.window as any).showTextDocument = async (
            document: vscode.TextDocument,
            options?: vscode.TextDocumentShowOptions
        ): Promise<vscode.TextEditor> => {
            showTextDocumentCalls.push({ document, options });
            return {
                document: document,
                selection: new vscode.Selection(0, 0, 0, 0),
                selections: [new vscode.Selection(0, 0, 0, 0)],
                visibleRanges: [new vscode.Range(0, 0, 0, 0)],
                viewColumn: vscode.ViewColumn.One,
                options: {},
                edit: async () => Promise.resolve(true),
                insertSnippet: async () => Promise.resolve(true),
                setDecorations: () => {},
                revealRange: () => {},
                show: () => {},
                hide: () => {}
            } as vscode.TextEditor;
        };

        // Clear module cache to force reload with mocked execFile
        const describeRawPath = require.resolve('../../../commands/describeRaw');
        delete require.cache[describeRawPath];
        
        // Don't clear DescribeRawFileSystemProvider cache - we want to use the same
        // singleton instance across the test and command execution
        
        // Now import the module - it will use the mocked execFile
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        describeRawModule = require('../../../commands/describeRaw');
        
        // Get the command function from the reloaded module
        describeRawCommand = describeRawModule.describeRawCommand;
    });

    teardown(() => {
        // Restore original functions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.window as any).showErrorMessage = originalShowErrorMessage;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.workspace as any).openTextDocument = originalOpenTextDocument;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vscode.window as any).showTextDocument = originalShowTextDocument;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (KubeconfigParser as any).getKubeconfigPath = originalGetKubeconfigPath;
        
        // Restore require
        Module.prototype.require = originalRequire;
        isProxyActive = false;
    });

    /**
     * Helper function to mock execFile with success response
     */
    function mockExecFileSuccess(stdout: string, stderr: string = ''): void {
        mockExecFileResponse = { type: 'success', stdout, stderr };
    }

    /**
     * Helper function to mock execFile with error
     */
    function mockExecFileError(error: Error): void {
        mockExecFileResponse = { type: 'error', error };
    }

    /**
     * Helper function to create a deployment tree item
     */
    function createDeploymentTreeItem(name: string, namespace: string, contextName: string = 'test-context'): ClusterTreeItem {
        const item = new ClusterTreeItem(
            name,
            'deployment' as TreeItemType,
            vscode.TreeItemCollapsibleState.None,
            {
                resourceName: name,
                namespace: namespace,
                context: {
                    name: contextName,
                    cluster: 'test-cluster'
                },
                cluster: {
                    name: 'test-cluster',
                    server: 'https://test-cluster.example.com'
                }
            }
        );
        item.contextValue = 'resource:Deployment';
        return item;
    }

    suite('Deployment Resource Handling', () => {
        test('should extract Deployment kind from contextValue', async () => {
            const treeItem = createDeploymentTreeItem('nginx-deployment', 'default');
            mockExecFileSuccess('Name: nginx-deployment\nNamespace: default\n...');

            await describeRawCommand(treeItem);

            assert.strictEqual(execFileCalls.length, 1, 'Should execute kubectl command');
            assert.strictEqual(execFileCalls[0].command, 'kubectl', 'Should execute kubectl');
            assert.strictEqual(execFileCalls[0].args[0], 'describe', 'Should use describe subcommand');
            assert.strictEqual(execFileCalls[0].args[1], 'deployment', 'Should use deployment kind');
            assert.strictEqual(execFileCalls[0].args[2], 'nginx-deployment', 'Should use deployment name');
        });

        test('should include namespace in kubectl command for namespaced resource', async () => {
            const treeItem = createDeploymentTreeItem('nginx-deployment', 'production');
            mockExecFileSuccess('Name: nginx-deployment\nNamespace: production\n...');

            await describeRawCommand(treeItem);

            assert.strictEqual(execFileCalls.length, 1, 'Should execute kubectl command');
            const args = execFileCalls[0].args;
            const namespaceIndex = args.indexOf('-n');
            assert.ok(namespaceIndex >= 0, 'Should include -n flag');
            assert.strictEqual(args[namespaceIndex + 1], 'production', 'Should include namespace value');
        });

        test('should not include namespace flag when namespace is undefined', async () => {
            const treeItem = createDeploymentTreeItem('nginx-deployment', 'default');
            // Remove namespace from resourceData
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (treeItem.resourceData as any).namespace = undefined;
            mockExecFileSuccess('Name: nginx-deployment\n...');

            await describeRawCommand(treeItem);

            assert.strictEqual(execFileCalls.length, 1, 'Should execute kubectl command');
            const args = execFileCalls[0].args;
            assert.strictEqual(args.indexOf('-n'), -1, 'Should not include -n flag when namespace is undefined');
        });

        test('should include kubeconfig and context flags', async () => {
            const treeItem = createDeploymentTreeItem('nginx-deployment', 'default', 'my-context');
            mockExecFileSuccess('Name: nginx-deployment\n...');

            await describeRawCommand(treeItem);

            assert.strictEqual(execFileCalls.length, 1, 'Should execute kubectl command');
            const args = execFileCalls[0].args;
            assert.ok(args.some(arg => arg.startsWith('--kubeconfig=')), 'Should include --kubeconfig flag');
            assert.ok(args.some(arg => arg.startsWith('--context=')), 'Should include --context flag');
            assert.ok(args.some(arg => arg === '--context=my-context'), 'Should include correct context name');
        });
    });

    suite('Tab Title with Namespace', () => {
        test('should include namespace in URI path when namespace is present', async () => {
            const treeItem = createDeploymentTreeItem('nginx-deployment', 'production');
            mockExecFileSuccess('Name: nginx-deployment\nNamespace: production\n...');

            try {
                await describeRawCommand(treeItem);
            } catch (error) {
                console.error('Command failed:', error);
                throw error;
            }

            assert.strictEqual(openTextDocumentCalls.length, 1, 'Should open text document');
            const uri = openTextDocumentCalls[0];
            assert.strictEqual(uri.scheme, 'kube9-describe', 'Should use kube9-describe scheme');
            assert.ok(uri.path.includes('production'), 'URI path should include namespace');
            assert.ok(uri.path.includes('nginx-deployment'), 'URI path should include deployment name');
            assert.ok(uri.path.endsWith('.describe'), 'URI path should end with .describe');
        });

        test('should not include namespace in URI path when namespace is undefined', async () => {
            const treeItem = createDeploymentTreeItem('nginx-deployment', 'default');
            // Remove namespace from resourceData
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (treeItem.resourceData as any).namespace = undefined;
            mockExecFileSuccess('Name: nginx-deployment\n...');

            await describeRawCommand(treeItem);

            assert.strictEqual(openTextDocumentCalls.length, 1, 'Should open text document');
            const uri = openTextDocumentCalls[0];
            assert.strictEqual(uri.scheme, 'kube9-describe', 'Should use kube9-describe scheme');
            // Path should be /nginx-deployment.describe (no namespace prefix)
            assert.strictEqual(uri.path, '/nginx-deployment.describe', 'URI path should not include namespace when undefined');
        });

        test('should store content with namespace-prefixed key when namespace is present', async () => {
            const treeItem = createDeploymentTreeItem('nginx-deployment', 'production');
            const describeOutput = 'Name: nginx-deployment\nNamespace: production\n...';
            mockExecFileSuccess(describeOutput);

            // Get the provider instance BEFORE the command runs to ensure we use the same instance
            const fsProviderBefore = DescribeRawFileSystemProvider.getInstance();
            
            await describeRawCommand(treeItem);

            // Use the same instance to retrieve content
            const fsProviderAfter = DescribeRawFileSystemProvider.getInstance();
            assert.strictEqual(fsProviderBefore, fsProviderAfter, 'Should use same singleton instance');
            const content = fsProviderAfter.getContent('production/nginx-deployment.describe');
            assert.strictEqual(content, describeOutput, 'Content should be stored with namespace-prefixed key');
        });

        test('should store content without namespace prefix when namespace is undefined', async () => {
            const treeItem = createDeploymentTreeItem('nginx-deployment', 'default');
            // Remove namespace from resourceData
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (treeItem.resourceData as any).namespace = undefined;
            const describeOutput = 'Name: nginx-deployment\n...';
            mockExecFileSuccess(describeOutput);

            // Get the provider instance BEFORE the command runs to ensure we use the same instance
            const fsProviderBefore = DescribeRawFileSystemProvider.getInstance();
            
            await describeRawCommand(treeItem);

            // Use the same instance to retrieve content
            const fsProviderAfter = DescribeRawFileSystemProvider.getInstance();
            assert.strictEqual(fsProviderBefore, fsProviderAfter, 'Should use same singleton instance');
            const content = fsProviderAfter.getContent('nginx-deployment.describe');
            assert.strictEqual(content, describeOutput, 'Content should be stored without namespace prefix');
        });
    });

    suite('Error Handling', () => {
        test('should show error message when tree item is invalid', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const invalidTreeItem: any = null;

            await describeRawCommand(invalidTreeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error message');
            assert.ok(showErrorMessageCalls[0].includes('Invalid tree item'), 'Error should mention invalid tree item');
            assert.strictEqual(execFileCalls.length, 0, 'Should not execute kubectl command');
        });

        test('should show error message when resourceData is missing', async () => {
            const treeItem = new ClusterTreeItem('test', 'deployment' as TreeItemType);
            treeItem.contextValue = 'resource:Deployment';
            // resourceData is undefined

            await describeRawCommand(treeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error message');
            assert.ok(showErrorMessageCalls[0].includes('Invalid tree item'), 'Error should mention invalid tree item');
            assert.strictEqual(execFileCalls.length, 0, 'Should not execute kubectl command');
        });

        test('should show error message when kubectl command fails', async () => {
            const treeItem = createDeploymentTreeItem('nginx-deployment', 'default');
            const kubectlError = new Error('kubectl: command not found');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (kubectlError as any).code = 'ENOENT';
            mockExecFileError(kubectlError);

            await describeRawCommand(treeItem);

            assert.strictEqual(execFileCalls.length, 1, 'Should attempt to execute kubectl command');
            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error message');
            assert.ok(showErrorMessageCalls[0].includes('Failed to describe'), 'Error should mention describe failure');
            assert.ok(showErrorMessageCalls[0].includes('Deployment'), 'Error should mention resource kind');
            assert.ok(showErrorMessageCalls[0].includes('nginx-deployment'), 'Error should mention resource name');
            assert.strictEqual(openTextDocumentCalls.length, 0, 'Should not open document on error');
        });

        test('should handle kubectl timeout gracefully', async () => {
            const treeItem = createDeploymentTreeItem('nginx-deployment', 'default');
            const timeoutError = new Error('Command timed out');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (timeoutError as any).code = 'ETIMEDOUT';
            mockExecFileError(timeoutError);

            await describeRawCommand(treeItem);

            assert.strictEqual(showErrorMessageCalls.length, 1, 'Should show error message');
            assert.strictEqual(openTextDocumentCalls.length, 0, 'Should not open document on timeout');
        });
    });

    suite('Document Opening', () => {
        test('should open document in read-only editor', async () => {
            const treeItem = createDeploymentTreeItem('nginx-deployment', 'default');
            mockExecFileSuccess('Name: nginx-deployment\n...');

            await describeRawCommand(treeItem);

            assert.strictEqual(openTextDocumentCalls.length, 1, 'Should open text document');
            assert.strictEqual(showTextDocumentCalls.length, 1, 'Should show text document');
            const showOptions = showTextDocumentCalls[0].options;
            assert.strictEqual(showOptions?.preview, false, 'Should not open in preview mode');
            assert.strictEqual(showOptions?.preserveFocus, false, 'Should not preserve focus');
        });

        test('should use correct URI scheme', async () => {
            const treeItem = createDeploymentTreeItem('nginx-deployment', 'production');
            mockExecFileSuccess('Name: nginx-deployment\n...');

            await describeRawCommand(treeItem);

            assert.strictEqual(openTextDocumentCalls.length, 1, 'Should open text document');
            const uri = openTextDocumentCalls[0];
            assert.strictEqual(uri.scheme, 'kube9-describe', 'Should use kube9-describe URI scheme');
        });
    });
});

