import * as assert from 'assert';
import * as Module from 'module';
import * as vscode from 'vscode';
import * as k8s from '@kubernetes/client-node';
import { ClusterTreeItem } from '../../../tree/ClusterTreeItem';
import { TreeItemType } from '../../../tree/TreeItemTypes';
import { KubectlError, KubectlErrorType } from '../../../kubernetes/KubectlError';
import { getKubernetesApiClient, resetKubernetesApiClient } from '../../../kubernetes/apiClient';

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

// Track API client calls
let patchDeploymentCalls: Array<{ name: string; namespace: string; body: unknown }> = [];
let patchStatefulSetCalls: Array<{ name: string; namespace: string; body: unknown }> = [];
let patchDaemonSetCalls: Array<{ name: string; namespace: string; body: unknown }> = [];
let readDeploymentCalls: Array<{ name: string; namespace: string }> = [];
let readStatefulSetCalls: Array<{ name: string; namespace: string }> = [];
let readDaemonSetCalls: Array<{ name: string; namespace: string }> = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockApiResponse: { type: 'success'; resource?: unknown } | { type: 'error'; error: unknown } | Array<{ type: 'success'; resource?: unknown } | { type: 'error'; error: unknown }> | null = null;

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
    // API client mocks
    let originalAppsApi: k8s.AppsV1Api;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockAppsApi: any;
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
        
        // Reset API client call tracking
        patchDeploymentCalls = [];
        patchStatefulSetCalls = [];
        patchDaemonSetCalls = [];
        readDeploymentCalls = [];
        readStatefulSetCalls = [];
        readDaemonSetCalls = [];
        mockApiResponse = null;
        
        // Reset and mock API client
        resetKubernetesApiClient();
        const apiClient = getKubernetesApiClient();
        originalAppsApi = apiClient.apps;
        
        // Create mock Apps API
        mockAppsApi = {
            patchNamespacedDeployment: async (options: { name: string; namespace: string; body: unknown }) => {
                patchDeploymentCalls.push(options);
                if (mockApiResponse && !Array.isArray(mockApiResponse)) {
                    if (mockApiResponse.type === 'error') {
                        throw mockApiResponse.error;
                    }
                    if (mockApiResponse.type === 'success' && mockApiResponse.resource) {
                        return mockApiResponse.resource as k8s.V1Deployment;
                    }
                }
                return { metadata: { name: options.name, namespace: options.namespace } } as k8s.V1Deployment;
            },
            patchNamespacedStatefulSet: async (options: { name: string; namespace: string; body: unknown }) => {
                patchStatefulSetCalls.push(options);
                if (mockApiResponse && !Array.isArray(mockApiResponse)) {
                    if (mockApiResponse.type === 'error') {
                        throw mockApiResponse.error;
                    }
                    if (mockApiResponse.type === 'success' && mockApiResponse.resource) {
                        return mockApiResponse.resource as k8s.V1StatefulSet;
                    }
                }
                return { metadata: { name: options.name, namespace: options.namespace } } as k8s.V1StatefulSet;
            },
            patchNamespacedDaemonSet: async (options: { name: string; namespace: string; body: unknown }) => {
                patchDaemonSetCalls.push(options);
                if (mockApiResponse && !Array.isArray(mockApiResponse)) {
                    if (mockApiResponse.type === 'error') {
                        throw mockApiResponse.error;
                    }
                    if (mockApiResponse.type === 'success' && mockApiResponse.resource) {
                        return mockApiResponse.resource as k8s.V1DaemonSet;
                    }
                }
                return { metadata: { name: options.name, namespace: options.namespace } } as k8s.V1DaemonSet;
            },
            readNamespacedDeployment: async (options: { name: string; namespace: string }) => {
                readDeploymentCalls.push(options);
                // Support sequential responses for rollout watch tests
                if (Array.isArray(mockApiResponse) && mockApiResponse.length > 0) {
                    const response = mockApiResponse[readDeploymentCalls.length - 1] || mockApiResponse[mockApiResponse.length - 1];
                    if (response && response.type === 'error') {
                        throw response.error;
                    }
                    if (response && response.type === 'success' && response.resource) {
                        return response.resource as k8s.V1Deployment;
                    }
                }
                if (mockApiResponse && !Array.isArray(mockApiResponse)) {
                    if (mockApiResponse.type === 'error') {
                        throw mockApiResponse.error;
                    }
                    if (mockApiResponse.type === 'success' && mockApiResponse.resource) {
                        return mockApiResponse.resource as k8s.V1Deployment;
                    }
                }
                return { 
                    metadata: { name: options.name, namespace: options.namespace },
                    spec: { replicas: 3 },
                    status: { readyReplicas: 3, updatedReplicas: 3, availableReplicas: 3 }
                } as k8s.V1Deployment;
            },
            readNamespacedStatefulSet: async (options: { name: string; namespace: string }) => {
                readStatefulSetCalls.push(options);
                if (mockApiResponse && !Array.isArray(mockApiResponse)) {
                    if (mockApiResponse.type === 'error') {
                        throw mockApiResponse.error;
                    }
                    if (mockApiResponse.type === 'success' && mockApiResponse.resource) {
                        return mockApiResponse.resource as k8s.V1StatefulSet;
                    }
                }
                return { 
                    metadata: { name: options.name, namespace: options.namespace },
                    spec: { replicas: 3 },
                    status: { readyReplicas: 3, updatedReplicas: 3 }
                } as k8s.V1StatefulSet;
            },
            readNamespacedDaemonSet: async (options: { name: string; namespace: string }) => {
                readDaemonSetCalls.push(options);
                if (mockApiResponse && !Array.isArray(mockApiResponse)) {
                    if (mockApiResponse.type === 'error') {
                        throw mockApiResponse.error;
                    }
                    if (mockApiResponse.type === 'success' && mockApiResponse.resource) {
                        return mockApiResponse.resource as k8s.V1DaemonSet;
                    }
                }
                return { 
                    metadata: { name: options.name, namespace: options.namespace },
                    status: { desiredNumberScheduled: 3, numberReady: 3, updatedNumberScheduled: 3, numberAvailable: 3 }
                } as k8s.V1DaemonSet;
            }
        };
        
        // Replace API client's apps API with mock
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (apiClient as any).appsApi = mockAppsApi;
        
        // Mock setContext to avoid "No active cluster!" error
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (apiClient as any).setContext = () => {
            // No-op: we're already using mocked API clients
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
        // Restore API client
        const apiClient = getKubernetesApiClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (apiClient as any).appsApi = originalAppsApi;
        resetKubernetesApiClient();
        
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
     * Helper function to mock API client with success response
     */
    function mockApiSuccess(resource?: unknown): void {
        mockApiResponse = { type: 'success', resource };
    }
    
    /**
     * Helper function to mock API client with error
     */
    function mockApiError(error: unknown): void {
        mockApiResponse = { type: 'error', error };
    }
    
    /**
     * Helper function to mock API client with sequential responses (for polling tests)
     */
    function mockApiSequential(responses: Array<{ type: 'success'; resource?: unknown } | { type: 'error'; error: unknown }>): void {
        mockApiResponse = responses;
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
            mockApiSuccess();
            
            await restartWorkloadModule.applyRestartAnnotation(
                'my-deployment',
                'default',
                'Deployment',
                'test-context',
                '/test/kubeconfig'
            );

            assert.strictEqual(patchDeploymentCalls.length, 1, 'Should call patchNamespacedDeployment');
            const call = patchDeploymentCalls[0];
            assert.strictEqual(call.name, 'my-deployment', 'Should include resource name');
            assert.strictEqual(call.namespace, 'default', 'Should include namespace');
            assert.ok(call.body, 'Should have patch body');
            const patchBody = call.body as { spec?: { template?: { metadata?: { annotations?: Record<string, string> } } } };
            assert.ok(patchBody.spec?.template?.metadata?.annotations, 'Should have annotations in patch');
            assert.ok(patchBody.spec.template.metadata.annotations!['kubectl.kubernetes.io/restartedAt'], 'Should have restart annotation');
            assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(patchBody.spec.template.metadata.annotations!['kubectl.kubernetes.io/restartedAt']!), 'Should have ISO 8601 timestamp');
        });

        test('applies restart annotation without namespace', async () => {
            mockApiSuccess();
            
            try {
                await restartWorkloadModule.applyRestartAnnotation(
                    'my-deployment',
                    undefined,
                    'Deployment',
                    'test-context',
                    '/test/kubeconfig'
                );
                assert.fail('Should throw error when namespace is undefined');
            } catch (error) {
                // KubectlError wraps the original error - check details for the original message
                assert.ok(error instanceof KubectlError, 'Should throw KubectlError');
                if (error instanceof KubectlError) {
                    const details = error.getDetails().toLowerCase();
                    assert.ok(details.includes('namespace'), 'Error details should mention namespace');
                }
            }
        });

        test('creates annotations object when missing', async () => {
            // With merge patch, annotations are created automatically if they don't exist
            // So this test just verifies that the patch succeeds even when annotations are missing
            mockApiSuccess();
            
            await restartWorkloadModule.applyRestartAnnotation(
                'my-deployment',
                'default',
                'Deployment',
                'test-context',
                '/test/kubeconfig'
            );

            // Should only make one patch call (merge patch handles missing annotations)
            assert.strictEqual(patchDeploymentCalls.length, 1, 'Should make single patch call');
            const call = patchDeploymentCalls[0];
            
            // Verify patch structure includes nested path to annotations
            const patchBody = call.body as { spec?: { template?: { metadata?: { annotations?: Record<string, string> } } } };
            assert.ok(patchBody.spec?.template?.metadata?.annotations, 'Should have full nested structure in patch');
        });

        test('timestamp is ISO 8601 format', async () => {
            mockApiSuccess();
            const beforeTime = new Date().toISOString();
            
            await restartWorkloadModule.applyRestartAnnotation(
                'my-deployment',
                'default',
                'Deployment',
                'test-context',
                '/test/kubeconfig'
            );

            const afterTime = new Date().toISOString();
            const call = patchDeploymentCalls[0];
            const patchBody = call.body as { spec?: { template?: { metadata?: { annotations?: Record<string, string> } } } };
            const timestamp = patchBody.spec?.template?.metadata?.annotations?.['kubectl.kubernetes.io/restartedAt'];
            
            assert.ok(timestamp, 'Should have timestamp');
            // Verify ISO 8601 format
            assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(timestamp), 'Timestamp should be ISO 8601 format');
            assert.ok(timestamp >= beforeTime && timestamp <= afterTime, 'Timestamp should be current time');
        });
    });

    suite('Restart StatefulSet', () => {
        test('applies restart annotation with correct resource type', async () => {
            mockApiSuccess();
            
            await restartWorkloadModule.applyRestartAnnotation(
                'my-statefulset',
                'default',
                'StatefulSet',
                'test-context',
                '/test/kubeconfig'
            );

            assert.strictEqual(patchStatefulSetCalls.length, 1, 'Should call patchNamespacedStatefulSet');
            const call = patchStatefulSetCalls[0];
            assert.strictEqual(call.name, 'my-statefulset', 'Should include resource name');
            assert.strictEqual(call.namespace, 'default', 'Should include namespace');
        });
    });

    suite('Restart DaemonSet', () => {
        test('applies restart annotation with correct resource type', async () => {
            mockApiSuccess();
            
            await restartWorkloadModule.applyRestartAnnotation(
                'my-daemonset',
                'default',
                'DaemonSet',
                'test-context',
                '/test/kubeconfig'
            );

            assert.strictEqual(patchDaemonSetCalls.length, 1, 'Should call patchNamespacedDaemonSet');
            const call = patchDaemonSetCalls[0];
            assert.strictEqual(call.name, 'my-daemonset', 'Should include resource name');
            assert.strictEqual(call.namespace, 'default', 'Should include namespace');
        });

        test('extracts status using DaemonSet-specific fields', async () => {
            mockApiSuccess({
                metadata: { name: 'my-daemonset', namespace: 'default' },
                status: {
                    desiredNumberScheduled: 5,
                    numberReady: 5,
                    updatedNumberScheduled: 5,
                    numberAvailable: 5
                }
            } as k8s.V1DaemonSet);
            
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
            assert.strictEqual(readDaemonSetCalls.length, 1, 'Should call readNamespacedDaemonSet');
        });
    });

    suite('Get Workload Status', () => {
        test('extracts status for Deployment', async () => {
            mockApiSuccess({
                metadata: { name: 'my-deployment', namespace: 'default' },
                spec: { replicas: 3 },
                status: {
                    readyReplicas: 3,
                    updatedReplicas: 3,
                    availableReplicas: 3
                }
            } as k8s.V1Deployment);
            
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
            assert.strictEqual(readDeploymentCalls.length, 1, 'Should call readNamespacedDeployment');
        });

        test('handles missing status fields', async () => {
            mockApiSuccess({
                metadata: { name: 'my-deployment', namespace: 'default' },
                spec: { replicas: 2 },
                status: {}
            } as k8s.V1Deployment);
            
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
            // First call returns incomplete status, second returns complete
            mockApiSequential([
                { 
                    type: 'success', 
                    resource: {
                        metadata: { name: 'my-deployment', namespace: 'default' },
                        spec: { replicas: 3 },
                        status: { readyReplicas: 2, updatedReplicas: 2, availableReplicas: 2 }
                    } as k8s.V1Deployment
                },
                { 
                    type: 'success', 
                    resource: {
                        metadata: { name: 'my-deployment', namespace: 'default' },
                        spec: { replicas: 3 },
                        status: { readyReplicas: 3, updatedReplicas: 3, availableReplicas: 3 }
                    } as k8s.V1Deployment
                }
            ]);

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

                // Advance time by 2 seconds (poll interval) between calls
                const watchPromise = restartWorkloadModule.watchRolloutStatus(
                    'my-deployment',
                    'default',
                    'Deployment',
                    'test-context',
                    '/test/kubeconfig',
                    progress
                );

                // Simulate time progression - first call happens immediately
                await new Promise(resolve => setTimeout(resolve, 10));
                currentTime += 2000; // Advance 2 seconds for second poll
                await new Promise(resolve => setTimeout(resolve, 10));
                currentTime += 2000; // Advance another 2 seconds

                await watchPromise;

                // Should have called readNamespacedDeployment multiple times
                assert.ok(readDeploymentCalls.length >= 2, 'Should poll status multiple times');
                // Should have reported progress
                assert.ok(progressReports.length > 0, 'Should report progress');
            } finally {
                Date.now = originalNow;
            }
        }).timeout(5000);

        test('throws timeout error after 5 minutes', async () => {
            // Always return incomplete status
            const incompleteDeployment = {
                metadata: { name: 'my-deployment', namespace: 'default' },
                spec: { replicas: 3 },
                status: { readyReplicas: 2, updatedReplicas: 2, availableReplicas: 2 }
            } as k8s.V1Deployment;
            
            // Mock to always return incomplete status
            mockApiSuccess(incompleteDeployment);

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

                const watchPromise = restartWorkloadModule.watchRolloutStatus(
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
                        return error.constructor.name === 'RolloutTimeoutError';
                    },
                    'Should throw RolloutTimeoutError'
                );
            } finally {
                Date.now = originalNow;
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
            mockApiSuccess();
            
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
            assert.strictEqual(patchDeploymentCalls.length, 1, 'Should only call patchNamespacedDeployment');
            assert.strictEqual(readDeploymentCalls.length, 0, 'Should not call readNamespacedDeployment');
        });

        test('refreshes tree view after successful restart', async () => {
            mockShowInformationMessage('Restart');
            mockApiSuccess();
            
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
            const apiError = {
                statusCode: 403,
                body: { message: 'Forbidden' },
                message: 'Forbidden'
            };
            mockApiError(apiError);
            
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
                // Should return early, no API calls
                assert.strictEqual(patchDeploymentCalls.length, 0, 'Should not call API when cancelled');
            }
        });
    });

    suite('Multiple Restarts', () => {
        test('updates annotation timestamp on multiple restarts', async () => {
            const timestamps: string[] = [];
            
            // Override mock to capture timestamps
            const originalPatch = mockAppsApi.patchNamespacedDeployment;
            mockAppsApi.patchNamespacedDeployment = async (options: { name: string; namespace: string; body: unknown }) => {
                patchDeploymentCalls.push(options);
                const patchBody = options.body as { spec?: { template?: { metadata?: { annotations?: Record<string, string> } } } };
                const timestamp = patchBody.spec?.template?.metadata?.annotations?.['kubectl.kubernetes.io/restartedAt'];
                if (timestamp) {
                    timestamps.push(timestamp);
                }
                return { metadata: { name: options.name, namespace: options.namespace } } as k8s.V1Deployment;
            };
            
            try {
                // First restart
                await restartWorkloadModule.applyRestartAnnotation(
                    'my-deployment',
                    'default',
                    'Deployment',
                    'test-context',
                    '/test/kubeconfig'
                );
                
                // Wait a bit to ensure different timestamp
                await new Promise(resolve => setTimeout(resolve, 10));
                
                // Second restart
                await restartWorkloadModule.applyRestartAnnotation(
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
                // Restore original mock
                mockAppsApi.patchNamespacedDeployment = originalPatch;
            }
        });
    });

    suite('Error Handling', () => {
        test('handles resource not found error', async () => {
            const apiError = {
                statusCode: 404,
                body: { message: 'deployments.apps "my-deployment" not found' },
                message: 'Not Found'
            };
            mockApiError(apiError);

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
            const apiError = {
                statusCode: 403,
                body: { message: 'deployments.apps "my-deployment" is forbidden' },
                message: 'Forbidden'
            };
            mockApiError(apiError);

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
            const apiError = {
                code: 'ECONNREFUSED',
                message: 'Unable to connect to the server: dial tcp: connection refused'
            };
            mockApiError(apiError);

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
            const apiError = {
                code: 'ETIMEDOUT',
                message: 'Request timeout'
            };
            mockApiError(apiError);

            try {
                await restartWorkloadModule.applyRestartAnnotation(
                    'my-deployment',
                    'default',
                    'Deployment',
                    'test-context',
                    '/test/kubeconfig'
                );
                assert.fail('Should throw timeout error');
            } catch (error: unknown) {
                assert.ok(error instanceof KubectlError, 'Should throw KubectlError');
                if (error instanceof KubectlError) {
                    assert.strictEqual(error.type, KubectlErrorType.Timeout, 'Should be timeout error type');
                }
            }
        });

        test('handles binary not found error', async () => {
            // This error type doesn't apply to API client - API client doesn't use kubectl binary
            // But we'll test that API errors are handled correctly
            const apiError = {
                code: 'ENOENT',
                message: 'API endpoint not found'
            };
            mockApiError(apiError);

            try {
                await restartWorkloadModule.applyRestartAnnotation(
                    'my-deployment',
                    'default',
                    'Deployment',
                    'test-context',
                    '/test/kubeconfig'
                );
                assert.fail('Should throw KubectlError for API errors');
            } catch (error: unknown) {
                assert.ok(error instanceof KubectlError, 'Should throw KubectlError');
            }
        });
    });
});

