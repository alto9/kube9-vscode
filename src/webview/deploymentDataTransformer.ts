/**
 * Transformer module for converting Kubernetes V1Deployment, V1ReplicaSet[], and Events[]
 * into DeploymentDescribeData structure for webview display.
 */

import * as k8s from '@kubernetes/client-node';
import { parseKubernetesQuantity } from '../utils/kubernetesQuantity';
import { formatRelativeTime } from '../utils/timeFormatting';
import { calculateAge, parseIntOrPercent, extractImageTag } from '../utils/deploymentUtils';

/**
 * Complete deployment information structure for webview display.
 */
export interface DeploymentDescribeData {
    name: string;
    namespace: string;
    overview: DeploymentOverview;
    replicaStatus: ReplicaStatus;
    strategy: DeploymentStrategy;
    podTemplate: PodTemplateInfo;
    conditions: DeploymentCondition[];
    replicaSets: ReplicaSetInfo[];
    labels: Record<string, string>;
    selectors: Record<string, string>;
    annotations: Record<string, string>;
    events: DeploymentEvent[];
}

/**
 * Basic deployment metadata and status.
 */
export interface DeploymentOverview {
    name: string;
    namespace: string;
    status: 'Available' | 'Progressing' | 'Failed' | 'Unknown';
    statusMessage: string;
    creationTimestamp: string;
    age: string;
    generation: number;
    observedGeneration: number;
    paused: boolean;
}

/**
 * Deployment replica counts and status.
 */
export interface ReplicaStatus {
    desired: number;
    current: number;
    ready: number;
    available: number;
    unavailable: number;
    upToDate: number;
    readyPercentage: number;
    availablePercentage: number;
    isHealthy: boolean;
}

/**
 * Deployment rollout strategy configuration.
 */
export interface DeploymentStrategy {
    type: 'RollingUpdate' | 'Recreate';
    maxSurge: string;
    maxSurgeValue: number;
    maxUnavailable: string;
    maxUnavailableValue: number;
    revisionHistoryLimit: number;
    progressDeadlineSeconds: number;
    minReadySeconds: number;
}

/**
 * Pod template specification details.
 */
export interface PodTemplateInfo {
    containers: ContainerInfo[];
    initContainers: ContainerInfo[];
    volumes: VolumeInfo[];
    restartPolicy: string;
    serviceAccount: string;
    securityContext: PodSecurityContextInfo;
}

/**
 * Container information.
 */
export interface ContainerInfo {
    name: string;
    image: string;
    imageTag: string;
    ports: ContainerPort[];
    env: EnvVarSummary;
    volumeMounts: VolumeMountSummary;
    resources: ContainerResources;
    livenessProbe: ProbeInfo | null;
    readinessProbe: ProbeInfo | null;
    startupProbe: ProbeInfo | null;
    imagePullPolicy: string;
}

/**
 * Container port information.
 */
export interface ContainerPort {
    name: string;
    containerPort: number;
    protocol: string;
}

/**
 * Environment variable summary.
 */
export interface EnvVarSummary {
    count: number;
    hasSecrets: boolean;
    hasConfigMaps: boolean;
}

/**
 * Volume mount summary.
 */
export interface VolumeMountSummary {
    count: number;
    paths: string[];
}

/**
 * Container resource requests and limits.
 */
export interface ContainerResources {
    requests: ResourceValues;
    limits: ResourceValues;
    hasRequests: boolean;
    hasLimits: boolean;
}

/**
 * Resource values (CPU and memory).
 */
export interface ResourceValues {
    cpu: string;
    cpuMillicores: number;
    memory: string;
    memoryBytes: number;
}

/**
 * Probe configuration information.
 */
export interface ProbeInfo {
    type: 'http' | 'tcp' | 'exec' | 'grpc';
    initialDelaySeconds: number;
    periodSeconds: number;
    timeoutSeconds: number;
    successThreshold: number;
    failureThreshold: number;
    details: string;
}

/**
 * Volume information.
 */
export interface VolumeInfo {
    name: string;
    type: string;
    source: string;
}

/**
 * Pod security context information.
 */
export interface PodSecurityContextInfo {
    runAsUser: number | null;
    runAsGroup: number | null;
    fsGroup: number | null;
    runAsNonRoot: boolean | null;
}

/**
 * Deployment status conditions.
 */
