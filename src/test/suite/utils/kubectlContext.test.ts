import * as assert from 'assert';
import * as Module from 'module';
import { KubectlContextState } from '../../../types/namespaceState';
import * as namespaceCacheModule from '../../../services/namespaceCache';

// Store original require for restoration
const originalRequire = Module.prototype.require;

// Set up module interception variables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockExecFileResponse: { type: 'success'; stdout: string; stderr: string } | { type: 'error'; error: any } | null = null;
let execFileCalls: Array<{ command: string; args: string[] }> = [];
let isProxyActive = false;

suite('kubectlContext Test Suite', () => {
    // Store original functions for restoration
    let originalGetCachedContext: typeof namespaceCacheModule.namespaceCache.getCachedContext;
    let originalSetCachedContext: typeof namespaceCacheModule.namespaceCache.setCachedContext;
    let originalInvalidateCache: typeof namespaceCacheModule.namespaceCache.invalidateCache;

    // Mock tracking
    let cacheGetCalls: number;
    let cacheSetCalls: Array<KubectlContextState>;
    let cacheInvalidateCalls: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let getCurrentNamespace: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let getContextInfo: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let setNamespace: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let clearNamespace: any;

    setup(() => {
        // Reset call tracking
        execFileCalls = [];
        cacheGetCalls = 0;
        cacheSetCalls = [];
        cacheInvalidateCalls = 0;
        mockExecFileResponse = null;

        // Set up require interception for child_process
        // Note: test/setup.ts already overrides this for vscode, so we need to preserve that
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
                            // Always return a mock function that checks if we have a mock response
                            return function(
                                file: string,
                                args: readonly string[],
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                options: any,
                                callback: (error: Error | null, stdout: string, stderr: string) => void
                            ) {
                                execFileCalls.push({ command: file, args: [...args] });
                                
                                if (mockExecFileResponse !== null) {
                                    if (mockExecFileResponse.type === 'success') {
                                        const response = mockExecFileResponse;
                                        process.nextTick(() => callback(null, response.stdout, response.stderr));
                                    } else {
                                        const response = mockExecFileResponse;
                                        process.nextTick(() => callback(response.error, '', ''));
                                    }
                                    return;
                                }
                                
                                // Fallback to real execFile if no mock
                                return target.execFile(file, args, options, callback);
                            };
                        }
                        return target[prop as keyof typeof target];
                    }
                });
            }
            return currentRequire.call(this, id);
        };

        // Clear module cache to force reload with mocked execFile
        const kubectlContextPath = require.resolve('../../../utils/kubectlContext');
        delete require.cache[kubectlContextPath];
        
        // Now import the functions - they will use the mocked execFile
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const kubectlContextModule = require('../../../utils/kubectlContext');
        getCurrentNamespace = kubectlContextModule.getCurrentNamespace;
        getContextInfo = kubectlContextModule.getContextInfo;
        setNamespace = kubectlContextModule.setNamespace;
        clearNamespace = kubectlContextModule.clearNamespace;

        // Store original functions
        originalGetCachedContext = namespaceCacheModule.namespaceCache.getCachedContext;
        originalSetCachedContext = namespaceCacheModule.namespaceCache.setCachedContext;
        originalInvalidateCache = namespaceCacheModule.namespaceCache.invalidateCache;

        // Mock namespaceCache by default (individual tests can override)
        namespaceCacheModule.namespaceCache.getCachedContext = function() {
            cacheGetCalls++;
            return null; // Default: no cache
        };

        namespaceCacheModule.namespaceCache.setCachedContext = function(state: KubectlContextState) {
            cacheSetCalls.push(state);
        };

        namespaceCacheModule.namespaceCache.invalidateCache = function() {
            cacheInvalidateCalls++;
        };
    });

    teardown(() => {
        // Deactivate proxy
        isProxyActive = false;
        
        // Restore original require (from setup.ts, not the absolute original)
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
        namespaceCacheModule.namespaceCache.getCachedContext = originalGetCachedContext;
        namespaceCacheModule.namespaceCache.setCachedContext = originalSetCachedContext;
        namespaceCacheModule.namespaceCache.invalidateCache = originalInvalidateCache;
    });

    /**
     * Helper function to mock execFile with error
     */
    function mockExecFileError(error: Partial<NodeJS.ErrnoException> & { stdout?: string; stderr?: string; killed?: boolean; signal?: string }) {
        const fullError = Object.assign(new Error(error.message || 'Command failed'), error);
        
        mockExecFileResponse = {
            type: 'error',
            error: fullError
        };
    }

    suite('getCurrentNamespace', () => {
        test('Should throw error when kubectl binary is not found', async () => {
            mockExecFileError({ code: 'ENOENT', message: 'kubectl not found' });
            
            await assert.rejects(
                async () => await getCurrentNamespace(),
                (error: Error) => {
                    assert.ok(error.message.includes('kubectl'));
                    return true;
                }
            );
        });

        test('Should throw error when kubectl command times out', async () => {
            mockExecFileError({ 
                killed: true, 
                signal: 'SIGTERM', 
                message: 'Command timed out',
                stderr: 'timeout'
            });
            
            await assert.rejects(
                async () => await getCurrentNamespace(),
                (error: Error) => {
                    assert.ok(error.message.includes('namespace'));
                    return true;
                }
            );
        });

        test('Should throw error on kubectl execution failure', async () => {
            mockExecFileError({ 
                code: 'ERR_KUBECTL_FAILED', 
                message: 'kubectl failed',
                stderr: 'Error: context not found'
            });
            
            await assert.rejects(
                async () => await getCurrentNamespace(),
                (error: Error) => {
                    assert.ok(error.message.includes('Failed to get current namespace'));
                    return true;
                }
            );
        });
    });

    suite('getContextInfo', () => {
        test('Should return cached context when available', async () => {
            const cachedState: KubectlContextState = {
                currentNamespace: 'cached-namespace',
                contextName: 'cached-context',
                clusterName: 'cached-cluster',
                lastUpdated: new Date(),
                source: 'extension'
            };

            // Override mock to return cached state
            namespaceCacheModule.namespaceCache.getCachedContext = function() {
                cacheGetCalls++;
                return cachedState;
            };

            const result = await getContextInfo();
            
            assert.strictEqual(result, cachedState);
            assert.strictEqual(cacheGetCalls, 1);
            assert.strictEqual(execFileCalls.length, 0); // Should not execute kubectl
        });
    });

    suite('setNamespace', () => {
        test('Should return false for empty namespace parameter', async () => {
            const result = await setNamespace('');
            
            assert.strictEqual(result, false);
            assert.strictEqual(execFileCalls.length, 0); // Should not execute kubectl
        });

        test('Should return false for whitespace-only parameter', async () => {
            const result = await setNamespace('   \t\n   ');
            
            assert.strictEqual(result, false);
            assert.strictEqual(execFileCalls.length, 0);
        });

        test('Should return false on kubectl execution failure', async () => {
            mockExecFileError({ 
                code: 'ERR_KUBECTL_FAILED',
                message: 'Failed to set context',
                stderr: 'Error: context not found'
            });
            
            const result = await setNamespace('my-namespace');
            
            assert.strictEqual(result, false);
        });

        test('Should not invalidate cache on failure', async () => {
            mockExecFileError({ code: 'ERR_FAILED', message: 'Failed' });
            
            await setNamespace('my-namespace');
            
            assert.strictEqual(cacheInvalidateCalls, 0);
        });

        test('Should handle kubectl binary not found error', async () => {
            mockExecFileError({ code: 'ENOENT', message: 'kubectl not found' });
            
            const result = await setNamespace('my-namespace');
            
            assert.strictEqual(result, false);
        });

        test('Should use --current flag when contextName is not provided (backward compatibility)', async () => {
            mockExecFileResponse = {
                type: 'success',
                stdout: '',
                stderr: ''
            };
            
            const result = await setNamespace('my-namespace');
            
            assert.strictEqual(result, true);
            assert.strictEqual(execFileCalls.length, 1);
            assert.deepStrictEqual(execFileCalls[0].args, [
                'config',
                'set-context',
                '--current',
                '--namespace=my-namespace'
            ]);
            assert.strictEqual(cacheInvalidateCalls, 1);
        });

        test('Should use specific context name when contextName is provided', async () => {
            mockExecFileResponse = {
                type: 'success',
                stdout: '',
                stderr: ''
            };
            
            const result = await setNamespace('my-namespace', 'minikube');
            
            assert.strictEqual(result, true);
            assert.strictEqual(execFileCalls.length, 1);
            assert.deepStrictEqual(execFileCalls[0].args, [
                'config',
                'set-context',
                'minikube',
                '--namespace=my-namespace'
            ]);
            assert.strictEqual(cacheInvalidateCalls, 1);
        });

        test('Should invalidate cache on success when contextName is provided', async () => {
            mockExecFileResponse = {
                type: 'success',
                stdout: '',
                stderr: ''
            };
            
            await setNamespace('test-namespace', 'prod-cluster');
            
            assert.strictEqual(cacheInvalidateCalls, 1);
        });

        test('Should handle error when setting namespace on non-existent context', async () => {
            mockExecFileError({ 
                code: 'ERR_KUBECTL_FAILED',
                message: 'Failed to set context',
                stderr: 'Error: context \'old-cluster\' not found'
            });
            
            const result = await setNamespace('my-namespace', 'old-cluster');
            
            assert.strictEqual(result, false);
            assert.strictEqual(cacheInvalidateCalls, 0);
        });
    });

    suite('clearNamespace', () => {
        test('Should return false on kubectl execution failure', async () => {
            mockExecFileError({ 
                code: 'ERR_KUBECTL_FAILED',
                message: 'Failed to set context',
                stderr: 'Error: context not found'
            });
            
            const result = await clearNamespace();
            
            assert.strictEqual(result, false);
        });

        test('Should not invalidate cache on failure', async () => {
            mockExecFileError({ code: 'ERR_FAILED', message: 'Failed' });
            
            await clearNamespace();
            
            assert.strictEqual(cacheInvalidateCalls, 0);
        });

        test('Should handle kubectl binary not found error', async () => {
            mockExecFileError({ code: 'ENOENT', message: 'kubectl not found' });
            
            const result = await clearNamespace();
            
            assert.strictEqual(result, false);
        });

        test('Should handle timeout error', async () => {
            mockExecFileError({ 
                killed: true,
                signal: 'SIGTERM',
                message: 'Timeout',
                stderr: 'Operation timed out'
            });
            
            const result = await clearNamespace();
            
            assert.strictEqual(result, false);
        });

        test('Should use --current flag when contextName is not provided', async () => {
            mockExecFileResponse = {
                type: 'success',
                stdout: '',
                stderr: ''
            };
            
            const result = await clearNamespace();
            
            assert.strictEqual(result, true);
            assert.strictEqual(execFileCalls.length, 1);
            assert.deepStrictEqual(execFileCalls[0].args, [
                'config',
                'set-context',
                '--current',
                '--namespace='
            ]);
            assert.strictEqual(cacheInvalidateCalls, 1);
        });

        test('Should use specific context name when contextName is provided', async () => {
            mockExecFileResponse = {
                type: 'success',
                stdout: '',
                stderr: ''
            };
            
            const result = await clearNamespace('minikube');
            
            assert.strictEqual(result, true);
            assert.strictEqual(execFileCalls.length, 1);
            assert.deepStrictEqual(execFileCalls[0].args, [
                'config',
                'set-context',
                'minikube',
                '--namespace='
            ]);
            assert.strictEqual(cacheInvalidateCalls, 1);
        });

        test('Should invalidate cache on success when contextName is provided', async () => {
            mockExecFileResponse = {
                type: 'success',
                stdout: '',
                stderr: ''
            };
            
            await clearNamespace('prod-cluster');
            
            assert.strictEqual(cacheInvalidateCalls, 1);
        });

        test('Should handle error when clearing namespace on non-existent context', async () => {
            mockExecFileError({ 
                code: 'ERR_KUBECTL_FAILED',
                message: 'Failed to set context',
                stderr: 'Error: context \'old-cluster\' not found'
            });
            
            const result = await clearNamespace('old-cluster');
            
            assert.strictEqual(result, false);
            assert.strictEqual(cacheInvalidateCalls, 0);
        });
    });

    suite('Edge Cases and Error Scenarios', () => {
        test('getCurrentNamespace - Should handle connection refused error', async () => {
            mockExecFileError({
                code: 'ERR_CONNECTION_REFUSED',
                message: 'Connection refused',
                stderr: 'Unable to connect to the server: dial tcp: connection refused'
            });
            
            await assert.rejects(
                async () => await getCurrentNamespace(),
                (error: Error) => {
                    assert.ok(error.message.includes('Failed to get current namespace'));
                    return true;
                }
            );
        });
    });
});

