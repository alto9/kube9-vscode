/**
 * Transforms V1DaemonSet, related Pods, optional Nodes, and Events into structured describe data.
 */

import * as k8s from '@kubernetes/client-node';
import { calculateAge } from '../utils/deploymentUtils';
import { formatRelativeTime } from '../utils/timeFormatting';
import {
    buildPodTemplateInfoFromTemplateSpec,
    transformKubernetesEvents,
    DeploymentEvent,
    PodTemplateInfo
} from './deploymentDataTransformer';

export interface DaemonSetOverview {
    name: string;
    namespace: string;
    statusSummary: string;
    statusDetail: string;
    creationTimestamp: string;
    age: string;
    generation: number;
}

export interface DaemonSetReplicaCounts {
    desiredScheduled: number;
    currentScheduled: number;
    ready: number;
    available: number;
    unavailable: number;
    misscheduled: number;
    updatedScheduled: number;
}

export interface DaemonSetUpdateStrategyInfo {
    type: string;
    maxUnavailable: string;
    maxSurge: string;
}

export interface DaemonSetConditionRow {
    type: string;
    status: string;
    reason: string;
    message: string;
    lastTransitionTime: string;
    relativeTime: string;
    severity: 'success' | 'warning' | 'error' | 'info';
}

export interface DaemonSetNodeCoverageRow {
    nodeName: string;
    state: 'ready' | 'not-ready' | 'missing' | 'unexpected';
    podName: string;
    detail: string;
}

export interface DaemonSetPodRow {
    name: string;
    node: string;
    phase: string;
    ready: string;
    restartCount: number;
    age: string;
}

export interface DaemonSetDescribeData {
    name: string;
    namespace: string;
    overview: DaemonSetOverview;
    replicaCounts: DaemonSetReplicaCounts;
    updateStrategy: DaemonSetUpdateStrategyInfo;
    podTemplate: PodTemplateInfo;
    conditions: DaemonSetConditionRow[];
    nodeCoverage: DaemonSetNodeCoverageRow[];
    nodeCoverageLimitedMessage: string | null;
    pods: DaemonSetPodRow[];
    podsFetchError: string | null;
    labels: Record<string, string>;
    selectors: Record<string, string>;
    annotations: Record<string, string>;
    events: DeploymentEvent[];
    eventsFetchError: string | null;
}

function ownedByDaemonSet(pod: k8s.V1Pod, daemonSetName: string, daemonSetUid?: string): boolean {
    return (
        pod.metadata?.ownerReferences?.some(
            ref =>
                ref.kind === 'DaemonSet' &&
                ref.name === daemonSetName &&
                (!daemonSetUid || ref.uid === daemonSetUid)
        ) ?? false
    );
}

function nodeMatchesSelector(node: k8s.V1Node, selector: Record<string, string>): boolean {
    const labels = node.metadata?.labels || {};
    return Object.entries(selector).every(([k, v]) => labels[k] === v);
}

function podReadyString(pod: k8s.V1Pod): string {
    const statuses = pod.status?.containerStatuses || [];
    if (statuses.length === 0) {
        return '0/0';
    }
    const ready = statuses.filter(s => s.ready).length;
    return `${ready}/${statuses.length}`;
}

function podRestartTotal(pod: k8s.V1Pod): number {
    const statuses = pod.status?.containerStatuses || [];
    return statuses.reduce((sum, s) => sum + (s.restartCount || 0), 0);
}

function podIsReady(pod: k8s.V1Pod): boolean {
    const statuses = pod.status?.containerStatuses || [];
    if (statuses.length === 0) {
        return false;
    }
    return statuses.every(s => s.ready);
}

