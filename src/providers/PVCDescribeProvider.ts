/**
 * PVC Describe Provider interfaces.
 * Type definitions for PersistentVolumeClaim information data structures used in the Describe webview.
 */

/**
 * Main data structure containing all PVC information for display in the webview.
 */
export interface PVCDescribeData {
    /** Overview information including status, capacity, access modes, and storage class */
    overview: PVCOverview;
    /** Volume details including volume mode, finalizers, and capacity */
    volumeDetails: VolumeDetails;
    /** Usage information showing which Pods are using this PVC */
    usage: PVCUsage;
    /** PVC conditions for tracking state */
    conditions: PVCCondition[];
    /** Events related to the PVC */
    events: PVCEvent[];
    /** PVC metadata including labels and annotations */
    metadata: PVCMetadata;
}

/**
 * Overview information for a PVC including status, capacity, access modes, and storage class.
 */
export interface PVCOverview {
    /** PVC name */
    name: string;
    /** Namespace where the PVC is located */
    namespace: string;
    /** PVC status (Pending, Bound, Lost) */
    status: PVCStatus;
    /** PVC phase */
    phase: string;
    /** Requested storage capacity (e.g., "5Gi") */
    requestedCapacity: string;
    /** Actual capacity if bound (e.g., "5Gi") */
    actualCapacity?: string;
    /** Access modes (ReadWriteOnce, ReadOnlyMany, ReadWriteMany) */
    accessModes: string[];
    /** Storage class name (or "default" if not specified) */
    storageClass: string;
    /** Bound PV name if PVC is bound */
    boundPV?: string;
    /** Age of the PVC (formatted string like "3d", "5h", "23m") */
    age: string;
    /** Creation timestamp */
    creationTimestamp: string;
}

/**
 * PVC status information with phase and health calculation.
 */
export interface PVCStatus {
    /** PVC phase */
    phase: 'Pending' | 'Bound' | 'Lost';
    /** Optional reason for the current phase */
    reason?: string;
    /** Optional message describing the status */
    message?: string;
    /** Health status calculated from phase and conditions */
    health: 'Healthy' | 'Degraded' | 'Unhealthy' | 'Unknown';
}

/**
 * Volume details including volume mode, finalizers, and capacity information.
 */
export interface VolumeDetails {
    /** Volume mode (Filesystem, Block) */
    volumeMode: string;
    /** Finalizers on the PVC */
    finalizers: string[];
    /** Requested storage capacity */
    requestedCapacity: string;
    /** Actual capacity if bound */
    actualCapacity?: string;
    /** Storage class name */
    storageClass: string;
    /** Access modes */
    accessModes: string[];
}

/**
 * Usage information showing which Pods are using this PVC.
 */
export interface PVCUsage {
    /** List of Pods using this PVC */
    pods: PodUsageInfo[];
    /** Total number of Pods using this PVC */
    totalPods: number;
}

/**
 * Information about a Pod using the PVC.
 */
export interface PodUsageInfo {
    /** Pod name */
    name: string;
    /** Pod namespace */
    namespace: string;
    /** Pod phase */
    phase: string;
    /** Volume mount path in the Pod */
    mountPath?: string;
    /** Whether the mount is read-only */
    readOnly?: boolean;
}

/**
 * PVC condition for tracking state.
 */
export interface PVCCondition {
    /** Condition type (e.g., "Resizing", "FileSystemResizePending") */
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
 * PVC event information for timeline display.
 */
export interface PVCEvent {
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
 * PVC metadata including labels and annotations.
 */
export interface PVCMetadata {
    /** Labels applied to the PVC */
    labels: Record<string, string>;
    /** Annotations applied to the PVC */
    annotations: Record<string, string>;
    /** PVC UID */
    uid: string;
    /** Resource version */
    resourceVersion: string;
    /** Creation timestamp */
    creationTimestamp: string;
}

import * as k8s from '@kubernetes/client-node';
import { KubernetesApiClient } from '../kubernetes/apiClient';

/**
 * Provider for fetching and formatting PVC information for the Describe webview.
 * Fetches PVC data from Kubernetes API and transforms it into structured data structures.
 */
export class PVCDescribeProvider {
    constructor(private k8sClient: KubernetesApiClient) {}

