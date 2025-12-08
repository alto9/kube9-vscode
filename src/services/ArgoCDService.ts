import { execFile } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { OperatorStatusClient } from './OperatorStatusClient';
import { KubectlError, KubectlErrorType } from '../kubernetes/KubectlError';
import {
    ArgoCDInstallationStatus,
    DETECTION_CACHE_TTL,
    DEFAULT_ARGOCD_NAMESPACE
} from '../types/argocd';

/**
 * Timeout for kubectl commands in milliseconds.
 */
const KUBECTL_TIMEOUT_MS = 5000;

/**
 * Promisified version of execFile for async/await usage.
 */
const execFileAsync = promisify(execFile);

/**
 * Cached ArgoCD detection status with metadata.
 */
interface CachedDetectionStatus {
    /** The detection status */
    status: ArgoCDInstallationStatus;
    
    /** Timestamp when this status was cached (milliseconds since epoch) */
    timestamp: number;
}

/**
 * ArgoCD server deployment information.
 */
interface ArgoCDServerInfo {
    /** Namespace where ArgoCD server is deployed */
    namespace: string;
    
    /** ArgoCD version string */
    version: string;
}

/**
 * OutputChannel for ArgoCD service logging.
 * Created lazily on first use.
 */
let outputChannel: vscode.OutputChannel | undefined;

/**
 * Gets or creates the OutputChannel for ArgoCD service logging.
 * 
 * @returns The OutputChannel instance
 */
function getOutputChannel(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('kube9 ArgoCD Service');
    }
    return outputChannel;
}

/**
 * Service for detecting ArgoCD installations in Kubernetes clusters.
 * 
 * This service operates in two modes:
 * 1. **Operated mode**: Consumes ArgoCD status from kube9-operator status ConfigMap
 * 2. **Basic mode**: Falls back to direct CRD detection when operator is not available
 * 
 * Detection results are cached for 5 minutes to minimize kubectl calls.
 */
export class ArgoCDService {
    /**
     * Cache storage keyed by context name.
     */
    private cache: Map<string, CachedDetectionStatus> = new Map();

    /**
     * Cache time-to-live in milliseconds (5 minutes).
     */
    private readonly CACHE_TTL_MS = DETECTION_CACHE_TTL * 1000;

    /**
     * Creates a new ArgoCDService instance.
     * 
     * @param operatorStatusClient Client for querying operator status
     * @param kubeconfigPath Path to the kubeconfig file
     */
    constructor(
        private operatorStatusClient: OperatorStatusClient,
        private kubeconfigPath: string
    ) {}

    /**
     * Checks if ArgoCD is installed in the specified cluster context.
     * 
     * First attempts to use operator status (operated mode), then falls back
     * to direct CRD detection (basic mode) if operator is not available.
     * 
     * Results are cached for 5 minutes unless bypassCache is true.
     * 
     * @param context Name of the Kubernetes context
     * @param bypassCache If true, bypasses cache and queries the cluster directly
     * @returns Promise resolving to ArgoCD installation status
     */
    async isInstalled(
        context: string,
        bypassCache = false
    ): Promise<ArgoCDInstallationStatus> {
        // Check cache if not bypassing
        if (!bypassCache && this.cache.has(context)) {
            const cached = this.cache.get(context)!;
            const cacheAge = Date.now() - cached.timestamp;
            
            // Return cached result if still valid
            if (cacheAge < this.CACHE_TTL_MS) {
                return cached.status;
            }
        }

        try {
            // Try operated mode detection first
            const operatorStatus = await this.operatorStatusClient.getStatus(
                this.kubeconfigPath,
                context
            );

            // Check if operator has ArgoCD status
            if (operatorStatus.status && operatorStatus.status.argocd) {
                const argocdStatus = operatorStatus.status.argocd;
                
                if (argocdStatus.detected) {
                    // ArgoCD detected via operator
                    const status: ArgoCDInstallationStatus = {
                        installed: true,
                        namespace: argocdStatus.namespace || undefined,
                        version: argocdStatus.version || undefined,
                        detectionMethod: 'operator',
                        lastChecked: argocdStatus.lastChecked || new Date().toISOString()
                    };
                    
                    // Cache the result
                    this.cache.set(context, {
                        status,
                        timestamp: Date.now()
                    });
                    
                    return status;
                } else {
                    // Operator reports ArgoCD not detected
                    const status: ArgoCDInstallationStatus = {
                        installed: false,
                        detectionMethod: 'operator',
                        lastChecked: argocdStatus.lastChecked || new Date().toISOString()
                    };
                    
                    // Cache the result
                    this.cache.set(context, {
                        status,
                        timestamp: Date.now()
                    });
                    
                    return status;
                }
            }

            // Fall back to direct detection if operator status not available
            return await this.directDetection(context);
        } catch (error) {
            // Unexpected error - log and fall back to cache or direct detection
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            
            getOutputChannel().appendLine(
                `[ERROR] Unexpected error detecting ArgoCD for context ${context}: ${errorMessage}`
            );
            if (errorStack) {
                getOutputChannel().appendLine(`[ERROR] Stack trace: ${errorStack}`);
            }

            // Fall back to cache if available
            if (this.cache.has(context)) {
                getOutputChannel().appendLine(
                    `[INFO] Falling back to cached ArgoCD detection status for context ${context}`
                );
                return this.cache.get(context)!.status;
            }

            // No cache available - try direct detection
            try {
                return await this.directDetection(context);
            } catch (directError) {
                // Direct detection also failed - return not installed
                const directErrorMessage = directError instanceof Error ? directError.message : String(directError);
                getOutputChannel().appendLine(
                    `[ERROR] Direct detection also failed for context ${context}: ${directErrorMessage}`
                );
                
                // Return not installed status
                const status: ArgoCDInstallationStatus = {
                    installed: false,
                    detectionMethod: 'crd',
                    lastChecked: new Date().toISOString()
                };
                
                // Cache the negative result to avoid repeated failures
                this.cache.set(context, {
                    status,
                    timestamp: Date.now()
                });
                
                return status;
            }
        }
    }

