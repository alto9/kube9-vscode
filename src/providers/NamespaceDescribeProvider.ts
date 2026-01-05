/**
 * Namespace Describe Provider interfaces.
 * Type definitions for Namespace information data structures used in the Describe webview.
 */

/**
 * Main data structure containing all Namespace information for display in the webview.
 */
export interface NamespaceDescribeData {
    /** Overview information including status, phase, and metadata */
    overview: NamespaceOverview;
    /** Resource counts summary (empty for now, will be populated in story 003) */
    resources: ResourceSummary;
    /** Resource quotas configured for the namespace */
    quotas: ResourceQuotaInfo[];
    /** Limit ranges configured for the namespace */
    limitRanges: LimitRangeInfo[];
    /** Events related to the namespace */
    events: NamespaceEvent[];
    /** Namespace metadata including labels, annotations, and owner references */
    metadata: NamespaceMetadata;
}

/**
 * Overview information for a Namespace including status, phase, and metadata.
 */
export interface NamespaceOverview {
    /** Namespace name */
    name: string;
    /** Namespace status with phase and conditions */
    status: NamespaceStatus;
    /** Namespace phase (Active, Terminating) */
    phase: 'Active' | 'Terminating';
    /** Age of the namespace (formatted string like "3d", "5h", "23m") */
    age: string;
    /** Creation timestamp (ISO 8601 format) */
    creationTimestamp: string;
    /** Namespace UID */
    uid: string;
    /** Resource version */
    resourceVersion: string;
}

/**
 * Namespace status information with phase and conditions.
 */
export interface NamespaceStatus {
    /** Namespace phase */
    phase: 'Active' | 'Terminating';
    /** Optional namespace conditions */
    conditions?: NamespaceCondition[];
}

/**
 * Namespace condition for tracking namespace state.
 */
export interface NamespaceCondition {
    /** Condition type */
    type: string;
    /** Condition status */
    status: 'True' | 'False' | 'Unknown';
    /** Last transition time */
    lastTransitionTime: string;
    /** Optional reason for the condition */
    reason?: string;
    /** Optional message describing the condition */
    message?: string;
}

/**
 * Resource summary containing counts for all resource types in the namespace.
 * Empty structure for now, will be populated in story 003.
 */
export interface ResourceSummary {
    /** Pod summary with status breakdown */
    pods: PodSummary;
    /** Number of deployments */
    deployments: number;
    /** Number of stateful sets */
    statefulSets: number;
    /** Number of daemon sets */
    daemonSets: number;
    /** Service summary with type breakdown */
    services: ServiceSummary;
    /** Number of config maps */
    configMaps: number;
    /** Number of secrets */
    secrets: number;
    /** Number of ingresses */
    ingresses: number;
    /** Job summary with status breakdown */
    jobs: JobSummary;
    /** Number of cron jobs */
    cronJobs: number;
    /** Persistent volume claim summary with phase breakdown */
    persistentVolumeClaims: PVCSummary;
    /** Number of replica sets */
    replicaSets: number;
    /** Number of endpoints */
    endpoints: number;
    /** Number of network policies */
    networkPolicies: number;
    /** Number of service accounts */
    serviceAccounts: number;
    /** Number of roles */
    roles: number;
    /** Number of role bindings */
    roleBindings: number;
}

/**
 * Pod summary with counts by status.
 */
export interface PodSummary {
    /** Total number of pods */
    total: number;
    /** Number of running pods */
    running: number;
    /** Number of pending pods */
    pending: number;
    /** Number of failed pods */
    failed: number;
    /** Number of succeeded pods */
    succeeded: number;
    /** Number of pods with unknown status */
    unknown: number;
}

/**
 * Service summary with counts by type.
 */
export interface ServiceSummary {
    /** Total number of services */
    total: number;
    /** Number of ClusterIP services */
    clusterIP: number;
    /** Number of NodePort services */
    nodePort: number;
    /** Number of LoadBalancer services */
    loadBalancer: number;
    /** Number of ExternalName services */
    externalName: number;
}

/**
 * Job summary with counts by status.
 */
export interface JobSummary {
    /** Total number of jobs */
    total: number;
    /** Number of active jobs */
    active: number;
    /** Number of completed jobs */
    completed: number;
    /** Number of failed jobs */
    failed: number;
}

