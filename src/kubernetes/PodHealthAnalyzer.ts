import * as k8s from '@kubernetes/client-node';
import { WorkloadEntry, PodHealthSummary, HealthCheckStats, PodConditionSummary } from '../types/workloadData';
import { KubectlError } from './KubectlError';
import { fetchPods } from './resourceFetchers';
import { getResourceCache, CACHE_TTL } from './cache';
import { getKubernetesApiClient } from './apiClient';

/**
 * Minimal interface for Kubernetes Pod structure.
 * Contains only the fields needed for health analysis.
 */
interface Pod {
    metadata?: {
        name?: string;
        namespace?: string;
    };
    status?: {
        conditions?: Array<{
            type: string;
            status: string;
            reason?: string;
        }>;
        containerStatuses?: Array<{
            ready: boolean;
            state?: {
                waiting?: unknown;
                terminated?: unknown;
                running?: unknown;
            };
        }>;
    };
}

/**
 * Result of analyzing health for a single pod.
 */
interface PodHealthResult {
    isReady: boolean;
    healthChecks: HealthCheckStats;
    conditions: Array<{ type: string; status: string }>;
}

/**
 * Utility class for pod health analysis operations.
 */
export class PodHealthAnalyzer {
    /**
     * Retrieves the list of pods for a specific workload using kubectl.
     * Uses the workload's label selector to find associated pods.
     * 
     * @param workload The workload entry containing the label selector
     * @param namespace Namespace to query pods in
     * @param kubeconfigPath Path to the kubeconfig file
     * @param contextName Name of the context to query
     * @returns Promise<Pod[]> Array of pods belonging to this workload
     */
    public static async getPodsForWorkload(
        workload: WorkloadEntry,
        namespace: string,
        kubeconfigPath: string,
        contextName: string
    ): Promise<Pod[]> {
        try {
            // If no label selector provided, return empty array
            if (!workload.selector || workload.selector.trim() === '') {
                return [];
            }

            // Set context on API client
            const apiClient = getKubernetesApiClient();
            apiClient.setContext(contextName);
            
            // Check cache first
            const cache = getResourceCache();
            const cacheKey = `${contextName}:pods:${namespace}:${workload.selector}`;
            const cached = cache.get<k8s.V1Pod[]>(cacheKey);
            if (cached) {
                return cached;
            }

            // Fetch from API
            const v1Pods = await fetchPods({ 
                namespace, 
                labelSelector: workload.selector, 
                timeout: 10 
            });
            
            // Cache result
            cache.set(cacheKey, v1Pods, CACHE_TTL.PODS);
            
            // Return V1Pod[] directly (matches Pod interface)
            return v1Pods;
        } catch (error: unknown) {
            // API call failed - create structured error for detailed handling
            const kubectlError = KubectlError.fromExecError(error, contextName);
            
            // Log error details for debugging
            console.log(`Pod query failed for workload ${workload.name} in namespace ${namespace}: ${kubectlError.getDetails()}`);
            
            // Return empty array on error
            return [];
        }
    }

    /**
     * Analyzes the health of a single pod by examining its conditions and container statuses.
     * Extracts readiness state, health check statistics, and condition information.
     * 
     * @param pod The pod to analyze
     * @returns PodHealthResult containing readiness, health check stats, and conditions
     */
    public static analyzePodHealth(pod: Pod): PodHealthResult {
        // Extract conditions array from pod status
        const conditions = pod.status?.conditions || [];
        
        // Check readiness condition
        const readyCondition = conditions.find(c => c.type === 'Ready');
        const isReady = readyCondition?.status === 'True';
        
        // Extract container statuses
        const containerStatuses = pod.status?.containerStatuses || [];
        
        // Initialize health check statistics
        const healthChecks: HealthCheckStats = {
            passed: 0,
            failed: 0,
            unknown: 0
        };
        
        // Analyze each container's health
        containerStatuses.forEach(container => {
            // Check if container is ready
            if (container.ready === true) {
                healthChecks.passed++;
            } else if (container.state?.waiting || container.state?.terminated) {
                // Container is waiting to start or has terminated
                healthChecks.failed++;
            } else {
                // Unable to determine container state
                healthChecks.unknown++;
            }
        });
        
        // Map conditions to simplified format
        const simplifiedConditions = conditions.map(c => ({
            type: c.type,
            status: c.status
        }));
        
        return {
            isReady,
            healthChecks,
            conditions: simplifiedConditions
        };
    }

    /**
     * Aggregates health information across all pods in a workload.
     * Counts ready pods, sums health check statistics, and groups conditions.
     * 
     * @param pods Array of pods to aggregate health information from
     * @returns PodHealthSummary containing aggregated health data
     */
    public static aggregatePodHealth(pods: Pod[]): PodHealthSummary {
        const totalPods = pods.length;
        let readyPods = 0;
        
        // Initialize aggregated health check statistics
        const healthChecks: HealthCheckStats = {
            passed: 0,
            failed: 0,
            unknown: 0
        };
        
        // Map to track condition type:status combinations and their counts
        const conditionMap = new Map<string, number>();
        
        // Analyze each pod and aggregate results
        pods.forEach(pod => {
            const podHealth = this.analyzePodHealth(pod);
            
            // Count ready pods
            if (podHealth.isReady) {
                readyPods++;
            }
            
            // Sum health check statistics
            healthChecks.passed += podHealth.healthChecks.passed;
            healthChecks.failed += podHealth.healthChecks.failed;
            healthChecks.unknown += podHealth.healthChecks.unknown;
            
            // Aggregate conditions by type:status combination
            podHealth.conditions.forEach(condition => {
                const key = `${condition.type}:${condition.status}`;
                conditionMap.set(key, (conditionMap.get(key) || 0) + 1);
            });
        });
        
        // Convert condition map to array of PodConditionSummary objects
        const conditions: PodConditionSummary[] = [];
        conditionMap.forEach((count, key) => {
            const [type, status] = key.split(':');
            conditions.push({
                type,
                status: status as 'True' | 'False' | 'Unknown',
                count
            });
        });
        
        return {
            totalPods,
            readyPods,
            healthChecks,
            conditions
        };
    }
}

