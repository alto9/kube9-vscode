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

