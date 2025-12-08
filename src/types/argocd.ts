/**
 * ArgoCD Type Definitions
 * 
 * Type definitions for ArgoCD integration in kube9-vscode. These types represent
 * ArgoCD installation status, application data parsed from CRDs, sync/health status,
 * and resource-level drift information.
 * 
 * All types are based on the argocd-status-spec specification.
 */

import { ArgoCDStatus } from '../kubernetes/OperatorStatusTypes';

// ============================================================================
// Installation Status Types
// ============================================================================

/**
 * Represents whether ArgoCD is installed in a cluster and how it was detected.
 */
export interface ArgoCDInstallationStatus {
    /**
     * Whether ArgoCD is detected in the cluster
     */
    installed: boolean;
    
    /**
     * ArgoCD installation namespace (default: "argocd")
     */
    namespace?: string;
    
    /**
     * ArgoCD version string (e.g., "v2.8.4")
     */
    version?: string;
    
    /**
     * How ArgoCD was detected
     * - 'operator': From kube9-operator status ConfigMap
     * - 'crd': Direct CRD detection in basic mode
     */
    detectionMethod: 'operator' | 'crd';
    
    /**
     * ISO timestamp of last detection check
     */
    lastChecked?: string;
}

// Re-export ArgoCDStatus from OperatorStatusTypes
export { ArgoCDStatus };

// ============================================================================
// Application Types
// ============================================================================

/**
 * Sync status code for ArgoCD applications
 */
export type SyncStatusCode = 
    | 'Synced'
    | 'OutOfSync'
    | 'Unknown';

/**
 * Application sync status information
 */
export interface SyncStatus {
    /**
     * Current sync state
     * - 'Synced': Git state matches cluster state
     * - 'OutOfSync': Drift detected between Git and cluster
     * - 'Unknown': Sync status cannot be determined
     */
    status: SyncStatusCode;
    
    /**
     * Current Git commit SHA deployed
     */
    revision: string;
    
    /**
     * Git source being compared against
     */
    comparedTo: {
        source: ApplicationSource;
    };
}

/**
 * Health status code for ArgoCD applications
 */
export type HealthStatusCode =
    | 'Healthy'
    | 'Degraded'
    | 'Progressing'
    | 'Suspended'
    | 'Missing'
    | 'Unknown';

/**
 * Application health status information
 */
export interface HealthStatus {
    /**
     * Current health state
     * - 'Healthy': All resources are healthy
     * - 'Degraded': One or more resources are unhealthy
     * - 'Progressing': Application is being updated/deployed
     * - 'Suspended': Application is intentionally paused
     * - 'Missing': Required resources are missing
     * - 'Unknown': Health cannot be determined
     */
    status: HealthStatusCode;
    
    /**
     * Optional human-readable health message
     */
    message?: string;
}

/**
 * Helm parameters for Helm chart sources
 */
export interface HelmParameters {
    /**
     * Helm values as YAML string
     */
    values?: string;
    
    /**
     * Helm parameters array
     */
    parameters?: Array<{ name: string; value: string }>;
}

/**
 * Git source configuration for application
 */
export interface ApplicationSource {
    /**
     * Git repository URL
     */
    repoURL: string;
    
    /**
     * Path within repository to application manifests
     */
    path: string;
    
    /**
     * Branch, tag, or commit SHA to track
     */
    targetRevision: string;
    
    /**
     * Helm chart name (if using Helm)
     */
    chart?: string;
    
    /**
     * Helm-specific parameters (if using Helm)
     */
    helm?: HelmParameters;
}

/**
 * Kubernetes cluster and namespace where application is deployed
 */
export interface ApplicationDestination {
    /**
     * Kubernetes API server URL
     */
    server: string;
    
    /**
     * Target namespace for deployment
     */
    namespace: string;
    
    /**
     * Optional cluster name
     */
    name?: string;
}

/**
 * Complete application data parsed from Application CRD
 */
export interface ArgoCDApplication {
    /**
     * Application name (from metadata.name)
     */
    name: string;
    
    /**
     * Application namespace (from metadata.namespace)
     */
    namespace: string;
    
    /**
     * ArgoCD project name (from spec.project)
     */
    project: string;
    
    /**
     * ISO timestamp of application creation (from metadata.creationTimestamp)
     */
    createdAt: string;
    
    /**
     * Sync status information (from status.sync)
     */
    syncStatus: SyncStatus;
    
    /**
     * Health status information (from status.health)
     */
    healthStatus: HealthStatus;
    
    /**
     * Git source configuration (from spec.source)
     */
    source: ApplicationSource;
    
    /**
     * Deployment destination (from spec.destination)
     */
    destination: ApplicationDestination;
    
    /**
     * Resource-level status information (from status.resources)
     */
    resources: ArgoCDResource[];
    
    /**
     * Last operation state (from status.operationState)
     */
    lastOperation?: OperationState;
    
    /**
     * ISO timestamp of last successful sync
     */
    syncedAt?: string;
}

// ============================================================================
// Resource-Level Types
// ============================================================================

/**
 * Resource-level status for drift detection
 */
export interface ArgoCDResource {
    /**
     * Kubernetes resource kind (e.g., "Deployment", "Service")
     */
    kind: string;
    
    /**
     * Resource name
     */
    name: string;
    
    /**
     * Resource namespace
     */
    namespace: string;
    
