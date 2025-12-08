import { execFile } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { OperatorStatusClient } from './OperatorStatusClient';
import { KubectlError, KubectlErrorType } from '../kubernetes/KubectlError';
import {
    ArgoCDInstallationStatus,
    DETECTION_CACHE_TTL,
    APPLICATION_CACHE_TTL,
    DEFAULT_ARGOCD_NAMESPACE,
    ArgoCDNotFoundError,
    ArgoCDPermissionError,
    ArgoCDApplication,
    ArgoCDResource,
    OperationState,
    OperationResult,
    SyncStatus,
    HealthStatus,
    ApplicationSource,
    ApplicationDestination,
    SyncStatusCode,
    HealthStatusCode,
    OperationPhase,
    SyncOperationResult,
    ResourceResult,
    OPERATION_POLL_INTERVAL,
    OPERATION_TIMEOUT
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
 * Cached application list with metadata.
 */
interface CachedApplicationList {
    /** The parsed ArgoCDApplication objects */
    applications: ArgoCDApplication[];
    
    /** Timestamp when this list was cached (milliseconds since epoch) */
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
 * Raw Application CRD structure from Kubernetes API.
 */
interface RawApplicationCRD {
    metadata?: {
        name?: string;
        namespace?: string;
        creationTimestamp?: string;
    };
    spec?: {
        project?: string;
        source?: {
            repoURL?: string;
            path?: string;
            targetRevision?: string;
            chart?: string;
            helm?: {
                values?: string;
                parameters?: Array<{ name: string; value: string }>;
            };
        };
        destination?: {
            server?: string;
            namespace?: string;
            name?: string;
        };
    };
    status?: {
        sync?: {
            status?: string;
            revision?: string;
        };
        health?: {
            status?: string;
            message?: string;
        };
        resources?: Array<{
            kind?: string;
            name?: string;
            namespace?: string;
            status?: string;
            health?: {
                status?: string;
            };
            message?: string;
            requiresPruning?: boolean;
        }>;
        operationState?: {
            phase?: string;
            message?: string;
            startedAt?: string;
            finishedAt?: string;
            syncResult?: {
                resources?: Array<{
                    kind?: string;
                    name?: string;
                    namespace?: string;
                    status?: string;
                    message?: string;
                    hookPhase?: string;
                }>;
                revision?: string;
            };
        };
    };
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
     * Cache storage keyed by context name for detection status.
     */
    private cache: Map<string, CachedDetectionStatus> = new Map();

    /**
     * Cache storage keyed by context name for application lists.
     */
    private applicationCache: Map<string, CachedApplicationList> = new Map();

    /**
     * Cache time-to-live in milliseconds for detection (5 minutes).
     */
    private readonly CACHE_TTL_MS = DETECTION_CACHE_TTL * 1000;

    /**
     * Cache time-to-live in milliseconds for application lists (30 seconds).
     */
    private readonly APPLICATION_CACHE_TTL_MS = APPLICATION_CACHE_TTL * 1000;

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
     * Parses raw Application CRD JSON into strongly-typed ArgoCDApplication interface.
     * 
     * @param crdData Raw Application CRD JSON object
     * @returns Parsed ArgoCDApplication object
     */
    private parseApplication(crdData: unknown): ArgoCDApplication {
        const crd = crdData as RawApplicationCRD;
        // Extract metadata fields
        const name = crd.metadata?.name;
        const namespace = crd.metadata?.namespace || '';
        const project = crd.spec?.project || 'default';
        const createdAt = crd.metadata?.creationTimestamp || new Date().toISOString();

        // Validate required fields
        if (!name) {
            throw new Error('Application CRD missing required field: metadata.name');
        }
        if (!crd.spec?.source) {
            throw new Error('Application CRD missing required field: spec.source');
        }
        if (!crd.spec?.destination) {
            throw new Error('Application CRD missing required field: spec.destination');
        }

        // Parse sync status
        const syncStatus: SyncStatus = this.parseSyncStatus(crd);

        // Parse health status
        const healthStatus: HealthStatus = this.parseHealthStatus(crd);

        // Parse source
        const source: ApplicationSource = this.parseSource(crd.spec.source || {});

        // Parse destination
        const destination: ApplicationDestination = {
            server: crd.spec.destination.server || '',
            namespace: crd.spec.destination.namespace || '',
            name: crd.spec.destination.name
        };

        // Parse resources
        const resources = this.parseResources(crd.status?.resources || []);

        // Parse last operation
        const lastOperation = this.parseOperation(crd.status?.operationState);

        // Extract syncedAt from operationState finishedAt
        const syncedAt = crd.status?.operationState?.finishedAt;

        return {
            name,
            namespace,
            project,
            createdAt,
            syncStatus,
            healthStatus,
            source,
            destination,
            resources,
            lastOperation,
            syncedAt
        };
    }

    /**
     * Parses sync status from CRD data.
     * 
     * @param crdData Raw Application CRD JSON object
     * @returns Parsed SyncStatus object
     */
    private parseSyncStatus(crdData: RawApplicationCRD): SyncStatus {
        const sync = crdData.status?.sync;
        
        if (!sync) {
            // Default sync status with source from spec
            return {
                status: 'Unknown' as SyncStatusCode,
                revision: '',
                comparedTo: {
                    source: this.parseSource(crdData.spec?.source || {})
                }
            };
        }

        const statusCode = this.validateSyncStatusCode(sync.status || '');
        const revision = sync.revision || '';

        // Use spec.source for comparedTo.source
        const comparedToSource = this.parseSource(crdData.spec?.source || {});

        return {
            status: statusCode,
            revision,
            comparedTo: {
                source: comparedToSource
            }
        };
    }

    /**
     * Parses health status from CRD data.
     * 
     * @param crdData Raw Application CRD JSON object
     * @returns Parsed HealthStatus object
     */
    private parseHealthStatus(crdData: RawApplicationCRD): HealthStatus {
        const health = crdData.status?.health;
        
        if (!health) {
            return {
                status: 'Unknown' as HealthStatusCode
            };
        }

        const statusCode = this.validateHealthStatusCode(health.status || '');

        return {
            status: statusCode,
            message: health.message
        };
    }

    /**
     * Parses application source from CRD spec.source.
     * 
     * @param sourceData Raw source object from CRD
     * @returns Parsed ApplicationSource object
     */
    private parseSource(sourceData: unknown): ApplicationSource {
        const source = sourceData as RawApplicationCRD['spec'] | undefined;
        const sourceObj = source?.source;
        if (!sourceObj) {
            // Fallback: treat sourceData as the source object directly
            const directSource = sourceData as { repoURL?: string; path?: string; targetRevision?: string; chart?: string; helm?: { values?: string; parameters?: Array<{ name: string; value: string }> } };
            return {
                repoURL: directSource.repoURL || '',
                path: directSource.path || '',
                targetRevision: directSource.targetRevision || 'HEAD',
                chart: directSource.chart,
                helm: directSource.helm ? {
                    values: directSource.helm.values,
                    parameters: directSource.helm.parameters
                } : undefined
            };
        }
        return {
            repoURL: sourceObj.repoURL || '',
            path: sourceObj.path || '',
            targetRevision: sourceObj.targetRevision || 'HEAD',
            chart: sourceObj.chart,
            helm: sourceObj.helm ? {
                values: sourceObj.helm.values,
                parameters: sourceObj.helm.parameters
            } : undefined
        };
    }

    /**
     * Validates and normalizes sync status code.
     * 
     * @param status Raw status string from CRD
     * @returns Valid SyncStatusCode
     */
    private validateSyncStatusCode(status: string): SyncStatusCode {
        const validStatuses: SyncStatusCode[] = ['Synced', 'OutOfSync', 'Unknown'];
        if (validStatuses.includes(status as SyncStatusCode)) {
            return status as SyncStatusCode;
        }
        getOutputChannel().appendLine(
            `[WARNING] Invalid sync status code: ${status}, defaulting to 'Unknown'`
        );
        return 'Unknown';
    }

    /**
     * Validates and normalizes health status code.
     * 
     * @param status Raw status string from CRD
     * @returns Valid HealthStatusCode
     */
    private validateHealthStatusCode(status: string): HealthStatusCode {
        const validStatuses: HealthStatusCode[] = [
            'Healthy',
            'Degraded',
            'Progressing',
            'Suspended',
            'Missing',
            'Unknown'
        ];
        if (validStatuses.includes(status as HealthStatusCode)) {
            return status as HealthStatusCode;
        }
        getOutputChannel().appendLine(
            `[WARNING] Invalid health status code: ${status}, defaulting to 'Unknown'`
        );
        return 'Unknown';
    }

    /**
     * Parses resource-level status array from CRD data.
     * 
     * @param resources Raw resources array from CRD status.resources
     * @returns Array of parsed ArgoCDResource objects
     */
    private parseResources(resources: unknown[]): ArgoCDResource[] {
        if (!Array.isArray(resources)) {
            return [];
        }

        return resources.map(resource => {
            const res = resource as RawApplicationCRD['status'] extends { resources?: Array<infer R> } ? R : never;
            const parsed: ArgoCDResource = {
                kind: (res as { kind?: string }).kind || '',
                name: (res as { name?: string }).name || '',
                namespace: (res as { namespace?: string }).namespace || '',
                syncStatus: (res as { status?: string }).status || 'Unknown',
                healthStatus: (res as { health?: { status?: string } }).health?.status 
                    ? this.validateHealthStatusCode((res as { health?: { status?: string } }).health!.status!)
                    : undefined,
                message: (res as { message?: string }).message,
                requiresPruning: (res as { requiresPruning?: boolean }).requiresPruning
            };

            return parsed;
        });
    }

    /**
     * Parses operation state from CRD data.
     * 
     * @param operationState Raw operationState object from CRD status.operationState
     * @returns Parsed OperationState object or undefined if not present
     */
    private parseOperation(operationState: unknown): OperationState | undefined {
        if (!operationState) {
            return undefined;
        }

        const opState = operationState as RawApplicationCRD['status'] extends { operationState?: infer O } ? O : never;
        const opStateObj = opState as { phase?: string; startedAt?: string; finishedAt?: string; message?: string; syncResult?: { resources?: Array<{ kind?: string; name?: string; namespace?: string; status?: string; message?: string; hookPhase?: string }>; revision?: string } } | undefined;
        const phase = this.validateOperationPhase(opStateObj?.phase || '');
        const startedAt = opStateObj?.startedAt || new Date().toISOString();
        const finishedAt = opStateObj?.finishedAt;
        const message = opStateObj?.message;

        // Parse syncResult if present
        let syncResult: SyncOperationResult | undefined;
        if (opStateObj && opStateObj.syncResult) {
            const resources: ResourceResult[] = (opStateObj.syncResult.resources || []).map((res: unknown) => {
                const r = res as { kind?: string; name?: string; namespace?: string; status?: string; message?: string; hookPhase?: string };
                return {
                    kind: r.kind || '',
                    name: r.name || '',
                    namespace: r.namespace || '',
                    status: r.status || '',
                    message: r.message,
                    hookPhase: r.hookPhase
                };
            });

            syncResult = {
                resources,
                revision: opStateObj.syncResult.revision || ''
            };
        }

        return {
            phase,
            message,
            startedAt,
            finishedAt,
            syncResult
        };
    }

    /**
     * Validates and normalizes operation phase.
     * 
     * @param phase Raw phase string from CRD
     * @returns Valid OperationPhase
     */
    private validateOperationPhase(phase: string): OperationPhase {
        const validPhases: OperationPhase[] = [
            'Running',
            'Terminating',
            'Succeeded',
            'Failed',
            'Error'
        ];
        if (validPhases.includes(phase as OperationPhase)) {
            return phase as OperationPhase;
        }
        getOutputChannel().appendLine(
            `[WARNING] Invalid operation phase: ${phase}, defaulting to 'Error'`
        );
        return 'Error';
    }

    /**
     * Queries all ArgoCD Applications in the cluster.
     * 
     * Returns parsed ArgoCDApplication objects.
     * Results are cached for 30 seconds unless bypassCache is true.
     * 
     * @param context Name of the Kubernetes context
     * @param bypassCache If true, bypasses cache and queries the cluster directly
     * @returns Promise resolving to array of parsed ArgoCDApplication objects
     */
    async getApplications(
        context: string,
        bypassCache = false
    ): Promise<ArgoCDApplication[]> {
        // Check cache if not bypassing
        if (!bypassCache && this.applicationCache.has(context)) {
            const cached = this.applicationCache.get(context)!;
            const cacheAge = Date.now() - cached.timestamp;
            
            // Return cached result if still valid
            if (cacheAge < this.APPLICATION_CACHE_TTL_MS) {
                getOutputChannel().appendLine(
                    `[INFO] Returning cached application list for context ${context}`
                );
                return cached.applications as ArgoCDApplication[];
            }
        }

        // Get ArgoCD namespace from detection
        let namespace: string;
        try {
            const installationStatus = await this.isInstalled(context, false);
            
            // If ArgoCD is not installed, return empty array
            if (!installationStatus.installed) {
                getOutputChannel().appendLine(
                    `[INFO] ArgoCD not installed in context ${context}, returning empty application list`
                );
                return [];
            }
            
            namespace = installationStatus.namespace || DEFAULT_ARGOCD_NAMESPACE;
        } catch (error) {
            // If detection fails, log and return empty array
            const errorMessage = error instanceof Error ? error.message : String(error);
            getOutputChannel().appendLine(
                `[WARNING] Failed to detect ArgoCD installation for context ${context}: ${errorMessage}`
            );
            
            // Check cache before returning empty array
            if (this.applicationCache.has(context)) {
                getOutputChannel().appendLine(
                    `[INFO] Returning cached application list after detection failure for context ${context}`
                );
                return this.applicationCache.get(context)!.applications as ArgoCDApplication[];
            }
            
            return [];
        }

        try {
            // Execute kubectl get applications
            const { stdout } = await execFileAsync(
                'kubectl',
                [
                    'get',
                    'applications.argoproj.io',
                    '-n',
                    namespace,
                    '--output=json',
                    `--kubeconfig=${this.kubeconfigPath}`,
                    `--context=${context}`
                ],
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large application lists
                    env: { ...process.env }
                }
            );

            // Parse JSON response
            const response = JSON.parse(stdout);
            
            // Extract items array (kubectl returns list with items array)
            const rawApplications = response.items || [];
            
            // Parse each application
            const applications: ArgoCDApplication[] = [];
            for (const rawApp of rawApplications) {
                try {
                    const parsed = this.parseApplication(rawApp);
                    applications.push(parsed);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    getOutputChannel().appendLine(
                        `[WARNING] Failed to parse application CRD: ${errorMessage}`
                    );
                    // Continue with other applications instead of failing completely
                }
            }
            
            // Cache the result
            this.applicationCache.set(context, {
                applications,
                timestamp: Date.now()
            });
            
            getOutputChannel().appendLine(
                `[INFO] Successfully queried and parsed ${applications.length} applications from context ${context}`
            );
            
            return applications;
        } catch (error: unknown) {
            // kubectl failed - analyze error
            const kubectlError = KubectlError.fromExecError(error, context);
            const errorDetails = kubectlError.getDetails().toLowerCase();
            
            // Check cache before returning empty array
            if (this.applicationCache.has(context)) {
                getOutputChannel().appendLine(
                    `[WARNING] Error querying applications for context ${context}, returning cached data: ${kubectlError.getDetails()}`
                );
                return this.applicationCache.get(context)!.applications as ArgoCDApplication[];
            }
            
            // Handle RBAC/permission errors
            if (kubectlError.type === KubectlErrorType.PermissionDenied) {
                getOutputChannel().appendLine(
                    `[WARNING] RBAC permission denied when querying ArgoCD applications for context ${context}: ${kubectlError.getDetails()}`
                );
                return [];
            }
            
            // Handle not found errors (namespace or CRD not found)
            if (
                errorDetails.includes('not found') ||
                errorDetails.includes('404')
            ) {
                getOutputChannel().appendLine(
                    `[INFO] ArgoCD applications not found in namespace ${namespace} for context ${context}`
                );
                return [];
            }
            
            // Handle network/connection errors
            if (
                kubectlError.type === KubectlErrorType.ConnectionFailed ||
                kubectlError.type === KubectlErrorType.Timeout
            ) {
                getOutputChannel().appendLine(
                    `[ERROR] Network/connectivity error when querying ArgoCD applications for context ${context}: ${kubectlError.getDetails()}`
                );
                return [];
            }
            
            // Unknown error - log and return empty array
            getOutputChannel().appendLine(
                `[WARNING] Error querying ArgoCD applications for context ${context}: ${kubectlError.getDetails()}`
            );
            return [];
        }
    }

    /**
     * Queries a single ArgoCD Application by name.
     * 
     * Returns parsed ArgoCDApplication object.
     * No caching for single application queries.
     * 
     * @param name Application name
     * @param namespace Application namespace
     * @param context Name of the Kubernetes context
     * @returns Promise resolving to parsed ArgoCDApplication object
     * @throws ArgoCDNotFoundError if application is not found
     * @throws Error for other failures
     */
    async getApplication(
        name: string,
        namespace: string,
        context: string
    ): Promise<ArgoCDApplication> {
        try {
            // Execute kubectl get application
            const { stdout } = await execFileAsync(
                'kubectl',
                [
                    'get',
                    `application.argoproj.io/${name}`,
                    '-n',
                    namespace,
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
            const rawApplication = JSON.parse(stdout);
            
            // Parse the application
            const application = this.parseApplication(rawApplication);
            
            getOutputChannel().appendLine(
                `[INFO] Successfully queried and parsed application ${name} from namespace ${namespace} in context ${context}`
            );
            
            return application;
        } catch (error: unknown) {
            // kubectl failed - analyze error
            const kubectlError = KubectlError.fromExecError(error, context);
            const errorDetails = kubectlError.getDetails().toLowerCase();
            
            // Handle not found errors
            if (
                errorDetails.includes('not found') ||
                errorDetails.includes('404')
            ) {
                throw new ArgoCDNotFoundError(
                    `Application ${name} not found in namespace ${namespace}`
                );
            }
            
            // Handle RBAC/permission errors
            if (kubectlError.type === KubectlErrorType.PermissionDenied) {
                getOutputChannel().appendLine(
                    `[WARNING] RBAC permission denied when querying application ${name} in namespace ${namespace} for context ${context}: ${kubectlError.getDetails()}`
                );
                throw new ArgoCDNotFoundError(
                    `Permission denied: Cannot access application ${name} in namespace ${namespace}`
                );
            }
            
            // Handle network/connection errors
            if (
                kubectlError.type === KubectlErrorType.ConnectionFailed ||
                kubectlError.type === KubectlErrorType.Timeout
            ) {
                const errorMessage = `Network/connectivity error when querying application ${name} in namespace ${namespace} for context ${context}: ${kubectlError.getDetails()}`;
                getOutputChannel().appendLine(`[ERROR] ${errorMessage}`);
                throw new Error(errorMessage);
            }
            
            // Unknown error - log and throw
            const errorMessage = `Error querying application ${name} in namespace ${namespace} for context ${context}: ${kubectlError.getDetails()}`;
            getOutputChannel().appendLine(`[ERROR] ${errorMessage}`);
            throw new Error(errorMessage);
        }
    }

    /**
     * Triggers a sync operation for an ArgoCD application.
     * 
     * Patches the Application CRD with a refresh annotation that ArgoCD controller
     * detects and processes to initiate a sync operation.
     * 
     * @param name Application name
     * @param namespace Application namespace
     * @param context Name of the Kubernetes context
     * @throws ArgoCDNotFoundError if application is not found
     * @throws ArgoCDPermissionError if RBAC permission denied
     * @throws Error for other failures
     */
    async syncApplication(
        name: string,
        namespace: string,
        context: string
    ): Promise<void> {
        const patch = {
            metadata: {
                annotations: {
                    'argocd.argoproj.io/refresh': 'normal'
                }
            }
        };

        try {
            await execFileAsync(
                'kubectl',
                [
                    'patch',
                    `application.argoproj.io/${name}`,
                    '-n',
                    namespace,
                    '--type=merge',
                    `-p=${JSON.stringify(patch)}`,
                    `--kubeconfig=${this.kubeconfigPath}`,
                    `--context=${context}`
                ],
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                    env: { ...process.env }
                }
            );

            getOutputChannel().appendLine(
                `[INFO] Successfully triggered sync for application ${name} in namespace ${namespace} in context ${context}`
            );

            // Invalidate cache to ensure fresh data on next query
            this.invalidateCache(context);
        } catch (error: unknown) {
            const kubectlError = KubectlError.fromExecError(error, context);
            const errorDetails = kubectlError.getDetails().toLowerCase();

            // Handle not found errors
            if (
                errorDetails.includes('not found') ||
                errorDetails.includes('404')
            ) {
                throw new ArgoCDNotFoundError(
                    `Application ${name} not found in namespace ${namespace}`
                );
            }

            // Handle RBAC/permission errors
            if (kubectlError.type === KubectlErrorType.PermissionDenied) {
                const errorMessage = `Permission denied: Cannot sync application ${name} in namespace ${namespace}`;
                getOutputChannel().appendLine(`[ERROR] ${errorMessage}`);
                throw new ArgoCDPermissionError(errorMessage);
            }

            // Handle network/connection errors
            if (
                kubectlError.type === KubectlErrorType.ConnectionFailed ||
                kubectlError.type === KubectlErrorType.Timeout
            ) {
                const errorMessage = `Network/connectivity error when syncing application ${name} in namespace ${namespace} for context ${context}: ${kubectlError.getDetails()}`;
                getOutputChannel().appendLine(`[ERROR] ${errorMessage}`);
                throw new Error(errorMessage);
            }

            // Unknown error - log and throw
            const errorMessage = `Error syncing application ${name} in namespace ${namespace} for context ${context}: ${kubectlError.getDetails()}`;
            getOutputChannel().appendLine(`[ERROR] ${errorMessage}`);
            throw new Error(errorMessage);
        }
    }

    /**
     * Triggers a refresh operation for an ArgoCD application.
     * 
     * Refresh uses the same annotation as sync. ArgoCD controller determines
     * whether sync is needed based on current state.
     * 
     * @param name Application name
     * @param namespace Application namespace
     * @param context Name of the Kubernetes context
     * @throws ArgoCDNotFoundError if application is not found
     * @throws ArgoCDPermissionError if RBAC permission denied
     * @throws Error for other failures
     */
    async refreshApplication(
        name: string,
        namespace: string,
        context: string
    ): Promise<void> {
        // Same as sync - ArgoCD determines operation type
        return this.syncApplication(name, namespace, context);
    }

    /**
     * Triggers a hard refresh operation for an ArgoCD application.
     * 
     * Hard refresh clears the cache before comparing Git vs cluster state.
     * Patches the Application CRD with a hard refresh annotation.
     * 
     * @param name Application name
     * @param namespace Application namespace
     * @param context Name of the Kubernetes context
     * @throws ArgoCDNotFoundError if application is not found
     * @throws ArgoCDPermissionError if RBAC permission denied
     * @throws Error for other failures
     */
    async hardRefreshApplication(
        name: string,
        namespace: string,
        context: string
    ): Promise<void> {
        const patch = {
            metadata: {
                annotations: {
                    'argocd.argoproj.io/refresh': 'hard'
                }
            }
        };

        try {
            await execFileAsync(
                'kubectl',
                [
                    'patch',
                    `application.argoproj.io/${name}`,
                    '-n',
                    namespace,
                    '--type=merge',
                    `-p=${JSON.stringify(patch)}`,
                    `--kubeconfig=${this.kubeconfigPath}`,
                    `--context=${context}`
                ],
                {
                    timeout: KUBECTL_TIMEOUT_MS,
                    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                    env: { ...process.env }
                }
            );

            getOutputChannel().appendLine(
                `[INFO] Successfully triggered hard refresh for application ${name} in namespace ${namespace} in context ${context}`
            );

            // Invalidate cache to ensure fresh data on next query
            this.invalidateCache(context);
        } catch (error: unknown) {
            const kubectlError = KubectlError.fromExecError(error, context);
            const errorDetails = kubectlError.getDetails().toLowerCase();

            // Handle not found errors
            if (
                errorDetails.includes('not found') ||
                errorDetails.includes('404')
            ) {
                throw new ArgoCDNotFoundError(
                    `Application ${name} not found in namespace ${namespace}`
                );
            }

            // Handle RBAC/permission errors
            if (kubectlError.type === KubectlErrorType.PermissionDenied) {
                const errorMessage = `Permission denied: Cannot hard refresh application ${name} in namespace ${namespace}`;
                getOutputChannel().appendLine(`[ERROR] ${errorMessage}`);
                throw new ArgoCDPermissionError(errorMessage);
            }

            // Handle network/connection errors
            if (
                kubectlError.type === KubectlErrorType.ConnectionFailed ||
                kubectlError.type === KubectlErrorType.Timeout
            ) {
                const errorMessage = `Network/connectivity error when hard refreshing application ${name} in namespace ${namespace} for context ${context}: ${kubectlError.getDetails()}`;
                getOutputChannel().appendLine(`[ERROR] ${errorMessage}`);
                throw new Error(errorMessage);
            }

            // Unknown error - log and throw
            const errorMessage = `Error hard refreshing application ${name} in namespace ${namespace} for context ${context}: ${kubectlError.getDetails()}`;
            getOutputChannel().appendLine(`[ERROR] ${errorMessage}`);
            throw new Error(errorMessage);
        }
    }

    /**
     * Tracks the progress of an ArgoCD operation by polling application status.
     * 
     * Polls the application's operationState every 2 seconds until the operation
     * completes (Succeeded, Failed, or Error) or times out after 5 minutes.
     * 
     * @param name Application name
     * @param namespace Application namespace
     * @param context Name of the Kubernetes context
     * @param timeoutSeconds Timeout in seconds (default: 300 seconds / 5 minutes)
     * @returns Promise resolving to operation result
     * @throws Error if operation times out or fails to track
     */
    async trackOperation(
        name: string,
        namespace: string,
        context: string,
        timeoutSeconds: number = OPERATION_TIMEOUT
    ): Promise<OperationResult> {
        const startTime = Date.now();
        const timeoutMs = timeoutSeconds * 1000;
        let operationComplete = false;

        getOutputChannel().appendLine(
            `[INFO] Starting operation tracking for application ${name} in namespace ${namespace} in context ${context}`
        );

        while (!operationComplete) {
            // Check timeout
            const elapsedMs = Date.now() - startTime;
            if (elapsedMs >= timeoutMs) {
                const errorMessage = `Operation tracking timed out after ${timeoutSeconds} seconds for application ${name} in namespace ${namespace}`;
                getOutputChannel().appendLine(`[ERROR] ${errorMessage}`);
                throw new Error(errorMessage);
            }

            try {
                // Get application status
                const app = await this.getApplication(name, namespace, context);

                // Check operation state
                if (app.lastOperation) {
                    const phase = app.lastOperation.phase;

                    if (phase === 'Succeeded') {
                        const message = app.lastOperation.message || 'Operation completed successfully';
                        getOutputChannel().appendLine(
                            `[INFO] Operation succeeded for application ${name} in namespace ${namespace}: ${message}`
                        );
                        operationComplete = true;
                        return {
                            success: true,
                            message
                        };
                    }

                    if (phase === 'Failed' || phase === 'Error') {
                        const message = app.lastOperation.message || 'Operation failed';
                        getOutputChannel().appendLine(
                            `[ERROR] Operation failed for application ${name} in namespace ${namespace}: ${message}`
                        );
                        operationComplete = true;
                        return {
                            success: false,
                            message
                        };
                    }

                    // Operation still running or terminating - continue polling
                    if (phase === 'Running' || phase === 'Terminating') {
                        getOutputChannel().appendLine(
                            `[INFO] Operation in progress for application ${name} in namespace ${namespace}: phase=${phase}`
                        );
                    }
                } else {
                    // No operation state yet - operation may not have started
                    getOutputChannel().appendLine(
                        `[INFO] No operation state found for application ${name} in namespace ${namespace}, continuing to poll`
                    );
                }

                // Wait before polling again
                await new Promise(resolve => setTimeout(resolve, OPERATION_POLL_INTERVAL));
            } catch (error: unknown) {
                // Handle errors from getApplication
                const errorMessage = error instanceof Error ? error.message : String(error);
                
                // If it's a not found error, the application may have been deleted
                if (error instanceof ArgoCDNotFoundError) {
                    const errorMsg = `Application ${name} not found during operation tracking in namespace ${namespace}`;
                    getOutputChannel().appendLine(`[ERROR] ${errorMsg}`);
                    throw new Error(errorMsg);
                }

                // For other errors, log and continue polling (may be transient)
                getOutputChannel().appendLine(
                    `[WARNING] Error polling application status during operation tracking: ${errorMessage}, continuing to poll`
                );
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, OPERATION_POLL_INTERVAL));
            }
        }

        // This should never be reached, but TypeScript requires a return
        throw new Error('Operation tracking ended unexpectedly');
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

    /**
     * Clears the cached application list for a specific cluster.
     * 
     * @param context Name of the Kubernetes context
     */
    clearApplicationCache(context: string): void {
        this.applicationCache.delete(context);
    }

    /**
     * Clears all cached application lists.
     */
    clearAllApplicationCache(): void {
        this.applicationCache.clear();
    }

    /**
     * Invalidates all cached data for a specific cluster context.
     * Clears both detection cache and application list cache.
     * 
     * @param context Name of the Kubernetes context
     */
    invalidateCache(context: string): void {
        this.clearCache(context);
        this.clearApplicationCache(context);
    }
}