export interface DeploymentCondition {
    type: 'Available' | 'Progressing' | 'ReplicaFailure';
    status: 'True' | 'False' | 'Unknown';
    reason: string;
    message: string;
    lastUpdateTime: string;
    lastTransitionTime: string;
    relativeTime: string;
    severity: 'success' | 'warning' | 'error' | 'info';
}

/**
 * Information about related ReplicaSets.
 */
export interface ReplicaSetInfo {
    name: string;
    namespace: string;
    revision: number;
    desired: number;
    current: number;
    ready: number;
    available: number;
    creationTimestamp: string;
    age: string;
    isCurrent: boolean;
    images: string[];
}

/**
 * Recent Kubernetes events for the deployment.
 */
export interface DeploymentEvent {
    type: 'Normal' | 'Warning';
    reason: string;
    message: string;
    count: number;
    firstTimestamp: string;
    lastTimestamp: string;
    source: string;
    relativeTime: string;
}

/**
 * Transforms raw Kubernetes V1Deployment, V1ReplicaSet[], and Events[] data into DeploymentDescribeData structure.
 * 
 * @param deployment - The Kubernetes V1Deployment object
 * @param replicaSets - Array of V1ReplicaSet objects owned by the deployment
 * @param events - Array of CoreV1Event objects related to the deployment
 * @returns Complete DeploymentDescribeData object ready for webview display
 */
export function transformDeploymentData(
    deployment: k8s.V1Deployment,
    replicaSets: k8s.V1ReplicaSet[],
    events: k8s.CoreV1Event[]
): DeploymentDescribeData {
    const metadata = deployment.metadata;
    const spec = deployment.spec;
    
    return {
        name: metadata?.name || 'Unknown',
        namespace: metadata?.namespace || 'default',
        overview: extractOverview(deployment),
        replicaStatus: extractReplicaStatus(deployment),
        strategy: extractStrategy(deployment),
        podTemplate: extractPodTemplate(deployment),
        conditions: extractConditions(deployment),
        replicaSets: transformReplicaSets(replicaSets, deployment),
        labels: metadata?.labels || {},
        selectors: spec?.selector?.matchLabels || {},
        annotations: metadata?.annotations || {},
        events: transformEvents(events)
    };
}

/**
 * Extracts deployment overview information from V1Deployment.
 */
function extractOverview(deployment: k8s.V1Deployment): DeploymentOverview {
    const metadata = deployment.metadata;
    const spec = deployment.spec;
    const status = deployment.status;
    const conditions = status?.conditions || [];
    
    const availableCondition = conditions.find(c => c.type === 'Available');
    const progressingCondition = conditions.find(c => c.type === 'Progressing');
    const failureCondition = conditions.find(c => c.type === 'ReplicaFailure');
    
    let statusValue: 'Available' | 'Progressing' | 'Failed' | 'Unknown' = 'Unknown';
    let statusMessage = '';
    
    if (failureCondition?.status === 'True') {
        statusValue = 'Failed';
        statusMessage = failureCondition.message || '';
    } else if (availableCondition?.status === 'True') {
        statusValue = 'Available';
        statusMessage = availableCondition.message || 'Deployment is available';
    } else if (progressingCondition?.status === 'True') {
        statusValue = 'Progressing';
        statusMessage = progressingCondition.message || '';
    }
    
    // Convert creationTimestamp to string if it's a Date
    let creationTimestamp = '';
    if (metadata?.creationTimestamp) {
        creationTimestamp = typeof metadata.creationTimestamp === 'string'
            ? metadata.creationTimestamp
            : metadata.creationTimestamp.toISOString();
    }
    
    return {
        name: metadata?.name || 'Unknown',
        namespace: metadata?.namespace || 'default',
        status: statusValue,
        statusMessage,
        creationTimestamp,
        age: creationTimestamp ? calculateAge(creationTimestamp) : '',
        generation: metadata?.generation || 0,
        observedGeneration: status?.observedGeneration || 0,
        paused: spec?.paused || false
    };
}

/**
 * Extracts and calculates deployment replica status.
 */
