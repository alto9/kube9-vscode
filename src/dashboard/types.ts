/**
 * Dashboard-specific type definitions for operator status and dashboard data.
 */

/**
 * Operator status information tailored for dashboard use.
 * This interface provides a simplified view of operator status focused on
 * what the dashboard needs to determine which conditional content to display.
 */
export interface OperatorDashboardStatus {
    /** 
     * Operator status mode.
     * - basic: Operator not installed
     * - operated: Operator installed in free tier
     * - enabled: Operator installed in pro tier with API key
     * - degraded: Operator installed but has issues
     */
    mode: 'basic' | 'operated' | 'enabled' | 'degraded';
    
    /** 
     * Whether the operator has an API key configured.
     * Read from operator's ConfigMap. Extension cannot set this.
     */
    hasApiKey: boolean;
    
    /** 
     * Operator tier (free or pro).
     * Undefined if operator not installed (basic mode).
     */
    tier?: 'free' | 'pro';
    
    /** 
     * Operator version string.
     * Undefined if operator not installed (basic mode).
     */
    version?: string;
    
    /** 
     * Health status of the operator.
     * Undefined if operator not installed (basic mode).
     */
    health?: 'healthy' | 'degraded' | 'unhealthy';
}

/**
 * Workload counts for all Kubernetes workload types.
 * Used by both Free and Operated dashboards.
 */
export interface WorkloadCounts {
    /** Number of Deployments across all namespaces */
    deployments: number;
    
    /** Number of StatefulSets across all namespaces */
    statefulsets: number;
    
    /** Number of DaemonSets across all namespaces */
    daemonsets: number;
    
    /** Number of ReplicaSets across all namespaces */
    replicasets: number;
    
    /** Number of Jobs across all namespaces */
    jobs: number;
    
    /** Number of CronJobs across all namespaces */
    cronjobs: number;
    
    /** Total number of Pods across all namespaces */
    pods: number;
}

/**
 * Node information for cluster dashboard.
 * Used by both Free and Operated dashboards.
 */
export interface NodeInfo {
    /** Total number of nodes in the cluster */
    totalNodes: number;
    
    /** Number of nodes in Ready status */
    readyNodes: number;
    
    /** Total CPU capacity across all nodes (formatted string like "4" or "0.5") */
    cpuCapacity: string;
    
    /** Total memory capacity across all nodes (formatted string like "8.0 Gi") */
    memoryCapacity: string;
}

/**
 * Operator-specific metrics for dashboard display.
 * Tracks operator health and data collection activity.
 */
export interface OperatorMetrics {
    /** Number of collector instances currently running */
    collectorsRunning: number;
    
    /** Total number of data points collected by the operator */
    dataPointsCollected: number;
    
    /** Timestamp of the last successful data collection */
    lastCollectionTime: Date;
}

/**
 * Operator-provided dashboard data from the kube9-dashboard-data ConfigMap.
 * This data is pre-aggregated by the operator for performance.
 */
export interface OperatorDashboardData {
    /** Number of namespaces in the cluster */
    namespaceCount: number;
    
    /** Workload counts for all resource types */
    workloads: WorkloadCounts;
    
    /** Node information including capacity and health */
    nodes: NodeInfo;
    
    /** Operator-specific metrics */
    operatorMetrics: OperatorMetrics;
    
    /** Timestamp when this data was last updated by the operator */
    lastUpdated: Date;
}

/**
 * Individual AI recommendation for cluster optimization.
 * Recommendations are provided by the operator when an API key is configured.
 */
export interface AIRecommendation {
    /** Unique identifier for the recommendation */
    id: string;
    
    /** Type/category of recommendation */
    type: 'optimization' | 'cost' | 'security' | 'reliability';
    
    /** Severity level of the recommendation */
    severity: 'high' | 'medium' | 'low';
    
    /** Title of the recommendation */
    title: string;
    
    /** Detailed description of the recommendation */
    description: string;
    
    /** Whether this recommendation can be acted upon directly */
    actionable: boolean;
    
    /** Optional URL for taking action on the recommendation */
    actionUrl?: string;
}

/**
 * Cluster insight provided by AI analysis.
 */
export interface Insight {
    /** Unique identifier for the insight */
    id: string;
    
    /** Category of the insight */
    category: string;
    
    /** Brief summary of the insight */
    summary: string;
    
    /** Detailed information about the insight */
    details: string;
}

/**
 * AI recommendations data from the kube9-ai-recommendations ConfigMap.
 * Only available when operator is in enabled mode.
 */
export interface AIRecommendationsData {
    /** Array of AI-powered recommendations */
    recommendations: AIRecommendation[];
    
    /** Optional array of cluster insights */
    insights?: Insight[];
}