/**
 * Persistent volume claim summary with counts by phase.
 */
export interface PVCSummary {
    /** Total number of PVCs */
    total: number;
    /** Number of bound PVCs */
    bound: number;
    /** Number of pending PVCs */
    pending: number;
    /** Number of lost PVCs */
    lost: number;
}

/**
 * Resource quota information.
 */
export interface ResourceQuotaInfo {
    /** Quota name */
    name: string;
    /** Hard limits for resources */
    hard: Record<string, string>;
    /** Current usage for resources */
    used: Record<string, string>;
    /** Percentage used for each resource */
    percentUsed: Record<string, number>;
}

/**
 * Limit range information.
 */
export interface LimitRangeInfo {
    /** Limit range name */
    name: string;
    /** Limit constraints */
    limits: LimitRangeLimit[];
}

/**
 * Limit range limit details.
 */
export interface LimitRangeLimit {
    /** Limit type (Container, Pod, PersistentVolumeClaim) */
    type: 'Container' | 'Pod' | 'PersistentVolumeClaim';
    /** Default resource limits */
    default?: Record<string, string>;
    /** Default resource requests */
    defaultRequest?: Record<string, string>;
    /** Minimum resource constraints */
    min?: Record<string, string>;
    /** Maximum resource constraints */
    max?: Record<string, string>;
    /** Maximum limit request ratio */
    maxLimitRequestRatio?: Record<string, string>;
}

/**
 * Namespace event information for timeline display.
 */
export interface NamespaceEvent {
    /** Event type */
    type: 'Normal' | 'Warning';
    /** Event reason */
    reason: string;
    /** Event message */
    message: string;
    /** Number of times this event occurred (for grouped events) */
    count: number;
    /** First occurrence timestamp */
    firstTimestamp: string;
    /** Last occurrence timestamp */
    lastTimestamp: string;
    /** Source component that generated the event */
    source: string;
    /** Age of the event (formatted string) */
    age: string;
}

/**
 * Namespace metadata including labels, annotations, and owner references.
 */
export interface NamespaceMetadata {
    /** Labels applied to the namespace */
    labels: Record<string, string>;
    /** Annotations applied to the namespace */
    annotations: Record<string, string>;
    /** Finalizers on the namespace */
    finalizers: string[];
    /** Owner references */
    ownerReferences?: OwnerReference[];
}

/**
 * Owner reference information.
 */
export interface OwnerReference {
    /** Kind of owner */
    kind: string;
    /** Name of the owner */
    name: string;
    /** UID of the owner */
    uid: string;
    /** Whether this owner is a controller */
    controller: boolean;
}

import * as k8s from '@kubernetes/client-node';
import { KubernetesApiClient } from '../kubernetes/apiClient';

/**
 * Provider for fetching and formatting Namespace information for the Describe webview.
 * Fetches Namespace data from Kubernetes API and transforms it into structured data structures.
 */
export class NamespaceDescribeProvider {
    constructor(private k8sClient: KubernetesApiClient) {}