function extractReplicaStatus(deployment: k8s.V1Deployment): ReplicaStatus {
    const spec = deployment.spec;
    const status = deployment.status;
    
    const desired = spec?.replicas || 0;
    const current = status?.replicas || 0;
    const ready = status?.readyReplicas || 0;
    const available = status?.availableReplicas || 0;
    const upToDate = status?.updatedReplicas || 0;
    const unavailable = Math.max(0, desired - available);
    
    return {
        desired,
        current,
        ready,
        available,
        unavailable,
        upToDate,
        readyPercentage: desired > 0 ? (ready / desired) * 100 : 0,
        availablePercentage: desired > 0 ? (available / desired) * 100 : 0,
        isHealthy: ready === desired && available === desired && desired > 0
    };
}

/**
 * Extracts deployment strategy configuration.
 */
function extractStrategy(deployment: k8s.V1Deployment): DeploymentStrategy {
    const spec = deployment.spec;
    const strategy = spec?.strategy || { type: 'RollingUpdate' };
    
    if (strategy.type === 'Recreate') {
        return {
            type: 'Recreate',
            maxSurge: 'N/A',
            maxSurgeValue: 0,
            maxUnavailable: 'N/A',
            maxUnavailableValue: 0,
            revisionHistoryLimit: spec?.revisionHistoryLimit || 10,
            progressDeadlineSeconds: spec?.progressDeadlineSeconds || 600,
            minReadySeconds: spec?.minReadySeconds || 0
        };
    }
    
    const rollingUpdate = strategy.rollingUpdate || {};
    const replicas = spec?.replicas || 1;
    
    const maxSurge = rollingUpdate.maxSurge?.toString() || '25%';
    const maxUnavailable = rollingUpdate.maxUnavailable?.toString() || '25%';
    
    return {
        type: 'RollingUpdate',
        maxSurge,
        maxSurgeValue: parseIntOrPercent(rollingUpdate.maxSurge, replicas),
        maxUnavailable,
        maxUnavailableValue: parseIntOrPercent(rollingUpdate.maxUnavailable, replicas),
        revisionHistoryLimit: spec?.revisionHistoryLimit || 10,
        progressDeadlineSeconds: spec?.progressDeadlineSeconds || 600,
        minReadySeconds: spec?.minReadySeconds || 0
    };
}

/**
 * Extracts pod template information.
 */
function extractPodTemplate(deployment: k8s.V1Deployment): PodTemplateInfo {
    const podSpec = deployment.spec?.template?.spec;
    if (!podSpec) {
        return {
            containers: [],
            initContainers: [],
            volumes: [],
            restartPolicy: 'Always',
            serviceAccount: 'default',
            securityContext: {
                runAsUser: null,
                runAsGroup: null,
                fsGroup: null,
                runAsNonRoot: null
            }
        };
    }
    
    return {
        containers: (podSpec.containers || []).map(extractContainerInfo),
        initContainers: (podSpec.initContainers || []).map(extractContainerInfo),
        volumes: (podSpec.volumes || []).map(extractVolumeInfo),
        restartPolicy: podSpec.restartPolicy || 'Always',
        serviceAccount: podSpec.serviceAccountName || 'default',
        securityContext: extractPodSecurityContext(podSpec.securityContext)
    };
}

/**
 * Extracts container information from V1Container.
 */
function extractContainerInfo(container: k8s.V1Container): ContainerInfo {
    const imageTagResult = extractImageTag(container.image || '');
    
    return {
        name: container.name || '',
        image: container.image || '',
        imageTag: imageTagResult.tag,
        ports: (container.ports || []).map(p => ({
            name: p.name || '',
            containerPort: p.containerPort || 0,
            protocol: p.protocol || 'TCP'
        })),
        env: {
            count: (container.env || []).length,
            hasSecrets: (container.env || []).some(e => e.valueFrom?.secretKeyRef !== undefined),
            hasConfigMaps: (container.env || []).some(e => e.valueFrom?.configMapKeyRef !== undefined)
        },
        volumeMounts: {
            count: (container.volumeMounts || []).length,
            paths: (container.volumeMounts || []).map(vm => vm.mountPath || '')
        },
        resources: extractContainerResources(container.resources),
        livenessProbe: extractProbeInfo(container.livenessProbe),
        readinessProbe: extractProbeInfo(container.readinessProbe),
        startupProbe: extractProbeInfo(container.startupProbe),
        imagePullPolicy: container.imagePullPolicy || 'IfNotPresent'
    };
}

/**
 * Extracts container resource requests and limits.
 */
