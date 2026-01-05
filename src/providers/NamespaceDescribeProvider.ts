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

        // Format data
        return {
            overview: this.formatOverview(namespace),
            resources: this.createEmptyResourceSummary(),
            quotas: [],
            limitRanges: [],
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
     * Creates an empty resource summary structure.
     * Will be populated in story 003.
     */
    private createEmptyResourceSummary(): ResourceSummary {
        return {
            pods: {
                total: 0,
                running: 0,
                pending: 0,
                failed: 0,
                succeeded: 0,
                unknown: 0
            },
            deployments: 0,
            statefulSets: 0,
            daemonSets: 0,
            services: {
                total: 0,
                clusterIP: 0,
                nodePort: 0,
                loadBalancer: 0,
                externalName: 0
            },
            configMaps: 0,
            secrets: 0,
            ingresses: 0,
            jobs: {
                total: 0,
                active: 0,
                completed: 0,
                failed: 0
            },
            cronJobs: 0,
            persistentVolumeClaims: {
                total: 0,
                bound: 0,
                pending: 0,
                lost: 0
            },
            replicaSets: 0,
            endpoints: 0,
            networkPolicies: 0,
            serviceAccounts: 0,
            roles: 0,
            roleBindings: 0
        };
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