    /**
     * Fetches Namespace details from Kubernetes API and formats them for display.
     * 
     * @param name - Namespace name
     * @param context - Kubernetes context name
     * @returns Promise resolving to formatted Namespace data
     * @throws Error if Namespace cannot be fetched or if API calls fail
     */
    async getNamespaceDetails(
        name: string,
        context: string
    ): Promise<NamespaceDescribeData> {
        // Set context before API calls
        this.k8sClient.setContext(context);

        // Fetch Namespace object
        let namespace: k8s.V1Namespace;
        try {
            namespace = await this.k8sClient.core.readNamespace({
                name: name
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to fetch Namespace ${name}: ${errorMessage}`);
        }

        // Fetch resource quotas and limit ranges in parallel
        let quotas: k8s.V1ResourceQuota[] = [];
        let limitRanges: k8s.V1LimitRange[] = [];
        
        try {
            const [quotasResponse, limitRangesResponse] = await Promise.all([
                this.k8sClient.core.listNamespacedResourceQuota({
                    namespace: name
                }).catch(() => ({ items: [] })),
                this.k8sClient.core.listNamespacedLimitRange({
                    namespace: name
                }).catch(() => ({ items: [] }))
            ]);
            quotas = quotasResponse.items || [];
            limitRanges = limitRangesResponse.items || [];
        } catch (error) {
            // Log error but don't throw - namespace describe should still work
            console.log(`Failed to fetch quotas/limit ranges for namespace ${name}: ${error}`);
        }

        // Format data
        return {
            overview: this.formatOverview(namespace),
            resources: await this.countNamespacedResources(name),
            quotas: this.formatResourceQuotas(quotas),
            limitRanges: this.formatLimitRanges(limitRanges),
            events: [],
            metadata: this.formatMetadata(namespace.metadata!)
        };
    }

    /**
     * Formats Namespace overview information.
     */
    private formatOverview(namespace: k8s.V1Namespace): NamespaceOverview {
        const status = namespace.status!;
        const metadata = namespace.metadata!;

        return {
            name: metadata.name || 'Unknown',
            status: {
                phase: (status.phase as 'Active' | 'Terminating') || 'Active',
                conditions: status.conditions?.map(c => ({
                    type: c.type,
                    status: c.status as 'True' | 'False' | 'Unknown',
                    lastTransitionTime: this.formatTimestamp(c.lastTransitionTime),
                    reason: c.reason,
                    message: c.message
                }))
            },
            phase: (status.phase as 'Active' | 'Terminating') || 'Active',
            age: this.calculateAge(metadata.creationTimestamp),
            creationTimestamp: this.formatTimestamp(metadata.creationTimestamp),
            uid: metadata.uid || 'Unknown',
            resourceVersion: metadata.resourceVersion || 'Unknown'
        };
    }

    /**
     * Counts all namespaced resources in parallel for performance.
     * 
     * @param namespace - Namespace name to count resources in
     * @returns Promise resolving to ResourceSummary with all counts
     */
    private async countNamespacedResources(namespace: string): Promise<ResourceSummary> {
        const [
            pods,
            deployments,
            statefulSets,
            daemonSets,
            services,
            configMaps,
            secrets,
            ingresses,
            jobs,
            cronJobs,
            pvcs,
            replicaSets,
            endpoints,
            networkPolicies,
            serviceAccounts,
            roles,
            roleBindings
        ] = await Promise.all([
            this.countPods(namespace),
            this.countResource('deployments', namespace, 'apps'),
            this.countResource('statefulsets', namespace, 'apps'),
            this.countResource('daemonsets', namespace, 'apps'),
            this.countServices(namespace),
            this.countResource('configmaps', namespace, 'core'),
            this.countResource('secrets', namespace, 'core'),
            this.countResource('ingresses', namespace, 'networking'),
            this.countJobs(namespace),
            this.countResource('cronjobs', namespace, 'batch'),
            this.countPVCs(namespace),
            this.countResource('replicasets', namespace, 'apps'),
            this.countResource('endpoints', namespace, 'core'),
            this.countResource('networkpolicies', namespace, 'networking'),
            this.countResource('serviceaccounts', namespace, 'core'),
            this.countResource('roles', namespace, 'rbac'),
            this.countResource('rolebindings', namespace, 'rbac')
        ]);

        return {
            pods,
            deployments,
            statefulSets,
            daemonSets,
            services,
            configMaps,
            secrets,
            ingresses,
            jobs,
            cronJobs,
            persistentVolumeClaims: pvcs,
            replicaSets,
            endpoints,
            networkPolicies,
            serviceAccounts,
            roles,
            roleBindings
        };
    }

    /**
     * Counts pods by status (Running, Pending, Failed, Succeeded, Unknown).
     * 
     * @param namespace - Namespace name
     * @returns Promise resolving to PodSummary with status breakdown
     */
    private async countPods(namespace: string): Promise<PodSummary> {
        try {
            const response = await this.k8sClient.core.listNamespacedPod({
                namespace: namespace
            });
            const pods = response.items;

            const summary: PodSummary = {
                total: pods.length,
                running: 0,
                pending: 0,
                failed: 0,
                succeeded: 0,
                unknown: 0
            };

            pods.forEach((pod: k8s.V1Pod) => {
                const phase = pod.status?.phase?.toLowerCase();
                switch (phase) {
                    case 'running':
                        summary.running++;
                        break;
                    case 'pending':
                        summary.pending++;
                        break;
                    case 'failed':
                        summary.failed++;
                        break;
                    case 'succeeded':
                        summary.succeeded++;
                        break;
                    default:
                        summary.unknown++;
                }
            });

            return summary;
        } catch (error) {
            console.log(`Failed to count pods in namespace ${namespace}: ${error}`);
            return {
                total: 0,
                running: 0,
                pending: 0,
                failed: 0,
                succeeded: 0,
                unknown: 0
            };
        }
    }

    /**
     * Counts services by type (ClusterIP, NodePort, LoadBalancer, ExternalName).
     * 
     * @param namespace - Namespace name
     * @returns Promise resolving to ServiceSummary with type breakdown
     */
    private async countServices(namespace: string): Promise<ServiceSummary> {
        try {
            const response = await this.k8sClient.core.listNamespacedService({
                namespace: namespace
            });
            const services = response.items;

            const summary: ServiceSummary = {
                total: services.length,
                clusterIP: 0,
                nodePort: 0,
                loadBalancer: 0,
                externalName: 0
            };

            services.forEach((service: k8s.V1Service) => {
                const type = service.spec?.type?.toLowerCase();
                switch (type) {
                    case 'clusterip':
                        summary.clusterIP++;
                        break;
                    case 'nodeport':
                        summary.nodePort++;
                        break;
                    case 'loadbalancer':
                        summary.loadBalancer++;
                        break;
                    case 'externalname':
                        summary.externalName++;
                        break;
                    default:
                        // Default is ClusterIP if type is undefined
                        summary.clusterIP++;
                }
            });

            return summary;
        } catch (error) {
            console.log(`Failed to count services in namespace ${namespace}: ${error}`);
            return {
                total: 0,
                clusterIP: 0,
                nodePort: 0,
                loadBalancer: 0,
                externalName: 0
            };
        }
    }

    /**
     * Counts jobs by status (Active, Completed, Failed).
     * 
     * @param namespace - Namespace name
     * @returns Promise resolving to JobSummary with status breakdown
     */
    private async countJobs(namespace: string): Promise<JobSummary> {
        try {
            const response = await this.k8sClient.batch.listNamespacedJob({
                namespace: namespace
            });
            const jobs = response.items;

            const summary: JobSummary = {
                total: jobs.length,
                active: 0,
                completed: 0,
                failed: 0
            };

            jobs.forEach((job: k8s.V1Job) => {
                const status = job.status;
                if (status?.active && status.active > 0) {
                    summary.active++;
                } else if (status?.succeeded && status.succeeded > 0) {
                    summary.completed++;
                } else if (status?.failed && status.failed > 0) {
                    summary.failed++;
                }
            });

            return summary;
        } catch (error) {
            console.log(`Failed to count jobs in namespace ${namespace}: ${error}`);
            return {
                total: 0,
                active: 0,
                completed: 0,
                failed: 0
            };
        }
    }

    /**
     * Counts PVCs by phase (Bound, Pending, Lost).
     * 
     * @param namespace - Namespace name
     * @returns Promise resolving to PVCSummary with phase breakdown
     */
    private async countPVCs(namespace: string): Promise<PVCSummary> {
        try {
            const response = await this.k8sClient.core.listNamespacedPersistentVolumeClaim({
                namespace: namespace
            });
            const pvcs = response.items;

            const summary: PVCSummary = {
                total: pvcs.length,
                bound: 0,
                pending: 0,
                lost: 0
            };

            pvcs.forEach((pvc: k8s.V1PersistentVolumeClaim) => {
                const phase = pvc.status?.phase?.toLowerCase();
                switch (phase) {
                    case 'bound':
                        summary.bound++;
                        break;
                    case 'pending':
                        summary.pending++;
                        break;
                    case 'lost':
                        summary.lost++;
                        break;
                }
            });

            return summary;
        } catch (error) {
            console.log(`Failed to count PVCs in namespace ${namespace}: ${error}`);
            return {
                total: 0,
                bound: 0,
                pending: 0,
                lost: 0
            };
        }
    }

    /**
     * Generic method to count simple resources (deployments, configmaps, etc.).
     * 
     * @param resourceType - Resource type name (e.g., 'deployments', 'configmaps')
     * @param namespace - Namespace name
     * @param apiGroup - API group ('core', 'apps', 'batch', 'networking', 'rbac')
     * @returns Promise resolving to count of resources
     */
    private async countResource(
        resourceType: string,
        namespace: string,
        apiGroup: 'core' | 'apps' | 'batch' | 'networking' | 'rbac'
    ): Promise<number> {
        try {
            let response: { items: unknown[] };

            switch (apiGroup) {
                case 'core':
                    switch (resourceType) {
                        case 'configmaps':
                            response = await this.k8sClient.core.listNamespacedConfigMap({
                                namespace: namespace
                            });
                            break;
                        case 'secrets':
                            response = await this.k8sClient.core.listNamespacedSecret({
                                namespace: namespace
                            });
                            break;
                        case 'endpoints':
                            response = await this.k8sClient.core.listNamespacedEndpoints({
                                namespace: namespace
                            });
                            break;
                        case 'serviceaccounts':
                            response = await this.k8sClient.core.listNamespacedServiceAccount({
                                namespace: namespace
                            });
                            break;
                        default:
                            return 0;
                    }
                    break;
                case 'apps':
                    switch (resourceType) {
                        case 'deployments':
                            response = await this.k8sClient.apps.listNamespacedDeployment({
                                namespace: namespace
                            });
                            break;
                        case 'statefulsets':
                            response = await this.k8sClient.apps.listNamespacedStatefulSet({
                                namespace: namespace
                            });
                            break;
                        case 'daemonsets':
                            response = await this.k8sClient.apps.listNamespacedDaemonSet({
                                namespace: namespace
                            });
                            break;
                        case 'replicasets':
                            response = await this.k8sClient.apps.listNamespacedReplicaSet({
                                namespace: namespace
                            });
                            break;
                        default:
                            return 0;
                    }
                    break;
                case 'batch':
                    switch (resourceType) {
                        case 'cronjobs':
                            response = await this.k8sClient.batch.listNamespacedCronJob({
                                namespace: namespace
                            });
                            break;
                        default:
                            return 0;
                    }
                    break;
                case 'networking':
                    switch (resourceType) {
                        case 'ingresses':
                            response = await this.k8sClient.networking.listNamespacedIngress({
                                namespace: namespace
                            });
                            break;
                        case 'networkpolicies':
                            response = await this.k8sClient.networking.listNamespacedNetworkPolicy({
                                namespace: namespace
                            });
                            break;
                        default:
                            return 0;
                    }
                    break;
                case 'rbac':
                    switch (resourceType) {
                        case 'roles':
                            response = await this.k8sClient.rbac.listNamespacedRole({
                                namespace: namespace
                            });
                            break;
                        case 'rolebindings':
                            response = await this.k8sClient.rbac.listNamespacedRoleBinding({
                                namespace: namespace
                            });
                            break;
                        default:
                            return 0;
                    }
                    break;
                default:
                    return 0;
            }

            return response.items.length;
        } catch (error) {
            // Resource type not available or permission denied - return 0
            // Log error for debugging but don't throw
            console.log(`Failed to count ${resourceType} in namespace ${namespace}: ${error}`);
            return 0;
        }
    }

    /**
     * Formats Namespace metadata including labels, annotations, and owner references.
     */
    private formatMetadata(metadata: k8s.V1ObjectMeta): NamespaceMetadata {
        return {
            labels: metadata.labels || {},
            annotations: metadata.annotations || {},
            finalizers: metadata.finalizers || [],
            ownerReferences: (metadata.ownerReferences || []).map(ref => ({
                kind: ref.kind,
                name: ref.name,
                uid: ref.uid,
                controller: ref.controller || false
            }))
        };
    }

    /**
     * Parses Kubernetes resource value string to numeric value for calculations.
     * Handles millicores (100m), memory units (Ki, Mi, Gi, Ti, K, M, G, T), and plain numbers.
     * 
     * @param value - Resource value string (e.g., "100m", "1Gi", "10")
     * @returns Numeric value for calculations
     */
    private parseResourceValue(value: string | undefined | null): number {
        // Handle edge cases
        if (!value || value === '') {
            return 0;
        }

        // Handle millicores (e.g., "100m" = 0.1 cores)
        if (value.endsWith('m')) {
            const numericValue = parseFloat(value.slice(0, -1));
            if (isNaN(numericValue)) {
                return 0;
            }
            return numericValue / 1000;
        }

        // Handle memory units - binary (Ki, Mi, Gi, Ti)
        const binaryUnits: Record<string, number> = {
            'Ki': 1024,
            'Mi': 1024 * 1024,
            'Gi': 1024 * 1024 * 1024,
            'Ti': 1024 * 1024 * 1024 * 1024
        };

        for (const [unit, multiplier] of Object.entries(binaryUnits)) {
            if (value.endsWith(unit)) {
                const numericValue = parseFloat(value.slice(0, -unit.length));
                if (isNaN(numericValue)) {
                    return 0;
                }
                return numericValue * multiplier;
            }
        }

        // Handle memory units - decimal (K, M, G, T)
        const decimalUnits: Record<string, number> = {
            'K': 1000,
            'M': 1000 * 1000,
            'G': 1000 * 1000 * 1000,
            'T': 1000 * 1000 * 1000 * 1000
        };

        for (const [unit, multiplier] of Object.entries(decimalUnits)) {
            if (value.endsWith(unit)) {
                const numericValue = parseFloat(value.slice(0, -unit.length));
                if (isNaN(numericValue)) {
                    return 0;
                }
                return numericValue * multiplier;
            }
        }

        // Handle plain numbers
        const numericValue = parseFloat(value);
        if (isNaN(numericValue)) {
            return 0;
        }
        return numericValue;
    }

    /**
     * Formats resource quotas with percentage calculations.
     * 
     * @param quotas - Array of V1ResourceQuota objects
     * @returns Array of formatted ResourceQuotaInfo objects
     */
    private formatResourceQuotas(quotas: k8s.V1ResourceQuota[]): ResourceQuotaInfo[] {
        return quotas.map(quota => {
            const hard = quota.spec?.hard || {};
            const used = quota.status?.used || {};
            const percentUsed: Record<string, number> = {};

            // Calculate percentage for each resource in hard limits
            Object.keys(hard).forEach(resource => {
                const hardValue = this.parseResourceValue(hard[resource]);
                const usedValue = this.parseResourceValue(used[resource] || '0');

                if (hardValue > 0) {
                    percentUsed[resource] = (usedValue / hardValue) * 100;
                } else {
                    percentUsed[resource] = 0;
                }
            });

            return {
                name: quota.metadata?.name || 'Unknown',
                hard,
                used,
                percentUsed
            };
        });
    }

    /**
     * Formats limit ranges with constraint extraction.
     * 
     * @param limitRanges - Array of V1LimitRange objects
     * @returns Array of formatted LimitRangeInfo objects
     */
    private formatLimitRanges(limitRanges: k8s.V1LimitRange[]): LimitRangeInfo[] {
        return limitRanges.map(lr => ({
            name: lr.metadata?.name || 'Unknown',
            limits: (lr.spec?.limits || []).map(limit => {
                // V1LimitRangeItem uses _default instead of default (reserved keyword)
                // eslint-disable-next-line @typescript-eslint/naming-convention
                const limitItem = limit as k8s.V1LimitRangeItem & { _default?: Record<string, string> };
                return {
                    type: limit.type as 'Container' | 'Pod' | 'PersistentVolumeClaim',
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    default: limitItem._default,
                    defaultRequest: limit.defaultRequest,
                    min: limit.min,
                    max: limit.max,
                    maxLimitRequestRatio: limit.maxLimitRequestRatio
                };
            })
        }));
    }

    /**
     * Formats a timestamp (Date or string) to ISO string.
     */
    private formatTimestamp(timestamp?: string | Date): string {
        if (!timestamp) {
            return 'Unknown';
        }
        if (timestamp instanceof Date) {
            return timestamp.toISOString();
        }
        return timestamp;
    }

    /**
     * Calculates age from timestamp and formats as human-readable string.
     */
    private calculateAge(timestamp?: string | Date): string {
        if (!timestamp) {
            return 'Unknown';
        }

        try {
            const now = new Date();
            const then = timestamp instanceof Date ? timestamp : new Date(timestamp);
            const diffMs = now.getTime() - then.getTime();

            if (isNaN(diffMs) || diffMs < 0) {
                return 'Unknown';
            }

            const seconds = Math.floor(diffMs / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) {
                return `${days}d`;
            }
            if (hours > 0) {
                return `${hours}h`;
            }
            if (minutes > 0) {
                return `${minutes}m`;
            }
            return `${seconds}s`;
        } catch {
            return 'Unknown';
        }
    }
}

