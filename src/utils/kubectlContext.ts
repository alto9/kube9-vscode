import { execFile } from 'child_process';
import { promisify } from 'util';
import { KubectlError } from '../kubernetes/KubectlError';
import { KubectlContextState } from '../types/namespaceState';
import { namespaceCache } from '../services/namespaceCache';

/**
 * Timeout for kubectl commands in milliseconds.
 */
const KUBECTL_TIMEOUT_MS = 5000;

/**
 * Promisified version of execFile for async/await usage.
 */
const execFileAsync = promisify(execFile);

/**
 * Interface for the raw kubectl config view JSON response.
 */
interface KubeconfigContext {
    name?: string;
    context?: {
        cluster?: string;
        namespace?: string;
        user?: string;
    };
}

interface KubeconfigResponse {
    contexts?: KubeconfigContext[];
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'current-context'?: string;
}

/**
 * Retrieves the current namespace from kubectl context configuration.
 * Returns null if no namespace is set (cluster-wide view).
 * 
 * This function reads the kubectl context to determine which namespace is
 * currently active. An empty result indicates no namespace filtering is
 * applied (cluster-wide view).
 * 
 * @returns The current namespace name, or null if no namespace is set
 * @throws {Error} If kubectl command fails or is not available
 */
export async function getCurrentNamespace(): Promise<string | null> {
    try {
        // Execute kubectl config view with jsonpath to extract namespace
        const { stdout } = await execFileAsync(
            'kubectl',
            [
                'config',
                'view',
                '--minify',
                '--output=jsonpath={..namespace}'
            ],
            {
                timeout: KUBECTL_TIMEOUT_MS,
                env: { ...process.env }
            }
        );

        // Trim whitespace from output
        const namespace = stdout.trim();
        
        // Empty string means no namespace is set in context (cluster-wide view)
        if (!namespace || namespace.length === 0) {
            return null;
        }

        return namespace;
    } catch (error: unknown) {
        // kubectl failed - create structured error for detailed handling
        const kubectlError = KubectlError.fromExecError(error, 'current');
        
        // Log error details for debugging
        console.error(`Failed to get current namespace: ${kubectlError.getDetails()}`);
        
        // Rethrow as standard error for caller to handle
        throw new Error(`Failed to get current namespace: ${kubectlError.getUserMessage()}`);
    }
}

/**
 * Retrieves complete kubectl context information including context name,
 * cluster name, and current namespace.
 * 
 * This function queries kubectl's full context configuration to get detailed
 * information about the active context. It returns a structured object with
 * all context metadata needed for namespace selection.
 * 
 * Uses caching with 5-second TTL to minimize kubectl command overhead.
 * 
 * @returns Complete kubectl context state including namespace, context, and cluster
 * @throws {Error} If kubectl command fails, no context is set, or JSON is malformed
 */
export async function getContextInfo(): Promise<KubectlContextState> {
    // Check cache first
    const cachedContext = namespaceCache.getCachedContext();
    if (cachedContext) {
        return cachedContext;
    }

    try {
        // Execute kubectl config view with JSON output
        const { stdout } = await execFileAsync(
            'kubectl',
            [
                'config',
                'view',
                '--minify',
                '--output=json'
            ],
            {
                timeout: KUBECTL_TIMEOUT_MS,
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                env: { ...process.env }
            }
        );

        // Parse the JSON response
        let response: KubeconfigResponse;
        try {
            response = JSON.parse(stdout);
        } catch (parseError) {
            const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            console.error(`Failed to parse kubectl config JSON: ${errorMessage}`);
            throw new Error('kubectl config returned invalid JSON. The kubeconfig file may be corrupted.');
        }

        // Validate that we have context information
        if (!response.contexts || response.contexts.length === 0) {
            throw new Error('No kubectl context is currently set. Please configure a context using kubectl.');
        }

        // Extract the current context (first context in minified view)
        const currentContext = response.contexts[0];
        
        // Validate context structure
        if (!currentContext.name) {
            throw new Error('kubectl context is missing a name. The kubeconfig file may be corrupted.');
        }

        if (!currentContext.context?.cluster) {
            throw new Error(`kubectl context '${currentContext.name}' is missing a cluster reference.`);
        }

        // Extract context information
        const contextName = currentContext.name;
        const clusterName = currentContext.context.cluster;
        const currentNamespace = currentContext.context.namespace || null;

        // Build and return the context state
        const contextState: KubectlContextState = {
            currentNamespace,
            contextName,
            clusterName,
            lastUpdated: new Date(),
            source: 'external' // Initial read, not set by extension
        };

        // Update cache with fresh state
        namespaceCache.setCachedContext(contextState);

        return contextState;
    } catch (error: unknown) {
        // Check if this is already our formatted error from validation
        if (error instanceof Error && error.message.includes('kubectl')) {
            throw error;
        }

        // kubectl command execution failed - create structured error
        const kubectlError = KubectlError.fromExecError(error, 'current');
        
        // Log error details for debugging
        console.error(`Failed to get context info: ${kubectlError.getDetails()}`);
        
        // Rethrow as standard error for caller to handle
        throw new Error(`Failed to get kubectl context info: ${kubectlError.getUserMessage()}`);
    }
}

