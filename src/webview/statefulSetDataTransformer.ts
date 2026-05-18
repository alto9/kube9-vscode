/**
 * Transforms Kubernetes StatefulSet, Pods, PVCs, and Events into a webview-ready shape.
 */

import * as k8s from '@kubernetes/client-node';
import { calculateAge } from '../utils/deploymentUtils';
import { formatRelativeTime } from '../utils/timeFormatting';
import {
    DeploymentEvent,
    extractPodTemplateInfoFromPodSpec,
    PodTemplateInfo,
    transformKubernetesEvents
} from './deploymentDataTransformer';

/** High-level rollout / revision summary for a StatefulSet. */
export interface StatefulSetRolloutInfo {
    currentRevision: string;
    updateRevision: string;
    collisionCount: number;
    paused: boolean;
    partition: number | null;
}

/** One row per desired ordinal (0 … replicas-1). */
export interface StatefulSetOrdinalPodRow {
    ordinal: number;
    expectedPodName: string;
    podPresent: boolean;
    phase: string;
    readyDisplay: string;
    restartCount: number;
    nodeName: string;
    statusDetail: string;
    age: string;
}

/** Declared volume claim template (from spec). */
export interface VolumeClaimTemplateSummary {
    name: string;
    accessModes: string[];
    storageRequest: string;
    storageClassName: string;
}

/** PVC resolved for one ordinal × one template. */
export interface OrdinalPvcRow {
    ordinal: number;
    templateName: string;
    pvcName: string;
    found: boolean;
    phase: string;
    capacity: string;
    storageClassName: string;
}

export interface StatefulSetOverview {
    name: string;
    namespace: string;
    creationTimestamp: string;
    age: string;
    generation: number;
    observedGeneration: number;
    /** Desired replicas */
    replicas: number;
    currentReplicas: number;
    readyReplicas: number;
    updatedReplicas: number;
    serviceName: string;
    updateStrategyType: string;
    podManagementPolicy: string;
    selectorDisplay: string;
    /** Human-readable rollout health */
    rolloutSummary: string;
}

export interface StatefulSetReplicaStatus {
    desired: number;
    current: number;
    ready: number;
    updated: number;
    readyPercentage: number;
    isHealthy: boolean;
}

export interface StatefulSetConditionRow {
    type: string;
    status: string;
    reason: string;
    message: string;
    relativeTime: string;
    severity: 'success' | 'warning' | 'error' | 'info';
}

export interface StatefulSetDescribeData {
    name: string;
    namespace: string;
    overview: StatefulSetOverview;
    replicaStatus: StatefulSetReplicaStatus;
    rollout: StatefulSetRolloutInfo;
    ordinalPods: StatefulSetOrdinalPodRow[];
    volumeClaimTemplates: VolumeClaimTemplateSummary[];
    ordinalPvcs: OrdinalPvcRow[];
    conditions: StatefulSetConditionRow[];
    podTemplate: PodTemplateInfo;
    labels: Record<string, string>;
    selectors: Record<string, string>;
    annotations: Record<string, string>;
    events: DeploymentEvent[];
    /** Non-fatal fetch problems (RBAC, transient API), shown as page warnings */
    dataLoadErrors?: {
        pods?: string;
        pvcs?: string;
        events?: string;
    };
}

function extractOrdinalFromPodName(statefulSetName: string, podName: string): number | null {
    const prefix = `${statefulSetName}-`;
    if (!podName.startsWith(prefix)) {
        return null;
    }
    const suffix = podName.slice(prefix.length);
    const n = parseInt(suffix, 10);
    return Number.isFinite(n) && String(n) === suffix ? n : null;
}

function podReadyDisplay(pod: k8s.V1Pod): string {
    const conditions = pod.status?.conditions || [];
    const readyCond = conditions.find(c => c.type === 'Ready');
    if (readyCond?.status === 'True') {
        return 'Ready';
    }
    if (readyCond?.status === 'False') {
        return `NotReady (${readyCond.reason || 'False'})`;
    }
    return readyCond?.status || pod.status?.phase || 'Unknown';
}

function podRestarts(pod: k8s.V1Pod): number {
    let total = 0;
    for (const cs of pod.status?.containerStatuses || []) {
        total += cs.restartCount || 0;
    }
    for (const cs of pod.status?.initContainerStatuses || []) {
        total += cs.restartCount || 0;
    }
    return total;
}

function podAge(pod: k8s.V1Pod): string {
    const ts = pod.metadata?.creationTimestamp;
    if (!ts) {
        return '';
    }
    const creationTimestamp = typeof ts === 'string' ? ts : ts.toISOString();
    return calculateAge(creationTimestamp);
}