function extractOverview(ds: k8s.V1DaemonSet): DaemonSetOverview {
    const metadata = ds.metadata;
    const status = ds.status;
    const conditions = status?.conditions || [];
    const desired = status?.desiredNumberScheduled ?? 0;
    const ready = status?.numberReady ?? 0;
    const misscheduled = status?.numberMisscheduled ?? 0;

    let statusSummary = 'Unknown';
    let statusDetail = '';

    const failureCond = conditions.find(
        c => (c.type === 'DaemonSetReplicaFailure' || c.reason === 'ReplicaFailure') && c.status === 'True'
    );
    if (failureCond) {
        statusSummary = 'Degraded';
        statusDetail = failureCond.message || failureCond.reason || 'Replica failure reported';
    } else if (misscheduled > 0) {
        statusSummary = 'Misscheduled pods';
        statusDetail = `${misscheduled} pod(s) reported as misscheduled`;
    } else if (desired > 0 && ready === desired) {
        statusSummary = 'Healthy';
        statusDetail = `All ${desired} scheduled node(s) report ready pods`;
    } else if (desired > 0) {
        statusSummary = 'Rolling out';
        statusDetail = `${ready} of ${desired} node(s) ready`;
    } else {
        const prog = conditions.find(c => c.type === 'DaemonSetRolloutProgressing');
        if (prog?.message) {
            statusDetail = prog.message;
            statusSummary = prog.status === 'False' ? 'Blocked' : 'Progressing';
        }
    }

    let creationTimestamp = '';
    if (metadata?.creationTimestamp) {
        creationTimestamp =
            typeof metadata.creationTimestamp === 'string'
                ? metadata.creationTimestamp
                : metadata.creationTimestamp.toISOString();
    }

    return {
        name: metadata?.name || 'Unknown',
        namespace: metadata?.namespace || 'default',
        statusSummary,
        statusDetail,
        creationTimestamp,
        age: creationTimestamp ? calculateAge(creationTimestamp) : '',
        generation: metadata?.generation || 0
    };
}

function extractReplicaCounts(ds: k8s.V1DaemonSet): DaemonSetReplicaCounts {
    const st = ds.status;
    const desired = st?.desiredNumberScheduled ?? 0;
    const current = st?.currentNumberScheduled ?? 0;
    const ready = st?.numberReady ?? 0;
    const available = st?.numberAvailable ?? 0;
    const unavailable = st?.numberUnavailable ?? 0;
    const misscheduled = st?.numberMisscheduled ?? 0;
    const updated = st?.updatedNumberScheduled ?? 0;

    return {
        desiredScheduled: desired,
        currentScheduled: current,
        ready,
        available,
        unavailable,
        misscheduled,
        updatedScheduled: updated
    };
}

function extractUpdateStrategy(ds: k8s.V1DaemonSet): DaemonSetUpdateStrategyInfo {
    const strategy = ds.spec?.updateStrategy;
    const t = strategy?.type || 'RollingUpdate';
    if (t === 'OnDelete') {
        return { type: 'OnDelete', maxUnavailable: 'N/A', maxSurge: 'N/A' };
    }
    const ru = strategy?.rollingUpdate;
    return {
        type: 'RollingUpdate',
        maxUnavailable: ru?.maxUnavailable !== undefined ? String(ru.maxUnavailable) : 'N/A',
        maxSurge: ru?.maxSurge !== undefined ? String(ru.maxSurge) : 'N/A'
    };
}

function extractConditions(ds: k8s.V1DaemonSet): DaemonSetConditionRow[] {
    const conditions = ds.status?.conditions || [];
    return conditions.map(c => {
        const lastTransition = c.lastTransitionTime
            ? typeof c.lastTransitionTime === 'string'
                ? c.lastTransitionTime
                : c.lastTransitionTime.toISOString()
            : '';
        let severity: DaemonSetConditionRow['severity'] = 'info';
        if (c.status === 'True' && c.type?.includes('Failure')) {
            severity = 'error';
        } else if (c.status === 'False') {
            severity = 'success';
        } else if (c.status === 'True') {
            severity = 'success';
        }
        return {
            type: c.type || 'Unknown',
            status: c.status || 'Unknown',
            reason: c.reason || '',
            message: c.message || '',
            lastTransitionTime: lastTransition,
            relativeTime: lastTransition ? formatRelativeTime(lastTransition) : '',
            severity
        };
    });
}

