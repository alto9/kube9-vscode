/**
 * Pod Describe Provider interfaces.
 * Type definitions for Pod information data structures used in the Describe webview.
 */

/**
 * Main data structure containing all Pod information for display in the webview.
 */
export interface PodDescribeData {
    /** Overview information including status, phase, networking, and configuration */
    overview: PodOverview;
    /** Regular containers in the Pod */
    containers: ContainerInfo[];
    /** Init containers in the Pod */
    initContainers: ContainerInfo[];
    /** Pod conditions for readiness tracking */
    conditions: PodCondition[];
    /** Events related to the Pod for timeline display */
    events: PodEvent[];
    /** Volumes attached to the Pod */
    volumes: VolumeInfo[];
    /** Pod metadata including labels, annotations, and owner references */
    metadata: PodMetadata;
}

/**
 * Overview information for a Pod including status, phase, networking, and configuration.
 */
export interface PodOverview {
    /** Pod name */
    name: string;
    /** Namespace where the Pod is located */
    namespace: string;
    /** Pod status with phase and health calculation */
    status: PodStatus;
    /** Pod phase (Pending, Running, Succeeded, Failed, Unknown) */
    phase: string;
    /** Pod IP address */
    podIP: string;
    /** Host IP address where the Pod is running */
    hostIP: string;
    /** Node name where the Pod is scheduled */
    nodeName: string;
    /** Quality of Service class (BestEffort, Burstable, Guaranteed) */
    qosClass: string;
    /** Restart policy (Always, OnFailure, Never) */
    restartPolicy: string;
    /** Service account name */
    serviceAccount: string;
    /** Start time of the Pod */
    startTime: string;
    /** Age of the Pod (formatted string like "3d", "5h", "23m") */
    age: string;
}

/**
 * Pod status information with phase and health calculation.
 */
export interface PodStatus {
    /** Pod phase */
    phase: 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown';
    /** Optional reason for the current phase */
    reason?: string;
    /** Optional message describing the status */
    message?: string;
    /** Health status calculated from phase, conditions, and container restarts */
    health: 'Healthy' | 'Degraded' | 'Unhealthy' | 'Unknown';
}

/**
 * Container information including status, resources, ports, environment, and volume mounts.
 */
export interface ContainerInfo {
    /** Container name */
    name: string;
    /** Container image */
    image: string;
    /** Container image ID */
    imageID: string;
    /** Container status (waiting/running/terminated) */
    status: ContainerStatus;
    /** Whether the container is ready */
    ready: boolean;
    /** Number of times the container has restarted */
    restartCount: number;
    /** Resource requests and limits */
    resources: ContainerResources;
    /** Ports exposed by the container */
    ports: ContainerPort[];
    /** Environment variables */
    environment: EnvironmentVariable[];
    /** Volume mounts */
    volumeMounts: VolumeMount[];
}

/**
 * Container status information for state tracking.
 */
export interface ContainerStatus {
    /** Current state of the container */
    state: 'waiting' | 'running' | 'terminated';
    /** Details about the current state */
    stateDetails: {
        /** Reason for waiting or termination */
        reason?: string;
        /** Message describing the state */
        message?: string;
        /** Time when the container started */
        startedAt?: string;
        /** Time when the container finished */
        finishedAt?: string;
        /** Exit code if terminated */
        exitCode?: number;
        /** Signal number if terminated by signal */
        signal?: number;
    };
    /** Previous state of the container (if restarted) */
    lastState?: {
        /** Previous state */
        state: 'waiting' | 'running' | 'terminated';
        /** Reason for previous state */
        reason?: string;
        /** Exit code from previous state */
        exitCode?: number;
        /** Time when previous state finished */
        finishedAt?: string;
    };
}

/**
 * Container resource requests and limits.
 */
export interface ContainerResources {
    /** Resource requests */
    requests: {
        /** CPU request (e.g., "100m", "1") */
        cpu?: string;
        /** Memory request (e.g., "128Mi", "1Gi") */
        memory?: string;
    };
    /** Resource limits */
    limits: {
        /** CPU limit (e.g., "500m", "2") */
        cpu?: string;
        /** Memory limit (e.g., "512Mi", "2Gi") */
        memory?: string;
    };
}

/**
 * Container port configuration.
 */