    /**
     * Direct detection of ArgoCD by checking for CRD and server deployment.
     * 
     * This method is used when operator status is not available (basic mode).
     * 
     * @param context Name of the Kubernetes context
     * @returns Promise resolving to ArgoCD installation status
     */
    private async directDetection(context: string): Promise<ArgoCDInstallationStatus> {
        // Check if CRD exists
        const crdExists = await this.checkCRDExists(context);
        
        if (!crdExists) {
            // CRD doesn't exist - ArgoCD not installed
            const status: ArgoCDInstallationStatus = {
                installed: false,
                detectionMethod: 'crd',
                lastChecked: new Date().toISOString()
            };
            
            // Cache the result
            this.cache.set(context, {
                status,
                timestamp: Date.now()
            });
            
            return status;
        }

        // CRD exists - find ArgoCD server deployment
        const serverInfo = await this.findArgoCDServer(context);
        
        if (!serverInfo) {
            // CRD exists but server not found - treat as not installed
            const status: ArgoCDInstallationStatus = {
                installed: false,
                detectionMethod: 'crd',
                lastChecked: new Date().toISOString()
            };
            
            // Cache the result
            this.cache.set(context, {
                status,
                timestamp: Date.now()
            });
            
            return status;
        }

        // ArgoCD is installed
        const status: ArgoCDInstallationStatus = {
            installed: true,
            namespace: serverInfo.namespace,
            version: serverInfo.version,
            detectionMethod: 'crd',
            lastChecked: new Date().toISOString()
        };
        
        // Cache the result
        this.cache.set(context, {
            status,
            timestamp: Date.now()
        });
        
        return status;
    }

