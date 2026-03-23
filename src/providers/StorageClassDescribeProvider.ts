/**
 * StorageClass Describe Provider interfaces.
 * Type definitions for StorageClass information data structures used in the Describe webview.
 */

/**
 * Main data structure containing all StorageClass information for display in the webview.
 */
export interface StorageClassDescribeData {
    /** Overview information including provisioner, reclaim policy, volume binding mode, and default indicator */
    overview: StorageClassOverview;
    /** Provider-specific parameters */
    parameters: StorageClassParameters;
    /** Usage information showing PVCs using this storage class */
    usage: StorageClassUsage;
    /** Events related to the StorageClass */
    events: StorageClassEvent[];
    /** StorageClass metadata including labels and annotations */
    metadata: StorageClassMetadata;
}

/**
 * Overview information for a StorageClass including provisioner, reclaim policy, volume binding mode, and default indicator.
 */
export interface StorageClassOverview {
    /** StorageClass name */
    name: string;
    /** Provisioner (storage driver) */
    provisioner: string;
    /** Reclaim policy (Delete, Retain) */
    reclaimPolicy: string;
    /** Volume binding mode (Immediate, WaitForFirstConsumer) */
    volumeBindingMode: string;
    /** Whether volume expansion is allowed */
    allowVolumeExpansion: boolean;
    /** Whether this is the default storage class */
    isDefault: boolean;
    /** Mount options */
    mountOptions: string[];
    /** Age of the StorageClass (formatted string like "3d", "5h", "23m") */
    age: string;
    /** Creation timestamp */
    creationTimestamp: string;
}

/**
 * Provider-specific parameters for the StorageClass.
 */
export interface StorageClassParameters {
    /** Parameters as key-value pairs */
    parameters: Record<string, string>;
}

/**
 * Usage information showing PVCs using this storage class.
 */
export interface StorageClassUsage {
    /** List of PVCs using this storage class */
    pvcs: PVCUsageInfo[];
    /** Total number of PVCs using this storage class */
    totalPVCs: number;
}

/**
 * Information about a PVC using the storage class.
 */
export interface PVCUsageInfo {
    /** PVC name */
    name: string;
    /** PVC namespace */
    namespace: string;
    /** PVC phase */
    phase: string;
    /** Requested capacity */
    requestedCapacity?: string;
    /** Actual capacity if bound */
    actualCapacity?: string;
    /** Bound PV name if PVC is bound */
    boundPV?: string;
}

/**
 * StorageClass event information for timeline display.
 */
export interface StorageClassEvent {
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
 * StorageClass metadata including labels and annotations.
 */
export interface StorageClassMetadata {
    /** Labels applied to the StorageClass */
    labels: Record<string, string>;
    /** Annotations applied to the StorageClass */
    annotations: Record<string, string>;
    /** StorageClass UID */
    uid: string;
    /** Resource version */
    resourceVersion: string;
    /** Creation timestamp */
    creationTimestamp: string;
}

import * as k8s from '@kubernetes/client-node';
import { KubernetesApiClient } from '../kubernetes/apiClient';

/**
 * Provider for fetching and formatting StorageClass information for the Describe webview.
 * Fetches StorageClass data from Kubernetes API and transforms it into structured data structures.
 */
export class StorageClassDescribeProvider {
    constructor(private k8sClient: KubernetesApiClient) {}