export interface ContainerPort {
    /** Optional port name */
    name?: string;
    /** Container port number */
    containerPort: number;
    /** Protocol (TCP, UDP, SCTP) */
    protocol: string;
    /** Optional host port number */
    hostPort?: number;
}

/**
 * Environment variable configuration.
 */
export interface EnvironmentVariable {
    /** Environment variable name */
    name: string;
    /** Direct value (if not using valueFrom) */
    value?: string;
    /** Value source configuration */
    valueFrom?: {
        /** Type of value source */
        type: 'configMap' | 'secret' | 'fieldRef' | 'resourceFieldRef';
        /** Reference to the source (e.g., "configMap/my-config", "secret/my-secret") */
        reference: string;
    };
}

/**
 * Volume mount information.
 */
export interface VolumeMount {
    /** Volume name */
    name: string;
    /** Mount path in the container */
    mountPath: string;
    /** Whether the mount is read-only */
    readOnly: boolean;
    /** Optional sub path within the volume */
    subPath?: string;
}

/**
 * Pod condition for readiness tracking.
 */
export interface PodCondition {
    /** Condition type (e.g., "Ready", "Initialized", "PodScheduled") */
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
 * Pod event information for timeline display.
 */
export interface PodEvent {
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
 * Volume information.
 */
export interface VolumeInfo {
    /** Volume name */
    name: string;
    /** Volume type (e.g., "ConfigMap", "Secret", "PersistentVolumeClaim") */
    type: string;
    /** Volume source description */
    source: string;
    /** Containers that mount this volume */
    mountedBy: string[];
}

/**
 * Pod metadata including labels, annotations, and owner references.
 */
export interface PodMetadata {
    /** Labels applied to the Pod */
    labels: Record<string, string>;
    /** Annotations applied to the Pod */
    annotations: Record<string, string>;
    /** Owner references (e.g., ReplicaSet, StatefulSet) */
    ownerReferences: OwnerReference[];
    /** Pod UID */
    uid: string;
    /** Resource version */
    resourceVersion: string;
    /** Creation timestamp */
    creationTimestamp: string;
}

/**
 * Owner reference information.
 */
export interface OwnerReference {
    /** Kind of owner (e.g., "ReplicaSet", "StatefulSet") */
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
 * Provider for fetching and formatting Pod information for the Describe webview.
 * Fetches Pod data from Kubernetes API and transforms it into structured data structures.
 */
export class PodDescribeProvider {
    constructor(private k8sClient: KubernetesApiClient) {}

