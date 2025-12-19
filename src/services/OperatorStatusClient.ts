import * as vscode from 'vscode';
import { ConfigurationCommands } from '../kubectl/ConfigurationCommands';
import { KubectlError, KubectlErrorType } from '../kubernetes/KubectlError';
import { OperatorStatusMode, OperatorStatus } from '../kubernetes/OperatorStatusTypes';
import { getOperatorNamespaceResolver } from './OperatorNamespaceResolver';

/**
 * ConfigMap response structure from kubectl.
 * This interface matches what will be exported from ConfigurationCommands in story 002.
 */
interface ConfigMapResponse {
    metadata?: {
        name?: string;
        namespace?: string;
    };
    data?: {
        [key: string]: string;
    };
}

/**
 * Result of a single ConfigMap query operation.
 * This interface matches what will be exported from ConfigurationCommands in story 002.
 */
interface ConfigMapResult {
    configMap: ConfigMapResponse | null;
    error?: KubectlError;
}

// Note: getConfigMap will be added to ConfigurationCommands in story 002.
// We use a type assertion to call it until story 002 is complete.

/**
 * Cached operator status with metadata.
 */
export interface CachedOperatorStatus {
    /** The operator status, or null if operator not installed */
    status: OperatorStatus | null;
    
    /** Timestamp when this status was cached (milliseconds since epoch) */
    timestamp: number;
    
    /** The extension-determined status mode */
    mode: OperatorStatusMode;
}

/**
 * OutputChannel for operator status logging.
 * Created lazily on first use.
 */
let outputChannel: vscode.OutputChannel | undefined;

/**
 * Gets or creates the OutputChannel for operator status logging.
 * 
 * @returns The OutputChannel instance
 */
function getOutputChannel(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('kube9 Operator Status');
    }
    return outputChannel;
}

/**
 * Client for querying and caching operator status from the kube9-operator-status ConfigMap.
 * 
 * This client queries the ConfigMap using dynamically resolved namespace (via OperatorNamespaceResolver)
 * and caches results for 5 minutes to minimize kubectl calls. Status is determined based on operator
 * presence, mode, tier, health, and registration state.
 */
export class OperatorStatusClient {
    /**
     * Cache storage keyed by `<kubeconfigPath>:<contextName>`.
     */
    private cache: Map<string, CachedOperatorStatus> = new Map();

    /**
     * Cache time-to-live in milliseconds (5 minutes).
     */
    private readonly CACHE_TTL_MS = 5 * 60 * 1000;

    /**
     * Name of the operator status ConfigMap.
     */
    private readonly STATUS_CONFIGMAP_NAME = 'kube9-operator-status';

    /**
     * Retrieves the operator status for a cluster, using cache when available.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the Kubernetes context
     * @param forceRefresh If true, bypasses cache and queries the cluster directly
     * @returns Cached operator status with mode, status data, and timestamp
     */
    async getStatus(
        kubeconfigPath: string,
        contextName: string,
        forceRefresh = false
    ): Promise<CachedOperatorStatus> {
        const cacheKey = `${kubeconfigPath}:${contextName}`;

        // Check cache if not forcing refresh
        if (!forceRefresh && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey)!;
            const cacheAge = Date.now() - cached.timestamp;
            
            // Return cached result if still valid
            if (cacheAge < this.CACHE_TTL_MS) {
                return cached;
            }
        }