function extractOverview(
    statefulSet: k8s.V1StatefulSet,
    replicaStatus: StatefulSetReplicaStatus
): StatefulSetOverview {
    const metadata = statefulSet.metadata;
    const spec = statefulSet.spec;
    const status = statefulSet.status;

    let creationTimestamp = '';
    if (metadata?.creationTimestamp) {
        creationTimestamp =
            typeof metadata.creationTimestamp === 'string'
                ? metadata.creationTimestamp
                : metadata.creationTimestamp.toISOString();
    }

    const matchLabels = spec?.selector?.matchLabels || {};
    const selectorDisplay = Object.entries(matchLabels)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');

    let rolloutSummary = 'Unknown';
    const conds = status?.conditions || [];
    const readyCond = conds.find(c => c.type === 'Ready');
    if (readyCond?.status === 'True') {
        rolloutSummary = 'Ready';
    } else if (readyCond?.status === 'False') {
        rolloutSummary = readyCond.message || readyCond.reason || 'Not ready';
    } else if (replicaStatus.desired > 0 && replicaStatus.ready === replicaStatus.desired) {
        rolloutSummary = 'Replicas ready';
    } else if (replicaStatus.desired > 0) {
        rolloutSummary = `Waiting for pods (${replicaStatus.ready}/${replicaStatus.desired} ready)`;
    }

    const st = spec?.updateStrategy;
    const updateStrategyType = st?.type || 'RollingUpdate';

    return {
        name: metadata?.name || 'Unknown',
        namespace: metadata?.namespace || 'default',
        creationTimestamp,
        age: creationTimestamp ? calculateAge(creationTimestamp) : '',
        generation: metadata?.generation || 0,
        observedGeneration: status?.observedGeneration || 0,
        replicas: spec?.replicas ?? 0,
        currentReplicas: status?.currentReplicas ?? 0,
        readyReplicas: status?.readyReplicas ?? 0,
        updatedReplicas: status?.updatedReplicas ?? 0,
        serviceName: spec?.serviceName || '',
        updateStrategyType,
        podManagementPolicy: spec?.podManagementPolicy || 'OrderedReady',
        selectorDisplay,
        rolloutSummary
    };
}

function extractReplicaStatus(statefulSet: k8s.V1StatefulSet): StatefulSetReplicaStatus {
    const spec = statefulSet.spec;
    const status = statefulSet.status;
    const desired = spec?.replicas ?? 0;
    const current = status?.currentReplicas ?? 0;
    const ready = status?.readyReplicas ?? 0;
    const updated = status?.updatedReplicas ?? 0;
    return {
        desired,
        current,
        ready,
        updated,
        readyPercentage: desired > 0 ? (ready / desired) * 100 : 0,
        isHealthy: desired > 0 && ready === desired && current === desired
    };
}

function extractRollout(statefulSet: k8s.V1StatefulSet): StatefulSetRolloutInfo {
    const status = statefulSet.status;
    const spec = statefulSet.spec;
    const ru = spec?.updateStrategy?.rollingUpdate;
    let partition: number | null = null;
    if (ru && ru.partition !== undefined && ru.partition !== null) {
        partition = ru.partition;
    }
    return {
        currentRevision: status?.currentRevision || '',
        updateRevision: status?.updateRevision || '',
        collisionCount: status?.collisionCount ?? 0,
        paused: false,
        partition
    };
}

function buildOrdinalPodRows(
    statefulSet: k8s.V1StatefulSet,
    pods: k8s.V1Pod[]
): StatefulSetOrdinalPodRow[] {
    const name = statefulSet.metadata?.name || '';
    const desired = statefulSet.spec?.replicas ?? 0;
    const podByOrdinal = new Map<number, k8s.V1Pod>();

    for (const pod of pods) {
        const podName = pod.metadata?.name || '';
        const ord = extractOrdinalFromPodName(name, podName);
        if (ord !== null) {
            podByOrdinal.set(ord, pod);
        }
    }

    const rows: StatefulSetOrdinalPodRow[] = [];
    for (let i = 0; i < desired; i++) {
        const expectedPodName = `${name}-${i}`;
        const pod = podByOrdinal.get(i);
        if (!pod) {
            rows.push({
                ordinal: i,
                expectedPodName,
                podPresent: false,
                phase: '—',
                readyDisplay: 'Pod not created yet',
                restartCount: 0,
                nodeName: '—',
                statusDetail: 'No pod matching this ordinal',
                age: '—'
            });
            continue;
        }

        const conditions = pod.status?.conditions || [];
        const scheduled = conditions.find(c => c.type === 'PodScheduled');
        let statusDetail = pod.status?.reason || '';
        if (!statusDetail && scheduled?.status === 'False') {
            statusDetail = scheduled.message || scheduled.reason || 'Unscheduled';
        }
        if (!statusDetail) {
            statusDetail = pod.status?.message || '';
        }

        rows.push({
            ordinal: i,
            expectedPodName: pod.metadata?.name || expectedPodName,
            podPresent: true,
            phase: pod.status?.phase || 'Unknown',
            readyDisplay: podReadyDisplay(pod),
            restartCount: podRestarts(pod),
            nodeName: pod.spec?.nodeName || 'Pending',
            statusDetail: statusDetail || '—',
            age: podAge(pod)
        });
    }

    return rows;
}