function extractContainerResources(resources?: k8s.V1ResourceRequirements): ContainerResources {
    if (!resources) {
        return {
            requests: {
                cpu: '0',
                cpuMillicores: 0,
                memory: '0',
                memoryBytes: 0
            },
            limits: {
                cpu: '0',
                cpuMillicores: 0,
                memory: '0',
                memoryBytes: 0
            },
            hasRequests: false,
            hasLimits: false
        };
    }
    
    const requests = resources.requests || {};
    const limits = resources.limits || {};
    
    const cpuRequest = requests.cpu || '0';
    const memoryRequest = requests.memory || '0';
    const cpuLimit = limits.cpu || '0';
    const memoryLimit = limits.memory || '0';
    
    // Parse CPU to millicores
    const cpuRequestCores = parseKubernetesQuantity(cpuRequest, 'cores');
    const cpuLimitCores = parseKubernetesQuantity(cpuLimit, 'cores');
    const cpuRequestMillicores = Math.round(cpuRequestCores * 1000);
    const cpuLimitMillicores = Math.round(cpuLimitCores * 1000);
    
    // Format CPU for display (millicores if < 1 core, otherwise cores)
    const cpuRequestFormatted = cpuRequestCores > 0
        ? (cpuRequestCores < 1 ? `${cpuRequestMillicores}m` : String(cpuRequestCores))
        : '0';
    const cpuLimitFormatted = cpuLimitCores > 0
        ? (cpuLimitCores < 1 ? `${cpuLimitMillicores}m` : String(cpuLimitCores))
        : '0';
    
    // Parse memory to bytes
    const memoryRequestBytes = parseKubernetesQuantity(memoryRequest, 'bytes');
    const memoryLimitBytes = parseKubernetesQuantity(memoryLimit, 'bytes');
    
    // Format memory for display (Mi/Gi)
    const memoryRequestFormatted = memoryRequestBytes > 0
        ? formatBytesQuantity(memoryRequestBytes)
        : '0';
    const memoryLimitFormatted = memoryLimitBytes > 0
        ? formatBytesQuantity(memoryLimitBytes)
        : '0';
    
    return {
        requests: {
            cpu: cpuRequestFormatted,
            cpuMillicores: cpuRequestMillicores,
            memory: memoryRequestFormatted,
            memoryBytes: memoryRequestBytes
        },
        limits: {
            cpu: cpuLimitFormatted,
            cpuMillicores: cpuLimitMillicores,
            memory: memoryLimitFormatted,
            memoryBytes: memoryLimitBytes
        },
        hasRequests: cpuRequest !== '0' || memoryRequest !== '0',
        hasLimits: cpuLimit !== '0' || memoryLimit !== '0'
    };
}

/**
 * Formats bytes quantity back to Kubernetes format (e.g., "8Mi", "1Gi").
 */
function formatBytesQuantity(bytes: number): string {
    const units = ['', 'Ki', 'Mi', 'Gi', 'Ti', 'Pi', 'Ei'];
    let unitIndex = 0;
    let size = bytes;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    // Round to avoid floating point issues
    const rounded = Math.round(size * 100) / 100;
    return `${rounded}${units[unitIndex]}`;
}

/**
 * Extracts probe information from V1Probe.
 */
function extractProbeInfo(probe?: k8s.V1Probe): ProbeInfo | null {
    if (!probe) {
        return null;
    }
    
    let probeType: 'http' | 'tcp' | 'exec' | 'grpc' = 'exec';
    let details = '';
    
    if (probe.httpGet) {
        probeType = 'http';
        const httpGet = probe.httpGet;
        const path = httpGet.path || '/';
        const port = httpGet.port || 80;
        const scheme = httpGet.scheme || 'HTTP';
        details = `${scheme} GET ${path} on port ${port}`;
    } else if (probe.tcpSocket) {
        probeType = 'tcp';
        const tcpSocket = probe.tcpSocket;
        const port = tcpSocket.port || 80;
        details = `TCP socket on port ${port}`;
    } else if (probe.grpc) {
        probeType = 'grpc';
        const grpc = probe.grpc;
        const port = grpc.port || 80;
        const service = grpc.service || '';
        details = `gRPC on port ${port}${service ? ` service ${service}` : ''}`;
    } else if (probe.exec) {
        probeType = 'exec';
        const command = probe.exec.command || [];
        details = `Exec: ${command.join(' ')}`;
    }
    
    return {
        type: probeType,
        initialDelaySeconds: probe.initialDelaySeconds || 0,
        periodSeconds: probe.periodSeconds || 10,
        timeoutSeconds: probe.timeoutSeconds || 1,
        successThreshold: probe.successThreshold || 1,
        failureThreshold: probe.failureThreshold || 3,
        details
    };
}