        // Query cluster for operator status
        try {
            // Resolve namespace dynamically using OperatorNamespaceResolver
            const resolver = getOperatorNamespaceResolver();
            const namespace = await resolver.resolveNamespace(contextName);

            // Note: getConfigMap will be added in story 002. Using type assertion for now.
            const result = await (ConfigurationCommands as {getConfigMap: (name: string, namespace: string, kubeconfigPath: string, contextName: string) => Promise<unknown>}).getConfigMap(
                this.STATUS_CONFIGMAP_NAME,
                namespace,
                kubeconfigPath,
                contextName
            ) as ConfigMapResult;

            // Handle errors from getConfigMap
            if (result.error) {
                const error = result.error;
                const isNotFound = this.isNotFoundError(error);
                
                if (isNotFound) {
                    // 404 - operator not installed (expected behavior)
                    const basicStatus: CachedOperatorStatus = {
                        status: null,
                        timestamp: Date.now(),
                        mode: OperatorStatusMode.Basic
                    };
                    this.cache.set(cacheKey, basicStatus);
                    getOutputChannel().appendLine(
                        `[DEBUG] Operator status ConfigMap not found in namespace '${namespace}' for context ${contextName} (expected if operator not installed)`
                    );
                    return basicStatus;
                }
                
                // Categorize and handle other errors
                const errorType = error.type;
                const errorDetails = error.getDetails();
                
                if (errorType === KubectlErrorType.PermissionDenied) {
                    // RBAC permission error - log warning and fall back
                    getOutputChannel().appendLine(
                        `[WARNING] RBAC permission denied when checking operator status in namespace '${namespace}' for context ${contextName}: ${errorDetails}`
                    );
                } else if (errorType === KubectlErrorType.ConnectionFailed || errorType === KubectlErrorType.Timeout) {
                    // Network/connectivity error - log error and fall back
                    getOutputChannel().appendLine(
                        `[ERROR] Network/connectivity error when checking operator status in namespace '${namespace}' for context ${contextName}: ${errorDetails}`
                    );
                } else {
                    // Unknown error - log error and fall back
                    getOutputChannel().appendLine(
                        `[ERROR] Unexpected error when checking operator status in namespace '${namespace}' for context ${contextName}: ${error.getUserMessage()} (${errorDetails})`
                    );
                }
                
                // Fall back to cache if available
                if (this.cache.has(cacheKey)) {
                    getOutputChannel().appendLine(
                        `[INFO] Falling back to cached operator status for context ${contextName}`
                    );
                    return this.cache.get(cacheKey)!;
                }
                
                // No cache available - return basic status
                const basicStatus: CachedOperatorStatus = {
                    status: null,
                    timestamp: Date.now(),
                    mode: OperatorStatusMode.Basic
                };
                this.cache.set(cacheKey, basicStatus);
                getOutputChannel().appendLine(
                    `[INFO] No cached status available for context ${contextName}, using basic status`
                );
                return basicStatus;
            }

            // ConfigMap found - parse status
            if (!result.configMap || !result.configMap.data) {
                // ConfigMap exists but has no data - treat as basic
                const basicStatus: CachedOperatorStatus = {
                    status: null,
                    timestamp: Date.now(),
                    mode: OperatorStatusMode.Basic
                };
                this.cache.set(cacheKey, basicStatus);
                return basicStatus;
            }

            const statusJson = result.configMap.data.status;
            if (!statusJson) {
                // ConfigMap exists but status key is missing - treat as basic
                const basicStatus: CachedOperatorStatus = {
                    status: null,
                    timestamp: Date.now(),
                    mode: OperatorStatusMode.Basic
                };
                this.cache.set(cacheKey, basicStatus);
                return basicStatus;
            }

            // Parse JSON status
            let operatorStatus: OperatorStatus;
            try {
                operatorStatus = JSON.parse(statusJson) as OperatorStatus;
            } catch (parseError) {
                // Invalid JSON - log error and fall back
                const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
                getOutputChannel().appendLine(
                    `[ERROR] Failed to parse operator status JSON for context ${contextName}: ${errorMessage}`
                );
                getOutputChannel().appendLine(`[ERROR] Invalid JSON content: ${statusJson.substring(0, 200)}...`);
                
                // Fall back to cache if available
                if (this.cache.has(cacheKey)) {
                    getOutputChannel().appendLine(
                        `[INFO] Falling back to cached operator status for context ${contextName} after JSON parse error`
                    );
                    return this.cache.get(cacheKey)!;
                }
                
                // No cache - return basic status
                const basicStatus: CachedOperatorStatus = {
                    status: null,
                    timestamp: Date.now(),
                    mode: OperatorStatusMode.Basic
                };
                this.cache.set(cacheKey, basicStatus);
                return basicStatus;
            }

            // Validate required fields in parsed status JSON
            const validationError = this.validateStatusFields(operatorStatus, contextName);
            if (validationError) {
                // Missing required fields - log error and fall back
                getOutputChannel().appendLine(
                    `[ERROR] Invalid operator status for context ${contextName}: ${validationError}`
                );
                
                // Fall back to cache if available
                if (this.cache.has(cacheKey)) {
                    getOutputChannel().appendLine(
                        `[INFO] Falling back to cached operator status for context ${contextName} after validation error`
                    );
                    return this.cache.get(cacheKey)!;
                }
                
                // No cache - return basic status
                const basicStatus: CachedOperatorStatus = {
                    status: null,
                    timestamp: Date.now(),
                    mode: OperatorStatusMode.Basic
                };
                this.cache.set(cacheKey, basicStatus);
                return basicStatus;
            }

            // Determine extension status mode
            const mode = this.determineStatusMode(operatorStatus);

            // Cache the result
            const cachedStatus: CachedOperatorStatus = {
                status: operatorStatus,
                timestamp: Date.now(),
                mode
            };
            this.cache.set(cacheKey, cachedStatus);
            return cachedStatus;

        } catch (error) {
            // Unexpected error - log and fall back to cache or basic status
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            
            // Resolve namespace for error message (may have been resolved earlier, but need it here too)
            let namespaceForError = 'unknown';
            try {
                const resolver = getOperatorNamespaceResolver();
                namespaceForError = await resolver.resolveNamespace(contextName);
            } catch {
                // If resolution fails, use 'unknown'
            }
            
            getOutputChannel().appendLine(
                `[ERROR] Unexpected error querying operator status in namespace '${namespaceForError}' for context ${contextName}: ${errorMessage}`
            );
            if (errorStack) {
                getOutputChannel().appendLine(`[ERROR] Stack trace: ${errorStack}`);
            }

            // Fall back to cache if available
            if (this.cache.has(cacheKey)) {
                getOutputChannel().appendLine(
                    `[INFO] Falling back to cached operator status for context ${contextName} after unexpected error`
                );
                return this.cache.get(cacheKey)!;
            }

            // No cache available - return basic status
            const basicStatus: CachedOperatorStatus = {
                status: null,
                timestamp: Date.now(),
                mode: OperatorStatusMode.Basic
            };
            this.cache.set(cacheKey, basicStatus);
            getOutputChannel().appendLine(
                `[INFO] No cached status available for context ${contextName}, using basic status after unexpected error`
            );
            return basicStatus;
        }
    }

    /**
     * Clears the cached status for a specific cluster.
     * 
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the Kubernetes context
     */
    clearCache(kubeconfigPath: string, contextName: string): void {
        const cacheKey = `${kubeconfigPath}:${contextName}`;
        this.cache.delete(cacheKey);
    }

    /**
     * Clears all cached operator statuses.
     */
    clearAllCache(): void {
        this.cache.clear();
    }

    /**
     * Determines the extension status mode from operator status.
     * 
     * @param status The operator status from the ConfigMap
     * @returns The extension-determined status mode
     */
    private determineStatusMode(status: OperatorStatus): OperatorStatusMode {
        // Check if status timestamp is stale (>5 minutes)
        try {
            const lastUpdateTime = new Date(status.lastUpdate).getTime();
            const statusAge = Date.now() - lastUpdateTime;
            const isStale = statusAge > this.CACHE_TTL_MS;
            
            if (isStale) {
                return OperatorStatusMode.Degraded;
            }
        } catch (error) {
            // Invalid timestamp - treat as degraded
            const errorMessage = error instanceof Error ? error.message : String(error);
            getOutputChannel().appendLine(
                `[ERROR] Failed to parse operator status lastUpdate timestamp: ${errorMessage}`
            );
            return OperatorStatusMode.Degraded;
        }

        // Check health status
        if (status.health === 'degraded' || status.health === 'unhealthy') {
            return OperatorStatusMode.Degraded;
        }

        // Check enabled mode (pro tier)
        if (status.mode === 'enabled') {
            if (status.tier === 'pro' && status.registered && status.health === 'healthy') {
                return OperatorStatusMode.Enabled;
            }
            // Enabled mode but not properly registered or healthy - degraded
            return OperatorStatusMode.Degraded;
        }

        // Check operated mode (free tier)
        if (status.mode === 'operated') {
            if (status.tier === 'free' && status.health === 'healthy') {
                return OperatorStatusMode.Operated;
            }
            // Operated mode but not healthy - degraded
            return OperatorStatusMode.Degraded;
        }

        // Unknown mode - treat as degraded
        return OperatorStatusMode.Degraded;
    }

    /**
     * Validates that the operator status contains all required fields.
     * 
     * @param status The operator status to validate
     * @param contextName The context name for error messages
     * @returns Error message if validation fails, null if valid
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private validateStatusFields(status: OperatorStatus, _contextName: string): string | null {
        const missingFields: string[] = [];
        
        // Check required fields
        if (status.mode === undefined || status.mode === null) {
            missingFields.push('mode');
        }
        if (status.tier === undefined || status.tier === null) {
            missingFields.push('tier');
        }
        if (status.version === undefined || status.version === null || status.version === '') {
            missingFields.push('version');
        }
        if (status.health === undefined || status.health === null) {
            missingFields.push('health');
        }
        if (status.lastUpdate === undefined || status.lastUpdate === null || status.lastUpdate === '') {
            missingFields.push('lastUpdate');
        }
        if (status.registered === undefined || status.registered === null) {
            missingFields.push('registered');
        }
        
        if (missingFields.length > 0) {
            return `Missing required fields: ${missingFields.join(', ')}`;
        }
        
        return null;
    }

    /**
     * Checks if a kubectl error indicates the ConfigMap was not found (404).
     * 
     * @param error The kubectl error to check
     * @returns True if the error indicates ConfigMap not found
     */
    private isNotFoundError(error: import('../kubernetes/KubectlError').KubectlError): boolean {
        // Check error details for 404 indicators
        const details = error.getDetails().toLowerCase();
        return (
            details.includes('not found') ||
            details.includes('404') ||
            error.type === KubectlErrorType.Unknown && details.includes('configmap') && details.includes('not found')
        );
    }
}

/**
 * Exports the OutputChannel for use by other components.
 * 
 * @returns The OutputChannel instance
 */
export function getOperatorStatusOutputChannel(): vscode.OutputChannel {
    return getOutputChannel();
}