    /**
     * Checks if the ArgoCD Application CRD exists in the cluster.
     * 
     * @param context Name of the Kubernetes context
     * @returns Promise resolving to true if CRD exists, false otherwise
     */
    private async checkCRDExists(context: string): Promise<boolean> {
        try {
            // Execute kubectl get crd for applications.argoproj.io
            const { stdout } = await execFileAsync(
                'kubectl',
                [
                    'get',
                    'crd',
                    'applications.argoproj.io',
                    '--output=json',
                    `--kubeconfig=${this.kubeconfigPath}`,
                    `--context=${context}`
                ],
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                    env: { ...process.env }
                }
            );

            // Parse JSON to verify CRD exists
            const crdData = JSON.parse(stdout);
            
            // Check if CRD has required metadata
            if (crdData.metadata && crdData.metadata.name === 'applications.argoproj.io') {
                return true;
            }
            
            return false;
        } catch (error: unknown) {
            // kubectl failed - analyze error
            const kubectlError = KubectlError.fromExecError(error, context);
            const errorDetails = kubectlError.getDetails().toLowerCase();
            
            // Check if error indicates CRD not found (404)
            if (
                errorDetails.includes('not found') ||
                errorDetails.includes('404') ||
                kubectlError.type === KubectlErrorType.Unknown && errorDetails.includes('crd') && errorDetails.includes('not found')
            ) {
                // CRD not found - expected behavior
                return false;
            }
            
            // Handle RBAC/permission errors
            if (kubectlError.type === KubectlErrorType.PermissionDenied) {
                getOutputChannel().appendLine(
                    `[WARNING] RBAC permission denied when checking ArgoCD CRD for context ${context}: ${kubectlError.getDetails()}`
                );
                return false;
            }
            
            // Handle network/connection errors
            if (
                kubectlError.type === KubectlErrorType.ConnectionFailed ||
                kubectlError.type === KubectlErrorType.Timeout
            ) {
                getOutputChannel().appendLine(
                    `[ERROR] Network/connectivity error when checking ArgoCD CRD for context ${context}: ${kubectlError.getDetails()}`
                );
                return false;
            }
            
            // Unknown error - log and return false
            getOutputChannel().appendLine(
                `[WARNING] Error checking for ArgoCD CRD in context ${context}: ${kubectlError.getDetails()}`
            );
            return false;
        }
    }

    /**
     * Finds the ArgoCD server deployment and extracts namespace and version.
     * 
     * @param context Name of the Kubernetes context
     * @returns Promise resolving to server info with namespace and version, or null if not found
     */
    private async findArgoCDServer(context: string): Promise<ArgoCDServerInfo | null> {
        try {
            // Execute kubectl get deployments with label selector
            const { stdout } = await execFileAsync(
                'kubectl',
                [
                    'get',
                    'deployments',
                    '--all-namespaces',
                    '--selector=app.kubernetes.io/name=argocd-server',
                    '--output=json',
                    `--kubeconfig=${this.kubeconfigPath}`,
                    `--context=${context}`
                ],
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                    env: { ...process.env }
                }
            );

            // Parse JSON response
            const response = JSON.parse(stdout);
            
            // Check if any deployments found
            if (!response.items || response.items.length === 0) {
                return null;
            }

            // Get first deployment
            const deployment = response.items[0];
            
            // Extract namespace
            const namespace = deployment.metadata?.namespace || DEFAULT_ARGOCD_NAMESPACE;
            
            // Extract version
            let version = 'unknown';
            
            // First try: metadata labels
            if (deployment.metadata?.labels?.['app.kubernetes.io/version']) {
                version = deployment.metadata.labels['app.kubernetes.io/version'];
            } else if (deployment.spec?.template?.spec?.containers?.[0]?.image) {
                // Fallback: parse container image tag
                const image = deployment.spec.template.spec.containers[0].image;
                const imageTagMatch = image.match(/:(.+)$/);
                if (imageTagMatch && imageTagMatch[1]) {
                    version = imageTagMatch[1];
                    // Ensure version starts with 'v' if it's a version number
                    if (/^\d+\.\d+\.\d+/.test(version) && !version.startsWith('v')) {
                        version = `v${version}`;
                    }
                }
            }
            
            return {
                namespace,
                version
            };
        } catch (error: unknown) {
            // kubectl failed - analyze error
            const kubectlError = KubectlError.fromExecError(error, context);
            const errorDetails = kubectlError.getDetails().toLowerCase();
            
            // Check if error indicates deployment not found
            if (
                errorDetails.includes('not found') ||
                errorDetails.includes('404') ||
                (kubectlError.type === KubectlErrorType.Unknown && errorDetails.includes('deployment') && errorDetails.includes('not found'))
            ) {
                // Deployment not found - expected behavior
                return null;
            }
            
            // Handle RBAC/permission errors
            if (kubectlError.type === KubectlErrorType.PermissionDenied) {
                getOutputChannel().appendLine(
                    `[WARNING] RBAC permission denied when searching for ArgoCD server deployment in context ${context}: ${kubectlError.getDetails()}`
                );
                return null;
            }
            
            // Handle network/connection errors
            if (
                kubectlError.type === KubectlErrorType.ConnectionFailed ||
                kubectlError.type === KubectlErrorType.Timeout
            ) {
                getOutputChannel().appendLine(
                    `[ERROR] Network/connectivity error when searching for ArgoCD server deployment in context ${context}: ${kubectlError.getDetails()}`
                );
                return null;
            }
            
            // Unknown error - log and return null
            getOutputChannel().appendLine(
                `[WARNING] Error searching for ArgoCD server deployment in context ${context}: ${kubectlError.getDetails()}`
            );
            return null;
        }
    }

    /**
     * Clears the cached detection status for a specific cluster.
     * 
     * @param context Name of the Kubernetes context
     */
    clearCache(context: string): void {
        this.cache.delete(context);
    }

    /**
     * Clears all cached detection statuses.
     */
    clearAllCache(): void {
        this.cache.clear();
    }
}