/**
 * Gets the namespace for a specific kubectl context.
 * 
 * This function reads the kubectl context configuration for a specific context
 * (not necessarily the current one) to determine which namespace is set.
 * 
 * @param contextName - The context name to check
 * @returns The namespace name for the context, or null if no namespace is set
 * @throws {Error} If kubectl command fails or context is not found
 */
export async function getNamespaceForContext(contextName: string): Promise<string | null> {
    try {
        // Use --minify with --context to get only the specified context's namespace
        const { stdout } = await execFileAsync(
            'kubectl',
            [
                'config',
                'view',
                '--minify',
                `--context=${contextName}`,
                '--output=jsonpath={..namespace}'
            ],
            {
                timeout: KUBECTL_TIMEOUT_MS,
                env: { ...process.env }
            }
        );

        // Trim whitespace from output
        const namespace = stdout.trim();
        
        // Empty string means no namespace is set in context (cluster-wide view)
        if (!namespace || namespace.length === 0) {
            return null;
        }

        return namespace;
    } catch (error: unknown) {
        // kubectl failed - create structured error for detailed handling
        const kubectlError = KubectlError.fromExecError(error, contextName);
        
        // Log error details for debugging
        console.error(`Failed to get namespace for context '${contextName}': ${kubectlError.getDetails()}`);
        
        // Rethrow as standard error for caller to handle
        throw new Error(`Failed to get namespace for context '${contextName}': ${kubectlError.getUserMessage()}`);
    }
}

/**
 * Sets the active namespace in the kubectl context.
 * 
 * This function modifies the kubectl context to set a specific namespace as active.
 * The change persists in the kubeconfig file and affects all kubectl commands until
 * changed again or cleared.
 * 
 * @param namespace - The namespace to set as active (must be non-empty)
 * @param contextName - Optional context name to target. If not provided, uses --current for backward compatibility
 * @returns Promise<boolean> - true if successful, false if failed
 */
export async function setNamespace(namespace: string, contextName?: string): Promise<boolean> {
    // Validate namespace parameter
    if (!namespace || namespace.trim().length === 0) {
        console.error('Failed to set namespace: namespace parameter must be a non-empty string');
        return false;
    }

    try {
        // Build kubectl command arguments
        const args = ['config', 'set-context'];
        
        // Use specific context name if provided, otherwise use --current for backward compatibility
        if (contextName) {
            args.push(contextName);
        } else {
            args.push('--current');
        }
        
        args.push(`--namespace=${namespace}`);

        // Execute kubectl config set-context to update namespace
        await execFileAsync(
            'kubectl',
            args,
            {
                timeout: KUBECTL_TIMEOUT_MS,
                env: { ...process.env }
            }
        );

        // Invalidate cache since context was modified
        namespaceCache.invalidateCache();

        // Command succeeded
        return true;
    } catch (error: unknown) {
        // Extract stderr for specific error pattern detection
        const err = error as {
            stderr?: Buffer | string;
            stdout?: Buffer | string;
            code?: string | number;
            message?: string;
            killed?: boolean;
            signal?: string;
        };
        
        const stderr = err.stderr
            ? (Buffer.isBuffer(err.stderr) ? err.stderr.toString() : err.stderr).trim()
            : '';
        
        const targetContext = contextName || 'current';
        
        // Check for context not found error
        if (stderr.includes('not found')) {
            console.error(`Context '${targetContext}' not found in kubeconfig`);
            return false;
        }
        
        // Check for permission denied error
        if (stderr.includes('unable to write') || stderr.includes('permission denied')) {
            console.error('Permission denied to modify kubeconfig');
            return false;
        }
        
        // Fall back to structured error handling for other errors
        const kubectlError = KubectlError.fromExecError(error, targetContext);
        
        // Log error details for debugging
        console.error(`Failed to set namespace '${namespace}': ${kubectlError.getDetails()}`);
        
        // Return failure status
        return false;
    }
}