    /**
     * Fetches PVC details from Kubernetes API and formats them for display.
     * 
     * @param name - PVC name
     * @param namespace - PVC namespace
     * @param context - Kubernetes context name
     * @returns Promise resolving to formatted PVC data
     * @throws Error if PVC cannot be fetched or if API calls fail
     */
    async getPVCDetails(
        name: string,
        namespace: string,
        context: string
    ): Promise<PVCDescribeData> {
        // Set context before API calls
        this.k8sClient.setContext(context);

        // Fetch PVC object
        let pvc: k8s.V1PersistentVolumeClaim;
        try {
            pvc = await this.k8sClient.core.readNamespacedPersistentVolumeClaim({
                name: name,
                namespace: namespace
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to fetch PVC ${name} in namespace ${namespace}: ${errorMessage}`);
        }

        // Fetch bound PV if PVC is bound
        let boundPV: k8s.V1PersistentVolume | undefined;
        const volumeName = pvc.spec?.volumeName;
        if (volumeName) {
            try {
                boundPV = await this.k8sClient.core.readPersistentVolume({
                    name: volumeName
                });
            } catch (error) {
                // Log but don't fail if PV can't be fetched
                console.warn(`Failed to fetch bound PV ${volumeName} for PVC ${name}:`, error);
            }
        }

        // Find Pods using this PVC
        let podsUsingPVC: PodUsageInfo[] = [];
        try {
            podsUsingPVC = await this.findPodsUsingPVC(name, namespace);
        } catch (error) {
            // Log but don't fail if Pods can't be fetched
            console.warn(`Failed to find Pods using PVC ${name}:`, error);
        }

        // Fetch PVC-related events
        let events: k8s.CoreV1Event[] = [];
        try {
            const pvcUid = pvc.metadata?.uid;
            if (pvcUid && namespace) {
                const fieldSelector = `involvedObject.name=${name},involvedObject.uid=${pvcUid}`;
                const eventsResponse = await this.k8sClient.core.listNamespacedEvent({
                    namespace: namespace,
                    fieldSelector: fieldSelector
                });
                events = eventsResponse.items || [];
                
                // Defensive filter to ensure PVC-level events only
                events = events.filter(event => 
                    event.involvedObject?.kind === 'PersistentVolumeClaim' && 
                    event.involvedObject?.name === name
                );
            }
        } catch (error) {
            // Log but don't fail if events can't be fetched
            console.warn(`Failed to fetch events for PVC ${name}:`, error);
        }

        // Format data
        return {
            overview: this.formatOverview(pvc, boundPV),
            volumeDetails: this.formatVolumeDetails(pvc),
            usage: {
                pods: podsUsingPVC,
                totalPods: podsUsingPVC.length
            },
            conditions: this.formatConditions(pvc.status?.conditions || []),
            events: this.formatEvents(events),
            metadata: this.formatMetadata(pvc.metadata!)
        };
    }

    /**
     * Formats PVC overview information.
     */
    private formatOverview(pvc: k8s.V1PersistentVolumeClaim, boundPV?: k8s.V1PersistentVolume): PVCOverview {
        const status = pvc.status;
        const spec = pvc.spec;
        const metadata = pvc.metadata;

        const phase = status?.phase || 'Pending';
        const requestedCapacity = spec?.resources?.requests?.storage || 'Unknown';
        const actualCapacity = status?.capacity?.storage || boundPV?.spec?.capacity?.storage || undefined;
        const accessModes = spec?.accessModes || [];
        const storageClass = spec?.storageClassName || '(default)';
        const volumeName = spec?.volumeName;

        return {
            name: metadata?.name || 'Unknown',
            namespace: metadata?.namespace || 'Unknown',
            status: this.calculatePVCStatus(pvc),
            phase: phase,
            requestedCapacity: requestedCapacity,
            actualCapacity: actualCapacity,
            accessModes: accessModes,
            storageClass: storageClass,
            boundPV: volumeName,
            age: this.calculateAge(metadata?.creationTimestamp),
            creationTimestamp: this.formatTimestamp(metadata?.creationTimestamp)
        };
    }

    /**
     * Calculates PVC health status based on phase and conditions.
     */
    private calculatePVCStatus(pvc: k8s.V1PersistentVolumeClaim): PVCStatus {
        const phase = pvc.status?.phase || 'Pending';
        const conditions = pvc.status?.conditions || [];

        let health: PVCStatus['health'] = 'Unknown';

        if (phase === 'Bound') {
            // Check for problematic conditions
            const hasErrorCondition = conditions.some(c => 
                c.status === 'True' && 
                (c.type === 'Resizing' || c.type === 'FileSystemResizePending')
            );
            health = hasErrorCondition ? 'Degraded' : 'Healthy';
        } else if (phase === 'Pending') {
            health = 'Degraded';
        } else if (phase === 'Lost') {
            health = 'Unhealthy';
        }

        return {
            phase: phase as PVCStatus['phase'],
            health
        };
    }

    /**
     * Formats volume details information.
     */
    private formatVolumeDetails(pvc: k8s.V1PersistentVolumeClaim): VolumeDetails {
        const spec = pvc.spec;
        const status = pvc.status;
        const metadata = pvc.metadata;

        return {
            volumeMode: spec?.volumeMode || 'Filesystem',
            finalizers: metadata?.finalizers || [],
            requestedCapacity: spec?.resources?.requests?.storage || 'Unknown',
            actualCapacity: status?.capacity?.storage,
            storageClass: spec?.storageClassName || '(default)',
            accessModes: spec?.accessModes || []
        };
    }

    /**
     * Finds Pods using this PVC by listing all Pods in the namespace and checking volume mounts.
     */
    private async findPodsUsingPVC(pvcName: string, namespace: string): Promise<PodUsageInfo[]> {
        try {
            const response = await this.k8sClient.core.listNamespacedPod({
                namespace: namespace
            });
            const pods = response.items || [];

            const podsUsingPVC: PodUsageInfo[] = [];

            pods.forEach((pod: k8s.V1Pod) => {
                const volumes = pod.spec?.volumes || [];
                const containers = [
                    ...(pod.spec?.containers || []),
                    ...(pod.spec?.initContainers || [])
                ];

                // Check if any volume references this PVC
                volumes.forEach(volume => {
                    if (volume.persistentVolumeClaim?.claimName === pvcName) {
                        // Find containers that mount this volume
                        containers.forEach(container => {
                            const volumeMount = container.volumeMounts?.find(
                                mount => mount.name === volume.name
                            );
                            if (volumeMount) {
                                podsUsingPVC.push({
                                    name: pod.metadata?.name || 'Unknown',
                                    namespace: pod.metadata?.namespace || namespace,
                                    phase: pod.status?.phase || 'Unknown',
                                    mountPath: volumeMount.mountPath,
                                    readOnly: volumeMount.readOnly || false
                                });
                            }
                        });
                    }
                });
            });

            // Remove duplicates (same Pod might mount the PVC multiple times)
            const uniquePods = new Map<string, PodUsageInfo>();
            podsUsingPVC.forEach(pod => {
                const key = `${pod.namespace}/${pod.name}`;
                if (!uniquePods.has(key)) {
                    uniquePods.set(key, pod);
                }
            });

            return Array.from(uniquePods.values());
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to find Pods using PVC ${pvcName}: ${errorMessage}`);
        }
    }

    /**
     * Formats PVC conditions.
     */
    private formatConditions(conditions: k8s.V1PersistentVolumeClaimCondition[]): PVCCondition[] {
        return conditions.map(c => ({
            type: c.type,
            status: c.status as 'True' | 'False' | 'Unknown',
            lastTransitionTime: c.lastTransitionTime ? this.formatTimestamp(c.lastTransitionTime) : 'Unknown',
            reason: c.reason,
            message: c.message
        }));
    }

    /**
     * Formats and groups PVC events by type and reason.
     */
    private formatEvents(events: k8s.CoreV1Event[]): PVCEvent[] {
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
     * Formats PVC metadata including labels and annotations.
     */
    private formatMetadata(metadata: k8s.V1ObjectMeta): PVCMetadata {
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