    /**
     * Fetches StorageClass details from Kubernetes API and formats them for display.
     * 
     * @param name - StorageClass name
     * @param context - Kubernetes context name
     * @returns Promise resolving to formatted StorageClass data
     * @throws Error if StorageClass cannot be fetched or if API calls fail
     */
    async getStorageClassDetails(
        name: string,
        context: string
    ): Promise<StorageClassDescribeData> {
        // Set context before API calls
        this.k8sClient.setContext(context);

        // Fetch StorageClass object
        let storageClass: k8s.V1StorageClass;
        try {
            storageClass = await this.k8sClient.storage.readStorageClass({
                name: name
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to fetch StorageClass ${name}: ${errorMessage}`);
        }

        // Fetch PVCs using this storage class (list all PVCs across namespaces)
        let pvcs: k8s.V1PersistentVolumeClaim[] = [];
        try {
            const pvcsResponse = await this.k8sClient.core.listPersistentVolumeClaimForAllNamespaces();
            pvcs = (pvcsResponse.items || []).filter(pvc => {
                const pvcStorageClass = pvc.spec?.storageClassName;
                // Match if storage class name matches, or if both are empty/default
                return pvcStorageClass === name || 
                       (pvcStorageClass === '' && this.isDefaultStorageClass(storageClass));
            });
        } catch (error) {
            // Log but don't fail if PVCs can't be fetched
            console.warn(`Failed to fetch PVCs for StorageClass ${name}:`, error);
        }

        // Fetch StorageClass-related events (cluster-scoped, no namespace)
        let events: k8s.CoreV1Event[] = [];
        try {
            const scUid = storageClass.metadata?.uid;
            if (scUid) {
                // For cluster-scoped resources, we need to list events from all namespaces
                // and filter by involvedObject
                const eventsResponse = await this.k8sClient.core.listEventForAllNamespaces();
                events = (eventsResponse.items || []).filter(event => 
                    event.involvedObject?.kind === 'StorageClass' && 
                    event.involvedObject?.name === name &&
                    event.involvedObject?.uid === scUid
                );
            }
        } catch (error) {
            // Log but don't fail if events can't be fetched
            console.warn(`Failed to fetch events for StorageClass ${name}:`, error);
        }

        // Format data
        return {
            overview: this.formatOverview(storageClass),
            parameters: this.formatParameters(storageClass),
            usage: this.formatUsage(pvcs),
            events: this.formatEvents(events),
            metadata: this.formatMetadata(storageClass.metadata!)
        };
    }

    /**
     * Checks if a StorageClass is the default storage class.
     * A StorageClass is default if it has the annotation 'storageclass.kubernetes.io/is-default-class' set to 'true'.
     */
    private isDefaultStorageClass(storageClass: k8s.V1StorageClass): boolean {
        const annotations = storageClass.metadata?.annotations || {};
        return annotations['storageclass.kubernetes.io/is-default-class'] === 'true' ||
               annotations['storageclass.beta.kubernetes.io/is-default-class'] === 'true';
    }

    /**
     * Formats StorageClass overview information.
     */
    private formatOverview(sc: k8s.V1StorageClass): StorageClassOverview {
        const metadata = sc.metadata;
        const provisioner = sc.provisioner || 'Unknown';
        const reclaimPolicy = sc.reclaimPolicy || 'Delete';
        const volumeBindingMode = sc.volumeBindingMode || 'Immediate';
        const allowVolumeExpansion = sc.allowVolumeExpansion || false;
        const mountOptions = sc.mountOptions || [];
        const isDefault = this.isDefaultStorageClass(sc);

        return {
            name: metadata?.name || 'Unknown',
            provisioner: provisioner,
            reclaimPolicy: reclaimPolicy,
            volumeBindingMode: volumeBindingMode,
            allowVolumeExpansion: allowVolumeExpansion,
            isDefault: isDefault,
            mountOptions: mountOptions,
            age: this.calculateAge(metadata?.creationTimestamp),
            creationTimestamp: this.formatTimestamp(metadata?.creationTimestamp)
        };
    }

    /**
     * Formats StorageClass parameters.
     */
    private formatParameters(sc: k8s.V1StorageClass): StorageClassParameters {
        return {
            parameters: sc.parameters || {}
        };
    }

    /**
     * Formats usage information showing PVCs using this storage class.
     */
    private formatUsage(pvcs: k8s.V1PersistentVolumeClaim[]): StorageClassUsage {
        const pvcUsageInfo: PVCUsageInfo[] = pvcs.map(pvc => {
            const metadata = pvc.metadata;
            const spec = pvc.spec;
            const status = pvc.status;

            return {
                name: metadata?.name || 'Unknown',
                namespace: metadata?.namespace || 'Unknown',
                phase: pvc.status?.phase || 'Unknown',
                requestedCapacity: spec?.resources?.requests?.storage,
                actualCapacity: status?.capacity?.storage,
                boundPV: pvc.spec?.volumeName
            };
        });

        return {
            pvcs: pvcUsageInfo,
            totalPVCs: pvcUsageInfo.length
        };
    }

    /**
     * Formats and groups StorageClass events by type and reason.
     */
    private formatEvents(events: k8s.CoreV1Event[]): StorageClassEvent[] {
        // Group events by type and reason
        const grouped = new Map<string, k8s.CoreV1Event[]>();

        events.forEach(event => {
            const key = `${event.type || 'Normal'}-${event.reason || 'Unknown'}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(event);
        });

        // Format grouped events
        return Array.from(grouped.values()).map(group => {
            const first = group[0];
            const sorted = group.sort((a, b) => {
                const aTime = this.getEventTimestamp(a.lastTimestamp || a.firstTimestamp);
                const bTime = this.getEventTimestamp(b.lastTimestamp || b.firstTimestamp);
                return bTime.getTime() - aTime.getTime();
            });
            const last = sorted[0];

            return {
                type: (first.type || 'Normal') as 'Normal' | 'Warning',
                reason: first.reason || 'Unknown',
                message: first.message || 'No message',
                count: first.count || group.length,
                firstTimestamp: this.formatTimestamp(first.firstTimestamp) || 'Unknown',
                lastTimestamp: this.formatTimestamp(last.lastTimestamp || last.firstTimestamp) || 'Unknown',
                source: first.source?.component || 'Unknown',
                age: this.calculateAge(this.getEventTimestamp(last.lastTimestamp || last.firstTimestamp))
            };
        });
    }

    /**
     * Formats StorageClass metadata including labels and annotations.
     */
    private formatMetadata(metadata: k8s.V1ObjectMeta): StorageClassMetadata {
        return {
            labels: metadata.labels || {},
            annotations: metadata.annotations || {},
            uid: metadata.uid || 'Unknown',
            resourceVersion: metadata.resourceVersion || 'Unknown',
            creationTimestamp: metadata.creationTimestamp ? this.formatTimestamp(metadata.creationTimestamp) : 'Unknown'
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
     * Gets a Date object from a timestamp (Date or string).
     */
    private getEventTimestamp(timestamp?: string | Date): Date {
        if (!timestamp) {
            return new Date();
        }
        if (timestamp instanceof Date) {
            return timestamp;
        }
        return new Date(timestamp);
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