/**
 * Extracts volume information from V1Volume.
 */
function extractVolumeInfo(volume: k8s.V1Volume): VolumeInfo {
    let volumeType = 'Unknown';
    let source = '';
    
    if (volume.configMap) {
        volumeType = 'ConfigMap';
        source = volume.configMap.name || '';
    } else if (volume.secret) {
        volumeType = 'Secret';
        source = volume.secret.secretName || '';
    } else if (volume.emptyDir) {
        volumeType = 'EmptyDir';
        source = '';
    } else if (volume.persistentVolumeClaim) {
        volumeType = 'PersistentVolumeClaim';
        source = volume.persistentVolumeClaim.claimName || '';
    } else if (volume.hostPath) {
        volumeType = 'HostPath';
        source = volume.hostPath.path || '';
    } else if (volume.awsElasticBlockStore) {
        volumeType = 'AWSElasticBlockStore';
        source = volume.awsElasticBlockStore.volumeID || '';
    } else if (volume.azureDisk) {
        volumeType = 'AzureDisk';
        source = volume.azureDisk.diskName || '';
    } else if (volume.gcePersistentDisk) {
        volumeType = 'GCEPersistentDisk';
        source = volume.gcePersistentDisk.pdName || '';
    } else if (volume.nfs) {
        volumeType = 'NFS';
        source = volume.nfs.server || '';
    } else if (volume.csi) {
        volumeType = 'CSI';
        source = volume.csi.driver || '';
    }
    
    return {
        name: volume.name || '',
        type: volumeType,
        source
    };
}

/**
 * Extracts pod security context information.
 */
function extractPodSecurityContext(securityContext?: k8s.V1PodSecurityContext): PodSecurityContextInfo {
    if (!securityContext) {
        return {
            runAsUser: null,
            runAsGroup: null,
            fsGroup: null,
            runAsNonRoot: null
        };
    }
    
    return {
        runAsUser: securityContext.runAsUser || null,
        runAsGroup: securityContext.runAsGroup || null,
        fsGroup: securityContext.fsGroup || null,
        runAsNonRoot: securityContext.runAsNonRoot || null
    };
}

/**
 * Extracts deployment conditions with relative time formatting.
 */
function extractConditions(deployment: k8s.V1Deployment): DeploymentCondition[] {
    const conditions = deployment.status?.conditions || [];
    
    return conditions
        .filter(c => {
            const validTypes: string[] = ['Available', 'Progressing', 'ReplicaFailure'];
            return validTypes.includes(c.type || '');
        })
        .map(c => {
            // Convert timestamps to string if they're Date objects
            let lastUpdateTime = '';
            let lastTransitionTime = '';
            
            if (c.lastUpdateTime) {
                lastUpdateTime = typeof c.lastUpdateTime === 'string'
                    ? c.lastUpdateTime
                    : c.lastUpdateTime.toISOString();
            }
            
            if (c.lastTransitionTime) {
                lastTransitionTime = typeof c.lastTransitionTime === 'string'
                    ? c.lastTransitionTime
                    : c.lastTransitionTime.toISOString();
            }
            
            // Determine severity based on condition type and status
            let severity: 'success' | 'warning' | 'error' | 'info' = 'info';
            if (c.type === 'ReplicaFailure' && c.status === 'True') {
                severity = 'error';
            } else if (c.type === 'Available' && c.status === 'True') {
                severity = 'success';
            } else if (c.type === 'Progressing' && c.status === 'True') {
                severity = 'warning';
            }
            
            return {
                type: c.type as DeploymentCondition['type'],
                status: (c.status || 'Unknown') as DeploymentCondition['status'],
                reason: c.reason || '',
                message: c.message || '',
                lastUpdateTime,
                lastTransitionTime,
                relativeTime: lastTransitionTime ? formatRelativeTime(lastTransitionTime) : '',
                severity
            };
        });
}

/**
 * Transforms ReplicaSets into ReplicaSetInfo array, sorted by revision.
 */