function summarizeVolumeClaimTemplates(statefulSet: k8s.V1StatefulSet): VolumeClaimTemplateSummary[] {
    const templates = statefulSet.spec?.volumeClaimTemplates || [];
    return templates.map(t => {
        const req = t.spec?.resources?.requests?.storage || '';
        return {
            name: t.metadata?.name || '',
            accessModes: t.spec?.accessModes || [],
            storageRequest: typeof req === 'string' ? req : String(req || ''),
            storageClassName: t.spec?.storageClassName || ''
        };
    });
}

function buildOrdinalPvcRows(
    statefulSet: k8s.V1StatefulSet,
    pvcs: k8s.V1PersistentVolumeClaim[]
): OrdinalPvcRow[] {
    const stsName = statefulSet.metadata?.name || '';
    const desired = statefulSet.spec?.replicas ?? 0;
    const templates = statefulSet.spec?.volumeClaimTemplates || [];
    const pvcByName = new Map<string, k8s.V1PersistentVolumeClaim>();
    for (const p of pvcs) {
        const n = p.metadata?.name;
        if (n) {
            pvcByName.set(n, p);
        }
    }

    const rows: OrdinalPvcRow[] = [];
    for (const t of templates) {
        const tname = t.metadata?.name || '';
        for (let i = 0; i < desired; i++) {
            const pvcName = `${tname}-${stsName}-${i}`;
            const pvc = pvcByName.get(pvcName);
            rows.push({
                ordinal: i,
                templateName: tname,
                pvcName,
                found: !!pvc,
                phase: pvc?.status?.phase || (pvc ? 'Unknown' : 'Not found'),
                capacity: pvc?.status?.capacity?.storage || '—',
                storageClassName: pvc?.spec?.storageClassName || t.spec?.storageClassName || '—'
            });
        }
    }
    return rows;
}

function extractConditions(statefulSet: k8s.V1StatefulSet): StatefulSetConditionRow[] {
    const conditions = statefulSet.status?.conditions || [];
    return conditions.map(c => {
        const lastTransition = c.lastTransitionTime;
        let lastTransitionStr = '';
        if (lastTransition) {
            lastTransitionStr =
                typeof lastTransition === 'string' ? lastTransition : lastTransition.toISOString();
        }
        let severity: StatefulSetConditionRow['severity'] = 'info';
        if (c.type === 'Ready' && c.status === 'True') {
            severity = 'success';
        } else if (c.status === 'False') {
            severity = 'error';
        }
        return {
            type: c.type || '',
            status: c.status || '',
            reason: c.reason || '',
            message: c.message || '',
            relativeTime: lastTransitionStr ? formatRelativeTime(lastTransitionStr) : '',
            severity
        };
    });
}

/**
 * Transforms API objects into data for the StatefulSet describe webview.
 */
export function transformStatefulSetData(
    statefulSet: k8s.V1StatefulSet,
    pods: k8s.V1Pod[],
    pvcs: k8s.V1PersistentVolumeClaim[],
    events: k8s.CoreV1Event[]
): StatefulSetDescribeData {
    const metadata = statefulSet.metadata;
    const spec = statefulSet.spec;
    const replicaStatus = extractReplicaStatus(statefulSet);

    return {
        name: metadata?.name || 'Unknown',
        namespace: metadata?.namespace || 'default',
        overview: extractOverview(statefulSet, replicaStatus),
        replicaStatus,
        rollout: extractRollout(statefulSet),
        ordinalPods: buildOrdinalPodRows(statefulSet, pods),
        volumeClaimTemplates: summarizeVolumeClaimTemplates(statefulSet),
        ordinalPvcs: buildOrdinalPvcRows(statefulSet, pvcs),
        conditions: extractConditions(statefulSet),
        podTemplate: extractPodTemplateInfoFromPodSpec(spec?.template?.spec),
        labels: metadata?.labels || {},
        selectors: spec?.selector?.matchLabels || {},
        annotations: metadata?.annotations || {},
        events: transformKubernetesEvents(events)
    };
}
