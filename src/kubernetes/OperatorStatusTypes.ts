/**
 * Operator status mode as determined by the extension.
 * 
 * The extension maps operator presence and health to one of four status modes:
 * - Basic: Operator not installed (ConfigMap does not exist)
 * - Operated: Operator installed in free tier mode
 * - Enabled: Operator installed in pro tier mode and properly registered
 * - Degraded: Operator installed but has issues (unhealthy, unregistered, or stale)
 */
export enum OperatorStatusMode {
    /**
     * Operator is not installed in the cluster.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Basic = 'basic',
    
    /**
     * Operator is installed but running in free tier (operated) mode.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Operated = 'operated',
    
    /**
     * Operator is installed and running in pro tier (enabled) mode with proper registration.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Enabled = 'enabled',
    
    /**
     * Operator is installed but has issues (unhealthy, unregistered, or stale status).
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

/**
 * Operator status as returned by the kube9-operator-status ConfigMap.
 * Matches the operator's OperatorStatus interface.
 */
export interface OperatorStatus {
    /** Operator mode: "operated" (free) or "enabled" (pro) */
    mode: 'operated' | 'enabled';
    
    /** User-facing tier name */
    tier: 'free' | 'pro';
    
    /** Operator version (semver) */
    version: string;
    
    /** Health status */
    health: 'healthy' | 'degraded' | 'unhealthy';
    
    /** ISO 8601 timestamp of last status update */
    lastUpdate: string;
    
    /** Whether operator is registered with kube9-server (pro tier only) */
    registered: boolean;
    
    /** Whether an API key is configured */
    apiKeyConfigured: boolean;
    
    /** Error message if unhealthy or degraded */
    error: string | null;
    
    /** Optional: Server-provided cluster ID (pro tier only) */
    clusterId?: string;
    
    /** Collection statistics */
    collectionStats: CollectionStats;
}