function transformReplicaSets(
    replicaSets: k8s.V1ReplicaSet[],
    deployment: k8s.V1Deployment
): ReplicaSetInfo[] {
    const currentReplicas = deployment.status?.updatedReplicas || 0;
    
    // Map and sort by revision (newest first)
    const sorted = replicaSets
        .map(rs => {
            const metadata = rs.metadata;
            const spec = rs.spec;
            const status = rs.status;
            
            // Extract revision from annotation
            const revisionStr = metadata?.annotations?.['deployment.kubernetes.io/revision'] || '0';
            const revision = parseInt(revisionStr, 10) || 0;
            
            // Convert creationTimestamp to string if it's a Date
            let creationTimestamp = '';
            if (metadata?.creationTimestamp) {
                creationTimestamp = typeof metadata.creationTimestamp === 'string'
                    ? metadata.creationTimestamp
                    : metadata.creationTimestamp.toISOString();
            }
            
            // Determine if this is the current ReplicaSet
            // Current RS is the one with replicas > 0 and matches the deployment's updatedReplicas
            const isCurrent = (spec?.replicas || 0) > 0 && 
                             (status?.replicas || 0) === currentReplicas &&
                             currentReplicas > 0;
            
            // Extract images from pod template
            const images = (spec?.template?.spec?.containers || []).map((c: k8s.V1Container) => c.image || '');
            
            return {
                name: metadata?.name || 'Unknown',
                namespace: metadata?.namespace || 'default',
                revision,
                desired: spec?.replicas || 0,
                current: status?.replicas || 0,
                ready: status?.readyReplicas || 0,
                available: status?.availableReplicas || 0,
                creationTimestamp,
                age: creationTimestamp ? calculateAge(creationTimestamp) : '',
                isCurrent,
                images
            };
        })
        .sort((a, b) => b.revision - a.revision);
    
    return sorted;
}

/**
 * Transforms events into DeploymentEvent array, filtering to last hour and grouping by reason.
 */
function transformEvents(events: k8s.CoreV1Event[]): DeploymentEvent[] {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Filter events to last hour
    const recentEvents = events.filter(event => {
        if (!event.firstTimestamp && !event.eventTime) {
            return false;
        }
        
        const timestamp = event.firstTimestamp || event.eventTime;
        if (!timestamp) {
            return false;
        }
        
        const eventTime = typeof timestamp === 'string'
            ? new Date(timestamp).getTime()
            : timestamp.getTime();
        
        return eventTime >= oneHourAgo;
    });
    
    // Group events by reason
    const groupedEvents = new Map<string, k8s.CoreV1Event[]>();
    
    for (const event of recentEvents) {
        const reason = event.reason || 'Unknown';
        if (!groupedEvents.has(reason)) {
            groupedEvents.set(reason, []);
        }
        groupedEvents.get(reason)!.push(event);
    }
    
    // Transform grouped events
    return Array.from(groupedEvents.entries()).map(([reason, eventGroup]) => {
        // Use the first event for most fields, but aggregate count
        const firstEvent = eventGroup[0];
        
        // Find earliest firstTimestamp and latest lastTimestamp
        let firstTimestamp = '';
        let lastTimestamp = '';
        
        for (const event of eventGroup) {
            const ft = event.firstTimestamp || event.eventTime;
            const lt = event.lastTimestamp || event.firstTimestamp || event.eventTime;
            
            if (ft) {
                const ftStr = typeof ft === 'string' ? ft : ft.toISOString();
                if (!firstTimestamp || ftStr < firstTimestamp) {
                    firstTimestamp = ftStr;
                }
            }
            
            if (lt) {
                const ltStr = typeof lt === 'string' ? lt : lt.toISOString();
                if (!lastTimestamp || ltStr > lastTimestamp) {
                    lastTimestamp = ltStr;
                }
            }
        }
        
        // Use firstTimestamp if lastTimestamp not found
        if (!lastTimestamp && firstTimestamp) {
            lastTimestamp = firstTimestamp;
        }
        
        return {
            type: (firstEvent.type || 'Normal') as 'Normal' | 'Warning',
            reason,
            message: firstEvent.message || '',
            count: eventGroup.length,
            firstTimestamp,
            lastTimestamp,
            source: firstEvent.source?.component || '',
            relativeTime: lastTimestamp ? formatRelativeTime(lastTimestamp) : ''
        };
    });
}