/**
 * Switches the current kubectl context.
 * 
 * This function changes the active kubectl context by modifying the current-context
 * field in the kubeconfig file. The change persists across VS Code reloads.
 * 
 * @param contextName - The context name to switch to
 * @returns Promise<boolean> - true if successful, false if failed
 */
export async function switchContext(contextName: string): Promise<boolean> {
    // Validate context name parameter
    if (!contextName || contextName.trim().length === 0) {
        console.error('Failed to switch context: context name parameter must be a non-empty string');
        return false;
    }

    try {
        // Execute kubectl config use-context to switch context
        await execFileAsync(
            'kubectl',
            ['config', 'use-context', contextName],
            {
                timeout: KUBECTL_TIMEOUT_MS,
                env: { ...process.env }
            }
        );

        // Invalidate cache since context was modified
        namespaceCache.invalidateCache();

        // Command succeeded
        return true;
    } catch (error: unknown) {
        // Extract stderr for specific error pattern detection
        const err = error as {
            stderr?: Buffer | string;
            stdout?: Buffer | string;
            code?: string | number;
            message?: string;
            killed?: boolean;
            signal?: string;
        };
        
        const stderr = err.stderr
            ? (Buffer.isBuffer(err.stderr) ? err.stderr.toString() : err.stderr).trim()
            : '';
        
        // Check for context not found error
        if (stderr.includes('not found') || stderr.includes('does not exist')) {
            console.error(`Context '${contextName}' not found in kubeconfig`);
            return false;
        }
        
        // Check for permission denied error
        if (stderr.includes('unable to write') || stderr.includes('permission denied')) {
            console.error('Permission denied to modify kubeconfig');
            return false;
        }
        
        // Fall back to structured error handling for other errors
        const kubectlError = KubectlError.fromExecError(error, contextName);
        
        // Log error details for debugging
        console.error(`Failed to switch context to '${contextName}': ${kubectlError.getDetails()}`);
        
        // Return failure status
        return false;
    }
}

/**
 * Clears the active namespace from the kubectl context.
 * 
 * This function removes the namespace setting from the kubectl context, returning to
 * a cluster-wide view. The change persists in the kubeconfig file.
 * 
 * @param contextName - Optional context name to target. If not provided, uses --current for backward compatibility
 * @returns Promise<boolean> - true if successful, false if failed
 */
export async function clearNamespace(contextName?: string): Promise<boolean> {
    try {
        // Build kubectl command arguments
        const args = ['config', 'set-context'];
        
        // Use specific context name if provided, otherwise use --current for backward compatibility
        if (contextName) {
            args.push(contextName);
        } else {
            args.push('--current');
        }
        
        args.push('--namespace=');  // Empty string clears namespace

        // Execute kubectl config set-context to clear namespace (set to empty string)
        await execFileAsync(
            'kubectl',
            args,
            {
                timeout: KUBECTL_TIMEOUT_MS,
                env: { ...process.env }
            }
        );

        // Invalidate cache since context was modified
        namespaceCache.invalidateCache();

        // Command succeeded
        return true;
    } catch (error: unknown) {
        // Extract stderr for specific error pattern detection
        const err = error as {
            stderr?: Buffer | string;
            stdout?: Buffer | string;
            code?: string | number;
            message?: string;
            killed?: boolean;
            signal?: string;
        };
        
        const stderr = err.stderr
            ? (Buffer.isBuffer(err.stderr) ? err.stderr.toString() : err.stderr).trim()
            : '';
        
        const targetContext = contextName || 'current';
        
        // Check for context not found error
        if (stderr.includes('not found')) {
            console.error(`Context '${targetContext}' not found in kubeconfig`);
            return false;
        }
        
        // Check for permission denied error
        if (stderr.includes('unable to write') || stderr.includes('permission denied')) {
            console.error('Permission denied to modify kubeconfig');
            return false;
        }
        
        // Fall back to structured error handling for other errors
        const kubectlError = KubectlError.fromExecError(error, targetContext);
        
        // Log error details for debugging
        console.error(`Failed to clear namespace: ${kubectlError.getDetails()}`);
        
        // Return failure status
        return false;
    }
}

