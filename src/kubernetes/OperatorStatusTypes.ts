/**
 * Operator status mode as determined by the extension.
 *
 * The kube9 VS Code extension is open source and does not gate features on paid tiers.
 *
 * - Basic: Operator not installed (ConfigMap does not exist)
 * - Operated: Operator installed and healthy
 * - Enabled: Legacy status payload from older operators; treated like Operated for display
 * - Degraded: Operator installed but unhealthy, stale status, or other issues
 */
export enum OperatorStatusMode {
    /**
     * Operator is not installed in the cluster.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Basic = 'basic',

    /**
     * Operator is installed and reporting healthy status.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Operated = 'operated',

    /**
     * Legacy mode value from older operator status JSON; handled the same as Operated.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Enabled = 'enabled',

    /**
     * Operator is installed but status is unhealthy, stale, or otherwise degraded.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Degraded = 'degraded'
}

/**
 * Collection statistics for operator status
 */
export interface CollectionStats {
    /** Total number of successful collections across all types */
    totalSuccessCount: number;
    
    /** Total number of failed collections across all types */
    totalFailureCount: number;
    
    /** Number of collections currently stored locally */
    collectionsStoredCount: number;
    
    /** ISO 8601 timestamp of most recent successful collection, null if no collections yet */
    lastSuccessTime: string | null;
}

/** Per-check result row from the last scheduled Well-Architected assessment (operator status). */
export interface AssessmentCheckStatusSummary {
    checkId: string;
    checkName: string;
    pillar: string;
    status: string;
    message?: string | null;
    remediation?: string | null;
}

/** Summary of scheduled in-cluster assessments published by kube9-operator. */
export interface AssessmentStatusSummary {
    lastScheduledCompletedAt: string | null;
    lastScheduledOutcome: 'none' | 'success' | 'failed';
    lastScheduledRunState: string | null;
    lastScheduledRunId: string | null;
    lastScheduledTotals: {
        totalChecks: number;
        completedChecks: number;
        passedChecks: number;
        failedChecks: number;
        warningChecks: number;
    };
    lastScheduledError: string | null;
    lastScheduledChecks?: AssessmentCheckStatusSummary[];
    schedulingEnabled?: boolean;
    scheduleIntervalSeconds?: number | null;
    scheduledAssessmentMode?: 'full' | 'pillar' | null;
    scheduledAssessmentPillar?: string | null;
}

/**
 * ArgoCD Status
 * Represents the current state of ArgoCD detection in the cluster
 */
export interface ArgoCDStatus {
    /**
     * Whether ArgoCD is detected in the cluster
     */
    detected: boolean;
    
    /**
     * Namespace where ArgoCD is installed
     * null if ArgoCD is not detected
     */
    namespace: string | null;
    
    /**
     * ArgoCD version extracted from deployment
     * null if not detected or version unavailable
     * @example "v2.8.0"
     */
    version: string | null;
    
    /**
     * ISO 8601 timestamp of last detection check
     * @example "2025-11-20T15:30:00Z"
     */
    lastChecked: string;
}

/**
 * Operator status as returned by the kube9-operator-status ConfigMap.
 * Aligns with the open-source kube9-operator status payload.
 */
export interface OperatorStatus {
    /** Operator mode from the in-cluster operator */
    mode: 'operated' | 'enabled';

    /** Operator version (semver) */
    version: string;
    
    /** Health status */
    health: 'healthy' | 'degraded' | 'unhealthy';
    
    /** ISO 8601 timestamp of last status update */
    lastUpdate: string;
    
    /** Legacy field from older status payloads; ignored by the extension */
    registered?: boolean;

    /** Legacy field from older status payloads; ignored by the extension */
    apiKeyConfigured?: boolean;
    
    /** Error message if unhealthy or degraded */
    error: string | null;
    
    /** Optional cluster identifier when present in status JSON */
    clusterId?: string;
    
    /** Namespace where the operator runs (when present in status JSON) */
    namespace?: string;

    /** Collection statistics */
    collectionStats: CollectionStats;
    
    /** Optional: ArgoCD awareness information */
    argocd?: ArgoCDStatus;

    /** Optional: last scheduled Well-Architected assessment (newer operators) */
    assessment?: AssessmentStatusSummary;
}

