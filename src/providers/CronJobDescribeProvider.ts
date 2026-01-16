/**
 * CronJob Describe Provider interfaces.
 * Type definitions for CronJob information data structures used in the Describe webview.
 */

/**
 * Main data structure containing all CronJob information for display in the webview.
 */
export interface CronJobDescribeData {
    /** Overview information including status, suspend state, and metadata */
    overview: CronJobOverview;
    /** Schedule information with cron expression and timing details */
    schedule: ScheduleInfo;
    /** Job history including active, successful, and failed jobs */
    jobHistory: JobHistoryInfo;
    /** Job template specification */
    jobTemplate: JobTemplateInfo;
    /** Configuration settings for the CronJob */
    configuration: CronJobConfiguration;
    /** Labels applied to the CronJob */
    labels: Record<string, string>;
    /** Annotations on the CronJob */
    annotations: Record<string, string>;
    /** Events related to the CronJob for timeline display */
    events: CronJobEvent[];
}

/**
 * Overview information for a CronJob.
 */
export interface CronJobOverview {
    /** CronJob name */
    name: string;
    /** Namespace where the CronJob is located */
    namespace: string;
    /** Whether the CronJob is currently suspended */
    suspended: boolean;
    /** Creation timestamp */
    creationTimestamp: string;
    /** Age of the CronJob (formatted string like "3d", "5h", "23m") */
    age: string;
    /** UID of the CronJob resource */
    uid: string;
    /** Resource version */
    resourceVersion: string;
}

/**
 * Schedule information for the CronJob.
 */
export interface ScheduleInfo {
    /** Cron expression */
    schedule: string;
    /** Human-readable description of the schedule */
    humanReadable: string;
    /** Timezone for the schedule (if specified) */
    timezone?: string;
    /** Last time the job was scheduled */
    lastScheduleTime?: string;
    /** Relative time since last schedule */
    lastScheduleRelative?: string;
    /** Next scheduled run time (calculated) */
    nextScheduleTime?: string;
    /** Relative time until next schedule */
    nextScheduleRelative?: string;
}

/**
 * Job history information.
 */
export interface JobHistoryInfo {
    /** Currently active jobs */
    activeJobs: ActiveJobInfo[];
    /** Total number of active jobs */
    activeCount: number;
    /** Information about last successful job */
    lastSuccessfulJob?: LastJobInfo;
    /** Information about last failed job */
    lastFailedJob?: LastJobInfo;
    /** Total successful job completions */
    successfulCompletions: number;
    /** Total failed job completions */
    failedCompletions: number;
}

/**
 * Information about an active job.
 */
export interface ActiveJobInfo {
    /** Job name */
    name: string;
    /** Job namespace */
    namespace: string;
    /** Job start time */
    startTime: string;
    /** Relative age of the job */
    age: string;
    /** Current status of the job */
    status: string;
    /** Number of active pods */
    active: number;
    /** Number of succeeded pods */
    succeeded: number;
    /** Number of failed pods */
    failed: number;
}

/**
 * Information about the last successful or failed job.
 */
export interface LastJobInfo {
    /** Job name */
    name: string;
    /** Job namespace */
    namespace: string;
    /** Completion time */
    completionTime: string;
    /** Relative time of completion */
    relativeTime: string;
    /** Duration of the job */
    duration?: string;
}

/**
 * Job template specification.
 */
export interface JobTemplateInfo {
    /** Containers defined in the job template */
    containers: JobContainerInfo[];
    /** Init containers (if any) */
    initContainers: JobContainerInfo[];
    /** Restart policy */
    restartPolicy: string;
    /** Service account name */
    serviceAccountName?: string;
    /** Volumes defined in the pod spec */
    volumes: VolumeInfo[];
}

/**
 * Container information in the job template.
 */
export interface JobContainerInfo {
    /** Container name */
    name: string;
    /** Container image */
    image: string;
    /** Image pull policy */
    imagePullPolicy: string;
    /** Command to run */
    command?: string[];
    /** Arguments to the command */
    args?: string[];
    /** Environment variables */
    env: EnvVarInfo[];
    /** Resource requests and limits */
    resources: ResourceRequirements;
    /** Volume mounts */
    volumeMounts: VolumeMountInfo[];
    /** Container ports */
    ports: ContainerPortInfo[];
}

/**
 * Environment variable information.
 */
export interface EnvVarInfo {
    /** Variable name */
    name: string;
    /** Variable value (if direct value) */
    value?: string;
    /** Value from source (if from ConfigMap/Secret) */
    valueFrom?: {
        /** Type of source (configMap, secret, field, resource) */
        type: string;
        /** Name of the source */
        name?: string;
        /** Key within the source */
        key?: string;
    };
}

/**
 * Resource requirements (requests and limits).
 */
export interface ResourceRequirements {
    /** Resource requests */
    requests: {
        /** CPU request */
        cpu?: string;
        /** Memory request */
        memory?: string;
    };
    /** Resource limits */
    limits: {
        /** CPU limit */
        cpu?: string;
        /** Memory limit */
        memory?: string;
    };
}

/**
 * Volume mount information.
 */
export interface VolumeMountInfo {
    /** Mount name */
    name: string;
    /** Mount path in the container */
    mountPath: string;
    /** Whether the mount is read-only */
    readOnly: boolean;
    /** Sub-path within the volume */
    subPath?: string;
}

/**
 * Container port information.
 */
export interface ContainerPortInfo {
    /** Container port number */
    containerPort: number;
    /** Port protocol (TCP, UDP) */
    protocol: string;
    /** Port name */
    name?: string;
}

/**
 * Volume information.
 */
export interface VolumeInfo {
    /** Volume name */
    name: string;
    /** Volume type (e.g., "ConfigMap", "Secret", "EmptyDir") */
    type: string;
    /** Source details */
    source?: string;
}

/**
 * CronJob configuration settings.
 */
export interface CronJobConfiguration {
    /** Concurrency policy (Allow, Forbid, Replace) */
    concurrencyPolicy: string;
    /** Deadline in seconds for starting the job */
    startingDeadlineSeconds?: number;
    /** Number of successful jobs to keep in history */
    successfulJobsHistoryLimit: number;
    /** Number of failed jobs to keep in history */
    failedJobsHistoryLimit: number;
    /** Completions required for the job */
    completions?: number;
    /** Parallelism for the job */
    parallelism?: number;
    /** Backoff limit for retries */
    backoffLimit?: number;
}

/**
 * Event related to the CronJob.
 */
export interface CronJobEvent {
    /** Event type (Normal, Warning) */
    type: string;
    /** Reason for the event */
    reason: string;
    /** Event message */
    message: string;
    /** Event timestamp */
    timestamp: string;
    /** Relative time of the event */
    relativeTime: string;
    /** Source component that generated the event */
    source: string;
    /** Number of times this event occurred */
    count: number;
}

/**
 * CronJob Describe Provider class.
 * Fetches and transforms CronJob data from the Kubernetes API.
 */
export class CronJobDescribeProvider {
}