    /**
     * Whether this specific resource is synced
     * "Synced" | "OutOfSync"
     */
    syncStatus: string;
    
    /**
     * Health of this specific resource
     */
    healthStatus?: HealthStatusCode;
    
    /**
     * Optional message about sync status
     */
    message?: string;
    
    /**
     * Whether resource should be deleted
     */
    requiresPruning?: boolean;
}

// ============================================================================
// Operation Types
// ============================================================================

/**
 * Operation phase for sync/refresh operations
 */
export type OperationPhase =
    | 'Running'
    | 'Terminating'
    | 'Succeeded'
    | 'Failed'
    | 'Error';

/**
 * Resource result from sync operation
 */
export interface ResourceResult {
    /**
     * Kubernetes resource kind
     */
    kind: string;
    
    /**
     * Resource name
     */
    name: string;
    
    /**
     * Resource namespace
     */
    namespace: string;
    
    /**
     * Sync status: "Synced" | "SyncFailed"
     */
    status: string;
    
    /**
     * Optional status message
     */
    message?: string;
    
    /**
     * Optional hook phase
     */
    hookPhase?: string;
}

/**
 * Detailed results of sync operation
 */
export interface SyncOperationResult {
    /**
     * Results for each resource in the sync
     */
    resources: ResourceResult[];
    
    /**
     * Git revision that was synced
     */
    revision: string;
}

/**
 * State of last sync/refresh operation
 */
export interface OperationState {
    /**
     * Current operation phase
     * - 'Running': Operation in progress
     * - 'Terminating': Finalizing operation
     * - 'Succeeded': Completed successfully
     * - 'Failed': Completed with failure
     * - 'Error': Encountered error
     */
    phase: OperationPhase;
    
    /**
     * Optional status or error message
     */
    message?: string;
    
    /**
     * ISO timestamp when operation began
     */
    startedAt: string;
    
    /**
     * ISO timestamp when operation completed (if finished)
     */
    finishedAt?: string;
    
    /**
     * Detailed sync results
     */
    syncResult?: SyncOperationResult;
}

// ============================================================================
// Display Types
// ============================================================================

/**
 * Tree view item data for displaying applications
 */
export interface ArgoCDTreeItem {
    /**
     * Full application data
     */
    application: ArgoCDApplication;
    
    /**
     * Display name
     */
    label: string;
    
    /**
     * Status summary
     */
    description: string;
    
    /**
     * Icon identifier based on status
     */
    icon: string;
    
    /**
     * Hover tooltip
     */
    tooltip: string;
    
    /**
     * Context value for context menu
     */
    contextValue: string;
}

/**
 * Data structure for webview display
 */
export interface ApplicationDetailsData {
    /**
     * Full application data
     */
    application: ArgoCDApplication;
    
    /**
     * Icon name/path for sync status
     */
    syncStatusIcon: string;
    
    /**
     * Icon name/path for health status
     */
    healthStatusIcon: string;
    
    /**
     * Truncated Git SHA for display (first 7 chars)
     */
    shortRevision: string;
    
    /**
     * Human-readable time since last sync (e.g., "2 hours ago")
     */
    lastSyncRelative: string;
    
    /**
     * Filtered list of out-of-sync resources
     */
    outOfSyncResources: ArgoCDResource[];
    
    /**
     * Filtered list of synced resources
     */
    syncedResources: ArgoCDResource[];
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base error type for ArgoCD operations
 */
export class ArgoCDError extends Error {
    /**
     * Error code for programmatic handling
     */
    public code: string;
    
    /**
     * Optional additional error details
     */
    public details?: unknown;
    
    constructor(
        message: string,
        code: string,
        details?: unknown
    ) {
        super(message);
        this.name = 'ArgoCDError';
        this.code = code;
        this.details = details;
    }
}

/**
 * Error thrown when ArgoCD operation fails due to permission issues
 */
export class ArgoCDPermissionError extends ArgoCDError {
    constructor(message: string) {
        super(message, 'PERMISSION_DENIED');
        this.name = 'ArgoCDPermissionError';
    }
}

/**
 * Error thrown when ArgoCD resource is not found
 */
export class ArgoCDNotFoundError extends ArgoCDError {
    constructor(message: string) {
        super(message, 'NOT_FOUND');
        this.name = 'ArgoCDNotFoundError';
    }
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default ArgoCD installation namespace
 */
export const DEFAULT_ARGOCD_NAMESPACE = 'argocd';

/**
 * Minimum supported ArgoCD version
 */
export const MIN_SUPPORTED_VERSION = 'v2.5.0';

/**
 * Cache TTL for detection results (5 minutes in seconds)
 */
export const DETECTION_CACHE_TTL = 300;

/**
 * Cache TTL for application data (30 seconds)
 */
export const APPLICATION_CACHE_TTL = 30;

/**
 * Polling interval for operation status checks (2 seconds in milliseconds)
 */
export const OPERATION_POLL_INTERVAL = 2000;

/**
 * Timeout for operation completion (5 minutes in seconds)
 */
export const OPERATION_TIMEOUT = 300;

/**
 * ArgoCD Application CRD name
 */
export const ARGOCD_APPLICATION_CRD = 'applications.argoproj.io';

/**
 * ArgoCD AppProject CRD name
 */
export const ARGOCD_APPPROJECT_CRD = 'appprojects.argoproj.io';

