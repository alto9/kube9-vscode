/**
 * Transformer module for converting Kubernetes V1CronJob and related resources
 * into CronJobDescribeData structure for webview display.
 */

import * as k8s from '@kubernetes/client-node';
import { formatRelativeTime } from '../utils/timeFormatting';
import { calculateAge } from '../utils/deploymentUtils';
import {
    CronJobDescribeData,
    CronJobOverview,
    ScheduleInfo,
    JobHistoryInfo,
    ActiveJobInfo,
    LastJobInfo,
    JobTemplateInfo,
    JobContainerInfo,
    EnvVarInfo,
    ResourceRequirements,
    VolumeMountInfo,
    ContainerPortInfo,
    VolumeInfo,
    CronJobConfiguration,
    CronJobEvent
} from '../providers/CronJobDescribeProvider';

/**
 * Transform a V1CronJob and related resources into CronJobDescribeData for webview display.
 * 
 * @param cronJob The Kubernetes V1CronJob object
 * @param jobs Array of V1Job objects owned by this CronJob
 * @param events Array of CoreV1Event objects related to this CronJob
 * @returns CronJobDescribeData structure ready for webview rendering
 */
export function transformCronJobData(
    cronJob: k8s.V1CronJob,
    jobs: k8s.V1Job[],
    events: k8s.CoreV1Event[]
): CronJobDescribeData {
    const metadata = cronJob.metadata || {};
    const spec = cronJob.spec || {};
    const status = cronJob.status || {};

    return {
        overview: extractOverview(cronJob),
        schedule: extractScheduleInfo(cronJob),
        jobHistory: extractJobHistory(cronJob, jobs),
        jobTemplate: extractJobTemplate(cronJob.spec?.jobTemplate),
        configuration: extractConfiguration(cronJob),
        labels: metadata.labels || {},
        annotations: metadata.annotations || {},
        events: transformEvents(events)
    };
}

/**
 * Extract overview information from CronJob.
 */
function extractOverview(cronJob: k8s.V1CronJob): CronJobOverview {
    const metadata = cronJob.metadata;
    const spec = cronJob.spec;
    
    const creationTimestamp = metadata?.creationTimestamp 
        ? new Date(metadata.creationTimestamp).toISOString()
        : 'Unknown';
    
    return {
        name: metadata?.name || 'Unknown',
        namespace: metadata?.namespace || 'default',
        suspended: spec?.suspend || false,
        creationTimestamp,
        age: calculateAge(creationTimestamp),
        uid: metadata?.uid || '',
        resourceVersion: metadata?.resourceVersion || ''
    };
}

/**
 * Extract schedule information from CronJob.
 */
function extractScheduleInfo(cronJob: k8s.V1CronJob): ScheduleInfo {
    const spec = cronJob.spec;
    const status = cronJob.status;
    
    const schedule = spec?.schedule || 'Unknown';
    const lastScheduleTime = status?.lastScheduleTime 
        ? new Date(status.lastScheduleTime).toISOString()
        : undefined;
    
    return {
        schedule,
        humanReadable: parseScheduleToHuman(schedule),
        timezone: spec?.timeZone,
        lastScheduleTime,
        lastScheduleRelative: lastScheduleTime ? formatRelativeTime(lastScheduleTime) : undefined,
        nextScheduleTime: calculateNextSchedule(schedule, lastScheduleTime),
        nextScheduleRelative: undefined // Will be calculated from nextScheduleTime
    };
}

/**
 * Parse cron schedule into human-readable format.
 */