function buildNodeCoverage(
    ds: k8s.V1DaemonSet,
    pods: k8s.V1Pod[],
    nodes: k8s.V1Node[] | undefined,
    nodesError: string | undefined
): { rows: DaemonSetNodeCoverageRow[]; limitedMessage: string | null } {
    const dsName = ds.metadata?.name || '';
    const dsUid = ds.metadata?.uid;
    const ownedPods = pods.filter(p => ownedByDaemonSet(p, dsName, dsUid));

    if (nodesError || !nodes || nodes.length === 0) {
        return {
            rows: [],
            limitedMessage: nodesError
                ? `Node coverage is limited: ${nodesError}`
                : 'Node coverage requires listing cluster nodes; none were returned or listing failed.'
        };
    }

    const nodeSelector = ds.spec?.template?.spec?.nodeSelector || {};
    const eligible = nodeSelector && Object.keys(nodeSelector).length > 0
        ? nodes.filter(n => nodeMatchesSelector(n, nodeSelector))
        : [...nodes];

    const byNode = new Map<string, k8s.V1Pod>();
    for (const p of ownedPods) {
        const nodeName = p.spec?.nodeName;
        if (nodeName) {
            byNode.set(nodeName, p);
        }
    }

    const rows: DaemonSetNodeCoverageRow[] = [];
    const eligibleNames = new Set(eligible.map(n => n.metadata?.name || '').filter(Boolean));

    for (const node of eligible) {
        const nodeName = node.metadata?.name || 'unknown';
        const pod = byNode.get(nodeName);
        if (!pod) {
            rows.push({
                nodeName,
                state: 'missing',
                podName: '',
                detail: 'No DaemonSet pod scheduled on this node'
            });
        } else if (podIsReady(pod)) {
            rows.push({
                nodeName,
                state: 'ready',
                podName: pod.metadata?.name || '',
                detail: 'Pod is ready'
            });
        } else {
            rows.push({
                nodeName,
                state: 'not-ready',
                podName: pod.metadata?.name || '',
                detail: `Phase ${pod.status?.phase || 'Unknown'}`
            });
        }
    }

    for (const p of ownedPods) {
        const nn = p.spec?.nodeName;
        if (nn && !eligibleNames.has(nn)) {
            rows.push({
                nodeName: nn,
                state: 'unexpected',
                podName: p.metadata?.name || '',
                detail: 'Pod on a node that does not match the DaemonSet nodeSelector (may be misscheduled)'
            });
        }
    }

    rows.sort((a, b) => a.nodeName.localeCompare(b.nodeName));
    return { rows, limitedMessage: null };
}

function buildPodRows(pods: k8s.V1Pod[], daemonSetName: string, daemonSetUid?: string): DaemonSetPodRow[] {
    const owned = pods.filter(p => ownedByDaemonSet(p, daemonSetName, daemonSetUid));
    return owned.map(p => {
        let created = '';
        if (p.metadata?.creationTimestamp) {
            created =
                typeof p.metadata.creationTimestamp === 'string'
                    ? p.metadata.creationTimestamp
                    : p.metadata.creationTimestamp.toISOString();
        }
        return {
            name: p.metadata?.name || 'Unknown',
            node: p.spec?.nodeName || 'Pending',
            phase: p.status?.phase || 'Unknown',
            ready: podReadyString(p),
            restartCount: podRestartTotal(p),
            age: created ? calculateAge(created) : ''
        };
    });
}

/**
 * Build structured DaemonSet describe payload for the webview.
 */
export function transformDaemonSetData(
    ds: k8s.V1DaemonSet,
    pods: k8s.V1Pod[],
    nodes: k8s.V1Node[] | undefined,
    nodesListError: string | undefined,
    events: k8s.CoreV1Event[],
    podsFetchError: string | undefined,
    eventsFetchError: string | undefined
): DaemonSetDescribeData {
    const metadata = ds.metadata;
    const spec = ds.spec;
    const dsName = metadata?.name || 'Unknown';
    const dsUid = metadata?.uid;
    const { rows: nodeCoverage, limitedMessage: covLimited } = buildNodeCoverage(ds, pods, nodes, nodesListError);

    let nodeCoverageLimitedMessage = covLimited;
    if (podsFetchError) {
        nodeCoverageLimitedMessage = nodeCoverageLimitedMessage
            ? `${nodeCoverageLimitedMessage} Pod list error: ${podsFetchError}`
            : `Pod list error: ${podsFetchError}`;
    }

    return {
        name: dsName,
        namespace: metadata?.namespace || 'default',
        overview: extractOverview(ds),
        replicaCounts: extractReplicaCounts(ds),
        updateStrategy: extractUpdateStrategy(ds),
        podTemplate: buildPodTemplateInfoFromTemplateSpec(spec?.template),
        conditions: extractConditions(ds),
        nodeCoverage,
        nodeCoverageLimitedMessage: nodeCoverageLimitedMessage || null,
        pods: buildPodRows(pods, dsName, dsUid),
        podsFetchError: podsFetchError || null,
        labels: metadata?.labels || {},
        selectors: spec?.selector?.matchLabels || {},
        annotations: metadata?.annotations || {},
        events: transformKubernetesEvents(events),
        eventsFetchError: eventsFetchError || null
    };
}
