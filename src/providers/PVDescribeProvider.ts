/**
 * PV Describe Provider interfaces.
 * Type definitions for PersistentVolume information data structures used in the Describe webview.
 */

/**
 * Main data structure containing all PV information for display in the webview.
 */
export interface PVDescribeData {
    /** Overview information including status, capacity, access modes, reclaim policy, and storage class */
    overview: PVOverview;
    /** Volume source details including type, mount options, and node affinity */
    sourceDetails: VolumeSourceDetails;
    /** Binding information showing bound PVC if applicable */
    binding: PVBinding;
    /** Events related to the PV */
    events: PVEvent[];
    /** PV metadata including labels and annotations */
    metadata: PVMetadata;
}

/**
 * Overview information for a PV including status, capacity, access modes, reclaim policy, and storage class.
 */
export interface PVOverview {
    /** PV name */
    name: string;
    /** PV status (Available, Bound, Released, Failed) */
    status: PVStatus;
    /** Capacity (e.g., "5Gi") */
    capacity: string;
    /** Access modes (ReadWriteOnce, ReadOnlyMany, ReadWriteMany) */
    accessModes: string[];
    /** Reclaim policy (Retain, Delete, Recycle) */
    reclaimPolicy: string;
    /** Storage class name (or "default" if not specified) */
    storageClass: string;
    /** Bound PVC namespace/name if PV is bound */
    boundPVC?: string;
    /** Age of the PV (formatted string like "3d", "5h", "23m") */
    age: string;
    /** Creation timestamp */
    creationTimestamp: string;
}

/**
 * PV status information with phase and health calculation.
 */
export interface PVStatus {
    /** PV phase */
    phase: 'Available' | 'Bound' | 'Released' | 'Failed';
    /** Optional reason for the current phase */
    reason?: string;
    /** Optional message describing the status */
    message?: string;
    /** Health status calculated from phase */
    health: 'Healthy' | 'Degraded' | 'Unhealthy' | 'Unknown';
}

/**
 * Volume source details including type, mount options, and node affinity.
 */
export interface VolumeSourceDetails {
    /** Volume source type (NFS, iSCSI, AWS EBS, GCE PD, Azure Disk, hostPath, local, etc.) */
    type: string;
    /** Source-specific details as key-value pairs */
    details: Record<string, string>;
    /** Mount options */
    mountOptions: string[];
    /** Node affinity constraints if specified */
    nodeAffinity?: string;
}

/**
 * Binding information showing bound PVC if applicable.
 */
export interface PVBinding {
    /** Whether the PV is bound */
    isBound: boolean;
    /** Bound PVC namespace if bound */
    boundPVCNamespace?: string;
    /** Bound PVC name if bound */
    boundPVCName?: string;
}

/**
 * PV event information for timeline display.
 */
export interface PVEvent {
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
 * PV metadata including labels and annotations.
 */
export interface PVMetadata {
    /** Labels applied to the PV */
    labels: Record<string, string>;
    /** Annotations applied to the PV */
    annotations: Record<string, string>;
    /** PV UID */
    uid: string;
    /** Resource version */
    resourceVersion: string;
    /** Creation timestamp */
    creationTimestamp: string;
}

import * as k8s from '@kubernetes/client-node';
import { KubernetesApiClient } from '../kubernetes/apiClient';

/**
 * Provider for fetching and formatting PV information for the Describe webview.
 * Fetches PV data from Kubernetes API and transforms it into structured data structures.
 */
export class PVDescribeProvider {
    constructor(private k8sClient: KubernetesApiClient) {}