    /**
     * Fetches Pod details from Kubernetes API and formats them for display.
     * 
     * @param name - Pod name
     * @param namespace - Pod namespace
     * @param context - Kubernetes context name
     * @returns Promise resolving to formatted Pod data
     * @throws Error if Pod cannot be fetched or if API calls fail
     */
    async getPodDetails(
        name: string,
        namespace: string,
        context: string
    ): Promise<PodDescribeData> {
        // Set context before API calls
        this.k8sClient.setContext(context);

        // Fetch Pod object
        let pod: k8s.V1Pod;
        try {
            pod = await this.k8sClient.core.readNamespacedPod({
                name: name,
                namespace: namespace
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to fetch Pod ${name} in namespace ${namespace}: ${errorMessage}`);
        }

        // Fetch related events
        let events: k8s.CoreV1Event[] = [];
        try {
            const podUid = pod.metadata?.uid;
            if (podUid) {
                const fieldSelector = `involvedObject.name=${name},involvedObject.uid=${podUid}`;
                // Use type assertion as the API method signature may vary
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const eventsResponse = await (this.k8sClient.core.listNamespacedEvent as any)(
                    namespace,
                    undefined, // pretty
                    undefined, // allowWatchBookmarks
                    undefined, // _continue
                    fieldSelector
                );
                // The API returns a response with body containing items
                events = eventsResponse?.body?.items || [];
            }
        } catch (error) {
            // Log but don't fail if events can't be fetched
            console.warn(`Failed to fetch events for Pod ${name}:`, error);
        }

        // Format data
        return {
            overview: this.formatOverview(pod),
            containers: this.formatContainers(
                pod.spec?.containers || [],
                pod.status?.containerStatuses || []
            ),
            initContainers: this.formatContainers(
                pod.spec?.initContainers || [],
                pod.status?.initContainerStatuses || []
            ),
            conditions: this.formatConditions(pod.status?.conditions || []),
            events: this.formatEvents(events),
            volumes: this.formatVolumes(pod),
            metadata: this.formatMetadata(pod.metadata!)
        };
    }

    /**
     * Formats Pod overview information.
     */
    private formatOverview(pod: k8s.V1Pod): PodOverview {
        const status = pod.status;
        const spec = pod.spec;
        const metadata = pod.metadata;

        return {
            name: metadata?.name || 'Unknown',
            namespace: metadata?.namespace || 'Unknown',
            status: this.calculatePodStatus(pod),
            phase: status?.phase || 'Unknown',
            podIP: status?.podIP || 'N/A',
            hostIP: status?.hostIP || 'N/A',
            nodeName: spec?.nodeName || 'Unscheduled',
            qosClass: status?.qosClass || 'BestEffort',
            restartPolicy: spec?.restartPolicy || 'Always',
            serviceAccount: spec?.serviceAccountName || 'default',
            startTime: status?.startTime ? this.formatTimestamp(status.startTime) : 'N/A',
            age: this.calculateAge(metadata?.creationTimestamp)
        };
    }

    /**
     * Calculates Pod health status based on phase, conditions, and container restarts.
     */
    private calculatePodStatus(pod: k8s.V1Pod): PodStatus {
        const phase = pod.status?.phase || 'Unknown';
        const conditions = pod.status?.conditions || [];
        const containerStatuses = pod.status?.containerStatuses || [];

        let health: PodStatus['health'] = 'Unknown';

        if (phase === 'Running') {
            const allReady = conditions.every(c => c.type !== 'Ready' || c.status === 'True');
            const noRestarts = containerStatuses.every(c => (c.restartCount || 0) === 0);

            if (allReady && noRestarts) {
                health = 'Healthy';
            } else if (allReady) {
                health = 'Degraded';
            } else {
                health = 'Unhealthy';
            }
        } else if (phase === 'Succeeded') {
            health = 'Healthy';
        } else if (phase === 'Failed') {
            health = 'Unhealthy';
        } else if (phase === 'Pending') {
            health = 'Degraded';
        }

        return {
            phase: phase as PodStatus['phase'],
            reason: pod.status?.reason,
            message: pod.status?.message,
            health
        };
    }

    /**
     * Formats container information from container specs and statuses.
     */
    private formatContainers(
        specs: k8s.V1Container[],
        statuses: k8s.V1ContainerStatus[]
    ): ContainerInfo[] {
        return specs.map(spec => {
            const status = statuses.find(s => s.name === spec.name);

            return {
                name: spec.name,
                image: spec.image || 'N/A',
                imageID: status?.imageID || 'N/A',
                status: this.formatContainerStatus(status),
                ready: status?.ready || false,
                restartCount: status?.restartCount || 0,
                resources: this.formatResources(spec.resources),
                ports: this.formatPorts(spec.ports || []),
                environment: this.formatEnvironment(spec.env || []),
                volumeMounts: this.formatVolumeMounts(spec.volumeMounts || [])
            };
        });
    }

    /**
     * Formats container status information.
     */
    private formatContainerStatus(status?: k8s.V1ContainerStatus): ContainerStatus {
        if (!status) {
            return {
                state: 'waiting',
                stateDetails: { reason: 'Pending', message: 'Container not started' }
            };
        }

        let state: ContainerStatus['state'] = 'waiting';
        let stateDetails: ContainerStatus['stateDetails'] = {};
        let lastState: ContainerStatus['lastState'] | undefined;

        if (status.state?.running) {
            state = 'running';
            stateDetails = {
                startedAt: status.state.running.startedAt ? this.formatTimestamp(status.state.running.startedAt) : undefined
            };
        } else if (status.state?.waiting) {
            state = 'waiting';
            stateDetails = {
                reason: status.state.waiting.reason,
                message: status.state.waiting.message
            };
        } else if (status.state?.terminated) {
            state = 'terminated';
            stateDetails = {
                reason: status.state.terminated.reason,
                message: status.state.terminated.message,
                startedAt: status.state.terminated.startedAt ? this.formatTimestamp(status.state.terminated.startedAt) : undefined,
                finishedAt: status.state.terminated.finishedAt ? this.formatTimestamp(status.state.terminated.finishedAt) : undefined,
                exitCode: status.state.terminated.exitCode,
                signal: status.state.terminated.signal
            };
        }

        // Format last state if present
        if (status.lastState) {
            if (status.lastState.running) {
                lastState = {
                    state: 'running',
                    finishedAt: status.lastState.running.startedAt ? this.formatTimestamp(status.lastState.running.startedAt) : undefined
                };
            } else if (status.lastState.waiting) {
                lastState = {
                    state: 'waiting',
                    reason: status.lastState.waiting.reason
                };
            } else if (status.lastState.terminated) {
                lastState = {
                    state: 'terminated',
                    reason: status.lastState.terminated.reason,
                    exitCode: status.lastState.terminated.exitCode,
                    finishedAt: status.lastState.terminated.finishedAt ? this.formatTimestamp(status.lastState.terminated.finishedAt) : undefined
                };
            }
        }

        return { state, stateDetails, lastState };
    }

    /**
     * Formats container resource requests and limits.
     */
    private formatResources(resources?: k8s.V1ResourceRequirements): ContainerResources {
        return {
            requests: {
                cpu: resources?.requests?.cpu || 'Not set',
                memory: resources?.requests?.memory || 'Not set'
            },
            limits: {
                cpu: resources?.limits?.cpu || 'Not set',
                memory: resources?.limits?.memory || 'Not set'
            }
        };
    }

    /**
     * Formats container ports.
     */
    private formatPorts(ports: k8s.V1ContainerPort[]): ContainerPort[] {
        return ports.map(port => ({
            name: port.name,
            containerPort: port.containerPort,
            protocol: port.protocol || 'TCP',
            hostPort: port.hostPort
        }));
    }

    /**
     * Formats environment variables.
     */
    private formatEnvironment(env: k8s.V1EnvVar[]): EnvironmentVariable[] {
        return env.map(envVar => {
            const result: EnvironmentVariable = {
                name: envVar.name
            };

            if (envVar.value) {
                result.value = envVar.value;
            } else if (envVar.valueFrom) {
                let type: 'configMap' | 'secret' | 'fieldRef' | 'resourceFieldRef' = 'configMap';
                let reference = '';

                if (envVar.valueFrom.configMapKeyRef) {
                    type = 'configMap';
                    reference = `configMap/${envVar.valueFrom.configMapKeyRef.name}`;
                } else if (envVar.valueFrom.secretKeyRef) {
                    type = 'secret';
                    reference = `secret/${envVar.valueFrom.secretKeyRef.name}`;
                } else if (envVar.valueFrom.fieldRef) {
                    type = 'fieldRef';
                    reference = envVar.valueFrom.fieldRef.fieldPath || '';
                } else if (envVar.valueFrom.resourceFieldRef) {
                    type = 'resourceFieldRef';
                    reference = envVar.valueFrom.resourceFieldRef.resource || '';
                }

                if (type && reference) {
                    result.valueFrom = { type, reference };
                }
            }

            return result;
        });
    }

    /**
     * Formats volume mounts.
     */
    private formatVolumeMounts(volumeMounts: k8s.V1VolumeMount[]): VolumeMount[] {
        return volumeMounts.map(mount => ({
            name: mount.name,
            mountPath: mount.mountPath,
            readOnly: mount.readOnly || false,
            subPath: mount.subPath
        }));
    }

    /**
     * Formats Pod conditions.
     */
    private formatConditions(conditions: k8s.V1PodCondition[]): PodCondition[] {
        return conditions.map(c => ({
            type: c.type,
            status: c.status as 'True' | 'False' | 'Unknown',
            lastTransitionTime: c.lastTransitionTime ? this.formatTimestamp(c.lastTransitionTime) : 'Unknown',
            reason: c.reason,
            message: c.message
        }));
    }

    /**
     * Formats and groups Pod events by type and reason.
     */
    private formatEvents(events: k8s.CoreV1Event[]): PodEvent[] {
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
     * Formats volume information from Pod spec.
     */
    private formatVolumes(pod: k8s.V1Pod): VolumeInfo[] {
        const volumes = pod.spec?.volumes || [];
        const containers = [
            ...(pod.spec?.containers || []),
            ...(pod.spec?.initContainers || [])
        ];

        return volumes.map(volume => {
            let type = 'Unknown';
            let source = 'N/A';

            if (volume.configMap) {
                type = 'ConfigMap';
                source = `configMap/${volume.configMap.name}`;
            } else if (volume.secret) {
                type = 'Secret';
                source = `secret/${volume.secret.secretName}`;
            } else if (volume.persistentVolumeClaim) {
                type = 'PersistentVolumeClaim';
                source = `persistentVolumeClaim/${volume.persistentVolumeClaim.claimName}`;
            } else if (volume.emptyDir) {
                type = 'EmptyDir';
                source = 'emptyDir';
            } else if (volume.hostPath) {
                type = 'HostPath';
                source = volume.hostPath.path || 'N/A';
            } else if (volume.downwardAPI) {
                type = 'DownwardAPI';
                source = 'downwardAPI';
            } else if (volume.projected) {
                type = 'Projected';
                source = 'projected';
            } else if (volume.awsElasticBlockStore) {
                type = 'AWSElasticBlockStore';
                source = volume.awsElasticBlockStore.volumeID || 'N/A';
            } else if (volume.azureDisk) {
                type = 'AzureDisk';
                source = volume.azureDisk.diskName || 'N/A';
            } else if (volume.azureFile) {
                type = 'AzureFile';
                source = volume.azureFile.secretName || 'N/A';
            } else if (volume.cephfs) {
                type = 'CephFS';
                source = volume.cephfs.monitors?.join(',') || 'N/A';
            } else if (volume.cinder) {
                type = 'Cinder';
                source = volume.cinder.volumeID || 'N/A';
            } else if (volume.fc) {
                type = 'FC';
                source = volume.fc.targetWWNs?.join(',') || 'N/A';
            } else if (volume.flexVolume) {
                type = 'FlexVolume';
                source = volume.flexVolume.driver || 'N/A';
            } else if (volume.flocker) {
                type = 'Flocker';
                source = volume.flocker.datasetName || 'N/A';
            } else if (volume.gcePersistentDisk) {
                type = 'GCEPersistentDisk';
                source = volume.gcePersistentDisk.pdName || 'N/A';
            } else if (volume.gitRepo) {
                type = 'GitRepo';
                source = volume.gitRepo.repository || 'N/A';
            } else if (volume.glusterfs) {
                type = 'Glusterfs';
                source = volume.glusterfs.endpoints || 'N/A';
            } else if (volume.iscsi) {
                type = 'ISCSI';
                source = volume.iscsi.iqn || 'N/A';
            } else if (volume.nfs) {
                type = 'NFS';
                source = `${volume.nfs.server}:${volume.nfs.path}`;
            } else if (volume.portworxVolume) {
                type = 'PortworxVolume';
                source = volume.portworxVolume.volumeID || 'N/A';
            } else if (volume.quobyte) {
                type = 'Quobyte';
                source = volume.quobyte.registry || 'N/A';
            } else if (volume.rbd) {
                type = 'RBD';
                source = volume.rbd.monitors?.join(',') || 'N/A';
            } else if (volume.scaleIO) {
                type = 'ScaleIO';
                source = volume.scaleIO.gateway || 'N/A';
            } else if (volume.storageos) {
                type = 'StorageOS';
                source = 'storageos';
            } else if (volume.vsphereVolume) {
                type = 'VsphereVolume';
                source = volume.vsphereVolume.volumePath || 'N/A';
            }

            // Find containers that mount this volume
            const mountedBy = containers
                .filter(container =>
                    container.volumeMounts?.some(mount => mount.name === volume.name)
                )
                .map(container => container.name);

            return {
                name: volume.name,
                type,
                source,
                mountedBy
            };
        });
    }

    /**
     * Formats Pod metadata including labels, annotations, and owner references.
     */
    private formatMetadata(metadata: k8s.V1ObjectMeta): PodMetadata {
        return {
            labels: metadata.labels || {},
            annotations: metadata.annotations || {},
            ownerReferences: (metadata.ownerReferences || []).map(ref => ({
                kind: ref.kind,
                name: ref.name,
                uid: ref.uid,
                controller: ref.controller || false
            })),
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