function parseScheduleToHuman(schedule: string): string {
    if (!schedule || schedule === 'Unknown') {
        return 'Unknown schedule';
    }

    // Basic cron schedule parsing (minute hour day month weekday)
    const parts = schedule.split(' ');
    if (parts.length < 5) {
        return schedule; // Return as-is if not standard format
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // Handle common patterns
    if (schedule === '* * * * *') {
        return 'Every minute';
    }
    if (schedule.startsWith('*/')) {
        const interval = schedule.split(' ')[0].replace('*/', '');
        if (schedule === `*/${interval} * * * *`) {
            return `Every ${interval} minute${interval !== '1' ? 's' : ''}`;
        }
    }
    if (minute === '0' && hour === '*') {
        return 'Every hour';
    }
    if (minute === '0' && hour === '0') {
        return 'Daily at midnight';
    }
    if (minute === '0' && hour.includes('/')) {
        const interval = hour.replace('*/', '');
        return `Every ${interval} hours`;
    }
    if (dayOfWeek !== '*' && hour !== '*' && minute !== '*') {
        return `Weekly on ${dayOfWeek} at ${hour}:${minute.padStart(2, '0')}`;
    }
    if (dayOfMonth === '1' && hour === '0' && minute === '0') {
        return 'Monthly on the 1st at midnight';
    }

    return schedule; // Return original if no pattern matches
}

/**
 * Calculate next schedule time (approximate).
 */
function calculateNextSchedule(schedule: string, lastScheduleTime?: string): string | undefined {
    if (!lastScheduleTime) {
        return undefined;
    }

    // Simple calculation - for */N patterns
    const parts = schedule.split(' ');
    if (parts[0].startsWith('*/')) {
        const interval = parseInt(parts[0].replace('*/', ''), 10);
        if (!isNaN(interval)) {
            const last = new Date(lastScheduleTime);
            const next = new Date(last.getTime() + interval * 60 * 1000);
            return next.toISOString();
        }
    }

    // For other patterns, don't calculate (would require full cron parser)
    return undefined;
}

/**
 * Extract job history information.
 */
function extractJobHistory(cronJob: k8s.V1CronJob, jobs: k8s.V1Job[]): JobHistoryInfo {
    const status = cronJob.status;
    
    // Filter active jobs
    const activeJobs = jobs.filter(job => {
        const jobStatus = job.status;
        return jobStatus?.active && jobStatus.active > 0;
    });
    
    // Sort jobs by start time (most recent first)
    const sortedJobs = [...jobs].sort((a, b) => {
        const aStart = a.status?.startTime || a.metadata?.creationTimestamp;
        const bStart = b.status?.startTime || b.metadata?.creationTimestamp;
        const aStartStr = aStart ? (typeof aStart === 'string' ? aStart : aStart.toISOString()) : '';
        const bStartStr = bStart ? (typeof bStart === 'string' ? bStart : bStart.toISOString()) : '';
        return bStartStr.localeCompare(aStartStr);
    });
    
    // Find last successful and failed jobs
    let lastSuccessfulJob: LastJobInfo | undefined;
    let lastFailedJob: LastJobInfo | undefined;
    let successfulCount = 0;
    let failedCount = 0;
    
    for (const job of sortedJobs) {
        const jobStatus = job.status;
        const succeeded = jobStatus?.succeeded || 0;
        const failed = jobStatus?.failed || 0;
        
        if (succeeded > 0) {
            successfulCount++;
            if (!lastSuccessfulJob && jobStatus?.completionTime) {
                const completionTimeStr = typeof jobStatus.completionTime === 'string' 
                    ? jobStatus.completionTime 
                    : jobStatus.completionTime.toISOString();
                lastSuccessfulJob = {
                    name: job.metadata?.name || 'Unknown',
                    namespace: job.metadata?.namespace || 'default',
                    completionTime: new Date(completionTimeStr).toISOString(),
                    relativeTime: formatRelativeTime(completionTimeStr),
                    duration: calculateJobDuration(jobStatus.startTime, jobStatus.completionTime)
                };
            }
        }
        
        if (failed > 0) {
            failedCount++;
            if (!lastFailedJob && jobStatus?.completionTime) {
                const completionTimeStr = typeof jobStatus.completionTime === 'string' 
                    ? jobStatus.completionTime 
                    : jobStatus.completionTime.toISOString();
                lastFailedJob = {
                    name: job.metadata?.name || 'Unknown',
                    namespace: job.metadata?.namespace || 'default',
                    completionTime: new Date(completionTimeStr).toISOString(),
                    relativeTime: formatRelativeTime(completionTimeStr),
                    duration: calculateJobDuration(jobStatus.startTime, jobStatus.completionTime)
                };
            }
        }
    }
    
    return {
        activeJobs: activeJobs.map(job => transformActiveJob(job)),
        activeCount: status?.active?.length || 0,
        lastSuccessfulJob,
        lastFailedJob,
        successfulCompletions: successfulCount,
        failedCompletions: failedCount
    };
}

/**
 * Transform a V1Job into ActiveJobInfo.
 */
function transformActiveJob(job: k8s.V1Job): ActiveJobInfo {
    const metadata = job.metadata;
    const status = job.status;
    const startTime = status?.startTime || metadata?.creationTimestamp;
    const startTimeStr = startTime ? (typeof startTime === 'string' ? startTime : startTime.toISOString()) : '';
    
    return {
        name: metadata?.name || 'Unknown',
        namespace: metadata?.namespace || 'default',
        startTime: startTimeStr ? new Date(startTimeStr).toISOString() : 'Unknown',
        age: startTimeStr ? calculateAge(new Date(startTimeStr).toISOString()) : 'Unknown',
        status: 'Active',
        active: status?.active || 0,
        succeeded: status?.succeeded || 0,
        failed: status?.failed || 0
    };
}

/**
 * Calculate job duration.
 */
function calculateJobDuration(startTime?: Date | string, endTime?: Date | string): string | undefined {
    if (!startTime || !endTime) {
        return undefined;
    }
    
    const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
    const durationMs = end.getTime() - start.getTime();
    
    if (durationMs < 0) {
        return undefined;
    }
    
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
}

/**
 * Extract job template information.
 */
function extractJobTemplate(jobTemplate?: k8s.V1JobTemplateSpec): JobTemplateInfo {
    const spec = jobTemplate?.spec;
    const podSpec = spec?.template?.spec;
    
    if (!podSpec) {
        return {
            containers: [],
            initContainers: [],
            restartPolicy: 'Never',
            volumes: []
        };
    }
    
    return {
        containers: (podSpec.containers || []).map(transformContainer),
        initContainers: (podSpec.initContainers || []).map(transformContainer),
        restartPolicy: podSpec.restartPolicy || 'Never',
        serviceAccountName: podSpec.serviceAccountName,
        volumes: (podSpec.volumes || []).map(transformVolume)
    };
}

/**
 * Transform a V1Container into JobContainerInfo.
 */
function transformContainer(container: k8s.V1Container): JobContainerInfo {
    return {
        name: container.name,
        image: container.image || 'Unknown',
        imagePullPolicy: container.imagePullPolicy || 'IfNotPresent',
        command: container.command,
        args: container.args,
        env: (container.env || []).map(transformEnvVar),
        resources: transformResources(container.resources),
        volumeMounts: (container.volumeMounts || []).map(transformVolumeMount),
        ports: (container.ports || []).map(transformContainerPort)
    };
}

/**
 * Transform environment variable.
 */
function transformEnvVar(envVar: k8s.V1EnvVar): EnvVarInfo {
    const result: EnvVarInfo = {
        name: envVar.name
    };
    
    if (envVar.value) {
        result.value = envVar.value;
    }
    
    if (envVar.valueFrom) {
        if (envVar.valueFrom.configMapKeyRef) {
            result.valueFrom = {
                type: 'configMap',
                name: envVar.valueFrom.configMapKeyRef.name,
                key: envVar.valueFrom.configMapKeyRef.key
            };
        } else if (envVar.valueFrom.secretKeyRef) {
            result.valueFrom = {
                type: 'secret',
                name: envVar.valueFrom.secretKeyRef.name,
                key: envVar.valueFrom.secretKeyRef.key
            };
        } else if (envVar.valueFrom.fieldRef) {
            result.valueFrom = {
                type: 'field',
                key: envVar.valueFrom.fieldRef.fieldPath
            };
        } else if (envVar.valueFrom.resourceFieldRef) {
            result.valueFrom = {
                type: 'resource',
                key: envVar.valueFrom.resourceFieldRef.resource
            };
        }
    }
    
    return result;
}

/**
 * Transform resource requirements.
 */
function transformResources(resources?: k8s.V1ResourceRequirements): ResourceRequirements {
    return {
        requests: {
            cpu: resources?.requests?.cpu,
            memory: resources?.requests?.memory
        },
        limits: {
            cpu: resources?.limits?.cpu,
            memory: resources?.limits?.memory
        }
    };
}

/**
 * Transform volume mount.
 */
function transformVolumeMount(mount: k8s.V1VolumeMount): VolumeMountInfo {
    return {
        name: mount.name,
        mountPath: mount.mountPath,
        readOnly: mount.readOnly || false,
        subPath: mount.subPath
    };
}

/**
 * Transform container port.
 */
function transformContainerPort(port: k8s.V1ContainerPort): ContainerPortInfo {
    return {
        containerPort: port.containerPort,
        protocol: port.protocol || 'TCP',
        name: port.name
    };
}

/**
 * Transform volume.
 */
function transformVolume(volume: k8s.V1Volume): VolumeInfo {
    let type = 'Unknown';
    let source: string | undefined;
    
    if (volume.configMap) {
        type = 'ConfigMap';
        source = volume.configMap.name;
    } else if (volume.secret) {
        type = 'Secret';
        source = volume.secret.secretName;
    } else if (volume.emptyDir) {
        type = 'EmptyDir';
    } else if (volume.persistentVolumeClaim) {
        type = 'PersistentVolumeClaim';
        source = volume.persistentVolumeClaim.claimName;
    } else if (volume.hostPath) {
        type = 'HostPath';
        source = volume.hostPath.path;
    }
    
    return {
        name: volume.name,
        type,
        source
    };
}

/**
 * Extract configuration settings.
 */
function extractConfiguration(cronJob: k8s.V1CronJob): CronJobConfiguration {
    const spec = cronJob.spec;
    const jobSpec = spec?.jobTemplate?.spec;
    
    return {
        concurrencyPolicy: spec?.concurrencyPolicy || 'Allow',
        startingDeadlineSeconds: spec?.startingDeadlineSeconds,
        successfulJobsHistoryLimit: spec?.successfulJobsHistoryLimit ?? 3,
        failedJobsHistoryLimit: spec?.failedJobsHistoryLimit ?? 1,
        completions: jobSpec?.completions,
        parallelism: jobSpec?.parallelism,
        backoffLimit: jobSpec?.backoffLimit
    };
}

/**
 * Transform Kubernetes events into CronJobEvent format.
 */
function transformEvents(events: k8s.CoreV1Event[]): CronJobEvent[] {
    return events.map(event => {
        const timestamp = event.lastTimestamp || event.firstTimestamp || new Date().toISOString();
        const timestampStr = typeof timestamp === 'string' ? timestamp : timestamp.toISOString();
        
        return {
            type: event.type || 'Normal',
            reason: event.reason || 'Unknown',
            message: event.message || '',
            timestamp: new Date(timestampStr).toISOString(),
            relativeTime: formatRelativeTime(timestampStr),
            source: event.source?.component || 'Unknown',
            count: event.count || 1
        };
    });
}