    /**
     * Fetches PV details from Kubernetes API and formats them for display.
     * 
     * @param name - PV name
     * @param context - Kubernetes context name
     * @returns Promise resolving to formatted PV data
     * @throws Error if PV cannot be fetched or if API calls fail
     */
    async getPVDetails(
        name: string,
        context: string
    ): Promise<PVDescribeData> {
        // Set context before API calls
        this.k8sClient.setContext(context);

        // Fetch PV object
        let pv: k8s.V1PersistentVolume;
        try {
            pv = await this.k8sClient.core.readPersistentVolume({
                name: name
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to fetch PV ${name}: ${errorMessage}`);
        }

        // Fetch bound PVC if PV is bound (for potential future use)
        const claimRef = pv.spec?.claimRef;
        if (claimRef?.name && claimRef?.namespace) {
            try {
                // Fetch bound PVC for potential future use (e.g., showing PVC details)
                await this.k8sClient.core.readNamespacedPersistentVolumeClaim({
                    name: claimRef.name,
                    namespace: claimRef.namespace
                });
                // Note: boundPVC data is not currently used but fetched for consistency
            } catch (error) {
                // Log but don't fail if PVC can't be fetched
                console.warn(`Failed to fetch bound PVC ${claimRef.namespace}/${claimRef.name} for PV ${name}:`, error);
            }
        }

        // Fetch PV-related events (cluster-scoped, no namespace)
        let events: k8s.CoreV1Event[] = [];
        try {
            const pvUid = pv.metadata?.uid;
            if (pvUid) {
                // For cluster-scoped resources, we need to list events from all namespaces
                // and filter by involvedObject
                const eventsResponse = await this.k8sClient.core.listEventForAllNamespaces();
                events = (eventsResponse.items || []).filter(event => 
                    event.involvedObject?.kind === 'PersistentVolume' && 
                    event.involvedObject?.name === name &&
                    event.involvedObject?.uid === pvUid
                );
            }
        } catch (error) {
            // Log but don't fail if events can't be fetched
            console.warn(`Failed to fetch events for PV ${name}:`, error);
        }

        // Format data
        return {
            overview: this.formatOverview(pv),
            sourceDetails: this.formatVolumeSource(pv),
            binding: this.formatBinding(pv),
            events: this.formatEvents(events),
            metadata: this.formatMetadata(pv.metadata!)
        };
    }

    /**
     * Formats PV overview information.
     */
    private formatOverview(pv: k8s.V1PersistentVolume): PVOverview {
        const spec = pv.spec;
        const metadata = pv.metadata;

        const capacity = spec?.capacity?.storage || 'Unknown';
        const accessModes = spec?.accessModes || [];
        const reclaimPolicy = spec?.persistentVolumeReclaimPolicy || 'Retain';
        const storageClass = spec?.storageClassName || '(default)';
        const claimRef = spec?.claimRef;
        const boundPVC = claimRef ? `${claimRef.namespace}/${claimRef.name}` : undefined;

        return {
            name: metadata?.name || 'Unknown',
            status: this.calculatePVStatus(pv),
            capacity: capacity,
            accessModes: accessModes,
            reclaimPolicy: reclaimPolicy,
            storageClass: storageClass,
            boundPVC: boundPVC,
            age: this.calculateAge(metadata?.creationTimestamp),
            creationTimestamp: this.formatTimestamp(metadata?.creationTimestamp)
        };
    }

    /**
     * Calculates PV health status based on phase.
     */
    private calculatePVStatus(pv: k8s.V1PersistentVolume): PVStatus {
        const phase = pv.status?.phase || 'Available';

        let health: PVStatus['health'] = 'Unknown';

        if (phase === 'Bound') {
            health = 'Healthy';
        } else if (phase === 'Available' || phase === 'Released') {
            health = 'Degraded';
        } else if (phase === 'Failed') {
            health = 'Unhealthy';
        }

        return {
            phase: phase as PVStatus['phase'],
            health
        };
    }

    /**
     * Formats volume source details.
     */
    private formatVolumeSource(pv: k8s.V1PersistentVolume): VolumeSourceDetails {
        const spec = pv.spec;
        const details: Record<string, string> = {};
        let type = 'Unknown';

        // Determine volume source type and extract details
        if (spec?.nfs) {
            type = 'NFS';
            details['Server'] = spec.nfs.server || 'Unknown';
            details['Path'] = spec.nfs.path || 'Unknown';
        } else if (spec?.iscsi) {
            type = 'iSCSI';
            details['Target Portal'] = spec.iscsi.targetPortal || 'Unknown';
            details['IQN'] = spec.iscsi.iqn || 'Unknown';
            details['Lun'] = String(spec.iscsi.lun || 'Unknown');
            if (spec.iscsi.portals) {
                details['Portals'] = spec.iscsi.portals.join(', ');
            }
        } else if (spec?.awsElasticBlockStore) {
            type = 'AWS EBS';
            details['Volume ID'] = spec.awsElasticBlockStore.volumeID || 'Unknown';
            details['FSType'] = spec.awsElasticBlockStore.fsType || 'ext4';
        } else if (spec?.gcePersistentDisk) {
            type = 'GCE PD';
            details['PD Name'] = spec.gcePersistentDisk.pdName || 'Unknown';
            details['FSType'] = spec.gcePersistentDisk.fsType || 'ext4';
        } else if (spec?.azureDisk) {
            type = 'Azure Disk';
            details['Disk Name'] = spec.azureDisk.diskName || 'Unknown';
            details['Disk URI'] = spec.azureDisk.diskURI || 'Unknown';
        } else if (spec?.hostPath) {
            type = 'HostPath';
            details['Path'] = spec.hostPath.path || 'Unknown';
            details['Type'] = spec.hostPath.type || 'Unknown';
        } else if (spec?.local) {
            type = 'Local';
            details['Path'] = spec.local.path || 'Unknown';
        } else if (spec?.csi) {
            type = 'CSI';
            details['Driver'] = spec.csi.driver || 'Unknown';
            if (spec.csi.volumeHandle) {
                details['Volume Handle'] = spec.csi.volumeHandle;
            }
        } else if (spec?.rbd) {
            type = 'RBD';
            details['Ceph Monitors'] = (spec.rbd.monitors || []).join(', ');
            details['RBD Image'] = spec.rbd.image || 'Unknown';
            details['Pool'] = spec.rbd.pool || 'Unknown';
        } else if (spec?.glusterfs) {
            type = 'GlusterFS';
            details['Endpoints'] = spec.glusterfs.endpoints || 'Unknown';
            details['Path'] = spec.glusterfs.path || 'Unknown';
        } else if (spec?.cephfs) {
            type = 'CephFS';
            details['Monitors'] = (spec.cephfs.monitors || []).join(', ');
            details['Path'] = spec.cephfs.path || 'Unknown';
        } else if (spec?.fc) {
            type = 'Fibre Channel';
            details['Target WWNs'] = (spec.fc.targetWWNs || []).join(', ');
            details['Lun'] = spec.fc.lun ? String(spec.fc.lun) : 'Unknown';
        } else if (spec?.flocker) {
            type = 'Flocker';
            details['Dataset Name'] = spec.flocker.datasetName || 'Unknown';
        } else if (spec?.flexVolume) {
            type = 'FlexVolume';
            details['Driver'] = spec.flexVolume.driver || 'Unknown';
        } else if (spec?.vsphereVolume) {
            type = 'vSphere';
            details['Volume Path'] = spec.vsphereVolume.volumePath || 'Unknown';
            details['FSType'] = spec.vsphereVolume.fsType || 'Unknown';
        } else if (spec?.quobyte) {
            type = 'Quobyte';
            details['Registry'] = spec.quobyte.registry || 'Unknown';
            details['Volume'] = spec.quobyte.volume || 'Unknown';
        } else if (spec?.azureFile) {
            type = 'Azure File';
            details['Secret Name'] = spec.azureFile.secretName || 'Unknown';
            details['Share Name'] = spec.azureFile.shareName || 'Unknown';
        } else if (spec?.photonPersistentDisk) {
            type = 'Photon';
            details['PD ID'] = spec.photonPersistentDisk.pdID || 'Unknown';
        } else if (spec?.portworxVolume) {
            type = 'Portworx';
            details['Volume ID'] = spec.portworxVolume.volumeID || 'Unknown';
        } else if (spec?.scaleIO) {
            type = 'ScaleIO';
            details['Gateway'] = spec.scaleIO.gateway || 'Unknown';
            details['System'] = spec.scaleIO.system || 'Unknown';
            details['Volume Name'] = spec.scaleIO.volumeName || 'Unknown';
        } else if (spec?.storageos) {
            type = 'StorageOS';
            details['Volume Name'] = spec.storageos.volumeName || 'Unknown';
            details['Volume Namespace'] = spec.storageos.volumeNamespace || 'Unknown';
        }

        // Extract mount options
        const mountOptions = spec?.mountOptions || [];

        // Extract node affinity
        let nodeAffinity: string | undefined;
        if (spec?.nodeAffinity) {
            try {
                nodeAffinity = JSON.stringify(spec.nodeAffinity, null, 2);
            } catch {
                nodeAffinity = 'Unable to serialize node affinity';
            }
        }

        return {
            type: type,
            details: details,
            mountOptions: mountOptions,
            nodeAffinity: nodeAffinity
        };
    }

    /**
     * Formats binding information.
     */
    private formatBinding(pv: k8s.V1PersistentVolume): PVBinding {
        const claimRef = pv.spec?.claimRef;

        return {
            isBound: !!claimRef,
            boundPVCNamespace: claimRef?.namespace,
            boundPVCName: claimRef?.name
        };
    }

    /**
     * Formats and groups PV events by type and reason.
     */
    private formatEvents(events: k8s.CoreV1Event[]): PVEvent[] {
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
     * Formats PV metadata including labels and annotations.
     */
    private formatMetadata(metadata: k8s.V1ObjectMeta): PVMetadata {
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
